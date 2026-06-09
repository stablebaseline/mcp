# Stable Baseline

Stable Baseline is an agent-managed company brain. It is a single, secure workspace where people and AI agents co-author living documents, build diagrams and infographics, design freeform whiteboards, run plans and tasks, and search a shared, self-updating knowledge graph.

This connector exposes the Stable Baseline Model Context Protocol (MCP) server so agents built in Copilot Studio and Microsoft 365 Copilot can use those tools directly. Tools are discovered dynamically from the live server, so new and updated tools appear automatically without a connector change.

## Publisher

Orixian Solutions Pty Ltd (trading as Stable Baseline), Mount Waverley, Victoria, Australia.

## Prerequisites

- A Stable Baseline account and organisation. Sign up at [app.stablebaseline.io](https://app.stablebaseline.io).
- A Stable Baseline MCP API key (it starts with `sta_`). Mint one at [app.stablebaseline.io/settings/mcp-keys](https://app.stablebaseline.io/settings/mcp-keys).

## How to get a connection

1. Sign in to Stable Baseline and open Settings, then MCP keys.
2. Create a key. Copy it straight away (it is shown once). Keys carry your workspace permissions, so treat them like a password.
3. When you create a connection for this connector, set the **Authorization (Bearer key)** field to the word `Bearer`, a space, then your key. For example: `Bearer sta_xxxxxxxxxxxx`.

The key is sent on every request in the standard `Authorization` header. You can revoke a key at any time from the same settings page.

## What you can do

The server exposes one streamable endpoint that surfaces the full tool catalogue. Tools are grouped by area:

- **Documents** create and edit living rich-text documents, find and replace text, and embed diagrams and images inline.
- **Diagrams** generate pixel-perfect diagrams from text across many families (sequence, state, ERD, flow, Gantt, ELK architecture, BPMN, and more) plus data-driven infographics, returned as PNG, JPEG, or SVG.
- **Whiteboards** create freeform boards from high-level specs, add stencils, sticky notes, architecture icons, and freehand drawings, or hand a goal to the multi-agent designer.
- **Plans and tasks** build structured plans, phases, tasks, dependencies, and assignees.
- **Improvements and risks** log and track improvements, risks, and follow-ups with categories, comments, and evidence.
- **Knowledge graph** every document, diagram, plan, and board feeds a shared company brain you can search semantically and traverse by entity, community, and backlink.
- **Workspace administration** manage organisations, workspaces, projects, folders, members, and permissions.

For the complete, always-current tool list and per-area guides, see [stablebaseline.io/docs/mcp](https://stablebaseline.io/docs/mcp).

## Authentication

API key sent as a bearer token in the `Authorization` header. Keys are scoped to the calling user's workspace permissions, so a connection can only do what that user can do. OAuth 2.1 is also supported by the underlying service and may be offered as an additional connection method in a later release.

## Throttling and limits

Usage is metered per organisation under the account's plan. Heavy generation tools (for example, the multi-agent whiteboard designer) consume credits. Standard fair-use rate limits apply; transient `429` responses should be retried with backoff.

## Known issues and limitations

- The server speaks streamable HTTP. Server-sent events are also available on the same endpoint for older clients.
- Long-running generation tools (whiteboard and infographic design) may take several seconds to return.
- Some administrative tools are hidden for specific host applications by policy and may not appear in every client.

## Support

- Documentation: [stablebaseline.io/docs/mcp](https://stablebaseline.io/docs/mcp)
- Contact: [stablebaseline.io/contact](https://stablebaseline.io/contact)
- Email: support@stablebaseline.io
- Terms: [stablebaseline.io/terms](https://stablebaseline.io/terms)
