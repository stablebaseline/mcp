// Unit tests for CLI credential storage. Uses an isolated temp HOME so
// tests don't read or trample the real ~/.config/stablebaseline/auth.json.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  readCredential,
  writeCredential,
  clearCredential,
  getStoredCredentialPath,
} from "../src/config.js";

let tempHome: string;
let savedEnv: Record<string, string | undefined>;

beforeEach(async () => {
  tempHome = await mkdtemp(path.join(tmpdir(), "sb-cli-test-"));
  savedEnv = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    APPDATA: process.env.APPDATA,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  };
  process.env.HOME = tempHome;
  process.env.USERPROFILE = tempHome;
  process.env.APPDATA = path.join(tempHome, "AppData", "Roaming");
  process.env.XDG_CONFIG_HOME = path.join(tempHome, ".config");
});

afterEach(async () => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await rm(tempHome, { recursive: true, force: true });
});

describe("readCredential", () => {
  it("returns null when no auth file exists", async () => {
    const cred = await readCredential();
    expect(cred).toBeNull();
  });

  it("returns null on malformed JSON without throwing", async () => {
    const file = getStoredCredentialPath();
    await writeCredential({ type: "api_key", value: "sta_x" });
    // Stomp the file with bad JSON
    const fs = await import("node:fs/promises");
    await fs.writeFile(file, "not json {", "utf8");
    const cred = await readCredential();
    expect(cred).toBeNull();
  });
});

describe("writeCredential / readCredential round-trip", () => {
  it("persists an api_key credential", async () => {
    const path1 = await writeCredential({ type: "api_key", value: "sta_abc123" });
    expect(path1).toContain("auth.json");

    const cred = await readCredential();
    expect(cred).toEqual({ type: "api_key", value: "sta_abc123" });
  });

  it("persists an oauth credential with refresh fields", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    await writeCredential({
      type: "oauth",
      value: "oauth_access_xyz",
      expiresAt,
      refreshToken: "rt_zzz",
    });

    const cred = await readCredential();
    expect(cred).toEqual({
      type: "oauth",
      value: "oauth_access_xyz",
      expiresAt,
      refreshToken: "rt_zzz",
    });
  });

  it("creates the parent directory if missing", async () => {
    const file = getStoredCredentialPath();
    await writeCredential({ type: "api_key", value: "sta_x" });
    const dir = path.dirname(file);
    const dirStat = await stat(dir);
    expect(dirStat.isDirectory()).toBe(true);
  });

  it("file contents are JSON ending with a newline", async () => {
    await writeCredential({ type: "api_key", value: "sta_y" });
    const raw = await readFile(getStoredCredentialPath(), "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(JSON.parse(raw)).toEqual({ type: "api_key", value: "sta_y" });
  });
});

describe("clearCredential", () => {
  it("returns false when no file exists", async () => {
    expect(await clearCredential()).toBe(false);
  });

  it("removes the file and returns true on success", async () => {
    await writeCredential({ type: "api_key", value: "sta_x" });
    expect(await clearCredential()).toBe(true);
    expect(await readCredential()).toBeNull();
  });
});

describe("Config dir resolution", () => {
  it("uses APPDATA on Windows", () => {
    if (process.platform !== "win32") return; // skip on POSIX
    const file = getStoredCredentialPath();
    expect(file).toContain(process.env.APPDATA!);
    expect(file).toContain("stablebaseline");
    expect(file.endsWith("auth.json")).toBe(true);
  });

  it("uses XDG_CONFIG_HOME on Unix", () => {
    if (process.platform === "win32") return; // skip on Windows
    const file = getStoredCredentialPath();
    expect(file).toContain(process.env.XDG_CONFIG_HOME!);
  });
});
