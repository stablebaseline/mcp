# stablebaseline

[![PyPI](https://img.shields.io/pypi/v/stablebaseline?color=orange)](https://pypi.org/project/stablebaseline/)
[![Tools](https://img.shields.io/badge/MCP%20tools-184-orange)](https://stablebaseline.io/docs/mcp/tools)

Python SDK for the **[Stable Baseline](https://stablebaseline.io) REST API** — the simplest, most complete, end-to-end agent-managed company brain. Living docs, 40+ visual diagrams, plans, and a self-learning Knowledge Graph. 184 tools across 19 categories.

## Install

```bash
pip install stablebaseline
```

## Quick start

```python
from stablebaseline import StableBaseline

# Mint a key at app.stablebaseline.io/settings/mcp-keys
with StableBaseline(api_key="sta_xxx") as sb:
    orgs = sb.tools.listOrganisations()
    print(orgs)

    doc = sb.tools.createDocument(
        folderId="folder-uuid",
        title="Q4 architecture",
        cdmd="# Architecture\n\nThis document covers...",
    )
    print(f"Created {doc['friendlyId']} ({doc['id']})")

    search = sb.tools.kg_search(query="compliance posture", mode="global")
    print(search["entities"])
```

Or asynchronously:

```python
import asyncio
from stablebaseline import AsyncStableBaseline

async def main() -> None:
    async with AsyncStableBaseline(api_key="sta_xxx") as sb:
        orgs = await sb.tools.listOrganisations()
        print(orgs)

asyncio.run(main())
```

## Auth

```python
StableBaseline(api_key="sta_...")              # API key (mint at app.stablebaseline.io/settings/mcp-keys)
StableBaseline(access_token="...")             # OAuth 2.1 access token
StableBaseline()                               # picks up SB_API_KEY / SB_ACCESS_TOKEN from env
```

## Tool dispatch

Each method on `client.tools` corresponds to one of the [184 MCP tools](https://stablebaseline.io/docs/mcp/tools):

```python
sb.tools.listOrganisations()
sb.tools.getProjectHierarchy(projectId="...")
sb.tools.createDocument(folderId="...", title="X", cdmd="# ...")
sb.tools.editDocument(documentId="...", versionTimestamp=..., patches=[...])
sb.tools.kg_search(query="...", mode="global")
sb.tools.previewSubscriptionChange(...)
sb.tools.applySubscriptionChange(...)
```

For dynamic / discovered names, use the callable form:

```python
sb.tools("createDocument", {"folderId": "...", "title": "X", "cdmd": "# Hi"})
```

Or the lower-level `call_tool`:

```python
sb.call_tool("createDocument", {"folderId": "...", "title": "X", "cdmd": "# Hi"})
```

## Discover tools at runtime

```python
catalogue = sb.list_tools()
print(f"{catalogue['count']} tools across categories:")
cats = {t['category'] for t in catalogue['tools']}
print(sorted(cats))
```

## Errors

All non-2xx responses raise `StableBaselineToolError` with `status`, `code`, `message`, and optional `details`:

```python
from stablebaseline import StableBaseline, StableBaselineToolError

with StableBaseline(api_key="sta_xxx") as sb:
    try:
        sb.tools.deleteDocument(documentId="missing")
    except StableBaselineToolError as e:
        if e.status == 404:
            print("not found")
        elif e.code == "permission_denied":
            print("RBAC said no")
        else:
            raise
```

## Companion packages

| Surface | Package | Use case |
|---|---|---|
| **Python SDK** (this) | `stablebaseline` | Python apps, data work |
| **TypeScript SDK** | `@stablebaseline/sdk` | Node, browsers, Deno, Bun |
| **CLI** | `@stablebaseline/cli` (binary `sb`) | Shells, scripts, CI/CD |
| **MCP server** | `https://api.stablebaseline.io/functions/v1/cloud-serve/mcp` | AI agents (Claude Code, Cursor, Windsurf, ChatGPT, Gemini, …) |

All four share the same auth, same handlers, same data — see [github.com/stablebaseline/mcp](https://github.com/stablebaseline/mcp).

## License

MIT — see [LICENSE](../../LICENSE) at the repo root. The Stable Baseline product itself is proprietary SaaS at [stablebaseline.io](https://stablebaseline.io).
