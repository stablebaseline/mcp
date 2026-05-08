import kleur from "kleur";
import open from "open";
import { Command } from "commander";
import {
  clearCredential,
  getStoredCredentialPath,
  readCredential,
  writeCredential,
} from "../config.js";
import { makeSdkClient } from "../client.js";

const OAUTH_AUTHORIZE_URL = "https://app.stablebaseline.io/oauth/authorize";
const KEYS_PAGE = "https://app.stablebaseline.io/settings/mcp-keys";

export function registerAuthCommands(program: Command) {
  const auth = program.command("auth").description("Sign in / out and inspect the active credential.");

  auth
    .command("login")
    .description("Sign in. Default uses OAuth in the browser; pass --api-key to skip OAuth.")
    .option("--api-key <key>", "Use an API key (sta_*) directly. Mint at " + KEYS_PAGE)
    .action(async (opts: { apiKey?: string }) => {
      if (opts.apiKey) {
        if (!opts.apiKey.startsWith("sta_")) {
          console.error(kleur.red("✗ ") + "API key must start with `sta_`.");
          console.error("  Mint a key at " + kleur.cyan(KEYS_PAGE) + ".");
          process.exitCode = 1;
          return;
        }
        const path = await writeCredential({ type: "api_key", value: opts.apiKey });
        console.log(kleur.green("✓ ") + `Saved API key to ${kleur.dim(path)}`);
        return;
      }

      // OAuth path — for v0.1 we point the user at the browser-based flow.
      // Full local-callback support (PKCE + ephemeral loopback) is the
      // intended next iteration; for now we surface the URL so the user
      // can complete the dance and paste the resulting access token.
      console.log(kleur.bold("Sign in to Stable Baseline"));
      console.log("  " + kleur.cyan(OAUTH_AUTHORIZE_URL));
      console.log("");
      console.log("  Or run " + kleur.bold("sb auth login --api-key sta_...") + " for a non-interactive flow.");
      console.log("  Mint an API key at " + kleur.cyan(KEYS_PAGE) + ".");
      console.log("");
      try { await open(OAUTH_AUTHORIZE_URL); } catch { /* user can copy/paste */ }
      console.log(kleur.yellow("Note") + ": full PKCE-loopback OAuth from the CLI is on the roadmap (CLI v0.2). For now, prefer --api-key.");
    });

  auth
    .command("logout")
    .description("Forget the stored credential.")
    .action(async () => {
      const removed = await clearCredential();
      if (removed) {
        console.log(kleur.green("✓ ") + "Logged out.");
      } else {
        console.log(kleur.dim("Already logged out."));
      }
    });

  auth
    .command("whoami")
    .description("Show the current credential (truncated) and the user it's bound to.")
    .action(async () => {
      const cred = await readCredential();
      if (!cred && !process.env.SB_API_KEY && !process.env.SB_ACCESS_TOKEN) {
        console.log(kleur.dim("Not authenticated."));
        console.log(kleur.dim("  Run `sb auth login` (or `sb auth login --api-key sta_...`)."));
        process.exitCode = 1;
        return;
      }

      const sdk = await makeSdkClient();
      try {
        const user = await sdk.callTool<{
          user_id: string;
          display_name?: string;
          full_name?: string;
          email?: string;
        }>("getCurrentUser", {});
        const source = process.env.SB_API_KEY
          ? "env: SB_API_KEY"
          : process.env.SB_ACCESS_TOKEN
            ? "env: SB_ACCESS_TOKEN"
            : `file: ${getStoredCredentialPath()}`;
        console.log(kleur.green("✓ ") + (user.display_name || user.full_name || user.user_id));
        if (user.email) console.log("  " + kleur.dim("email: ") + user.email);
        console.log("  " + kleur.dim("user_id: ") + user.user_id);
        console.log("  " + kleur.dim("source: ") + source);
      } catch (err) {
        const e = err as Error;
        console.error(kleur.red("✗ ") + (e.message || String(err)));
        process.exitCode = 1;
      }
    });
}
