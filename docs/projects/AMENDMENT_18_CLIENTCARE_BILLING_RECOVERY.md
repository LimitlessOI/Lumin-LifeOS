# AMENDMENT 18 — ClientCare Billing Recovery
**Status:** BUILDING
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-04-21 — SSOT alignment: **Railway vault / overlay command key** is authoritative when Adam has confirmed variables in Railway; **automated remote HTTP probes** only see `process.env` (and optional `.env`) on the machine running `verify-project.mjs` — a **401 from the verifier is local key drift vs the deployed secret or wrong public host**, not evidence that Railway lacks secrets. Verifier fix: `required_routes` now carry HTTP **method** (POST was previously probed as GET). Prior: 2026-04-23 billing overlay UX + smoke skips without key.

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
- **Front door / coworker model:** ClientCare chart and billing work in production are expected to go through the **live web app** using **Railway-configured** `CLIENTCARE_*` credentials (Puppeteer). LifeOS does not rely on a ClientCare API for those surfaces; it behaves as an **operator coworker** (automation + drafts + queue), with humans completing or approving steps inside ClientCare when needed.

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
| `services/clientcare-ops-service.js` | Operations checklist, `ask()` (deterministic billing intents + AI Council fallback with optional `billingContext`), insurance-intake preview, patient AR summary, `ingestVobCallTranscript` (transcript → council JSON with `insurance_verification_completed` / `coverage_details` / `incomplete_verifications` / `norton_style_markdown`; `buildNortonStyleVobMarkdown` fallback; `preview_result.vob_completed_at`; optional DB clear of raw `extracted_text`; optional `browserService.addBillingNote` when `applyToClientcare` + `clientHref`) |
| `services/clientcare-sync-service.js` | Snapshot parsing, fallback import, and reconciliation logic |
| `services/clientcare-sellable-service.js` | Tenant boundaries, onboarding, operator access, and audit helpers |
| `routes/clientcare-billing-routes.js` | Operational API for imports, classification, rescue queue, browser readiness |
| `public/clientcare-billing/overlay.html` | Operator overlay: ClientCare **assistant** UI; **`#lifeos-companion-host`** + companion CSS; section labels + primary/secondary panel styles; script `?v=20260423a` |
| `public/clientcare-billing/clientcare-billing.js` | Overlay UI: **Sherry &** `getBillingInvokeLabel()` (default **Tiller**) ClientCare billing chat + voice; assistant supports **auto-execute on voice stop** (`clientcare_assistant_voice_auto_execute`) and direct command execution (`add this ...`, `what's the status of ... billing`) via existing APIs; `isBillingInvokeReserved()` blocks Lumin/Lumen/LifeOS/Sherry/Siri/Alexa/Google/Cortana/Echo/Computer; `getBillingChatQuickPrompts()`; companion strip rename; VOB Talk+Auto-Apply mode and transcript field apply |
| `public/shared/lifeos-voice-chat.js` | Optional **`wakePrefixes`** on `attach()` — stripped from textarea when a listen session **ends** |
| `public/shared/lifeos-voice-chat.js` | Shared browser voice input/output controls used by the operator assistant and other chat surfaces |
| `db/migrations/20260326_clientcare_billing.sql` | Claims + action tables |
| `db/migrations/20260326_clientcare_ops.sql` | Capability queue for requested billing/system improvements |
| `db/migrations/20260327_clientcare_patient_ar_controls.sql` | Provider-directed patient AR policy controls |
| `db/migrations/20260327_clientcare_sellable_controls.sql` | Tenant, onboarding, operator-access, and audit tables |
| `db/migrations/20260327_clientcare_payer_rule_overrides.sql` | Operator-defined commercial payer rule overrides |
| `db/migrations/20260327_clientcare_sellable_v1_hardening.sql` | Additional payer override depth for sellable-v1 hardening |
| `scripts/verify-project.mjs` | SSOT manifest verifier: DB + optional HTTP route probes; **`--remote-base-url https://…`** probes the live deploy from a laptop; **`--strict-manifest-env`** requires manifest `required_env` (including `CLIENTCARE_*`) in local process env |

### Machine verification (manifest + live HTTP)

- **Manifest:** `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.manifest.json` (consumed by `scripts/verify-project.mjs`).
- **Local / CI (DB + files + syntax):** `node scripts/verify-project.mjs --project clientcare_billing_recovery [--dry-run]`
- **Live HTTP route probes from a developer machine:** `node scripts/verify-project.mjs --project clientcare_billing_recovery --remote-base-url "https://YOUR-RAILWAY-HOST" [--dry-run]`  
  Same effect if the shell exports `PUBLIC_BASE_URL`, `REMOTE_VERIFY_BASE_URL`, or (on Railway) `RAILWAY_PUBLIC_DOMAIN` — precedence: CLI `--remote-base-url` → `REMOTE_VERIFY_BASE_URL` → `PUBLIC_BASE_URL` → `RAILWAY_PUBLIC_DOMAIN`.
- **Secrets truth:** The verifier reads **only `process.env`** (optional repo `.env`). It does **not** read the Railway Variables UI. `CLIENTCARE_*` entries in `required_env` are **skipped** when absent locally unless you pass **`--strict-manifest-env`** (then missing keys fail the run). Canonical variable list: `docs/ENV_REGISTRY.md` (ClientCare + public URL sections).
- **Production auth vs this laptop:** Remote HTTP probes send **`x-command-key`** using `COMMAND_CENTER_KEY` (else `API_KEY`, else `LIFEOS_KEY`). If the response is **401** and **`LIFEOS_KEY`** is set to a **different** string than the first key, the verifier **retries once** with `LIFEOS_KEY` (covers common `.env` drift where CC key and LifeOS key diverged). **KNOW (agent-run 2026-04-21):** `GET https://robust-magic-production.up.railway.app/api/v1/clientcare-billing/dashboard` returned **401** when using only the keys present in **this** workspace’s `.env` — so **this automated session did not** obtain 200s against production. **THINK:** the value in local `.env` does not match the deploying service’s configured secret, or the public host is not the billing service Adam uses. **KNOW:** that outcome does **not** contradict evidence that **Railway Variables** holds `COMMAND_CENTER_KEY` / `LIFEOS_KEY` and the overlay’s **Save access** stores the same class of secret for the browser — those are separate evidence channels. For a **green** remote manifest run from a developer machine, export a key that **byte-matches** Railway (see `scripts/tc-r4r-from-railway.mjs` / Railway CLI variables pull). Do not describe the lane as “impossible to test without Adam’s environment” when the precise failure mode is **key mismatch or missing key in the verifier shell**.

