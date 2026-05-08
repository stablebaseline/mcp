// End-to-end tests that spawn the actual built CLI binary. Verifies
// argument parsing, version output, help output, and error paths.
//
// These run against ./dist/sb.js — `npm run build` must have been called
// at least once before running. CI does that as a prerequisite step.
//
// Uses execFile (not the shell-invoking variant) to avoid command injection.

import { describe, it, expect } from "vitest";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";

const execFileAsync = promisify(execFileCb);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliBin = path.resolve(__dirname, "../dist/sb.js");
const skipIfNotBuilt = !existsSync(cliBin);

async function runCli(args: string[], env: NodeJS.ProcessEnv = {}): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliBin, ...args], {
      env: { ...process.env, ...env },
      timeout: 10_000,
    });
    return { stdout, stderr, code: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      code: err.code ?? 1,
    };
  }
}

describe("sb CLI binary", () => {
  it.skipIf(skipIfNotBuilt)("--version prints semver", async () => {
    const { stdout, code } = await runCli(["--version"]);
    expect(code).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it.skipIf(skipIfNotBuilt)("--help mentions the auth and tool subcommands", async () => {
    const { stdout, code } = await runCli(["--help"]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/auth/);
    expect(stdout).toMatch(/tool/);
    expect(stdout).toMatch(/Stable Baseline/i);
  });

  it.skipIf(skipIfNotBuilt)("with no args, prints help message", async () => {
    const { stdout, stderr } = await runCli([]);
    expect(stdout + stderr).toMatch(/Usage: sb/);
  });

  it.skipIf(skipIfNotBuilt)("`tool list` with no auth fails with NotAuthenticatedError", async () => {
    // Point env at a non-existent config dir so the credential lookup returns null.
    const env = {
      SB_API_KEY: "",
      SB_ACCESS_TOKEN: "",
      HOME: "/tmp/sb-cli-no-auth-fixture",
      USERPROFILE: "C:\\sb-cli-no-auth-fixture",
      APPDATA: "C:\\sb-cli-no-auth-fixture\\AppData\\Roaming",
      XDG_CONFIG_HOME: "/tmp/sb-cli-no-auth-fixture/.config",
    };
    const { stdout, stderr, code } = await runCli(["tool", "list"], env);
    expect(code).not.toBe(0);
    expect((stdout + stderr).toLowerCase()).toMatch(/auth|sign in|login|credential/);
  });

  it.skipIf(skipIfNotBuilt)("`auth whoami` with no creds prints actionable error", async () => {
    const env = {
      SB_API_KEY: "",
      SB_ACCESS_TOKEN: "",
      HOME: "/tmp/sb-cli-no-auth-fixture-2",
      USERPROFILE: "C:\\sb-cli-no-auth-fixture-2",
      APPDATA: "C:\\sb-cli-no-auth-fixture-2\\AppData\\Roaming",
      XDG_CONFIG_HOME: "/tmp/sb-cli-no-auth-fixture-2/.config",
    };
    const { stdout, stderr, code } = await runCli(["auth", "whoami"], env);
    expect(code).not.toBe(0);
    expect((stdout + stderr).toLowerCase()).toMatch(/sb auth login|sta_/);
  });
});
