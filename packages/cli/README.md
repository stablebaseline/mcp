# @stablebaseline/cli — `sb`

[![npm](https://img.shields.io/npm/v/@stablebaseline/cli?color=orange)](https://www.npmjs.com/package/@stablebaseline/cli)

Command-line client for **[Stable Baseline](https://stablebaseline.io)** — the simplest, most complete, end-to-end agent-managed company brain. Drive 196 MCP tools (docs, diagrams, plans, Knowledge Graph, members, billing, settings) from your terminal.

## Install

```bash
npm install -g @stablebaseline/cli
```

Or run without installing:

```bash
npx @stablebaseline/cli auth login --api-key sta_...
```

## First-time setup

```bash
# Mint a key at app.stablebaseline.io/settings/mcp-keys, then:
sb auth login --api-key sta_xxx

sb auth whoami
# ✓ Vineet Nair
#   email: vineet@example.com
#   user_id: 8d8b55ea-...
#   source: file: ~/.config/stablebaseline/auth.json
```

OAuth-from-the-CLI (PKCE loopback) is on the roadmap (CLI v0.2). For non-interactive use, the API-key path is the cleanest today.

## Usage

```bash
# Discover tools
sb tool list                          # all categories grouped
sb tool list --category=documents     # filter by category
sb tool search "schedule a task"      # natural-language search

# Call any tool (196 of them)
sb tool call listOrganisations
sb tool call createDocument --json '{"folderId":"<uuid>","title":"X","cdmd":"# Hi"}'
sb tool call kg_search --json '{"query":"compliance posture","mode":"global"}' --pretty

# JSON output is the default — pipe into jq for filtering
sb tool call listProjects --json '{"workspaceId":"<uuid>"}' | jq '.[].name'

# Use a JSON file for big inputs
sb tool call insertDiagramInDocument --json-file diagram.json
```

## Auth

| Source | How |
|---|---|
| **API key** (recommended for scripts/CI) | `sb auth login --api-key sta_...` writes to `~/.config/stablebaseline/auth.json` (0600 perms). |
| **Env override** | `SB_API_KEY=sta_...` or `SB_ACCESS_TOKEN=...` — wins over the on-disk credential. Useful for CI. |
| **OAuth (browser)** | `sb auth login` opens the browser. Full PKCE-loopback in CLI v0.2; for now, paste the access token via `SB_ACCESS_TOKEN`. |

Forget the credential:

```bash
sb auth logout
```

## Output formats

By default `sb tool call` prints compact JSON to stdout (machine-friendly). Use `--pretty` for indented JSON, or pipe to `jq`/`fx` for further processing.

`sb tool list` prints a grouped human-readable table by default; pass `--json` for raw JSON.

## What this CLI is (and isn't)

It's a **thin formatter on top of the [Stable Baseline REST API](https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1/docs)** — every command maps to a single REST call against the same handlers the MCP server uses. There is no business logic in this package; if a feature works on the MCP server, it works here on the same day, no CLI release needed.

## Companion packages

| Surface | Package | Use case |
|---|---|---|
| **CLI** (this) | `@stablebaseline/cli` (binary `sb`) | Shells, scripts, CI/CD |
| **TypeScript SDK** | `@stablebaseline/sdk` | Node, browsers, Deno, Bun |
| **Python SDK** | `stablebaseline` (PyPI) | Python apps, data work |
| **MCP server** | `https://api.stablebaseline.io/functions/v1/cloud-serve/mcp` | AI agents (Claude Code, Cursor, Windsurf, ChatGPT, Gemini, …) |

## License

MIT — see [LICENSE](../../LICENSE) at the repo root. The Stable Baseline product itself is proprietary SaaS at [stablebaseline.io](https://stablebaseline.io).
