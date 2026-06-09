# Stable Baseline

Stable Baseline is an agent-managed company brain. It is a single, secure workspace where people and AI agents co-author living documents, build diagrams and infographics, design freeform whiteboards, run plans and tasks, and search a shared, self-updating knowledge graph.

This connector exposes the Stable Baseline Model Context Protocol (MCP) server so agents built in Copilot Studio and Microsoft 365 Copilot can use those tools directly. Tools are discovered dynamically from the live server, so new and updated tools appear automatically without a connector change.

## Publisher

Orixian Solutions Pty Ltd (trading as Stable Baseline), Mount Waverley, Victoria, Australia.

## Prerequisites

- A Stable Baseline account and organisation. Sign up at [app.stablebaseline.io](https://app.stablebaseline.io).

## How to get a connection

This connector uses **OAuth 2.0**, so there is no key to copy or paste:

1. Add the connector and choose **Create connection**.
2. You are redirected to Stable Baseline to sign in and authorise the connection.
3. After you approve, the connection is ready. The connector receives an access token scoped to your own workspace permissions. You can revoke access at any time from Settings, then OAuth Clients in Stable Baseline.

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

OAuth 2.0 authorization-code flow. Each user signs in to Stable Baseline and consents; the resulting token is scoped to that user's own workspace permissions, so a connection can only do what that user can do. The underlying service also supports API keys (bearer `sta_` tokens) for clients that cannot use OAuth.

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
