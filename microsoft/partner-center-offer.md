# Partner Center offer — paste-ready pack

Everything needed to create and submit the **Connectors & Agents in Microsoft Copilot Studio** offer, mapped 1:1 to the Partner Center form. Source of truth for the form fields: [Verified publisher certification process](https://learn.microsoft.com/en-us/connectors/custom-connectors/submit-for-certification).

**Gate:** business verification must show **Accepted** first. Check at [Account settings → Legal info](https://partner.microsoft.com/dashboard/account/v3/organization/legalinfo) → **Developer** tab (covers the Microsoft 365 and Copilot program). Typically 3 to 5 business days.

---

## 1. Create the offer

[Partner Center](https://partner.microsoft.com/dashboard/home) (sign in as `Vineet@orixian.com.au`) → **Marketplace offers** → **Microsoft 365 and Copilot** → **New offer** → **Connectors & Agents in Microsoft Copilot Studio**.

| Field | Value |
|---|---|
| **Name** (internal, identifies the offer in Partner Center) | `Stable Baseline (MCP connector)` |

**Product setup** tab: nothing to enter; it auto-completes.

Note: this offer type has **no listing description or screenshot fields**. The public listing and Microsoft Learn docs page are generated from the package itself: `intro.md` + the swagger `info.description` / `x-ms-connector-metadata`.

## 2. Packages tab

| Field | Value |
|---|---|
| **SAS URI** | **Mint at submission time and never store a live SAS anywhere in this repo, which is public.** Upload the connector zip to the release storage account, mint a short-lived read-only SAS, and paste the freshly minted URL straight into Partner Center. The account name, container and command are in the internal runbook, not here. |
| **Client ID** | `ee6bb6b0-05e1-484c-a922-c3499f473635` |
| **Client Secret** | the secret for that OAuth client (created in Stable Baseline → Settings → MCP Setup → OAuth Clients; held in the password manager — never in this repo) |

Then **Save draft**.

The package at that SAS URI passed Microsoft's `ConnectorPackageValidator.ps1` ("Validation successful") and Solution Checker (0 findings at every severity). Structure: `intro.md` + `StableBaselineConnector.pdpkg.zip` → `PkgAssets/` → connector solution + flow solution.

**Partner Center's live checker (verified empirically 2026-06-12, by iterating package shapes against the Save-draft validation):**

- It downloads the SAS package on every save and validates it; errors surface as a red banner (and the underlying `PUT …/packagesets/…` API call 400s — watch the network tab if the banner is unclear).
- Required shape = exactly the validator shape: outer zip → `intro.md` + **exactly one** "solution package" zip at root → `PkgAssets/` → solution zips. ("Solution package not found at root" = solutions placed at the wrong depth; "Only one solution package zip should be present at the root" = both solution zips placed flat; "'PkgAssets' folder missing" = bare Dataverse solution zip used.)
- **The connector solution must contain ONLY the intended connector.** The checker appears to read the first connector folder alphabetically; a stray duplicate with empty `connectionparameters` (`{}`) produced *"Looks like this is not an OAuth connector. Kindly uncheck the box to proceed further."* A duplicate "Stable Baseline - 1" had been accidentally created in the maker portal (Create vs Update misclick) and silently joined the solution. Fix: `RemoveSolutionComponent` (Web API; note the quirky shape `{"SolutionComponent":{"solutioncomponentid":"<connector id>","@odata.type":"Microsoft.Dynamics.CRM.solutioncomponent"},"ComponentType":372,"SolutionUniqueName":…}`) → re-export → re-upload.
- Paste hygiene: a single leading space in the SAS URI field fails the whole save with a generic `InvalidArgument` (fault 41601) and **no UI error**. Trim before pasting.
- On success the Packages tab shows **Status: Complete** and Review-and-submit shows "Payload processing status: Completed".

## 3. Properties tab

| Field | Value |
|---|---|
| **Categories** (max 3) | `Productivity`, `Collaboration`, `Content and Files` (if the third is not in the dropdown, leave two; they must align with the swagger `x-ms-connector-metadata` categories `Productivity;Collaboration`) |
| **EULA** | tick **Standard Contract** (Microsoft commercial marketplace Standard Contract; recommended by the doc). Alternative if a custom EULA is preferred: `https://stablebaseline.io/terms` |
| **Privacy policy link** | `https://stablebaseline.io/privacy` |
| **Support document link** | `https://stablebaseline.io/contact` (docs at `https://stablebaseline.io/docs/mcp`) |

All URLs verified live (HTTP 200). Then **Save**.

## 4. Availability tab

- **HideKey: leave empty** (public availability). A HideKey also suppresses the generated Microsoft Learn reference docs, which we want published.
- **Review and publish** → notification audience: `vineet@orixian.com.au` → when every tab shows Complete, **Publish**.

## 5. Reviewer handoff (when Microsoft asks, via Partner Center)

Paste-ready note:

> This connector uses OAuth 2.0, so there is no key to paste. Choose Create connection, sign in with the test account below, and approve the consent screen. The connector exposes a single MCP endpoint (`InvokeServer`, protocol `mcp-streamable-1.0`); tools are discovered dynamically by Copilot Studio. A simple smoke test without MCP session handling: POST body `{"jsonrpc":"2.0","id":1,"method":"tools/list"}` returns the full tool catalogue.

Test account: create a fresh user in a **throwaway Stable Baseline organisation** seeded with the Northwind Robotics demo dataset (DOC-2666 handbook, WBD-105 whiteboard, PLN-3 plan with phases/tasks, IMP-155 improvement; replication steps in `eval-evidence.md` section 3). Do not hand reviewers an org with real data. Disable the account after certification.

Optional accelerator: attach `eval-evidence.md` (live transcripts of every tool area plus safe-failure and tenant-isolation evidence).

## 6. Compliance check (verified 2026-06-11)

| Requirement | Status |
|---|---|
| Title: English, unique, ≤30 chars, no banned words (API/Connector/product names) | `Stable Baseline` (15 chars) ✓ |
| Description: 30 to 500 chars, English, no Microsoft product names | 283 chars ✓ |
| Icon: 1:1, 100 to 230 px, non-transparent, not #ffffff/#007ee5 bg, logo <70%, PNG | 200×200, #0B1220, glyph ~64% ✓ |
| `iconBrandColor` valid hex, not white/default | `#0B1220` ✓ |
| Operation summary ≤80 chars, description a full sentence with punctuation | "Invoke the Stable Baseline MCP server" (37) ✓ |
| Response schema | object schema present; MCP responses are the documented dynamic-schema special case ✓ |
| `x-ms-connector-metadata` (Website, Privacy policy, Categories) | present ✓ |
| Production host only | `api.stablebaseline.io` ✓ |
| No secrets in package | 0 occurrences ✓ |
| Solution Checker | 0 critical / 0 high / 0 medium / 0 low ✓ |
| `ConnectorPackageValidator.ps1` | Validation successful ✓ |
| Open-source requirement | connector files public at [github.com/stablebaseline/mcp](https://github.com/stablebaseline/mcp); Microsoft mirrors artifacts to PowerPlatformConnectors with us in CODEOWNERS |
| Live OAuth connection test | Create connection → consent → `tools/list` 200 ✓ (2026-06-11, env b8a7de26) |

## 7. After submitting

1. **24 to 48 h**: automated validation; certification report appears in **Product overview**. Fix and resubmit if flagged.
2. **Preview environment**: a test link appears under **Publisher signoff**; it is live for only **48 business hours**. Test the connector there, then press **Go live**.
3. **Deployment**: Fridays PT; **10 to 14 days** to reach all regions (order: Testing → US preview → Asia → Europe → Brazil/Canada/Japan/India → Australia/UK/US). Ships at the **Premium tier** (cannot be changed).
4. New connectors carry a **preview** tag; request GA after it has been public a while and meets the bar.

## 8. Maintenance commitments

- **Client secret rotation**: the id/secret entered in Partner Center are baked into the certified connector for ALL users. Never rotate the secret server-side alone; mint the new secret and submit a connector update **at least one month before** any planned expiry or rotation, then swap server-side when Microsoft deploys it.
- Keep the live MCP server compatible with the certified swagger; submit an update for significant changes.
- Keep `intro.md` accurate; respond promptly to Partner Center compliance contacts.
- Office hours for certification queries: Tuesdays 3:30 to 4:30 PM UTC (Teams link in the [prepare-files doc](https://learn.microsoft.com/en-us/connectors/custom-connectors/certification-submission)).