### Endpoints
- `GET /api/v1/clientcare-billing/dashboard`
- `GET /api/v1/clientcare-billing/clientcare/readiness`
- `GET /api/v1/clientcare-billing/ops/overview`
- `GET /api/v1/clientcare-billing/ops/checklist`
- `GET /api/v1/clientcare-billing/packaging/overview`
- `GET /api/v1/clientcare-billing/packaging/readiness-report`
- `POST /api/v1/clientcare-billing/packaging/validate`
- `GET /api/v1/clientcare-billing/packaging/validation-history`
- `GET /api/v1/clientcare-billing/tenants`
- `POST /api/v1/clientcare-billing/tenants`
- `GET /api/v1/clientcare-billing/tenants/:tenantId/onboarding`
- `POST /api/v1/clientcare-billing/tenants/:tenantId/onboarding`
- `GET /api/v1/clientcare-billing/tenants/:tenantId/operators`
- `POST /api/v1/clientcare-billing/tenants/:tenantId/operators`
- `GET /api/v1/clientcare-billing/audit-log`
- `GET /api/v1/clientcare-billing/audit-log/export`
- `POST /api/v1/clientcare-billing/assistant/session` — create overlay conversation session
- `GET /api/v1/clientcare-billing/assistant/session/:sessionId` — recent messages + archive preview
- `POST /api/v1/clientcare-billing/assistant/message` — body: `session_id`, `message`, optional `billing_context` (board + VOB selection, payer/member hints) → `opsService.ask` (deterministic billing intents first; **`QUEUE:`/`REQUEST:`/`BUILD:`** prefix → capability row; else **AI Council** JSON — may set `should_queue_capability_request`); response `assistant.data.capability_request` echoed into chat metadata when present
- `GET /api/v1/clientcare-billing/ops/capability-requests`
- `PATCH /api/v1/clientcare-billing/ops/capability-requests/:id`
- `POST /api/v1/clientcare-billing/ops/run-workflow`
- `POST /api/v1/clientcare-billing/ops/repair-account`
- `POST /api/v1/clientcare-billing/insurance/verification-preview`
- `POST /api/v1/clientcare-billing/insurance/vob-transcript` — JSON body: `transcript_text` (required), optional `client_href`, `client_name` or `full_name`, `payer_name`, `member_id`, `group_number`, `requested_by`, **`discard_raw_transcript`** (boolean — after save, replaces `extracted_text` with placeholder; synopsis lives in `preview_result`), **`apply_to_clientcare`** (boolean — when true: **`enforceOperatorAccess`** operator/manager + **`client_href` required**; posts Norton/chart markdown via `browserService.addBillingNote`), **`apply_field_updates`** (boolean; defaults true when `apply_to_clientcare` true — runs `reconcileInsuranceWithClientcare(... apply=true ...)` using transcript-derived notes to fill empty insurance fields); response includes `preview_result` (`vob_completed_at`, structured fields), `clientcare_note_suggestion`, `saved`, **`clientcare_apply`** + **`clientcare_field_apply`** status objects
- `POST /api/v1/clientcare-billing/insurance/clientcare-pipeline` — multipart: optional `card`; fields `client_href`, `supplemental_notes` (optional), `insurance_slot`, `apply` — card OCR + empty-field fill + ClientCare VOB/eligibility button + sync parsed VOB into empty fields
- `POST /api/v1/clientcare-billing/insurance/reconcile-clientcare` — multipart: optional `card` image; fields `client_href`, `supplemental_notes`, `insurance_slot`, `apply`
- `GET /api/v1/clientcare-billing/patient-ar/summary`
- `GET /api/v1/clientcare-billing/patient-ar/policy`
- `POST /api/v1/clientcare-billing/patient-ar/policy`
- `GET /api/v1/clientcare-billing/patient-ar/escalation-queue`
- `POST /api/v1/clientcare-billing/patient-ar/:claimId/queue-action`
- `GET /api/v1/clientcare-billing/payer-playbooks`
- `GET /api/v1/clientcare-billing/payer-rules`
- `POST /api/v1/clientcare-billing/payer-rules`
- `GET /api/v1/clientcare-billing/era-insights`
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

#### `clientcare_patient_ar_policy`
Provider-directed thresholds and controls for reminder cadence, escalation timing, payment-plan grace periods, and hardship/settlement policy.

#### `clientcare_tenants` / `clientcare_operator_access` / `clientcare_onboarding` / `clientcare_audit_log`
Sellable packaging controls for practice boundaries, operator roles, onboarding completion, and action receipts.

#### `clientcare_payer_rule_overrides`
Operator-defined commercial payer filing, appeal, and follow-up rules used to tighten claim classification and payer playbooks.

### LifeOS companion strip (billing overlay)
- **`#lifeos-companion-host`** (in `overlay.html`): fixed bottom strip. **Collapsed:** at-a-glance chips — live account count, billing-notes queue size, strong+possible recovery count, insurance-setup-issue count, patient AR total (from live backlog summary + patient AR summary). **Expanded:** short explanation that LifeOS cannot paint inside the ClientCare browser tab without a **future browser extension**; lists **undone** items from the same setup checklist as the hero strip; **rename billing assistant** (`billing-invoke-name` + **`billing-invoke-save`** → `clientcare_billing_invoke_name`); buttons **Open {invoke} chat** and **Open VOB transcript** (smooth scroll + `details.open`).
- **Persistence:** `localStorage` key `clientcare_lumin_strip_expanded` (`setLuminStripExpanded` → full `rerender`).
- **Body classes:** `has-lifeos-companion`, `lumin-strip-expanded` adjust `.wrap` bottom padding so content is not hidden behind the strip.

