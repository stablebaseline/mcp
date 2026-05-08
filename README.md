<div align="center">

<img src="./assets/logo.png" alt="Stable Baseline" width="120" />

# Stable Baseline — MCP Server

**The simplest, most complete, end-to-end agent-managed company brain.**

[Website](https://stablebaseline.io) · [Sign up free](https://app.stablebaseline.io/signup) · [Docs](https://stablebaseline.io/docs/mcp) · [Tool catalogue](https://stablebaseline.io/docs/mcp/tools) · [llms.txt](https://stablebaseline.io/llms.txt)

[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.stablebaseline%2Fsb-orange)](https://registry.modelcontextprotocol.io/v0/servers?search=io.stablebaseline)
[![Smithery](https://img.shields.io/badge/Smithery-stablebaseline%2Fsb--mcp-orange)](https://smithery.ai/servers/stablebaseline/sb-mcp)
[![Tools](https://img.shields.io/badge/MCP%20tools-163-orange)](https://stablebaseline.io/docs/mcp/tools)
[![npm CLI](https://img.shields.io/npm/v/@stablebaseline/cli?label=%40stablebaseline%2Fcli&color=orange)](https://www.npmjs.com/package/@stablebaseline/cli)
[![npm SDK](https://img.shields.io/npm/v/@stablebaseline/sdk?label=%40stablebaseline%2Fsdk&color=orange)](https://www.npmjs.com/package/@stablebaseline/sdk)
[![PyPI](https://img.shields.io/pypi/v/stablebaseline?label=stablebaseline&color=orange)](https://pypi.org/project/stablebaseline/)

</div>

---

## How to use Stable Baseline

Pick the surface that matches how you work — every option talks to the same handlers, the same auth, the same data:

| Surface | What it's for | Install |
|---|---|---|
| **MCP server** | AI agents (Claude Code, Cursor, Windsurf, ChatGPT, Gemini, Smithery, …). Native protocol with prompts and resources. | Endpoint: [`api.stablebaseline.io/functions/v1/cloud-serve/mcp`](https://api.stablebaseline.io/functions/v1/cloud-serve/mcp). See [Quick start](#quick-start) below. |
| **REST API** | Any HTTP client, Postman, OpenAPI codegen, Zapier-style integrators. Tool-RPC + idiomatic resource routes. | Live spec: [`/api/v1/openapi.json`](https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1/openapi.json) · Interactive docs: [`/api/v1/docs`](https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1/docs) |
| **TypeScript SDK** | Node, browsers, Deno, Bun. Typed `client.tools.<toolName>(...)` surface. | `npm i @stablebaseline/sdk` — see [`packages/sdk-typescript`](packages/sdk-typescript/) |
| **CLI (`sb`)** | Shells, scripts, CI/CD. `sb tool call <name> --json '{...}'`. | `npm i -g @stablebaseline/cli` — see [`packages/cli`](packages/cli/) |
| **Python SDK** | Python apps, data work. Sync + async clients. | `pip install stablebaseline` — see [`packages/sdk-python`](packages/sdk-python/) |

163 tools across 16 categories. Same brain, same Knowledge Graph, same RBAC — every surface.

---

One workspace where humans and any MCP-compatible AI agent — Claude Code, Cursor, Windsurf, VS Code, Warp, OpenCode, Antigravity, OpenAI Codex, ChatGPT Developer Mode, Gemini CLI/Extensions, and more — co-author **living documents** (Markdown-native with a rich superset on top), **40+ visual diagrams** (Mermaid, BPMN 2.0, D2, PlantUML, GraphViz, ELK architecture, sequence, state, ERD, Gantt, Excalidraw freehand), plans, timelines, tasks, improvements, and a self-learning **Knowledge Graph that IS the company brain**.

**Lean, fast, secure, and affordable** — flexible enough for one person organising a personal mind, through to small businesses, growing businesses, and enterprise.

163 MCP tools across 16 categories let an agent drive **end-to-end**: sign-up → billing → org/workspace/project → members → teams → permissions → brain scope → docs → diagrams → plans, all without a human touching the UI.

## Endpoint

```
https://api.stablebaseline.io/functions/v1/cloud-serve/mcp
```

**Transport:** Streamable HTTP (with SSE fallback)
**Auth:** OAuth 2.1 with Dynamic Client Registration, **or** Bearer API key (`sta_*`)
**Discovery manifest:** [`https://stablebaseline.io/.well-known/mcp.json`](https://stablebaseline.io/.well-known/mcp.json)

## Quick start

### Mint an API key (skip OAuth)

1. [Sign up free](https://app.stablebaseline.io/signup) — no credit card
2. Go to **Settings → MCP keys** and click **Generate**
3. Copy the `sta_...` key

(Or skip this — every client below also supports interactive OAuth on first call.)

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "stable-baseline": {
      "url": "https://api.stablebaseline.io/functions/v1/cloud-serve/mcp",
      "headers": {
        "Authorization": "Bearer sta_YOUR_KEY"
      }
    }
  }
}
```

Or use the Claude Desktop OAuth flow — set just `url` and Claude will prompt you to authorize on first call.

### Claude Code

```bash
claude mcp add --transport http stable-baseline \
  https://api.stablebaseline.io/functions/v1/cloud-serve/mcp \
  --header "Authorization: Bearer sta_YOUR_KEY"
```

Or via OAuth:

```bash
claude mcp add --transport http stable-baseline \
  https://api.stablebaseline.io/functions/v1/cloud-serve/mcp
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "stable-baseline": {
      "url": "https://api.stablebaseline.io/functions/v1/cloud-serve/mcp",
      "headers": { "Authorization": "Bearer sta_YOUR_KEY" }
    }
  }
}
```

### Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "stable-baseline": {
      "serverUrl": "https://api.stablebaseline.io/functions/v1/cloud-serve/mcp",
      "headers": { "Authorization": "Bearer sta_YOUR_KEY" }
    }
  }
}
```

### VS Code (Copilot Chat)

`.vscode/mcp.json` (workspace) or user settings:

```json
{
  "servers": {
    "stable-baseline": {
      "type": "http",
      "url": "https://api.stablebaseline.io/functions/v1/cloud-serve/mcp",
      "headers": { "Authorization": "Bearer ${input:sta_key}" }
    }
  }
}
```

### Other clients

Recipes for Warp, OpenCode, Antigravity, OpenAI Codex, ChatGPT Developer Mode, Gemini CLI/Extensions, and a generic recipe are at [stablebaseline.io/docs/mcp/setup](https://stablebaseline.io/docs/mcp/setup).

## What you get

| Category | Sample tools | Docs |
|---|---|---|
| **navigation** | `listOrganisations`, `getProjectHierarchy`, `searchTools` | [→](https://stablebaseline.io/docs/mcp/tools/navigation) |
| **folders** | `createFolder`, `listFolders`, `setPlanItemParent` | [→](https://stablebaseline.io/docs/mcp/tools/folders) |
| **documents** | `createDocument`, `editDocument`, `findAndReplaceTextInDocument` | [→](https://stablebaseline.io/docs/mcp/tools/documents) |
| **diagrams** | `insertDiagramInDocument`, `listDiagramTypes`, `getCdmdLanguageGuide` | [→](https://stablebaseline.io/docs/mcp/tools/diagrams) |
| **images** | `createImageUploadSession`, `insertImageInDocument` | [→](https://stablebaseline.io/docs/mcp/tools/images) |
| **data** | `createVegaDataUploadSession` (CSV/JSON/TSV → Vega charts) | [→](https://stablebaseline.io/docs/mcp/tools/data) |
| **improvements** | `createImprovement`, `searchImprovements`, `addImprovementEvidence` | [→](https://stablebaseline.io/docs/mcp/tools/improvements) |
| **plans** | `createPlan`, `createPlanPhase`, `previewTaskDependencyCascade` | [→](https://stablebaseline.io/docs/mcp/tools/plans) |
| **knowledge_graph** | `kg_search`, `kg_get_entity`, `kg_related_documents` | [→](https://stablebaseline.io/docs/mcp/tools/knowledge_graph) |
| **organization** | `createOrganisation`, `createWorkspace`, `createProject` | [→](https://stablebaseline.io/docs/mcp/tools/organization) |
| **members** | `inviteMember`, `updateMemberRole`, `setMemberActive` | [→](https://stablebaseline.io/docs/mcp/tools/members) |
| **teams** | `createTeam`, `grantTeamWorkspaceAccess` | [→](https://stablebaseline.io/docs/mcp/tools/teams) |
| **permissions** | `upsertResourcePermission`, `setResourcePermissionOverride` | [→](https://stablebaseline.io/docs/mcp/tools/permissions) |
| **billing** | `previewSubscriptionChange`, `applySubscriptionChange`, `purchaseCreditPackage` | [→](https://stablebaseline.io/docs/mcp/tools/billing) |
| **kg_admin** | `setKgWorkspaceScope`, `triggerKgRebuild`, `previewKgRebuild` | [→](https://stablebaseline.io/docs/mcp/tools/kg_admin) |
| **settings** | `getOrgSettings`, `updateOrgFeatureFlags`, `updateUserPreferences` | [→](https://stablebaseline.io/docs/mcp/tools/settings) |

Full live catalogue: [stablebaseline.io/docs/mcp/tools](https://stablebaseline.io/docs/mcp/tools)

## Highlights

- **End-to-end agent-managed**: agents drive sign-up → billing → org/workspace/project lifecycle → members → teams → permissions → Knowledge Graph scope. No human touching the UI.
- **Living documents**: AI-native rich-text editor (CDMD = Markdown + inline diagrams, data tables, media, version history, real-time multi-author edits).
- **Visual diagram creation & editing**: 40+ types — AI-generated, diagram-as-code, or freehand.
- **Plans, timelines, tasks, improvements & bugs**: Day/Week/Month/Quarter/Year zoom Gantt, drag-to-reschedule, dependency cascades.
- **Self-learning Knowledge Graph (Enterprise)**: auto-built from every doc/plan/improvement; read by every connected agent. Stops hallucinations around gaps. Run one brain workspace-wide, one per department, or one per project — RBAC end-to-end.
- **Compliance Readiness (Enterprise)**: scans against OWASP ASVS, NIST SSDF, CIS Controls, ISO 27001, SOC 2, TISAX. *Readiness only — not legal advice, not an attestation.*
- **Bring-your-own-agent — no lock-in**: any MCP-compatible client.
- **Credit-cost preview ritual** for every spending operation: `previewX` → confirm token → `applyX`.

## Auth

| Method | When to use |
|---|---|
| **OAuth 2.1 + Dynamic Client Registration** | Default for desktop apps and IDE extensions. Smithery handles it automatically. |
| **Bearer API key** (`sta_...`) | CI/CD, headless agents, server-to-server. Mint at [app.stablebaseline.io/settings/mcp-keys](https://app.stablebaseline.io/settings/mcp-keys). Project-scoped or global. |

OAuth endpoints:
- `authorize`: `https://app.stablebaseline.io/oauth/authorize`
- `token`: `https://api.stablebaseline.io/oauth/token`
- `register` (DCR): `https://api.stablebaseline.io/oauth/register`
- Scopes: `org_admin`, `org_billing`, `org_members`, `org_teams`, `org_permissions`, `org_settings`, `kg_admin`, `lifecycle`

## Discovery

| Surface | URL |
|---|---|
| `.well-known/mcp.json` (manifest) | https://stablebaseline.io/.well-known/mcp.json |
| Official MCP Registry | https://registry.modelcontextprotocol.io/v0/servers?search=io.stablebaseline |
| Smithery | https://smithery.ai/servers/stablebaseline/sb-mcp |
| `llms.txt` | https://stablebaseline.io/llms.txt |
| `robots.txt` | https://stablebaseline.io/robots.txt |
| `sitemap.xml` | https://stablebaseline.io/sitemap.xml |
| `security.txt` | https://stablebaseline.io/.well-known/security.txt |

## Pricing

- **Free**: 100 one-off credits, no credit card.
- **Pro**: A$79 / user / month, 500 credits / user / month.
- **Enterprise**: custom — Knowledge Graph, Compliance Readiness, audit logs, SSO. [Contact](https://stablebaseline.io/contact).

## Status

- 🟢 **MCP Registry**: `io.stablebaseline/sb` — `active`, `isLatest`. Listed.
- 🟢 **Smithery**: published with `configSchema` (Quick Setup). 163 tools / 8 prompts / 6 resources discovered.
- 🟢 **`.well-known/mcp.json`**: live, schema 2024-11-05.
- 🟢 **Endpoint**: `api.stablebaseline.io/functions/v1/cloud-serve/mcp` — accepts POST with `mcp-protocol-version: 2025-03-26`.

## Issues & support

- **Bug or feature request**: open an issue here.
- **Security report**: see [`.well-known/security.txt`](https://stablebaseline.io/.well-known/security.txt) — RFC 9116 contact.
- **General support**: https://stablebaseline.io/contact

## License

This repository (README, `llms-install.md`, brand assets, and any documentation) is licensed under the **MIT License** — see [LICENSE](./LICENSE). You can copy, fork, and adapt these docs freely.

The Stable Baseline product itself — the SaaS application, the MCP server implementation, and the company brain Knowledge Graph — is proprietary, closed-source, and provided as a service at https://stablebaseline.io under the Stable Baseline [Terms of Service](https://stablebaseline.io/terms).

---

Built by [Orixian Solutions Pty Ltd](https://stablebaseline.io), Sydney, Australia.
