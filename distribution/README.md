# Distribution

Templates and CI workflows that publish the public-facing surfaces of Stable Baseline (CLI binaries, npm packages, PyPI package, OS package managers).

## Triggering a release

Tags drive everything. Push a tag with the right prefix and the matching workflow takes over:

| Tag pattern | Workflow | What ships |
|---|---|---|
| `cli-vX.Y.Z` | `release-cli.yml` | `sb` binaries (linux-x64, macos-x64, macos-arm64, windows-x64) and `checksums.txt` → GitHub Release. `@stablebaseline/cli` → npm (Trusted Publishing via OIDC, with provenance). |
| `sdk-ts-vX.Y.Z` | `release-sdk-ts.yml` | `@stablebaseline/sdk` → npm (Trusted Publishing via OIDC, with provenance). Refreshes OpenAPI types from production. |
| `sdk-py-vX.Y.Z` | `release-sdk-python.yml` | `stablebaseline` → PyPI (Trusted Publishing via OIDC; no token secret). |

```bash
# Bump versions in the relevant package.json / pyproject.toml first.
git tag cli-v0.1.0      && git push origin cli-v0.1.0
git tag sdk-ts-v0.1.0   && git push origin sdk-ts-v0.1.0
git tag sdk-py-v0.1.0   && git push origin sdk-py-v0.1.0
```

## Required secrets / settings

| Secret | Where | Used by |
|---|---|---|
| npm Trusted Publisher | npmjs.com → each package → Access → Trusted Publishers, bound to `stablebaseline/mcp` and the workflow file | `release-cli.yml`, `release-sdk-ts.yml`. No token secret: each publish uses a short-lived OIDC token. |
| `pypi` environment + Trusted Publisher | Repo → Settings → Environments → `pypi`, plus pypi.org → Manage → Publishing | `release-sdk-python.yml`. No long-lived token needed. |
| Homebrew tap PAT (optional) | Repo → Settings → Secrets → Actions → `HOMEBREW_TAP_TOKEN` | Future workflow that pushes the rendered formula to `stablebaseline/homebrew-tap`. |

## OS package managers

### Homebrew

The formula lives in this repo as a template at [`distribution/homebrew/sb.rb.template`](./homebrew/sb.rb.template). Not live yet: the tap repo `github.com/stablebaseline/homebrew-tap` does not exist, and no workflow renders the template. The plan is for the CLI release workflow to fill the SHA256 + version placeholders from the release's `checksums.txt` and commit the rendered `Formula/sb.rb` to that tap, after which users install with:

```bash
brew install stablebaseline/tap/sb
```

### winget

The manifest set lives in this repo as a template at [`distribution/winget/stablebaseline.sb.yaml.template`](./winget/stablebaseline.sb.yaml.template). Not live yet: the package is not in [`microsoft/winget-pkgs`](https://github.com/microsoft/winget-pkgs), and no workflow renders the template. The plan is for the CLI release workflow to fill the placeholders and open a PR there, after which users install with:

```cmd
winget install Stablebaseline.Sb
```

### apt / rpm (later)

Once we have predictable release cadence we'll add Debian/Red Hat package workflows. Until then, Linux users can either:

- Install via npm (`npm i -g @stablebaseline/cli`)
- Download the `sb-linux-x64.tar.gz` binary from the GitHub Release and drop `sb` on `$PATH`.

## Local testing of distribution paths

```bash
# Build a single-file binary locally (requires Bun)
cd packages/cli
bun build --compile --target=bun-linux-x64 --outfile=sb ./src/bin/sb.ts
./sb --version

# Pretend-publish the npm packages
cd packages/sdk-typescript && npm pack --dry-run
cd packages/cli            && npm pack --dry-run
```