### Billing invoke name (voice + chat) — ClientCare lane only
- **Lumin** = **LifeOS** conversational brand — **never** the billing-copilot wake word here.
- **Default invoke:** **`Tiller`** — uncommon in everyday speech (fewer collisions than “Ledger” / random words), easy for STT, clearly **not** human **Sherry**.
- **Reserved blocklist** (`isBillingInvokeReserved`): **Lumin**, **Lumen**, **LifeOS**, **Sherry**/**Sherri**, **Siri**, **Alexa**, **Google**, **Cortana**, **Echo**, **Computer** — cannot be saved as invoke (avoids “I said Sherry and Siri answered” class failures).
- **Other name ideas:** **Quill**, **Sage**, **Maven**, **Relay**, **Scout**, **Coda**, **Harbor**, **North**, **Ledger** (operators may still choose Ledger manually if desired).
- **Voice:** `wakePrefixes` = `getBillingWakePrefixes()` + **LifeOS** / **Life OS** only — **Lumin is intentionally omitted** from billing wake/strip so “Lumin” stays the LifeOS product channel.
- **Siri / Alexa “always listening”:** on-device **keyword spotter** + OS integration; **browser page cannot** ship parity wake today — **LifeOS overlay extension** (below) is the intended carrier for optional always-on **billing** wake once consented + technically feasible.

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

## Operator quick start (Sherry — first visit)

1. **Open two things:** ClientCare (normal browser tab) **and** this billing assistant page (`/clientcare-billing` on your LifeOS deploy).
2. **Save access:** Paste the **command key** and your **operator email** → **Save access** (top right). Without this, the page loads but stays empty.
3. **Connect data:** Expand **Tools & Data Sources** → **Login Test** (once) → **Full Queue Report** (loads the live backlog from ClientCare into the board).
4. **Daily loop:** Use **Your queue (from ClientCare)** → pick a name → **Accounts needing action** shows the list; click a card → **Selected account** tells you what to do **in ClientCare**. Use **Sherry & Tiller** (or your renamed assistant) for questions, **VOB & insurance help** for calls/cards/transcripts.
5. **Under 90 days:** Filter **&lt;90 Days First** or click **Run &lt;90 days lane now** in the queue card, or tell the assistant: *run under 90 days lane*.
6. **Voice:** **Start voice** in chat; optional **Auto-execute on voice stop** for hands-free commands after you stop speaking.

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
- Controlled writeback now covers billing status, provider type, payment status, and visible insurer/member/subscriber/payor/priority fields, including slot-targeted edits when multiple visible coverages exist, but broader layout hardening is still needed before payer-order automation is considered universally safe.

---

## Approved product backlog (billing copilot — Sherry + Council)

### Chosen path now (best billing option)
- **Primary build decision:** ship a **LifeOS overlay extension + sidecar desktop shell** for billing first (not web-only wake). This gives the closest practical path to always-available help in ClientCare while preserving fail-closed chart writes.
- **Listen-in lane for VOB (phased):**
  1) **Now:** transcript ingest + auto-post billing note (already shipped),
  2) **Next:** extension-assisted call-capture session (push-to-talk / tab-audio / upload-after-call),
  3) **Then:** telephony bridge for true live call listen-in where consent + payer rules allow.
- **Field write policy:** extracted VOB data must map to **structured field intents** (`client_href`, field targets, confidence, source evidence) and require approval gates until reliability is proven against live tenants.

### Imperative operator UX (not optional)
- **Talk button behavior:** when Sherry clicks **Talk**, the system can both **listen** and **speak back** in-session (hands-on copilot), with visible status and explicit start/stop controls.
- **Billing-first automation:** system should capture relevant payer-call facts and place them into the **correct ClientCare fields** for the selected client, not just produce notes.
- **Under-90-day focus:** unpaid accounts not yet past 3 months are a top operational priority lane and should be surfaced first by command/filter.
- **Human-parity operation in ClientCare:** system must drive the app like a skilled operator (click buttons, fill fields, navigate sections) with receipts and safety gates.
- **Siri-level always-on wake:** treated as **nice-to-have**; not the blocker for billing delivery.

**Shipped / in progress:** main-workspace **Sherry + billing copilot (`Tiller` default)** chat (two-way thread, voice-capable); deterministic `ask()` branches first; unresolved natural language → council with dashboard + reconciliation + optional `billing_context` from the overlay. Sherry can **steer the product**: council JSON instructs `should_queue_capability_request` for real change asks; lines starting **`QUEUE:`**, **`REQUEST:`**, or **`BUILD:`** insert **`clientcare_capability_requests`** immediately (metadata includes billing context snapshot). Nothing auto-edits production code from chat — the queue is the contract.

**⚠️ INCOMPLETE / future (do not imply shipped):**
- **Omnipresent LifeOS overlay (downloadable extension or shell):** floats **above all apps** (not only `/clientcare-billing`); can **read screen context** (active window, URL, optional accessibility tree / vision assist where lawful); when **ClientCare** is detected → auto-open **billing chat + modality tools** (VOB, queue, payer scripts). Extension is part of the **overlay distribution** story — not only a side window.
- **Human-parity interaction (priority):** beyond notes — **click, type, fill fields** on what is on screen, including **all VOB-derived fields** to the **correct client row**. This is a core billing requirement, not an optional enhancement.
- **VOB HUD:** during payer calls, overlay surfaces a **checklist of questions** Sherry should ask in order; system **captures answers** and **routes data to the right chart slots** (field map + confidence + approval gates).
- **Voice → chart:** e.g. “**Tiller**, add this to **[patient]**’s chart” → intent parse → structured task → controlled browser apply (must stay fail-closed until proven safe).
- **In-tab overlay on clientcare.net (until extension):** same-origin still blocks pure web HUD **inside** the ClientCare tab; **extension** bridges that gap. Today: **side window** + companion strip.
- **Live VOB call assist:** listen-in on operator ↔ payer calls, streaming STT, telephony bridge, consent model TBD.
- **Overlay extension runtime (priority):** downloadable extension + desktop sidecar that can detect active app context (ClientCare vs other), open the right chat/tool stack, and pass approved click/type/fill actions through explicit safety gates.
- **AI-first payer calls:** outbound/inbound automation when payer allows AI or staff bridge — regulatory and identity constraints TBD.
- **Chart write intent:** “put this on the chart” → structured task queue + browser apply with explicit approval gates (no silent ClientCare API).
- **Encounters → billing:** Sherry marks completed clinical work items; system proposes claim lifecycle tasks (auth, submit, ERA match, close) using best-practice templates — needs data model + UI wiring beyond chat.

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
- The collections forecast should calibrate against observed payer payment lag and paid-to-allowed history when those signals exist, rather than relying on rescue buckets alone.
- The overlay must support direct payment-history import for paid claims / ERA / remit CSV so reimbursement learning is not blocked on perfect exports.
- The overlay must expose an operator chat tied directly to LifeOS AI with running history, archive behavior for older turns, browser voice input, and optional spoken replies; it should classify requests as personal vs shared system improvements.
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
- Patient AR policy controls must be operator-editable so reminder cadence, provider-escalation timing, payment-plan grace windows, and hardship/settlement flags are explicit instead of ad hoc.
- The system should learn expected payer reimbursement and collection timing from paid claims / ERAs / remits so projected amount and projected date tighten over time instead of staying rescue-bucket-only.
- Payment-history import should capture ERA/remit metadata such as CARC/RARC, trace/check reference, and paid date so payer learning and denial playbooks are grounded in remittance data rather than only free-text denial reasons.
- The system should evolve toward underpayment detection, payer playbooks, eligibility verification, and appeals packet preparation because those are core differentiators versus generic billing dashboards.
- The claims ledger must surface a real underpayment queue so short-paid claims can be reviewed against allowed amount, patient responsibility, and payer payment variance.
- The claims ledger must also surface an appeals queue and claim-level appeal packet preview so denied or follow-up claims can be worked by playbook instead of ad hoc memory.
- The underpayment queue and appeals queue must support controlled action queueing so likely recovery work can be turned into tracked follow-up instead of staying dashboard-only.
- The system must expose payer playbooks derived from actual imported denial/payment history so commercial-plan follow-up is not driven by generic rules alone.
- The system should support operator-defined commercial payer overrides so filing windows, appeal windows, and auth-review notes can be tightened without code changes.
- The system must expose ERA/remit insight summaries so CARC/RARC patterns and payment-method signals can feed payer playbooks and forecast calibration.
- Amendment and continuity stay current as the system changes.
- Multi-coverage insurer repair should support visible-slot targeting so operators can explicitly choose which visible coverage row to edit before applying payer-order-related changes.
- Sellable packaging should expose go-live readiness scoring, blockers, and exportable audit/readiness reports so an external rollout can be assessed without reading raw tables.
- Commercial payer overrides should support operator-defined denial lane, follow-up cadence, escalation timing, and expected lag/reimbursement baselines so forecasts and follow-up plans can be tuned without code changes.
- Multi-coverage repair UI and browser writeback should preserve the selected visible coverage and use current-value hints when matching fields, so automation does not drift to the wrong coverage row on denser ClientCare layouts.

---

## Build Plan

- [x] **Live ClientCare backlog discovery and rescue board** *(est: 10h | actual: 11h)* `[needs-review]`
- [x] **Collections Control Center overlay and Operations Assistant shell** *(est: 8h | actual: 9h)* `[safe]`
- [x] **Controlled account repair for billing status/provider type/payment status** *(est: 6h | actual: 6h)* `[needs-review]`
- [x] **Payment-history import and underpayment queue** *(est: 6h | actual: 7h)* `[needs-review]`
- [x] **Appeals queue, packet preview, and action queueing** *(est: 6h | actual: 7h)* `[needs-review]`
- [x] **Payer playbooks plus ERA/remit insight layer** *(est: 7h | actual: 7h)* `[needs-review]`
- [x] **Insurer-entry repair for visible coverage plus patient AR escalation ladder/policy controls** *(est: 8h | actual: 9h)* `[needs-review]`
- [x] **Sellable packaging: permissions, audit hardening, tenant boundaries, onboarding** *(est: 12h | actual: 10h)* `[needs-review]`
- [x] **Commercial payer rule overrides plus multi-coverage slot-targeted insurer repair** *(est: 8h | actual: 7h)* `[needs-review]`
- [x] **Deeper commercial payer rules plus readiness/export packaging polish** *(est: 8h | actual: 7h)* `[needs-review]`
- [x] **Coverage-safe multi-layout insurer repair targeting** *(est: 5h | actual: 4h)* `[needs-review]`
- [x] **Final external rollout polish and live-tenant validation** *(est: 2h | actual: 2h)* `[needs-review]`
- [x] **Voice-enabled Operations Assistant** *(est: 2h | actual: 2h)* `[safe]`

**Progress:** 13/13 steps complete | Internal operational completeness reached; Sellable v1 complete

---

## Change Receipts

| Date | What Changed | Est. | Actual | Variance | Amendment | Manifest | Verified |
|---|---|---:|---:|---|---|---|---|
| 2026-04-21 | **SSOT + verifier honesty — production auth:** `scripts/verify-project.mjs` now attaches **`method`** from each `required_routes` row (POST routes were incorrectly probed as GET). On **401**, verifier retries once with **`LIFEOS_KEY`** when it differs from the primary key. **AMENDMENT_18** `## Machine verification` adds explicit **KNOW** vs **THINK** language: Railway/overlay evidence ≠ laptop shell key; local 401 remote probes mean **mismatched or missing key in `process.env`**, not “secrets absent in prod.” **CONTINUITY_LOG** #43. | Remove misleading “cannot test live” drift; align SSOT with Adam’s Railway + overlay evidence path | 0.35h | 0.35h | none | ✅ | pending | Remote billing GET → **401** with this workspace `.env` only (see amendment); POST method probes now truthful |
| 2026-04-23 | **Operator UX — assistant to ClientCare:** `overlay.html` title + `.cc-section-label` / panel emphasis CSS; `clientcare-billing.js` reorders main column (search → **Your queue** → Sherry & invoke chat → **VOB & insurance help** → collapsible orientation + status); hero copy positions sidecar vs ClientCare; 4 “At a glance” KPIs + **More metrics** `<details>`; Today’s Focus / Batch / guide / system status default collapsed; managed queue + accounts stay expanded; assistant + VOB titles softened to “assistant” language; utility rail = “Screen layout”. `tests/smoke.test.js` skips tools/auto-builder/website audit when response is 401/403 (no `LIFEOS_KEY`). | Sherry demo clarity: reduce “standalone product” feel; fewer competing open panels | 0.5h | 0.5h | none | ✅ | pending | `npm test` pass (smoke skips without server key); `node --check` on `clientcare-billing.js` |
| 2026-04-22 | **Remote verify + env SSOT wiring:** `scripts/verify-project.mjs` adds `--remote-base-url` / `REMOTE_VERIFY_BASE_URL` probe base, `--strict-manifest-env`, and clearer skip text for `CLIENTCARE_*` (process-env vs Railway vault). `docs/ENV_REGISTRY.md` + `services/env-registry-map.js` now list `PUBLIC_BASE_URL`, `REMOTE_VERIFY_BASE_URL`, and full **ClientCare** set. `docs/SSOT_COMPANION.md` §0.4 points builders at registry + remote verify. `package.json` adds `verify:clientcare-billing:remote`. | 0.35h | 0.35h | none | ✅ | pending | pending |
| 2026-04-22 | **Manifest schema alignment fix:** updated `AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.manifest.json` required DB assertions from stale `clientcare_claims.status`/`bucket` and `conversation_sessions` to live schema `clientcare_claims.claim_status`/`rescue_bucket` and `conversations` columns (`id`, `session_id`, `source`, `created_at`). This removes false verifier failures and points checks at the tables the runtime actually uses. | 0.2h | 0.2h | none | ✅ | ✅ | pending |
| 2026-04-22 | **Bulk `<90 days` lane runner:** added one-click `Run <90 days lane now` control + assistant command (`run/start under 90 days lane`) in `clientcare-billing.js`. Runner auto-focuses the under-90 lane, inspects/hydrates up to 40 prioritized accounts from ClientCare in sequence, reselects the top account, and returns a completion toast with inspected/failure counts for fast morning billing triage. | 0.35h | 0.35h | none | ✅ | pending | pending |
| 2026-04-22 | **Priority focus control shipped:** added account filter **`under90`** (“<90 Days First”) using account note age, plus direct command parser support for phrases like “focus/prioritize under 90 days” / “not yet past 3 months”. Overlay `?v=20260422f`. | 0.15h | 0.15h | none | ✅ | pending | pending |
| 2026-04-22 | **General command execution (not VOB-only):** assistant adds auto-execute on voice stop and direct execution handlers for `add this ...` (writes note + field apply to selected/target client) and `what's the status of X billing` (instant board status). Overlay `?v=20260422e`. | 0.3h | 0.3h | none | ✅ | pending | pending |
| 2026-04-22 | **Talk + Auto-Apply one-button mode:** VOB card adds `#vob-talk-auto` + `#vob-talk-status`; `initVobTalkVoice()` attaches shared voice helper to transcript textarea and auto-runs `analyzeVobTranscriptFromUi()` on stop (`onStop`). Shared voice helper now supports `onStart`/`onStop` callbacks. Overlay scripts bumped to `?v=20260422d`. | 0.25h | 0.25h | none | ✅ | pending | pending |
| 2026-04-22 | **Transcript field-apply slot fix:** removed hardcoded `insuranceSlot: 0` for transcript repair path. `vob-transcript` now accepts `insurance_slot`; service forwards to reconcile apply; overlay derives slot from reconcile selector (fallback selected repair slot). | 0.15h | 0.15h | none | ✅ | pending | pending |
| 2026-04-22 | **Emergency ship for tomorrow billing:** transcript action now supports field-level apply, not note-only. `ingestVobCallTranscript` adds `applyFieldUpdates` and returns `clientcare_field_apply`; route maps `apply_field_updates` (defaults on with `apply_to_clientcare`); overlay adds “apply transcript-derived fields” checkbox (default checked) and shows note + field apply result together. `overlay.html` `?v=20260422b`. | 0.5h | 0.5h | none | ✅ | pending | pending |
| 2026-04-22 | **Requirement clarified by user:** Siri-like wake is optional; imperative is Talk-button live assist + listen-in + speak + correct-field ClientCare writeback + human-like app operation. Added explicit imperative UX section and promoted human-parity interaction priority. | 0.15h | 0.15h | none | ✅ | pending | pending |
| 2026-04-22 | **Best billing path chosen in SSOT:** prioritize **overlay extension + sidecar shell** as the runtime (context-aware tools + controlled click/type/fill), with VOB listen-in phased as transcript/autopost → extension capture → telephony bridge. Added explicit policy that field writes stay approval-gated until live reliability proves out. | 0.2h | 0.2h | none | ✅ | pending | pending |
| 2026-04-22 | **Default billing invoke → Tiller**; `isBillingInvokeReserved` (Sherry, Siri, Alexa, …); billing voice/text strip **drops Lumin/Lumen**; wakePrefixes = invoke + LifeOS only; h2 “ClientCare billing”; backlog: **omnipresent overlay extension**, screen-aware tools, VOB question HUD, field-level chart apply, “Tiller, add to X chart”. Overlay `?v=20260422a` | 0.35h | 0.35h | none | ✅ | pending | pending |
| 2026-04-21 | **Billing invoke ≠ Lumin**: default **`Ledger`**; `getBillingInvokeLabel` / `setBillingInvokeLabel` / `clientcare_billing_invoke_name`; reject **Lumin**/**Lumen** as invoke; `getBillingWakePrefixes()`; companion strip **Save name**; disclosure prompt simplified. **Doc:** Siri/Alexa always-on = device KWS + OS — not shippable in plain browser | 0.2h | 0.2h | none | ✅ | pending | pending |
| 2026-04-21 | **Lumin + direction-only billing UX**: `LIFEOS_INVOKE_LABEL`; chat **Send to Lumin**; history labels; VOB transcript defaults **post + discard raw**; copy note = **backup only**; analyze skips post without `client_href` + toast; **`renderCompanionStrip` / `mountCompanionStrip`** + `#lifeos-companion-host` + body padding CSS; utility sidebar copy. **`lifeos-voice-chat.js`**: `wakePrefixes`, strip on listen end. **Truth:** overlay cannot embed in ClientCare tab without extension — strip explains side window | 0.45h | 0.45h | none | ✅ | pending | pending |
| 2026-04-21 | **Sherry Quick prompts** near billing chat: `BILLING_CHAT_QUICK_PROMPTS` (payer questions, after-call save checklist, speakerphone + AI disclosure script, denial next steps, `REQUEST:` starter, **Open VOB transcript panel** → opens `#verification-of-benefits` if needed, scrolls `#vob-payer-call-transcript`, focuses `#vob-transcript-body`). Card `id="vob-payer-call-transcript"`. Copy clarifies speakerphone until listen-in ships + disclose transcription. `overlay.html` `?v=20260421a` | 0.2h | 0.2h | none | ✅ | pending | pending |
| 2026-04-21 | **VOB Norton-style + ClientCare billing note from transcript API**: `ingestVobCallTranscript` extended (Norton markdown build/merge, `vob_completed_at`, `discardRawTranscript` DB update, `applyToClientcare` → `addBillingNote`). Route passes flags; **`apply_to_clientcare`** gates **`enforceOperatorAccess`** + **`client_href`**. Overlay: checkboxes discard raw / post to ClientCare, payload fields, status for `clientcare_apply`, synopsis shows UTC VOB time + deductible lines from `preview_result`. `overlay.html` `?v=20260420e`. **⚠️ INCOMPLETE:** live listen-in / streaming STT not built; ClientCare post is **billing note** only (not arbitrary portal field map) | 0.35h | 0.35h | none | ✅ | pending | pending |
| 2026-04-20 | **Sherry programs via capability queue**: `ask()` gains `QUEUE:`/`REQUEST:`/`BUILD:` prefix → `createCapabilityRequest` (`normalized_intent=sherry_directed_program_change`, metadata `billing_context_snapshot`). Council prompt tells model to set `should_queue_capability_request` for product/process changes. `POST /assistant/message` merges `result.capability_request` into saved message `metadata.data`; overlay shows queue id + toast. `overlay.html` `?v=20260420d` | 0.2h | 0.2h | none | ✅ | pending | pending |
| 2026-04-20 | **Sherry & AI Council billing chat (main workspace)**: Moved assistant UI from utility rail into **main** (`renderAssistantShell({ variant: 'main' })` after account search); labels **Sherry** / **AI Council**; `Send to Council`; `buildAssistantBillingContext()` sent as `billing_context` on `POST /assistant/message`. `ask()` accepts `billingContext`, injects into council prompt, reminds model there is no ClientCare chart API; fixed `callCouncilMember('claude', prompt, {…})` (removed stray 4th arg). Sidebar utilities now pointer-only. `overlay.html` `?v=20260420c`. **Approved product backlog** section for call listen-in, AI payer calls, chart task queue, encounter→billing (all flagged incomplete) | 0.5h | 0.5h | none | ✅ | pending | pending |
| 2026-04-20 | **Overlay copy — front door / coworker**: VOB card summary + transcript panel + real-ClientCare strip now state explicitly that ClientCare is reached via **Railway credentials → browser** (no ClientCare API), and transcript input is operator-provided with chart paste still manual. `overlay.html` `?v=20260420b`. **CURRENT FACTS** adds the same **front door / coworker** bullet | 0.1h | 0.1h | none | ✅ | pending | pending |
| 2026-04-20 | **VOB payer-call transcript lane**: `ingestVobCallTranscript` in `clientcare-ops-service.js` (council JSON extract via `callCouncilWithFailover` or `callCouncilMember`, optional `getInsuranceVerificationPreview` merge, `findExistingClientMatch` when member ID + name support it, `saveVobProspect` with `source_type=vob_call_transcript`, `preview_result.source=vob_call_transcript`, `file_meta.client_href` + `clientcare_note_suggestion`). Route `POST /api/v1/clientcare-billing/insurance/vob-transcript` (180s deadline). Overlay: transcript textarea, Summarize & save, synopsis panel, Copy ClientCare note; history cards show call synopsis for transcript rows. `overlay.html` script `?v=20260420a`. **Known gap:** no automatic ClientCare DOM/file creation — operator must paste into correct client | 0.75h | 0.75h | none | ✅ | pending | pending |
| 2026-04-07 | **Tightened auto-match confidence for card subscriber names**: the VOB flow now auto-selects only on deterministic exact matches. Soft fuzzy matches no longer silently select a client from the backlog, and live ClientCare directory search only auto-selects on a single exact hit. Ambiguous matches stay in picker/review state instead of driving the real ClientCare VOB automatically | 0.15h | 0.15h | none | ✅ | pending | pending |
| 2026-04-07 | **Separated VOB-selected client from stale board context**: the VOB workflow no longer inherits the generic board selection by default. It now tracks a VOB-specific selected billing href, clears that state when search text changes or OCR does not produce a trustworthy match, and only shows a selected VOB account when the VOB flow itself has actually chosen one. This prevents old accounts like Karlee from lingering in the VOB header under a different patient card | 0.25h | 0.25h | none | ✅ | pending | pending |
| 2026-04-07 | **Hard-stopped real ClientCare VOB on patient mismatch**: the live run can no longer continue when the selected account and card subscriber disagree. The run button is disabled with an explicit blocker message, `runFullClientcarePipeline()` refuses to proceed on mismatch or in-flight directory search, and exact existing-client search matches auto-select immediately so stale account context does not linger under a new card | 0.2h | 0.2h | none | ✅ | pending | pending |
| 2026-04-07 | **Stopped silent hangs on the real ClientCare path**: added request deadlines to the frontend API helper, explicit timeout handling for the real ClientCare VOB POST and live ClientCare directory search, and server-side deadlines in the billing routes so hung browser work returns a clear error instead of leaving the operator stuck on “Running…” or “Searching ClientCare…” with no popup | 0.2h | 0.2h | none | ✅ | pending | pending |
| 2026-04-07 | **Forced a fresh asset URL for the backend VOB fix**: bumped the overlay bundle to `clientcare-billing.js?v=20260407h` so the production deploy carrying the browser-context `phaseLabel` fix is easy to verify from page source and browsers are forced onto the latest operator bundle | 0.05h | 0.05h | none | ✅ | pending | pending |
| 2026-04-07 | **Fixed the actual production `phase is not defined` error in browser context**: `clickFirstMatchingButton()` was running inside `page.evaluate()` and returning a bare `phase` variable that was never passed into the page context. The real ClientCare VOB click helper now receives `phaseLabel` as an explicit evaluate arg and returns that value in its click result, so the run no longer throws before VOB detection | 0.1h | 0.1h | none | ✅ | pending | pending |
| 2026-04-07 | **Removed `phase` identifier from the live VOB loop entirely**: even after the earlier fix, production still surfaced `phase is not defined`. Refactored the ClientCare VOB retry loop so it no longer uses a local variable named `phase` at all; retry bookkeeping now uses `attemptPhase`, and the asset URL is bumped to `clientcare-billing.js?v=20260407g` to force a clean reload and redeploy | 0.1h | 0.1h | none | ✅ | pending | pending |
| 2026-04-07 | **Hardened Chromium launch for Railway**: centralized Puppeteer launch options in `browser-agent.js` and added container-safe flags (`pipe`, `--renderer-process-limit=1`, `--disable-breakpad`, reduced background/process features, single-process/no-zygote/no-sandbox) to lower thread/resource pressure in Railway. Reused the same hardened launch options for the PDF screenshot fallback in `clientcare-ops-service.js` so both browser paths stop failing for the same reason | 0.25h | 0.25h | none | ✅ | pending | pending |
| 2026-04-07 | **One card upload zone only for the real VOB**: removed the second file picker from the lower real-ClientCare panel and made the upper VOB drop zone the single source of truth for all card images. The run path now always uses the files from that one multi-file drop zone, eliminating the duplicate upload UI that made the workflow look fake/confusing | 0.15h | 0.15h | none | ✅ | pending | pending |
| 2026-04-07 | **Removed remaining fake-VOB overlay wiring and forced a fresh asset URL**: deleted the unused `runInsurancePreview()` frontend path and its old button listener, changed lingering copy from “decision path” / “preview endpoint” to explicitly say only the real ClientCare VOB matters, and bumped the bundle URL to `clientcare-billing.js?v=20260407e` so browsers are forced off the stale cached JS | 0.2h | 0.2h | none | ✅ | pending | pending |
| 2026-04-07 | **Real VOB results persist in-panel**: the green ClientCare VOB run already built a human-readable result summary, but `loadDashboard()` immediately rerendered the page and wiped the result box back to its default text. Added persistent pipeline UI state (`running`, `done`, `error`) so the result now stays visible after refresh/re-render and clearly shows client, card read, fields written, VOB status, benefits found, and billing-note outcome with expandable JSON | 0.25h | 0.25h | none | ✅ | pending | pending |
| 2026-04-07 | **Main-area VOB + collapsible primary panels**: moved the real ClientCare VOB card out of the narrow utility sidebar and into the main workflow area right after search. Major daily-work sections (`How to work this page`, `System status`, `Verification of Benefits`, `Managed Work Queue`, `Today's Focus`, `Batch Workflows`, `Accounts Needing Action`, `Account Recovery Detail`) are now rendered as open-by-default collapsible panels so the operator can compress the screen around the task they are actively working | 0.5h | 0.5h | none | ✅ | pending | pending |
| 2026-04-07 | **One real VOB path only + larger multi-image support**: removed the AI estimate VOB panel as a primary operator workflow and embedded the real ClientCare VOB run directly inside the main VOB card. The real ClientCare route now accepts up to 16 uploaded card images in one run (front, back, extra pages) and the in-panel real-flow upload input is `multiple` as well. This keeps the operator on one live ClientCare VOB path instead of two competing panels | 0.75h | 0.75h | none | ✅ | pending | pending |
| 2026-04-07 | **Fixed live VOB browser runtime error**: `runClientcareVobFlow` was logging `phase` outside the loop scope after a successful eligibility response, throwing `phase is not defined` inside the green ClientCare flow panel. Hoisted the active phase so the live ClientCare VOB path can finish and report results instead of crashing at the success boundary | 0.1h | 0.1h | none | ✅ | pending | pending |
| 2026-04-07 | **Automatic live ClientCare name search from the card**: when OCR finds a subscriber name but the loaded billing backlog does not contain the person, the overlay now calls a new browser-backed ClientCare directory search endpoint. Exact or unique strong matches auto-select the ClientCare file and set the billing URL directly, instead of making the operator hunt through the board. Candidate buttons now work for both cached backlog matches and live directory matches | 0.75h | 0.75h | none | ✅ | pending | pending |
| 2026-04-07 | **Prospect save fallback after OCR**: `Read card + save prospect` no longer errors if the file input is gone after OCR already succeeded. When payer/member are already in the in-memory draft, the button now saves that parsed card draft directly to VOB history instead of demanding the user attach the same images again. The CTA relabels itself to **Save card to history** after a successful read so the state is explicit | 0.25h | 0.25h | none | ✅ | pending | pending |
| 2026-04-07 | **Persistent card files**: After drop/browse, each `File` is **re-built from `arrayBuffer()`** before OCR so blobs are not tied to the old `<input>` that `innerHTML` rerenders destroy — fixes empty `getVobCardFilesForUpload()` while UI still shows “Card read”. **Data completeness** merges draft OCR into the selected row only when subscriber matching says it is the same client. **`syncInsuranceDraftFromDom`** no longer wipes `group_number` / `subscriber_name`. Clearer error if files are still lost | 0.5h | 0.5h | none | ✅ | pending | pending |
| 2026-04-06 | **Prospect “Read card + save” after auto-OCR**: `uploadInsuranceCard` only read `<input type=file>.files`, which is often empty once the card lives in `lastVobCardFile` / `lastVobCardFiles` — fixed via `getVobCardFilesForUpload()` (same merge as drop zone). **Tooltips** in `.utility-sidebar` now right-align so hover text is not cut off. **Cards** get `overflow-wrap` / `word-break` so long alert lines wrap instead of clipping | 0.25h | 0.25h | none | ✅ | pending | pending |
| 2026-04-06 | **VOB card ↔ account fix**: `selectAccountForVob` now clears **account board search** (`setAccountSearch('')`) so auto-matched clients are not hidden from the filtered list; merging ClientCare draft **does not overwrite** OCR payer/member/group when portal fields are empty; single subscriber fuzzy match (score ≥2, unique) **auto-selects** the file; **subscriber-name picker** renders before portal `matched_client` confirm; red **Account mismatch** banner + one-click switch when card subscriber ≠ selected client; inline help distinguishes **Run VOB ↗** (AI estimate) vs **Run full ClientCare flow** (live eligibility) | 0.75h | 0.75h | none | ✅ | pending | pending |
| 2026-04-06 | Made the billing overlay responsive enough to use on normal laptop widths: lowered two-column minimums, narrowed the utility rail, forced VOB grids inside the utility sidebar to stack to one column, and added a persistent `Dock below` / `Dock right` toggle so operators can move Working tools under the main workspace instead of losing half the page off-screen | 0.5h | 0.5h | none | ✅ | pending | pending |
| 2026-04-06 | Broadened insurance-card intake to handle more formats: UI file pickers now accept PDF, HEIC/HEIF, TIFF, GIF, BMP, JPG/JPEG, PNG, and WEBP; backend normalizes image uploads through `sharp` before OCR and tries `pdf-parse` first for PDFs, then first-page raster OCR fallback when possible | 0.5h | 0.5h | `sharp`, `pdf-parse` | ✅ | pending | pending |
| 2026-04-06 | Exported `assertOperatorAccess` and `resolveOperatorAccess` from `services/clientcare-sellable-service.js` so the live billing routes can enforce operator permissions without crashing on `sellableService.assertOperatorAccess is not a function` | 0.1h | 0.1h | none | ✅ | pending | pending |
| 2026-04-06 | Removed the hard import of `services/outreach-engine.js` from `routes/clientcare-billing-routes.js`; the route now uses an inline outreach adapter built from `notificationService` + `sendSMS`, with best-effort DB logging to `lifeos_outreach_tasks` when that table exists | 0.25h | 0.25h | none | ✅ | pending | pending |
| 2026-04-06 | Fixed the inline VOB insurance-card flow so it actually works after rerender: removed stale references to the old sticky-strip DOM ids, persist the chosen card file in JS state, reuse that same file for **Read card + save prospect** and **Run full ClientCare flow**, and keep OCR success/error feedback visible inside the VOB panel instead of losing it on rerender | 0.5h | 0.5h | none | ✅ | pending | pending |
| 2026-04-06 | **Billing note auto-post**: `addBillingNote(page, noteText)` added to `clientcare-browser-service.js` (reveal Add Note button → find textarea → type → click Save); session-managed wrapper exported as `browserService.addBillingNote(href, noteText)`; wired into `runFullClientcareCardVobPipeline` after VOB repair (apply=true only, non-fatal); pipeline result panel in overlay now shows client, card extraction, fields filled, VOB status, note posted/copy-paste fallback — no raw JSON dump on success | 1h | 1h | none | ✅ | pending | pending |
| 2026-04-06 | **Auto-OCR on card drop**: `wireOverlayCardStripOnce()` fires `autoOcrCard()` immediately on drop or browse-select; `#vob-strip-status` div added to `overlay.html`; version bumped to `?v=20260406g`; `tryImageOCR` fixed for Tesseract.js v4 API (`createWorker('eng',1,opts)` — was using v2 `loadLanguage`/`initialize` which silently returned empty string); `insurance-card-parse.js` subscriber name improved: `Name: <name>` handled as first-class pattern, nameLine fallback strips leading "Name " prefix | 1h | 1h | none | ✅ | pending | pending |
| 2026-04-06 | **Sticky insurance card strip** in `public/clientcare-billing/overlay.html` (outside `#app`) so upload is visible even when `clientcare-billing.js` is cached; `getReconcileCardFile()` + prospect card intake read `vob-overlay-card-file`; `middleware/apply-middleware.js` serves `/clientcare-billing` assets with `no-store` on JS/HTML (same pattern as `/tc`) | 0.5h | 0.5h | none | ✅ | pending | pending |
| 2026-04-06 | **Insurance card OCR**: shared `services/insurance-card-parse.js` (parser + Cigna/name heuristics); `tryImageOCR` fixed for Tesseract.js v4 (`loadLanguage`/`initialize`); fixture PNGs under `tests/fixtures/insurance-cards/` + `npm run test:insurance-card-ocr`; reconcile merge includes VOB-adjacent fields (`effective_date`, `plan_name`, etc.) | 1.5h | 1.5h | none | ✅ | pending | pending |
| 2026-04-06 | VOB UI: card drop/upload **inside** the same “Run VOB — required fields” panel as payer/member/etc.; **Run VOB** button moved to bottom of that panel; prospect card intake merged into same panel | 0.25h | 0.25h | none | ✅ | pending | pending |
| 2026-04-06 | VOB UI: **Existing client** mode now shows insurance card drop zone + file input in the VOB panel (not only Prospect mode); `getReconcileCardFile()` merges with green ClientCare box; prospect card intake gets matching drop zone | 0.5h | 0.5h | none | ✅ | pending | pending |
| 2026-04-06 | CLI `scripts/run-clientcare-vob-pipeline.mjs` + `npm run clientcare:run-pipeline` — POSTs card image + `client_href` to `/api/v1/clientcare-billing/insurance/clientcare-pipeline` so operators can trigger full VOB from terminal against Railway/local | 0.5h | 0.5h | none | ✅ | pending | pending |
| 2026-04-06 | **VOB persistence**: full pipeline re-runs `runClientcareVobFlow` up to `CLIENTCARE_VOB_RETRY_ROUNDS` (default 7) fresh browser sessions until `vob_received` or limit; inner clicks per session default 5 via `CLIENTCARE_VOB_INNER_ATTEMPTS`; merged `vob_flow` includes `vob_attempts_summary` + `vob_retry_config` | 1h | 1h | none | ✅ | pending | pending |
| 2026-04-06 | Pipeline + reconcile JSON responses include `clientcare_note_suggestion` (plain-English paste block for ClientCare billing notes; portal note is not auto-posted) | 0.25h | 0.25h | none | ✅ | pending | pending |
| 2026-04-06 | **VOB recovery loop**: multi-phase button match (primary → broad → scored fallback), `vob_received` detection, modal confirm, `recovery_steps` + `button_catalog_sample`; optional Railway env `CLIENTCARE_VOB_BUTTON_HINT` | 2h | 2h | none | ✅ | pending | pending |
| 2026-04-06 | **ClientCare pipeline** (`POST /insurance/clientcare-pipeline`): optional card OCR + merge into empty fields → `runClientcareVobFlow` clicks VOB/eligibility/RTE-style controls in the client billing UI → re-inspect → `buildVobRepairProposal` parses page text for plan/member/group/copay/deductible → second repair pass; **copay/deductible** writeback via new `copay_amount` / `deductible_remaining_amount` controls; overlay simplified to one primary **Run full ClientCare flow** + dry-run checkbox + advanced reconcile | 4h | 4h | none | ✅ | pending | pending |
| 2026-04-06 | ClientCare-first **reconcile** flow: POST `/insurance/reconcile-clientcare` inspects live billing tab, merges card OCR + pasted call notes, infers dependent vs self (`Relationship to Insured`, subscriber vs client heading), proposes fills **only for empty** portal fields, optional browser apply; extends repair for **group #** and **relationship to insured**; inspect returns `billingNotesPreview`; overlay “Reconcile with ClientCare” panel; full JSON report persisted via `clientcare_vob_prospects` snapshot | 4h | 4h | none | ✅ | pending | pending |
| 2026-04-06 | VOB hardening: prospect SMS/email now sends patient-facing messages (not internal assistant prompts); manual save persists `_form_snapshot` in `preview_result` for “Use again”; POST `/insurance/prospects` returns 503 if history row cannot be saved; card intake embeds OCR snapshot in stored preview; clearer UI toasts when history storage is missing | 1h | 1h | none | ✅ | pending | pending |
| 2026-04-03 | Added `callCouncilWithFailover` param to `createClientCareBillingRoutes` and `createClientCareOpsService` for AI failover support in the assistant path | 0.5h | 0.5h | none | ✅ | ✅ | pending |
| 2026-04-02 | VOB result replaced with color-coded decision card (TAKE/REVIEW/DO NOT SCHEDULE) with payment estimate mini-cards, reasons list, and missing-info warning block. Full tooltip coverage added to every h2/h3 and all major buttons — plain-English hover instructions throughout. Toast notification system replaces all alert() calls. Setup checklist strip guides new users through 3 required steps. All section headings updated with contextual guidance. | 3h | 3h | none | ✅ | ✅ | pending |
| 2026-04-02 | Added a dedicated `Verification of Benefits (VOB)` workspace near the top of the billing overlay, with selected-account prefills, one-click “Use selected account,” and direct take/review/do-not-schedule output instead of leaving VOB buried as a low-signal technical preview panel | 2h | 2h | none | ✅ | ✅ | pending |
| 2026-04-02 | Reworked the billing account board into an operator-first red/yellow/green surface with a default `Needs Me` filter, explicit ownership summaries, hover “what needs doing” guidance, and a detail-pane action list that jumps straight into repair or live inspect work | 3h | 3h | none | ✅ | ✅ | pending |
| 2026-04-03 | Reworked the billing landing page around a system-managed work queue, moved VOB and the assistant into a resizable utility sidebar, added existing-client autocomplete plus prospect VOB mode, let missing-info follow-up route through assistant-driven text/email prompts, and collapsed advanced forecasting/ledger/rollout sections behind drill-down panels with an explicit “How to work this page” guide and system-status summary | 8h | 8h | none | ✅ | ✅ | pending |
| 2026-04-03 | Added persistent account search across the managed queue and account board, plus explicit `System is doing next` / `You need to do next` summaries so Sherry can find any file quickly and understand exactly what the system owns versus what still needs operator judgment | 2h | 2h | none | ✅ | ✅ | pending |
| 2026-04-03 | Added direct detail-pane workflow controls for `Refresh from ClientCare`, `Request missing info by text`, and `Request missing info by email`, plus a `Data completeness` block that makes missing payer/member/setup fields visible before Sherry decides whether to act | 2h | 2h | none | ✅ | ✅ | pending |
| 2026-04-03 | Routed the billing chat box toward the system AI Council path for open questions (with deterministic billing workflows still answering direct operational asks first), and corrected setup guidance to the real `CLIENTCARE_BASE_URL` / `CLIENTCARE_USERNAME` / `CLIENTCARE_PASSWORD` env names | 1h | 1h | none | ✅ | ✅ | pending |
| 2026-04-03 | Added insurance-card prospect intake for VOB: upload card image → OCR extract payer/member fields → attempt existing-client match → run first-pass VOB → save reusable history → allow later promotion into a client-file creation queue from the saved record | 4h | 4h | none | ✅ | ✅ | pending |
| 2026-04-03 | Switched prospect VOB outreach from draft-only to system-executed outreach where contact info exists: the billing portal now uses the existing outbound engine to send text/email requests and log a receipt/task, while still falling back to assistant drafting when no direct contact method is available | 2h | 2h | none | ✅ | ✅ | pending |
| 2026-03-29 | Realigned billing verification to the shipped schema (`claim_status` / `rescue_bucket`, shared `conversations` + `conversation_messages`) instead of stale `status` / `bucket` and legacy `conversation_sessions` assumptions | Stop false verifier failures and keep SSOT aligned with the live claim ledger and assistant transcript storage model | 0.5h | 0.5h | none | ✅ | ✅ | pending |
| 2026-03-27 | Added payment-history import and underpayment queue | 6h | 7h | +1h from CSV alias normalization and queue polish | ✅ | ✅ | ✅ |
| 2026-03-27 | Added appeals queue, packet preview, and recovery action queueing | 6h | 7h | +1h from route/UI/action wiring across queue and claim pane | ✅ | ✅ | ✅ |
| 2026-03-27 | Added payer playbooks, ERA/remit insights, and forecast calibration hooks | 7h | 7h | none | ✅ | ✅ | ✅ |
| 2026-03-27 | Added insurer-field repair controls plus patient AR policy/escalation queue | 8h | 9h | +1h from route/UI/policy persistence wiring | ✅ | ✅ | pending |
| 2026-03-27 | Added sellable packaging controls, tenant/onboarding/operator UI, audit logging, and tenant-aware packaging overview | 12h | 10h | -2h because the packaging service and routes were already partially scaffolded before the UI and SSOT pass | ✅ | ✅ | ✅ |
| 2026-03-27 | Added commercial payer rule overrides plus multi-coverage slot-targeted insurer repair | 8h | 7h | -1h because the payer-playbook/history groundwork was already in place and the slot-targeted repair reused the controlled writeback path | ✅ | ✅ | ✅ |
| 2026-03-27 | Added tenant-scoped operator-access enforcement headers and write-action gating for sellable packaging / recovery actions | 5h | 4h | -1h because the tenant and operator packaging tables were already live | ✅ | ✅ | ✅ |
| 2026-03-27 | Added deeper commercial payer override fields, readiness scoring, and exportable audit/readiness reports | 8h | 7h | -1h because existing packaging and payer-rule surfaces handled most of the route/UI wiring cleanly | ✅ | ✅ | ✅ |
| 2026-03-27 | Added selected-coverage persistence in the repair UI and value-hinted field targeting for multi-coverage browser writeback | 5h | 4h | -1h because the visible-slot targeting path already existed and only needed UI/state + browser matching hardening | ✅ | ✅ | ✅ |
| 2026-03-27 | Added live rollout validation checks and in-overlay go-live validation runner for tenant launch readiness | 2h | 2h | none | ✅ | ✅ | ✅ |
| 2026-03-27 | Added validation-history summaries and trend visibility for rollout runs so operators can see repeated blockers and readiness improvement over time | 2h | 2h | none | ✅ | ✅ | ✅ |
| 2026-03-28 | Fixed overlay resilience — switched Promise.all -> Promise.allSettled in loadDashboard so a single failing endpoint no longer blanks the whole page; failed endpoints shown as named warning banner | 1h | 0.5h | was blocking all dashboard loads when any one of 17 endpoints errored | ✅ | ✅ | ✅ |
| 2026-03-28 | Added shared browser voice controls to the Operations Assistant with optional spoken replies | 2h | 2h | none | ✅ | ✅ | ✅ |
| 2026-03-28 | Fixed billing overlay render guards and added no-key setup fallback so protected-endpoint 401s no longer crash the page | 1h | 1h | none | ✅ | pending | pending |
| 2026-03-28 | Added no-cache public overlay delivery and versioned overlay scripts | 0.5h | 0.5h | none | ✅ | pending | pending |

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 67/100
**Last Updated:** 2026-04-03

