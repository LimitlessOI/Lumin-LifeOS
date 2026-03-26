# AMENDMENT 18 — ClientCare Billing Recovery
**Status:** BUILDING
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-26

---

## WHAT THIS IS
A billing-recovery and revenue-cycle operating system built around ClientCare West. It assumes **no public API** is available unless ClientCare proves otherwise, and it supports two execution paths:

1. **Preferred path:** private/vendor-issued API or export feed from ClientCare.
2. **Fallback path:** browser-assisted operations against our own ClientCare account, with exports/imports and human approval gates.

The immediate mission is not generic billing software. It is to **rescue unpaid claims already earned**, prevent additional claims from aging out, and give Sherry a controlled work queue with clear next actions.

---

## REVENUE MODEL
| Lane | Revenue Effect |
|------|----------------|
| Claims rescue | Recover already-earned revenue sitting unbilled / rejected / denied |
| Ongoing billing ops | Reduce leakage, speed submission, reduce aged A/R |
| Billing dashboard / rescue queue | Internal force multiplier first; potential product later |

---

## CURRENT FACTS
- ClientCare billing is built into the product per the vendor's public features page.
- ClientCare public marketing mentions AI-assisted charting, not a public billing API.
- No public API docs or self-serve API-key flow were found on the vendor's public site.
- Official contact path currently known:
  - Support phone: `503-610-2745`
  - Support email: `support@clientcare.net`
- Until proven otherwise, this amendment assumes **browser/export fallback is the real execution path**.

### Source Notes
- ClientCare home: <https://clientcare.net/>
- Features/pricing: <https://clientcare.net/features-pricing-ehr/>
- Region login chooser: <https://clientcare.net/choose-region-login/>
- Team/contact page: <https://clientcare.net/meet-your-team/>

---

## NON-NEGOTIABLES
- Never store ClientCare credentials in code, docs, or git.
- Use Railway secrets or the encrypted account vault only after browser automation is confirmed necessary.
- No patient billing path may be assumed lawful/contractually permitted without payer-specific confirmation.
- Timely-filing, reconsideration, appeal, and rebill advice must stay evidence-backed and payer-specific where possible.
- High-confidence automation is allowed only for data gathering, queueing, exports, and draft actions; sensitive billing submissions should remain approval-gated until live validation is complete.

---

## CANONICAL OPERATING MODEL
### 1. Claims Rescue Queue
Every claim lands in one of these buckets:
- `submit_now` — not yet submitted, still timely
- `correct_and_resubmit` — rejected/denied for correctable issue
- `timely_filing_exception` — late, but exception/reconsideration path may exist
- `payer_followup` — status unknown / payer response needed
- `proof_of_timely_filing` — needs clearinghouse/report evidence
- `contract_review` — patient-balance path must be checked before any statement is sent
- `likely_uncollectible` — high-risk/expired without viable recovery path

### 2. Execution Paths
- **API path** if ClientCare or connected systems provide supported access.
- **No-API path** via:
  - ClientCare browser workflows
  - exported claim/aging/rejection reports
  - clearinghouse evidence
  - internal rescue queue + tasking + approval gates

### 3. What the system must do
- Import/export claims from ClientCare reports
- Parse copied ClientCare tables or raw HTML when no report export is available
- Use credential-backed browser discovery to inspect the live ClientCare billing surface when secrets are configured
- Classify claims by payer, age, status, and rescueability
- Generate exact next actions per claim
- Track proof needed (ERA/EOB, clearinghouse submission proof, auth, enrollment, etc.)
- Surface oldest/highest-value claims first
- Keep a daily queue so nothing new ages out
- Reconcile what has and has not been submitted even before API access exists

---

## TECHNICAL SPEC
### Files
| File | Purpose |
|------|---------|
| `services/clientcare-billing-service.js` | Claim classification, rescue planning, dashboard summaries |
| `services/clientcare-browser-service.js` | No-API browser-readiness contract, login automation, and page discovery |
| `services/clientcare-sync-service.js` | Snapshot parsing, fallback import, and reconciliation logic |
| `routes/clientcare-billing-routes.js` | Operational API for imports, classification, rescue queue, browser readiness |
| `public/clientcare-billing/overlay.html` | Operator overlay page for claims rescue |
| `public/clientcare-billing/clientcare-billing.js` | Overlay UI logic for import, queue review, and claim planning |
| `db/migrations/20260326_clientcare_billing.sql` | Claims + action tables |

