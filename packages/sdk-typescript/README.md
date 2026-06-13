# @stablebaseline/sdk

[![npm](https://img.shields.io/npm/v/@stablebaseline/sdk?color=orange)](https://www.npmjs.com/package/@stablebaseline/sdk)
[![Tools](https://img.shields.io/badge/MCP%20tools-184-orange)](https://stablebaseline.io/docs/mcp/tools)

TypeScript SDK for the **[Stable Baseline](https://stablebaseline.io) REST API** — the simplest, most complete, end-to-end agent-managed company brain. Living docs, 40+ visual diagrams, plans, and a self-learning Knowledge Graph. 184 tools across 19 categories.

## Install

```bash
npm install @stablebaseline/sdk
```

## Quick start

```ts
import { StableBaseline } from "@stablebaseline/sdk";

// Mint an API key at https://app.stablebaseline.io/settings/mcp-keys
const sb = new StableBaseline({ apiKey: process.env.SB_API_KEY! });

const orgs = await sb.tools.listOrganisations({});
console.log(orgs);

const doc = await sb.tools.createDocument({
  folderId: "folder-uuid",
  title: "Q4 architecture",
  cdmd: "# Architecture\n\nThis document covers...",
});
console.log(`Created ${doc.friendlyId} (${doc.id})`);

const search = await sb.tools.kg_search({
  query: "compliance posture",
  mode: "global",
});
console.log(search.entities);
```

## Auth

Two equivalent paths:

```ts
// API key (mint at app.stablebaseline.io/settings/mcp-keys, prefix sta_)
new StableBaseline({ apiKey: "sta_..." });

// OAuth 2.1 access token (interactive flow against api.stablebaseline.io/oauth/token)
new StableBaseline({ accessToken: "..." });
```

Both go in the `Authorization: Bearer <...>` header.

## Tool catalogue

184 tools across 19 categories. The full list lives at [stablebaseline.io/docs/mcp/tools](https://stablebaseline.io/docs/mcp/tools). Highlights:

| Category | Sample tools |
|---|---|
| `navigation` | `listOrganisations`, `listWorkspaces`, `listProjects`, `getProjectHierarchy`, `searchTools` |
| `documents` | `createDocument`, `getDocument`, `editDocument`, `findAndReplaceTextInDocument`, `deleteDocument` |
| `diagrams` | `insertDiagramInDocument`, `listDiagramTypes`, `getCdmdLanguageGuide` |
| `plans` | `createPlan`, `createTask`, `getPlanHierarchy`, `previewTaskDependencyCascade` |
| `improvements` | `createImprovement`, `searchImprovements`, `addImprovementEvidence` |
| `knowledge_graph` | `kg_search`, `kg_get_entity`, `kg_related_documents` |
| `members` / `teams` / `permissions` | full org control plane |
| `billing` | `previewSubscriptionChange`, `applySubscriptionChange`, `purchaseCreditPackage` |

Discover what's available at runtime:

```ts
const { tools } = await sb.listTools();
console.log(`${tools.length} tools available`);
```

## Error handling

Errors throw `StableBaselineToolError` with `status`, `code`, `message`, and optional `details`:

```ts
import { StableBaseline } from "@stablebaseline/sdk";
import type { ToolError } from "@stablebaseline/sdk";

try {
  await sb.tools.createDocument({ folderId: "missing", title: "X", cdmd: "..." });
} catch (err) {
  const e = err as ToolError;
  if (e.code === "permission_denied") { /* ... */ }
  if (e.status === 404) { /* ... */ }
}
```

## Type safety

Types are auto-generated from the live OpenAPI spec at
`https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1/openapi.json` via
`openapi-typescript`. To regenerate locally:

```bash
npm run codegen   # fetches spec + writes src/types.generated.ts
npm run build
```

A regen runs automatically before every `npm publish` via `prepublishOnly`, so each released version of the SDK matches the live API surface.

## Other surfaces

This SDK is one of three first-party clients:

| Surface | Package | Use case |
|---|---|---|
| **TypeScript SDK** (this) | `@stablebaseline/sdk` | Node, browsers, Deno, Bun |
| **CLI** | `@stablebaseline/cli` (binary `sb`) | Shells, scripts, CI/CD |
| **Python SDK** | `stablebaseline` (PyPI) | Python apps, data work |

All three share the same auth, same tool surface, same handlers. The MCP server itself is the source of truth — see the [public-facing repo](https://github.com/stablebaseline/mcp).

## License

MIT — see [LICENSE](../../LICENSE) at the repo root. The Stable Baseline product itself is proprietary SaaS at [stablebaseline.io](https://stablebaseline.io).
