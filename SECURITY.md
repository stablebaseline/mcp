# Security Policy

We take the security of Stable Baseline and the packages distributed from this repo seriously. Thank you for helping keep the ecosystem safe.

## Supported versions

The latest published `0.x.y` of each package is supported. Older versions are not patched — please upgrade.

| Package | Latest | Supported |
|---|---|---|
| `@stablebaseline/sdk` | 0.1.x | Yes |
| `@stablebaseline/cli` | 0.1.x | Yes |
| `stablebaseline` (PyPI) | 0.1.x | Yes |

## Reporting a vulnerability

**Do not open public issues for security reports.** They are visible to everyone the moment you submit them.

Two private channels:

1. **GitHub private vulnerability reporting** — preferred. Visit the [Security tab](https://github.com/stablebaseline/mcp/security/advisories/new) of this repo and create a new draft advisory. We get notified and can collaborate on a fix and a coordinated disclosure timeline in a private thread.

2. **Email** — `security@stablebaseline.io`. Use this if you cannot use GitHub. Include:
   - A description of the vulnerability and its impact
   - Steps to reproduce
   - Affected packages and versions
   - Your name / handle if you want credit, or "anonymous" if you don't

## What to expect from us

| When | What |
|---|---|
| Within 48 hours | Acknowledgement that we received your report. |
| Within 5 working days | Initial assessment: severity rating, whether we can reproduce, rough fix timeline. |
| When fixed | Coordinated release. We'll cut a patched version, publish via OIDC Trusted Publishing, and credit you in the release notes (unless you've asked to remain anonymous). |
| Public disclosure | After the patched version is live and customers have had a reasonable window to upgrade — typically 7-30 days depending on severity, sooner if exploitation is observed in the wild. |

## What's in scope

- The published packages (`@stablebaseline/sdk`, `@stablebaseline/cli`, `stablebaseline` on PyPI) — vulnerabilities in the SDK code, CLI argument handling, credential storage, etc.
- The MCP discovery surface at `https://stablebaseline.io/.well-known/mcp.json`.
- The REST API at `https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1/*` — auth bypasses, data leaks across organisations, RLS gaps, rate-limit failures.
- The MCP endpoint at `https://api.stablebaseline.io/functions/v1/cloud-serve/mcp`.
- The OAuth flow under `/oauth/*`.

## What's out of scope

- Issues affecting third-party MCP clients (Claude Desktop, Cursor, Windsurf, etc.) — please report to the client's vendor instead.
- Self-inflicted issues (e.g. running an old version, misconfiguring auth, exposing your own API key in a public repo).
- The marketing website at `https://stablebaseline.io` — has its own [security.txt](https://stablebaseline.io/.well-known/security.txt) and reporting flow.
- Theoretical attacks that require already-compromised credentials or physical access to the user's device.
- Findings in dependencies that are already known to upstream — we run Dependabot and patch on the upstream cadence.

## Coordinated disclosure principles

- We will not threaten or take legal action against good-faith researchers who follow this policy.
- Please give us reasonable time to fix before public disclosure.
- Do not access, modify, or destroy data that isn't yours during testing. Use the test instance at `app.stablebaseline.io` with throwaway accounts.
- Do not run high-volume scans that affect availability for other users.

## Hall of fame

Reporters who identify valid vulnerabilities will be credited here (with permission) once the issue is resolved.

_(empty so far — be the first.)_
