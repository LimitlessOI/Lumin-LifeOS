# AMENDMENT 18 — ClientCare Billing Recovery
**Status:** BUILDING
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-27

---

## WHAT THIS IS
A billing-recovery and revenue-cycle operating system built around ClientCare West. It assumes **no public API** is available unless ClientCare proves otherwise, and it supports two execution paths:

1. **Preferred path:** private/vendor-issued API or export feed from ClientCare.
2. **Fallback path:** browser-assisted operations against our own ClientCare account, with exports/imports and human approval gates.

The immediate mission is not generic billing software. It is to **rescue unpaid claims already earned**, prevent additional claims from aging out, and give Sherry a controlled work queue with clear next actions.

This now expands into two linked lanes:
- **Insurance Recovery OS** — eligibility, claims, denials, underpayments, ERA/remits, appeals, collections forecast
- **Patient AR OS** — payment-plan monitoring, past-due balance work queue, provider-directed escalation, and controlled outreach

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
| `services/clientcare-ops-service.js` | Operations checklist, assistant execution layer, insurance-intake preview, patient AR summary |
| `services/clientcare-sync-service.js` | Snapshot parsing, fallback import, and reconciliation logic |
| `routes/clientcare-billing-routes.js` | Operational API for imports, classification, rescue queue, browser readiness |
| `public/clientcare-billing/overlay.html` | Operator overlay page for claims rescue |
| `public/clientcare-billing/clientcare-billing.js` | Overlay UI logic for import, queue review, and claim planning |
| `db/migrations/20260326_clientcare_billing.sql` | Claims + action tables |
| `db/migrations/20260326_clientcare_ops.sql` | Capability queue for requested billing/system improvements |

### Endpoints
- `GET /api/v1/clientcare-billing/dashboard`
- `GET /api/v1/clientcare-billing/clientcare/readiness`
- `GET /api/v1/clientcare-billing/ops/overview`
- `GET /api/v1/clientcare-billing/ops/checklist`
- `GET /api/v1/clientcare-billing/ops/capability-requests`
- `PATCH /api/v1/clientcare-billing/ops/capability-requests/:id`
- `POST /api/v1/clientcare-billing/ops/run-workflow`
- `POST /api/v1/clientcare-billing/ops/repair-account`
- `POST /api/v1/clientcare-billing/insurance/verification-preview`
- `GET /api/v1/clientcare-billing/patient-ar/summary`
- `GET /api/v1/clientcare-billing/payer-playbooks`
- `GET /api/v1/clientcare-billing/underpayments`
- `POST /api/v1/clientcare-billing/underpayments/:claimId/queue-action`
- `POST /api/v1/clientcare-billing/history/import-csv`
- `GET /api/v1/clientcare-billing/appeals/queue`
- `GET /api/v1/clientcare-billing/appeals/:claimId/packet`
- `POST /api/v1/clientcare-billing/appeals/:claimId/queue-action`
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

#### `clientcare_capability_requests`
Queue of requested assistant/system capabilities that are not yet fully automated.

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
- Paid claims / ERA / remit history has not been imported, so payout/date forecasting is still low-confidence.
- Browser selectors for read paths are working; writeback workflows still need controlled rollout and approval gates.
- Controlled writeback now covers billing status, provider type, and payment-status changes, but insurer-entry and payer-order changes still require payer-specific/manual handling.

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
- The operator overlay must visualize each account's current billing state with a simple progress/status board, hover summary, and click-through detail pane.
- The operator overlay must expose reimbursement intelligence from historical paid claims/ERAs/remits so payout projections improve over time and underpayment/leakage patterns can be acted on.
- The browser path must be able to traverse the full billing-notes queue, aggregate duplicate notes per account, and produce a full rescue list of unpaid insurance accounts visible in ClientCare.
- The full rescue report must include an operator summary for the whole backlog: diagnosis breakdown, recovery-likelihood bands, oldest accounts first, and the most common next-action buckets.
- The operator overlay must convert common blockers into batch workflows/playbooks so staff can work accounts by category instead of one account at a time.
- The operator overlay should automatically hydrate the live ClientCare backlog when credentials and app key are present so the visible account board and summary counts do not depend on a manual extra button press.
- The reimbursement intelligence view must include a collections forecast: projected collectible amount, projected timing buckets, and top expected collections, improving as paid-claim history is imported.
- The overlay must support direct payment-history import for paid claims / ERA / remit CSV so reimbursement learning is not blocked on perfect exports.
- The overlay must expose an operator chat tied directly to LifeOS AI with running history and archive behavior for older turns; it should classify requests as personal vs shared system improvements.
- The operator chat should be named `Operations Assistant`, support pinned and unpinned layouts, and stay out of the main workstream when collapsed.
- The overlay should present the live ClientCare backlog as the primary KPI strip so at-a-glance counts show live accounts, billing notes, recovery opportunity, and timing forecasts instead of empty local-ledger placeholders.
- The overlay should be organized into overview, accounts needing action, account recovery detail, and collapsible tools so Sherry can work the queue without scanning low-value diagnostics first.
- The overlay should load a fast backlog summary first, then inspect account details lazily, so the board fills quickly instead of waiting for every billing page to be opened.
- The browser path may include transport diagnostics for ClientCare billing-note loading when queue pagination or lazy loading prevents full backlog extraction.
- Rescue queue exists and scores claims by urgency/recoverability.
- Dashboard shows where money is stuck.
- Browser path readiness endpoint exists and lists required secrets/workflows.
- Operator overlay exists for queue review and CSV import.
- Operations layer must expose an optimization checklist, patient AR summary, insurance-intake preview, and capability queue instead of leaving those as chat-only concepts.
- `Operations Assistant` should use the ops layer first for actionable commands (workflow, AR, eligibility, setup) and only fall back to general AI when needed.
- Account Recovery Detail must support preview/apply repair actions for billing status, provider type, and payment-status updates with clear before/after feedback.
- The system must support provider-directed patient AR follow-up and payment-plan monitoring, but debt-collection style workflows remain compliance-gated until legal/licensing review is complete.
- The system should learn expected payer reimbursement and collection timing from paid claims / ERAs / remits so projected amount and projected date tighten over time instead of staying rescue-bucket-only.
- Payment-history import should capture ERA/remit metadata such as CARC/RARC, trace/check reference, and paid date so payer learning and denial playbooks are grounded in remittance data rather than only free-text denial reasons.
- The system should evolve toward underpayment detection, payer playbooks, eligibility verification, and appeals packet preparation because those are core differentiators versus generic billing dashboards.
- The claims ledger must surface a real underpayment queue so short-paid claims can be reviewed against allowed amount, patient responsibility, and payer payment variance.
- The claims ledger must also surface an appeals queue and claim-level appeal packet preview so denied or follow-up claims can be worked by playbook instead of ad hoc memory.
- The underpayment queue and appeals queue must support controlled action queueing so likely recovery work can be turned into tracked follow-up instead of staying dashboard-only.
- The system must expose payer playbooks derived from actual imported denial/payment history so commercial-plan follow-up is not driven by generic rules alone.
- Amendment and continuity stay current as the system changes.
