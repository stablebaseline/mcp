# Copilot Cowork plugin

The Stable Baseline plugin for **Microsoft 365 Copilot Cowork**. This is a
different distribution path from [`../copilot-connector/`](../copilot-connector/):

| | `copilot-connector/` | `cowork-plugin/` (this folder) |
|---|---|---|
| Packaged as | Power Platform connector solution | Unified M365 app package (zip) |
| Submitted through | Partner Center → Connectors & Agents in Copilot Studio | Partner Center → Microsoft 365 and Copilot |
| Surfaces | Copilot Studio, Power Platform | Copilot Cowork |
| Tool surface | Curated (~70, a Copilot Studio connector limit) | **Full 196** |
| Adds | — | 9 **Agent Skills** that teach the model our workflows |

Both point at the same production MCP server:
`https://api.stablebaseline.io/functions/v1/cloud-serve/mcp`.

## What's here

| Path | Purpose |
|---|---|
| `manifest.json` | Unified M365 app manifest (schema **v1.28**). Declares `agentConnectors` (the MCP server + OAuth) and `agentSkills` (the nine skills below). |
| `skills/` | Nine Agent Skills, one `SKILL.md` each. These are instructions, not code — they tell the model which tools to reach for and in what order. |
| `color.png`, `outline.png` | Store icons (full-colour and monochrome outline). |
| `build-scripts/build-tools-json.mjs` | Generates `tools/stable-baseline-tools.json` from the **live** `tools/list`. |
| `build-scripts/validate-package.py` | 367 pre-submission checks: manifest schema, icon geometry, ASCII-only descriptions, skill/tool cross-references, package layout. |

### The skills

| Skill | Covers |
|---|---|
| `sb-find` | Locating artefacts and answering questions from content |
| `sb-author` | Writing and editing documents in CDMD |
| `sb-diagram` | Generating diagrams across 40+ DSL families |
| `sb-whiteboard` | Authoring Excalidraw boards |
| `sb-deck` | Branded deck generation |
| `sb-brand` | Brand kits |
| `sb-plan` | Plans, phases, tasks, dependencies |
| `sb-improve` | Improvements, risks and follow-ups |
| `sb-meeting` | The meeting scribe |

## `tools/stable-baseline-tools.json` is generated, not committed

The manifest's `mcpToolDescription.file` target is built from the live server, so
it cannot drift from what Cowork actually receives. It is **not** in this repo,
for the same reason `openapi.json` is not: a committed copy goes stale the moment
a tool schema changes, and a stale copy is worse than none because it looks
authoritative. Regenerate it before every build.

Two transforms are applied on top of the live response, and both are printed in
the build report so the divergence is never silent:

1. **ASCII-only.** Store validation rejects emoji, hidden characters and
   typographic punctuation in tool and parameter descriptions. Each emoji gets a
   hand-written plain-English replacement; punctuation is mapped to ASCII.
2. **`contentEncoding: "base64"`.** Cowork rewrites any top-level string
   parameter carrying that keyword into a workspace file path, resolves the bytes
   itself and re-injects the base64. Four parameters take file bytes and needed
   it declared.

## Build

```bash
# 1. Generate the tool file from the live server (no auth needed for tools/list)
node build-scripts/build-tools-json.mjs

# 2. Validate before zipping
python build-scripts/validate-package.py

# 3. Zip — everything must sit at the archive ROOT, not inside a folder
#    PowerShell:
Compress-Archive -Path manifest.json, color.png, outline.png, tools, skills `
  -DestinationPath stable-baseline-cowork.zip
#    POSIX:
zip -r stable-baseline-cowork.zip manifest.json color.png outline.png tools/ skills/
```

The zip is gitignored — it is a build output, rebuilt from these sources.

## Widget rendering

Cowork renders interactive UI widgets from the MCP server following the
[MCP Apps Extension (SEP-1865)](https://github.com/modelcontextprotocol/ext-apps).
**Nothing in this package configures that** — the unified manifest has no UI or
widget surface at any schema version. Widget behaviour is entirely server-side,
so a widget problem is never fixed by rebuilding this zip.

Two Cowork specifics worth knowing when debugging one, both from
[Microsoft's Cowork author guide](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/mcp-apps-support):

- Cowork implements **SEP-1865 only**. A resource that also carries the OpenAI
  Apps SDK keys (`openai/outputTemplate` and friends) is ambiguous, and a host
  that sniffs for those first will reject it.
- Of the sandbox CSP fields, Cowork applies **only `frameDomains`**;
  `connectDomains`, `resourceDomains` and `baseUriDomains` are documented as not
  applied. Copilot Chat is the inverse. Outbound fetches must route through a
  widget `tools/call`.

## Submission

Partner Center → **Microsoft 365 and Copilot** → the Cowork offer → Packages →
upload the zip. Reviewers need test credentials in the certification notes, and
the token store must be set to **Any Microsoft 365 Organization**.

For local testing, sideload with `atk install --file-path <zip> --scope Personal`,
or upload to the tenant catalogue and share with "Only you".

## References

- [MCP apps plugin author guide for Cowork](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/mcp-apps-support)
- [Build plugins for Copilot Cowork](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/cowork-plugin-development)
- [MCP apps in Microsoft 365 Copilot](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-mcp-apps)
- [Configure authentication for MCP and API plugins](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-authentication)
