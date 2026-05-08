// CLI config IO. Stored at ~/.config/stablebaseline/auth.json (Unix) or
// %APPDATA%\stablebaseline\auth.json (Windows). Permissions are tightened
// to 0600 on POSIX. The file is a small JSON record with the credential
// type and its value.

import { readFile, writeFile, mkdir, chmod, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

export interface StoredCredential {
  type: "api_key" | "oauth";
  value: string;        // sta_xxx OR access_token
  expiresAt?: number;   // unix seconds (oauth only)
  refreshToken?: string;
}

function configDir(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "stablebaseline");
  }
  // Linux / macOS
  const xdg = process.env.XDG_CONFIG_HOME;
  return path.join(xdg ?? path.join(os.homedir(), ".config"), "stablebaseline");
}

function authFile(): string {
  return path.join(configDir(), "auth.json");
}

export async function readCredential(): Promise<StoredCredential | null> {
  const file = authFile();
  if (!existsSync(file)) return null;
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as StoredCredential;
  } catch {
    return null;
  }
}

export async function writeCredential(cred: StoredCredential): Promise<string> {
  const dir = configDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const file = authFile();
  await writeFile(file, JSON.stringify(cred, null, 2) + "\n", "utf8");
  if (process.platform !== "win32") {
    try { await chmod(file, 0o600); } catch { /* best-effort */ }
  }
  return file;
}

export async function clearCredential(): Promise<boolean> {
  const file = authFile();
  if (!existsSync(file)) return false;
  await unlink(file);
  return true;
}

export function getStoredCredentialPath(): string {
  return authFile();
}

export const DEFAULT_BASE_URL =
  process.env.SB_API_BASE_URL ||
  "https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1";