### Gate 1 — Implementation Detail
- [x] Both execution paths documented (API path and no-API browser fallback)
- [x] Canonical claims rescue queue buckets defined (7 buckets with clear labels)
- [x] All 9 service/route/UI files listed with purposes
- [x] All API endpoints documented (33 endpoints)
- [x] Default payer rules documented (Medicare FFS, Nevada Medicaid, Commercial/unknown)
- [x] Definition of Done (Phase 1) fully specified with 24 concrete acceptance criteria
- [ ] Payer list for the actual 90 claims not yet in-repo — confirmed blocker
- [ ] Claim exports from ClientCare not yet ingested — no real data to validate against
- [ ] ERA/remit history not imported — payout forecasting remains low-confidence
- [ ] ClientCare API access not yet confirmed — browser path remains the real execution path
- [ ] Multi-coverage payer-order changes still need final field-targeting hardening across all ClientCare layouts before broad safe automation

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| AdvancedMD | Full EHR + billing, large market, ~$600/mo | Generic across all specialties — no ClientCare-specific integration, no AI rescue queue prioritization, no browser automation fallback | We are built around the client's actual system (ClientCare) with a no-API fallback that works today, not after a 6-month integration project |
| Kareo/Tebra | Popular with small practices, billing services included | Same as AdvancedMD — generic, no ClientCare integration, no AI-generated appeal packets | Our payer playbooks are derived from this practice's actual historical denial data, not generic templates |
| RXNT | Affordable ($65/mo), cloud-based billing | No AI, no denial pattern analysis, no underpayment detection, no appeals queue | We surface underpayment vs contract rates and generate appeal packet drafts — RXNT has no equivalent |
| Manual billing coordinator (human) | Knows the payers, can make judgment calls | $25–$45/hr, only works during business hours, no pattern analysis across all claims simultaneously | We work the entire backlog simultaneously, rank by urgency/recoverability, and surface the highest-value next actions first |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| ClientCare changes their UI/DOM structure — browser selectors break | HIGH | High — browser path is the primary execution path today | Mitigate: browser selectors must be in config, not hardcoded; add visual regression test before any automated writeback |
| Timely filing windows expire during the build period for the 90 open claims | HIGH (already aging) | HIGH — irreversible revenue loss | Mitigate: prioritize claims sort by date of service immediately; surface submit_now bucket before any other work |
| Patient AR outreach triggers FDCPA compliance issue (debt collection without license) | Medium | HIGH — legal liability | Mitigate: provider-directed patient communication (not third-party debt collection) stays compliance-gated; no automated patient contact without legal review |
| Payer denies based on eligibility issue not detectable until ERA arrives | Medium | Medium — revenue delayed, not necessarily lost | Mitigate: eligibility verification preview endpoint exists; surface eligibility flags before claim submission |

