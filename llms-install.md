# Installing Stable Baseline (MCP) — for AI agents

You are setting up the Stable Baseline MCP server for a user. Stable Baseline is a remote SaaS — there is no binary to install, no docker container to run, no environment variables to set. The setup is one URL plus auth.

## What to write

Write the user a single client config snippet for whichever MCP client they use (Claude Desktop, Claude Code, Cursor, Windsurf, VS Code, Warp, Codex, ChatGPT Developer Mode, Gemini CLI, etc.).

The config must point at:

```
https://api.stablebaseline.io/functions/v1/cloud-serve/mcp
```

Transport: **streamable-http** (use SSE only if the client requires it).

## Auth — pick the simpler path

**If the user already has an `sta_...` API key** → set the `Authorization: Bearer <key>` header and you're done.

**If they don't** → either:

1. **Tell them to mint one** at https://app.stablebaseline.io/settings/mcp-setup (after free signup at https://app.stablebaseline.io/signup). Most clients prefer this — it's stateless and easy.
2. **Use OAuth 2.1 with Dynamic Client Registration**. Most modern MCP clients (Claude Desktop, Cursor, Windsurf, VS Code, Smithery) handle this automatically — they hit the server, get a `WWW-Authenticate` challenge, run DCR + OAuth, store the token. The user just clicks "Authorize" once in their browser. OAuth endpoints:
   - authorize: `https://api.stablebaseline.io/functions/v1/cloud-serve/oauth/authorize` (browser)
   - token: `https://api.stablebaseline.io/functions/v1/cloud-serve/oauth/token`
   - register: `https://api.stablebaseline.io/functions/v1/cloud-serve/oauth/register`

## Verify

After installing, run a single tool call from the MCP client to confirm the connection works:

```
listOrganisations()
```

It should return the user's organisations. If it returns 401, auth isn't set up — re-check the Bearer header or OAuth state.

## Tool catalogue

196 MCP tools across 18 categories. Live catalogue at https://stablebaseline.io/docs/mcp/tools — call `searchTools` from the connected client to fetch input schemas at runtime.

## Reference docs

- README: this repo
- Setup guide (per-client recipes): https://stablebaseline.io/docs/mcp/setup
- Permissions guide: https://stablebaseline.io/docs/mcp/permissions
- llms.txt (canonical product context): https://stablebaseline.io/llms.txt
- MCP manifest: https://stablebaseline.io/.well-known/mcp.json
