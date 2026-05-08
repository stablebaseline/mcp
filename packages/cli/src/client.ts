// Resolve the active credential and return a configured SDK client.

import { StableBaseline } from "@stablebaseline/sdk";
import { DEFAULT_BASE_URL, readCredential } from "./config.js";

export async function makeSdkClient(): Promise<StableBaseline> {
  // Env override (handy for CI): if SB_API_KEY is set, use it without
  // touching the on-disk credential.
  const envKey = process.env.SB_API_KEY;
  const envToken = process.env.SB_ACCESS_TOKEN;

  if (envKey) {
    return new StableBaseline({ apiKey: envKey, baseUrl: DEFAULT_BASE_URL });
  }
  if (envToken) {
    return new StableBaseline({ accessToken: envToken, baseUrl: DEFAULT_BASE_URL });
  }

  const cred = await readCredential();
  if (!cred) {
    throw new NotAuthenticatedError();
  }

  if (cred.type === "api_key") {
    return new StableBaseline({ apiKey: cred.value, baseUrl: DEFAULT_BASE_URL });
  }
  return new StableBaseline({ accessToken: cred.value, baseUrl: DEFAULT_BASE_URL });
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super(
      "Not authenticated. Run `sb auth login --api-key sta_...` (or `sb auth login` for OAuth via browser).",
    );
    this.name = "NotAuthenticatedError";
  }
}
