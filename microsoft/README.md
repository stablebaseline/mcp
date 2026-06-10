# Microsoft distribution

This folder holds everything needed to get the Stable Baseline MCP server **certified and published** through Microsoft, so it appears as a connector and agent tool across Copilot Studio, Microsoft 365 Copilot, and Power Platform.

Microsoft certifies MCP servers through the **connector certification program**: an MCP server is packaged and submitted like a Power Platform connector, then reviewed for security, reliability, compliance, and responsible AI.

## Status

| Step | State |
|---|---|
| Partner Center work account (`Vineet@orixian.com.au`) | Done |
| Enrolled in **Microsoft 365 & Copilot** program | Done |
| Publisher added | Done |
| Business verification (required for "verified publisher") | **Pending with Microsoft** (gates submission) |
| Connector package (this folder) | Ready (OAuth 2.0) |
| Connector **solution.zip** built | Done — connector `sb_stablebaseline` (clean prefix), exported from env, staged on Azure blob with a read SAS (see "Build the connector solution") |
| OAuth client for Power Platform (in Stable Baseline) | Done — confidential client `ee6bb6b0-…`; both shared + connector-unique (`…/redirect/sb-5f…`) redirect URIs allowlisted and verified |
| PKCE for non-PKCE connectors | Done — cloud-serve injects PKCE for confidential clients that omit it (Power Platform can't send it; GoTrue requires it). See "Authentication notes". |
| **Live connection test in Power Platform** | **Done — `Create connection` signs in/consents, `InvokeServer` (`tools/list`) returns `200` with the tool catalogue.** OAuth path proven end to end. |
| Evaluation evidence pack | Ready (`eval-evidence.md`) |
| Reviewer demo dataset | Seeded (Northwind Robotics; see `eval-evidence.md` section 3) |
| Offer created + submitted in Partner Center | Blocked on verification |

You cannot submit until business verification completes (typically a few business days). Everything else is ready to go.

## What's in `copilot-connector/`

| File | Purpose |
|---|---|
| `apiDefinition.swagger.json` | Swagger 2.0 definition. A single `POST /mcp` operation tagged `x-ms-agentic-protocol: mcp-streamable-1.0`. Copilot Studio discovers all tools dynamically from the live server. |
| `apiProperties.json` | Connection auth (**OAuth 2.0**, Generic `oauth2` identity provider — authorize/token/refresh URLs, scopes, `clientId` placeholder), `iconBrandColor` (`#0B1220`), publisher metadata. The client **secret is never committed** — it is entered in the maker portal / Partner Center. |
| `intro.md` | Public documentation generated into Microsoft's docs and discovery surfaces. |
| `icon.png` | 200x200 connector icon. Solid brand navy, centred logo under 70%, no rounded edges. |
| `settings.json` | `paconn` settings (fill `connectorId` and `environment` at submission time). |

Production host only: `https://api.stablebaseline.io/functions/v1/cloud-serve/mcp`. Staging or dev hosts are not allowed.

## Eligibility checklist (verified publisher)

- [x] Microsoft Partner Center account
- [ ] Business verification complete  ← waiting on Microsoft
- [x] Enrolled in the Microsoft 365 and Copilot program
- [x] Own / control the MCP endpoint (`api.stablebaseline.io`)
- [x] Server supports an approved auth method (**OAuth 2.0** chosen for this connector; API key also available)
- [x] OAuth client registered in Stable Baseline with Power Platform's redirect URI allowlisted (both the shared `…/redirect` and the connector-unique `…/redirect/sb-5fstable-20baseline-5f331acd82b125f090`)

## Build the connector solution (pac CLI)

The verified-publisher path submits the connector as a Dataverse **solution**, not the raw files. We build it with the Power Platform CLI (`pac`, installed via the MSI — the dotnet-tool install is broken under .NET 9). A dedicated Power Platform environment holds the build so it never touches production data: **Stable Baseline Connector** (`b8a7de26-3019-ef14-83e0-e3e18aeb71c5`, Dataverse `org3754fa67.crm6.dynamics.com`).

```bash
PAC=...PowerAppsCLI/.../pac.exe
SRC=sb-mcp-repo/microsoft/copilot-connector
ENV=b8a7de26-3019-ef14-83e0-e3e18aeb71c5

# 1. auth once (interactive, work account)
"$PAC" auth create --environment $ENV          # profile "sbconn", vineet@orixian.com.au

# 2. one clean publisher: the env default publisher, renamed to "Stable Baseline" / prefix "sb"
#    (changed via Dataverse Web API PATCH on the publisher row; uniquename stays
#     DefaultPublisherorg3754fa67 but friendlyname/prefix are nice). Scaffold + import an empty
#     unmanaged solution owned by it:
"$PAC" solution init --publisher-name DefaultPublisherorg3754fa67 --publisher-prefix sb --outputDirectory <proj>
"$PAC" solution pack   --zipfile <empty.zip> --folder <proj>/src --packagetype Unmanaged
"$PAC" solution import --path <empty.zip> --environment $ENV --publish-changes

# 3. create the connector INTO the solution with an explicit sb_ name via the Dataverse Web API
#    POST {org}/api/data/v9.2/connectors  (header: MSCRM.SolutionUniqueName=StableBaselineConnector)
#    fields: name=sb_stablebaseline, displayname="Stable Baseline", connectortype=1,
#            introducedversion="1.0", iconbrandcolor, iconblob(base64 PNG),
#            openapidefinition(swagger string), connectionparameters(JSON string).
#    ⚠ pac connector create has NO name/prefix flag and ALWAYS emits new_<name> regardless of the
#      solution's or environment's publisher (verified). Only the maker portal or the Web API can
#      set a real publisher prefix on a connector. Bearer token: az account get-access-token
#      --resource {org}.

# 4. export the populated solution → this is the artifact we submit
"$PAC" solution export --environment $ENV --name StableBaselineConnector --path <solution.zip> --overwrite
```

Result (built 2026-06-10):

- Connector id in env: `7e63cd89-c164-f111-a826-000d3ad14fdf`, logical name **`sb_stablebaseline`** (internalid `shared_sb-5fstable-20baseline-5f331acd82b125f090`). No `new_`.
- `solution.zip` contains `Connector/sb_stablebaseline_openapidefinition.json` (with `x-ms-agentic-protocol: mcp-streamable-1.0`, host `api.stablebaseline.io`), `…_connectionparameters.json` (OAuth, `clientId` present, **0 secret occurrences**), `…_iconblob.Png`, and `solution.xml` (`RootComponent type="372"` = Connector). Verified valid.
- **Redirect (resolved):** the env forces `redirectMode: GlobalPerConnector` and generated the unique redirect `https://global.consent.azure-apim.net/redirect/sb-5fstable-20baseline-5f331acd82b125f090`. That URL is allowlisted on OAuth client `ee6bb6b0-…` (alongside the shared `…/redirect`). A live GET to `/oauth/authorize` confirms the server accepts the client + this redirect and rejects bogus redirects.
- **Staged for Partner Center:** uploaded to Azure blob `clouddocskgstg779102` / container `copilot-connector` / `StableBaselineConnector.zip`. Regenerate the read SAS (≥15 days) at submission time:
  ```bash
  az storage blob generate-sas --account-name clouddocskgstg779102 --container-name copilot-connector \
    --name StableBaselineConnector.zip --permissions r --https-only --full-uri \
    --expiry $(date -u -d "+180 days" '+%Y-%m-%dT%H:%MZ') \
    --account-key "$(az storage account keys list -n clouddocskgstg779102 -g clouddocs-kg-rg --query '[0].value' -o tsv)"
  ```

To rebuild after changing any file in `copilot-connector/`: re-run step 3 with `pac connector update` (or delete + recreate), then step 4. The OAuth **client secret is never in the solution** — it is entered in Partner Center for the offer.

## Submission steps (once verified)

1. Sign in to [Partner Center](https://partner.microsoft.com/dashboard/home) as `Vineet@orixian.com.au`.
2. Open the **New offer** dropdown and choose the **Connectors and Agents for Microsoft Copilot Studio** category.
3. Provide offer metadata, legal and support info, and logos.
4. Package and upload the connector files in `copilot-connector/`:
   - Validate the package structure with Microsoft's `ConnectorPackageValidator.ps1`.
   - Upload the zip to a storage blob and generate a SAS URL valid for at least 15 days.
   - Submit the SAS URL in Partner Center.
5. Supply **test credentials** so reviewers can validate every tool (see below).
6. Submit. Microsoft runs automated validation, a manual review that tests each tool, and a responsible AI evaluation, then deploys across regions.

## Test credentials to provide reviewers

This connector uses OAuth, so reviewers **sign in** rather than paste a key. Supply:

- The OAuth **client id and client secret** (entered in Partner Center for the offer; the secret is shown once when the client is created in Stable Baseline — store it in a password manager).
- A dedicated **test account** in a throwaway Stable Baseline organisation with sample content (a few documents, a diagram, a whiteboard, a plan), so reviewers can sign in and exercise the tools.
- A short note: choose **Create connection**, sign in with the test account, and authorise.

Use a throwaway org and rotate the client secret / disable the test account after certification. Do not point reviewers at an org with real customer data.

## EVAL evidence (prepared)

Including evaluation evidence is not mandatory but can significantly expedite review. The pack is ready: see [`eval-evidence.md`](./eval-evidence.md). It contains real transcripts from live calls against the production endpoint covering documents, whiteboards, diagrams, plans/tasks, improvements, and knowledge-graph retrieval, plus five safe-failure modes (input validation, no-leak not-found, tenant isolation, least-privilege capability gating, auth required), attribution/telemetry, and prompt-injection-as-data handling. Rendered demo output is in [`eval-assets/`](./eval-assets/).

A fictional demo dataset (Northwind Robotics) was seeded for review: DOC-2666 (handbook), WBD-105 (onboarding-flow whiteboard), PLN-3 → PHA-1 → TAS-156 + TAS-157 (plan/phase/tasks), IMP-155 (improvement). For the live reviewer handoff, replicate it in a throwaway org per `eval-evidence.md` section 3.

## Authentication notes — OAuth 2.0 (chosen method)

The connector uses the OAuth 2.0 authorization-code flow against Stable Baseline's own OAuth server. Each user signs in and consents; the token is scoped to that user's workspace permissions (least privilege). The underlying service also supports API keys (`sta_` bearer tokens) for clients that cannot do OAuth.

Connector OAuth config (Generic `oauth2` identity provider):

| Field | Value |
|---|---|
| Authorization URL | `https://api.stablebaseline.io/functions/v1/cloud-serve/oauth/authorize` |
| Token URL | `https://api.stablebaseline.io/functions/v1/cloud-serve/oauth/token` |
| Refresh URL | `https://api.stablebaseline.io/functions/v1/cloud-serve/oauth/token` |
| Scopes | `openid profile email` |
| Client ID / Secret | from the **Microsoft Copilot Studio** OAuth client registered in Stable Baseline (Settings → MCP Setup → OAuth Clients) |

Gotchas (from Microsoft's connector docs):

- **The client secret stays out of the solution.** We build with `pac connector create` (no secret arg); the exported `solution.zip` carries the `clientId` but no secret. The secret is entered in Partner Center for the offer. (If you ever build in the maker portal instead, put the secret in an environment variable so it is not silently dropped on export.)
- **The redirect URL is generated by the connector** (Security tab). Whatever it shows must be allowlisted on the Stable Baseline OAuth client. Our env produced a *unique* redirect (`GlobalPerConnector`): `https://global.consent.azure-apim.net/redirect/sb-5fstable-20baseline-5f331acd82b125f090` — **now allowlisted** on client `ee6bb6b0-…` alongside the shared `https://global.consent.azure-apim.net/redirect`. If a rebuild changes the connector logical name, the unique redirect changes too — re-allowlist it.
- **PKCE (resolved in cloud-serve).** Supabase GoTrue (OAuth 2.1) mandates PKCE, but Power Platform's generic OAuth2 connector does NOT send `code_challenge`/`code_verifier`, so consent failed with *"PKCE flow requires both code_challenge and code_challenge_method"*. cloud-serve (which proxies `/oauth/authorize` + `/oauth/token`) now **injects a PKCE pair for confidential clients that omit it**: a `code_challenge` at authorize, the matching `code_verifier` at token (gated on the presence of a `client_secret`). The verifier is derived from the existing signing-key secret, so it stays secret with no new env var. Public clients (ChatGPT/Claude/Cursor) send their own PKCE and are untouched. Implemented in `supabase/functions/cloud-serve/{oauth.ts:getProxyPkce, index.ts}`.
- The OAuth client is currently registered under the **Orixian** org. Before GA, verify a maker in another customer's tenant can consent against *their own* Stable Baseline org through the same client.

## After certification

- Keep the live server aligned with the certified definition. Resubmit when adding new tools or making significant changes.
- Keep `intro.md` accurate and monitor telemetry and service health.
- Respond promptly to support or compliance issues. Microsoft monitors certified servers and can take corrective action.

## References

- [Microsoft MCP server certification](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-certification)
- [Prepare connector files for certification](https://learn.microsoft.com/en-us/connectors/custom-connectors/certification-submission)
- [Verified publisher certification process](https://learn.microsoft.com/en-us/connectors/custom-connectors/submit-for-certification)
- [Extend an agent with MCP](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp)
- [Connect your agent to an existing MCP server (OAuth + redirect)](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)
- [Specify connection parameters (Generic OAuth 2.0)](https://learn.microsoft.com/en-us/connectors/custom-connectors/connection-parameters)
- [Configure authentication for MCP and API plugins in Microsoft 365 Copilot](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-authentication)
