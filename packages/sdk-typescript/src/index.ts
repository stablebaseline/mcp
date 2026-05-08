// @stablebaseline/sdk — TypeScript SDK for the Stable Baseline REST API.
//
//   import { StableBaseline } from "@stablebaseline/sdk";
//
//   const sb = new StableBaseline({ apiKey: "sta_xxx" });
//   const orgs = await sb.tools.listOrganisations({});
//   const doc = await sb.tools.createDocument({
//     folderId: "...",
//     title: "Q4 architecture",
//     cdmd: "# ...",
//   });
//
// All 163 MCP tools are reachable from `sb.tools.<toolName>(input)`. Types
// are generated from the live OpenAPI spec (`openapi.json` in this package).

export { StableBaseline } from "./client.js";
export type { StableBaselineClientOptions, ToolError } from "./client.js";

// Re-export the generated types so consumers can `import type { ... } from "@stablebaseline/sdk/types"`.
export type * from "./types.generated.js";
