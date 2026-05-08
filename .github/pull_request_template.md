<!-- One-line title above. Keep PR titles short; use this template for the body. -->

## Summary

<!-- 1-3 sentences. What does this change and why. -->

## Surfaces touched

<!-- Tick what applies. -->

- [ ] `@stablebaseline/sdk` (TypeScript)
- [ ] `@stablebaseline/cli` (`sb` binary)
- [ ] `stablebaseline` (Python SDK)
- [ ] CI / release workflows
- [ ] Discovery / registry surfaces (`.well-known/mcp.json`, `registry/server.json`, README)
- [ ] Documentation only

## Tests

<!-- How was this verified? -->

- [ ] `npm test` passes for affected packages
- [ ] `npm run check:surfaces` passes (no consistency drift)
- [ ] If a new tool was added in cloud-serve, the OpenAPI was regenerated
- [ ] N/A — docs / metadata only

## Security checklist

- [ ] No new long-lived secrets introduced (we use OIDC Trusted Publishing — no `NPM_TOKEN`/`PYPI_TOKEN`)
- [ ] No new GitHub Actions added without pinning to a commit SHA
- [ ] No `pull_request_target` triggers added (most dangerous — auto-rejected)
- [ ] If touching workflow `permissions:`, scope is least-privilege per job
- [ ] If adding a dependency: it's audit-clean (`npm audit` / `pip-audit`) and not maintainer-changed recently

## Breaking changes

<!-- "None" if non-breaking. Otherwise: what breaks, who needs to migrate, how. -->

## Related

<!-- Link to issue, doc, or upstream change if any. -->