### Endpoints
- `GET /api/v1/clientcare-billing/dashboard`
- `GET /api/v1/clientcare-billing/clientcare/readiness`
- `POST /api/v1/clientcare-billing/browser/login-test`
- `POST /api/v1/clientcare-billing/browser/discover`
- `POST /api/v1/clientcare-billing/browser/extract-claims`
- `GET /api/v1/clientcare-billing/claims/import-template`
- `POST /api/v1/clientcare-billing/snapshots/parse`
- `POST /api/v1/clientcare-billing/snapshots/import`
- `GET /api/v1/clientcare-billing/reconciliation`
- `POST /api/v1/clientcare-billing/claims/import`
- `POST /api/v1/clientcare-billing/claims/import-csv`
- `GET /api/v1/clientcare-billing/claims`
- `GET /api/v1/clientcare-billing/claims/:claimId`
- `POST /api/v1/clientcare-billing/claims/:claimId/reclassify`
- `GET /api/v1/clientcare-billing/actions`
- `PATCH /api/v1/clientcare-billing/actions/:actionId`
- `GET /clientcare-billing`

### Data model
#### `clientcare_claims`
Canonical claim ledger for imported/exported billing data.

#### `clientcare_claim_actions`
Per-claim action queue: submit, resubmit, call payer, request proof, appeal, etc.

---

## DEFAULT PAYER RULES (INITIAL)
These are initial operational rules, not a substitute for payer contracts.

- **Medicare FFS**
  - baseline filing window: 1 calendar year from date of service
  - pure timely-filing denials are generally not appealable
  - reconsideration/reopening still applies for some non-timely issues
- **Nevada Medicaid**
  - baseline filing window: 180 days in-state, 365 days for out-of-state or TPL situations
  - official exception path exists for agency/system-caused delay; denied exceptions may be appealed
- **Commercial / unknown**
  - do not assume a universal filing window
  - classify as payer-specific review required until rule is verified

---

## IMMEDIATE RESCUE PLAYBOOK
1. Export all open/unpaid/unbilled/rejected/denied claims from ClientCare.
2. Import into the rescue queue.
3. Sort by:
   - payer
   - date of service
   - amount
   - current status
4. Work in this order:
   - still-timely, never submitted
   - rejected claims with proof of timely filing
   - denials with obvious correctable issues
   - Medicaid exception candidates
   - Medicare/nonappealable timely-filing losses
5. Build payer-specific evidence packets where needed.
6. Add daily controls so new claims do not fall behind.

---

## REQUIRED INPUTS / SECRETS
Only needed for the browser path:
- `CLIENTCARE_BASE_URL`
- `CLIENTCARE_USERNAME`
- `CLIENTCARE_PASSWORD`
- `CLIENTCARE_MFA_MODE` (if applicable)
- `CLIENTCARE_MFA_SECRET` or approved fallback process

Operational inputs needed regardless of integration path:
- claim aging export
- rejected claim export
- denied claim export
- unbilled encounter export
- ERA/EOB evidence where available
- payer roster / contracts / known payer IDs

---

## CURRENT BLOCKERS
- ClientCare has not yet confirmed whether private API/webhook access exists.
- Payer list for the 90 claims is not yet in-repo.
- Claim exports have not yet been ingested.
- Browser selectors/workflows cannot be finalized until we see the actual ClientCare billing screens.

---

## DEFINITION OF DONE (PHASE 1)
- Claims import endpoint exists and works.
- Snapshot HTML/text import exists and works as fallback.
- Credential-backed browser login/discovery exists and can preview billing pages and claim tables.
- Browser diagnostics are fail-soft: screenshot capture problems must not block live login/discovery/extraction.
- Browser automation must be compatible with the Puppeteer build available in Railway; helper shims are acceptable when newer page helpers are missing.
- Browser discovery/extraction must return partial results quickly under Railway request budgets; limit candidate pages, avoid blocking screenshots by default, and surface page-level errors instead of failing the whole run.
- Browser tooling must include a billing-operations overview and targeted page inspection so the operator can answer where billing stands before exports are available.
- Browser tooling must include client-account scanning so we can inspect billing state per account directly from ClientCare when exports are delayed or unavailable.
- Browser tooling must surface the billing-notes queue because that is likely where real unpaid-work backlog sits when sent-bills and ERA workspaces are empty.
- Operator-facing UI must summarize billing state in plain language tables/cards; raw JSON is diagnostic only and should stay secondary.
- The browser path must produce a live account rescue report from the billing-notes queue, including per-account status, likely root cause, and the next action needed.
- The operator overlay must expose the account rescue report directly so staff can review account status and next actions without reading raw payloads.
- Rescue queue exists and scores claims by urgency/recoverability.
- Dashboard shows where money is stuck.
- Browser path readiness endpoint exists and lists required secrets/workflows.
- Operator overlay exists for queue review and CSV import.
- Amendment and continuity stay current as the system changes.
