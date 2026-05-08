#!/usr/bin/env node
// `sb` — Stable Baseline command-line client.
//
// Usage:
//   sb auth login [--api-key sta_...]
//   sb auth logout
//   sb auth whoami
//   sb tool list [--category=...] [--json]
//   sb tool search "..."
//   sb tool call <name> [--json '{...}'] [--json-file path]
//
// Auth is stored at ~/.config/stablebaseline/auth.json (or %APPDATA% on Windows).
// Override with `SB_API_KEY` or `SB_ACCESS_TOKEN` env vars.

import { Command } from "commander";
import { registerAuthCommands } from "../commands/auth.js";
import { registerToolCommands } from "../commands/tool.js";

// Read package version from the installed package.json without bundling it.
// `tsup --shims` emits a CJS-style require shim that supports this.
async function getVersion(): Promise<string> {
  try {
    const url = new URL("../../package.json", import.meta.url);
    const { readFile } = await import("node:fs/promises");
    const text = await readFile(url, "utf8");
    return JSON.parse(text).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main() {
  const program = new Command();
  program
    .name("sb")
    .description(
      "Stable Baseline CLI — end-to-end agent-managed company brain. " +
        "Docs, diagrams, plans, and a self-learning Knowledge Graph from your terminal.",
    )
    .version(await getVersion(), "-v, --version", "Print version and exit");

  registerAuthCommands(program);
  registerToolCommands(program);

  program.addHelpText(
    "after",
    `
Examples:
  $ sb auth login --api-key sta_xxx
  $ sb auth whoami
  $ sb tool list --category=documents
  $ sb tool call listOrganisations
  $ sb tool call createDocument --json '{"folderId":"...","title":"X","cdmd":"# Hi"}'
  $ sb tool search "build a plan"

Docs:    https://stablebaseline.io/docs/mcp
Issues:  https://github.com/stablebaseline/mcp/issues
`,
  );

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
