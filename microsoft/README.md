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
| Connector package (this folder) | Ready |
| Offer created + submitted in Partner Center | Blocked on verification |

You cannot submit until business verification completes (typically a few business days). Everything else is ready to go.

## What's in `copilot-connector/`

| File | Purpose |
|---|---|
| `apiDefinition.swagger.json` | Swagger 2.0 definition. A single `POST /mcp` operation tagged `x-ms-agentic-protocol: mcp-streamable-1.0`. Copilot Studio discovers all tools dynamically from the live server. |
| `apiProperties.json` | Connection auth (API key as a bearer token), `iconBrandColor` (`#0B1220`), publisher metadata. |
| `intro.md` | Public documentation generated into Microsoft's docs and discovery surfaces. |
| `icon.png` | 200x200 connector icon. Solid brand navy, centred logo under 70%, no rounded edges. |
| `settings.json` | `paconn` settings (fill `connectorId` and `environment` at submission time). |

Production host only: `https://api.stablebaseline.io/functions/v1/cloud-serve/mcp`. Staging or dev hosts are not allowed.

## Eligibility checklist (verified publisher)

- [x] Microsoft Partner Center account
- [ ] Business verification complete  ← waiting on Microsoft
- [x] Enrolled in the Microsoft 365 and Copilot program
- [x] Own / control the MCP endpoint (`api.stablebaseline.io`)
- [x] Server supports an approved auth method (API key bearer token; OAuth 2.1 also available)

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

Microsoft tests each tool with credentials you supply. Prepare:

- A dedicated **test organisation** in Stable Baseline with sample content (a few documents, a diagram, a whiteboard, a plan).
- A **test MCP key** (`sta_...`) scoped to that org, minted at app.stablebaseline.io/settings/mcp-keys.
- A short note: enter the key in the connection as `Bearer sta_...`.

Use a throwaway test org and rotate or revoke the key after certification. Do not submit a key tied to real customer data.

## Optional: EVAL evidence (speeds up review)

Including evaluation evidence is not mandatory but can significantly expedite review. Prepare a short pack showing each tool returning a valid response for normal, edge-case, and adversarial inputs (for example, transcripts or screenshots from a Copilot Studio test agent that connected to the live server).

## Authentication notes

The connector authenticates with an **API key sent as a bearer token** in the `Authorization` header. The connection field expects the full header value, for example `Bearer sta_...`. Keys carry the calling user's workspace permissions, so a connection can only do what that user can do (least privilege).

OAuth 2.1 is supported by the underlying service (authorize at `app.stablebaseline.io/oauth/authorize`, token at `api.stablebaseline.io/oauth/token`). If we later offer OAuth as the connection method, we must register a multitenant app and provide client id/secret at submission, and renew those credentials at least one month before they expire.

## After certification

- Keep the live server aligned with the certified definition. Resubmit when adding new tools or making significant changes.
- Keep `intro.md` accurate and monitor telemetry and service health.
- Respond promptly to support or compliance issues. Microsoft monitors certified servers and can take corrective action.

## References

- [Microsoft MCP server certification](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-certification)
- [Prepare connector files for certification](https://learn.microsoft.com/en-us/connectors/custom-connectors/certification-submission)
- [Verified publisher certification process](https://learn.microsoft.com/en-us/connectors/custom-connectors/submit-for-certification)
- [Extend an agent with MCP](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp)