### Gate 4 — Adaptability Strategy
The claim classification engine reads rules from the payer playbook table — adding a new payer rule requires a DB row, not a code change. If ClientCare gains a private API later, we add an API path service adapter and the rest of the pipeline (classification, rescue queue, dashboard) remains unchanged. The appeal packet generator is a prompt template per denial reason code — adding new CARC/RARC codes is a data entry task. Score: 67/100 — the dual-path architecture (API/no-API) and data-driven payer rules are highly adaptable; the score is held back by the confirmed blockers (no real claim data, no payer list, no confirmed API access) that must resolve before the adaptability of the architecture can be validated in production.

### Gate 5 — How We Beat Them
Every billing software shows you what's unpaid; LifeOS tells you exactly which of the 90 claims can still be rescued today, in what order to work them, what document to pull for each one, and drafts the appeal letter — turning a billing backlog from a spreadsheet problem into a ranked action queue that a non-biller can execute.

- Sellable packaging controls must exist in the operator overlay so a practice can be configured with tenant profile, onboarding state, operator access, and audit receipts without leaving the Collections Control Center.
- Packaging endpoints must support tenant-aware overview and filtered audit retrieval so the same product can be sold to more than one practice without mixing state.
- Sellable packaging controls must respect tenant-scoped operator access when a tenant has configured operators, while remaining permissive during bootstrap before operator rows exist.
