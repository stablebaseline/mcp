import { Command } from "commander";
import kleur from "kleur";
import { readFile } from "node:fs/promises";
import { makeSdkClient } from "../client.js";

export function registerToolCommands(program: Command) {
  const tool = program.command("tool").description("Direct tool dispatch — call any of the 163 MCP tools.");

  tool
    .command("list")
    .description("List all tools (catalogue summary).")
    .option("--category <category>", "Filter by category (e.g. documents, plans, knowledge_graph)")
    .option("--json", "Output JSON instead of a table")
    .action(async (opts: { category?: string; json?: boolean }) => {
      const sdk = await makeSdkClient();
      const { tools } = await sdk.listTools();
      const filtered = opts.category
        ? tools.filter((t) => t.category === opts.category)
        : tools;

      if (opts.json) {
        console.log(JSON.stringify(filtered, null, 2));
        return;
      }

      // Group by category for human-readable output.
      const byCategory = new Map<string, typeof filtered>();
      for (const t of filtered) {
        const arr = byCategory.get(t.category) ?? [];
        arr.push(t);
        byCategory.set(t.category, arr);
      }
      const cats = [...byCategory.keys()].sort();
      for (const cat of cats) {
        console.log(kleur.bold(kleur.cyan(cat)) + kleur.dim(` (${byCategory.get(cat)!.length})`));
        for (const t of byCategory.get(cat)!) {
          const desc = t.description.slice(0, 80) + (t.description.length > 80 ? "…" : "");
          console.log(`  ${kleur.green(t.name)} ${kleur.dim("— " + desc)}`);
        }
        console.log("");
      }
      console.log(kleur.dim(`${filtered.length} tools`));
    });

  tool
    .command("call <name>")
    .description("Call a tool by name. Provide input via --json '{...}' or --json-file path.")
    .option("--json <json>", "Inline JSON input")
    .option("--json-file <path>", "Path to a file containing JSON input")
    .option("--pretty", "Pretty-print the response")
    .action(async (name: string, opts: { json?: string; jsonFile?: string; pretty?: boolean }) => {
      let input: any = {};
      if (opts.json && opts.jsonFile) {
        console.error(kleur.red("✗ ") + "Pass either --json or --json-file, not both.");
        process.exitCode = 1;
        return;
      }
      if (opts.jsonFile) {
        const raw = await readFile(opts.jsonFile, "utf8");
        input = JSON.parse(raw);
      } else if (opts.json) {
        input = JSON.parse(opts.json);
      }
      const sdk = await makeSdkClient();
      try {
        const result = await sdk.callTool(name, input);
        const out = opts.pretty
          ? JSON.stringify(result, null, 2)
          : JSON.stringify(result);
        console.log(out);
      } catch (err) {
        const e = err as { status?: number; code?: string; message?: string };
        console.error(kleur.red(`✗ ${e.code ?? "error"}: `) + (e.message ?? String(err)));
        if (e.status) console.error(kleur.dim(`  HTTP ${e.status}`));
        process.exitCode = 1;
      }
    });

  tool
    .command("search <query>")
    .description("Search the tool catalogue (passthrough to the searchTools meta-tool).")
    .action(async (query: string) => {
      const sdk = await makeSdkClient();
      try {
        const result = await sdk.callTool("searchTools", { query });
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        console.error(kleur.red("✗ ") + ((err as Error).message ?? String(err)));
        process.exitCode = 1;
      }
    });
}
