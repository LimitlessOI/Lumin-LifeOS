# Continuity Log
> This file is the running continuity reference for every conversation and action. It is always checked before responding.

## Update 2026-03-27 #1
- TC intake workspace can now link a triaged email directly to an existing transaction, log the routing event on the file, backfill `source_email_id` when it was missing, show recent intake activity in the workspace itself, run manual document validation / dry-run upload from the same screen, launch a dry-run intake for a target address, and turn failed QA checks into real document requests on a transaction, which reduces duplicate placeholder transactions during early intake and gives the operator an immediate audit trail plus fail-closed QA, rehearsal, and missing-doc follow-through before live filing.
- TC intake workspace can now create placeholder transactions directly from triaged contract emails, which reduces manual setup friction before full live filing credentials are available.
- TC email triage now captures preview text and message identity when the enrichment migration is present, which improves classification quality and gives the intake workspace better transaction-matching signals.
- TC agent portal now opens into an intake workspace when no transaction id is supplied, showing access readiness, secret-entry/bootstrap controls, dry-run GLVAR/SkySlope checks, the actionable inbox triage queue, and suggested matches to active transactions.
- TC now has access-readiness and bootstrap endpoints for email, GLVAR, TransactionDesk, and SkySlope prerequisites, and the startup guards now check real env/vault readiness instead of stale hard-coded env names.
- ClientCare rollout validation now has history/trend summaries in the overlay, so repeated blockers and validation-score movement are visible without exporting audit data.
- ClientCare sellable packaging now includes a live rollout validation runner that checks actual browser readiness, claim-history presence, operator access, audit receipts, and onboarding state before go-live.
- ClientCare account repair now preserves the selected visible coverage in the overlay and uses current-value hints during browser writeback, which materially lowers the risk of editing the wrong coverage row on denser multi-coverage layouts.
- ClientCare sellable packaging now exposes a go-live readiness score, checklist, blockers, and next actions directly in the Collections Control Center so rollout status is visible at a glance.
- ClientCare packaging can now export tenant readiness as JSON and tenant audit history as CSV without leaving the overlay, which closes a major external-rollout reporting gap.
- Commercial payer overrides now support denial-lane overrides, follow-up cadence, escalation timing, expected lag, and expected paid-to-allowed baselines; those values now flow into payer playbooks, appeal guidance, and forecast calibration.
- ClientCare billing now has sellable packaging controls in the Collections Control Center: tenant profile, onboarding state, operator access, and tenant-scoped audit history are visible and editable without leaving the overlay.
- ClientCare packaging now supports tenant-aware overview queries and filtered audit retrieval, so the same product can be configured for more than one practice without mixing state.
- ClientCare repair flow now supports multi-coverage slot targeting for visible insurer fields, reducing the manual blocker around payer-order edits on accounts with more than one visible coverage; broader layout hardening is still pending.
- ClientCare billing now also supports operator-defined payer rule overrides for commercial plans, so filing windows, appeal windows, auth-review flags, and follow-up notes can be tuned without code changes and flow directly into payer playbooks/classification.
- ClientCare sellable packaging now also enforces tenant-scoped operator access on write routes when operators are configured, using overlay-supplied operator identity plus tenant headers without blocking bootstrap before access rows exist.

## Update 2026-03-26 #2
- Trust reset applied: directed mode is now the default operating posture. Autonomous AI/build/research/improvement loops are being disabled unless explicitly re-enabled.
- Background auto-builder scheduling is now off by default; auto-builder should only run on explicit operator direction unless `LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER=true`.
- Hidden self-starting subsystem timers were identified as a major source of unwanted work:
  - `core/marketing-research-system.js`
  - `core/marketing-agency.js`
  - `core/self-funding-system.js`
  - `services/autonomy-scheduler.js`
- Startup-time autonomous workers are also now being held behind directed mode:
  - `services/autonomy-orchestrator.js`
  - enhanced/basic income drone deployment
  - `core/opportunity-executor.js`
- Savings dashboard/reporting is being corrected to use authoritative ledger rows only; duplicate token-optimizer writes to `token_usage_log` are being disabled so metrics stop overstating activity.
- ClientCare browser path hit a real production issue: screenshot capture failed on a zero-width page. Browser diagnostics are now being hardened so screenshots are best-effort and cannot block live login/discovery/extraction.
- ClientCare browser path also hit a Railway Puppeteer compatibility issue (`page.waitForTimeout` missing); browser session startup now shims that helper so older/newer Puppeteer builds behave consistently.
- ClientCare browser discovery/extraction is now being tightened for Railway request budgets: smaller candidate sets, no subpage screenshots by default, and partial page-level errors instead of whole-request failure wherever possible.
- ClientCare browser path now also exposes targeted page inspection and a billing-operations overview so we can answer where billing stands even before export automation is finalized.
- ClientCare browser path now also exposes client-account scanning by walking the client list and opening each account's billing tab, so per-account billing state can be inspected directly from the live system.
- ClientCare browser path now also exposes a billing-notes scan and client-scan batching (`offset`/`limit`) so we can work through the live backlog queue without waiting for exports.
- ClientCare overlay is being shifted away from raw JSON blocks toward operator-readable summaries; raw payloads remain available only as secondary diagnostics.
- ClientCare browser path now also exposes a live account rescue report so billing-note items can be turned into per-account status, likely root cause, and next action within one browser session.
- ClientCare overlay now also surfaces the account rescue report in a readable table so operators do not need to interpret raw JSON to work the queue.
- ClientCare overlay now also has an account status board with hover summaries and click-through details so Sherry can see where each account is stuck at a glance.
- ClientCare billing now also has a reimbursement-intelligence foundation so payout projections can be learned from historical paid claims/remits, and the browser path is being extended toward full billing-queue traversal rather than just the first visible batch.
- ClientCare billing now also has transport diagnostics for the billing-notes queue because the UI advertises 88 notes while the current headless traversal only sees 15 rendered rows.
- ClientCare billing-notes traversal now uses the actual `GetMidwifeNotesList` transport instead of rendered-page scraping, so the system can pull the full 88-note backlog and collapse it into account-level rescue work.
- ClientCare overlay now also summarizes the full backlog in operator terms: diagnosis counts, recovery-likelihood bands, oldest accounts first, and the most common next-action buckets, with raw payloads kept secondary.
- ClientCare overlay now also derives batch workflow playbooks from the full rescue report so the backlog can be worked by blocker type: insurance verification, billing setup, demographics, client match, and missing insurer data.
- ClientCare overlay now auto-loads the live full billing queue when the app key and ClientCare credentials are present, and the visible top stats switch from the empty local ledger to the live ClientCare backlog summary.
- ClientCare reimbursement intelligence now also includes a collections forecast with projected timing buckets and top expected collections; it starts low-confidence and improves as paid claims/ERAs/remits are imported.
- ClientCare overlay now uses a fast backlog-summary path to populate the board quickly, then lazily inspects account details when an operator clicks into a specific account.
- ClientCare overlay now also has an AI operations assistant with running conversation history and archive behavior, so Sherry can ask questions or request system changes directly from the portal.

## Update 2026-03-26 #1
- Priority shifted temporarily from TC to ClientCare billing recovery because there is already earned revenue trapped in unpaid / unbilled / rejected / denied claims.
- New amendment added: `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` defines the no-API-first operating model for ClientCare West billing rescue.
- New backend foundation added for ClientCare billing rescue:
  - `services/clientcare-billing-service.js` — claim classification, timely-filing triage, rescue buckets, action planning
  - `services/clientcare-browser-service.js` — browser/export fallback readiness contract and workflow templates
  - `routes/clientcare-billing-routes.js` — dashboard, import, classification, actions, and ClientCare readiness endpoints
  - `db/migrations/20260326_clientcare_billing.sql` — `clientcare_claims` and `clientcare_claim_actions`
- ClientCare billing now also has an operator overlay at `/clientcare-billing` for CSV import, dashboard review, claim drill-down, and action completion.
- ClientCare billing also now has snapshot parsing and reconciliation: copied ClientCare table HTML or pasted tab/comma-delimited text can be normalized and imported even before official exports or API access are available.
- ClientCare billing now also has credential-backed browser discovery: login test, billing-surface discovery, and claim-table extraction endpoints are wired behind Railway secrets so live page inspection can begin without waiting for exports.
- Working assumption remains: no public ClientCare API or self-serve API key exists until the vendor proves otherwise; browser/export fallback is the primary path.
- Immediate next operational step is to export the 90-claim backlog from ClientCare and import it into the new rescue queue.

## Update 2026-03-25 #1
- Priority reset: TC Service (Amendment 17) is the active revenue lane; API Cost Savings is secondary productization work.
- Governance: every meaningful product/code change must now update the owning amendment before the work is considered done; SSOT Companion and project index also update when shared platform state changes.
- TC scope expanded: real-time agent/client portal, file-state engine, communication engine, weekly listing reports, escalation engine, mobile approval flow, offer-prep command engine, and lawful/consented recording/coaching loop are now part of the canonical TC product definition.
- TC implementation now includes a portal-ready status engine plus a fail-closed document QA gate for intake/uploads; next build step is the client/agent portal surface on top of those APIs.
- TC portal surface now has schema/service/API support for transaction overview, communication tracking, and document requests; next step is UI and stronger Nevada-specific form packs.
- TC reporting layer now exists in code: showings, showing feedback, market snapshots, listing-health scoring, and weekly report generation are wired with API endpoints and persistence.
- TC now has basic agent/client portal pages at `/tc` and `/tc/client`, both backed by the canonical TC overview/report APIs.
- TC now also has an approval/automation backend: pending approval queue, one-tap approve/reject/snooze actions, prepared communication sending, showing-feedback request prep, document-request sending, and weekly report delivery prep.
- TC now also has the first closed-loop alert backend: alert records, escalation scheduling, delivery receipts, and portal actions for acknowledge / snooze / resolve.
- TC now has an initial Asana sync backend: preview canonical transaction sync plans, upsert parent/subtasks, and persist external mappings in `tc_external_refs`.
- TC now has initial machine-readable listing/buyer workflow specs and a derived workflow API, which also feeds the Asana sync layer.
- TC now has the first offer-prep backend: structured recommendation bands from property facts, comp data, seller signals, and client constraints, exposed through TC routes for review-first offer prep.
- TC now has the first lawful interaction-intelligence backend: disclosed/visible recording gate, notes-only fail-closed mode, transcript/audio analysis, commitment extraction into Word Keeper commitments, client-profile update suggestions, coaching review, and portal visibility for recent interactions.
- TC now has a canonical communication callback path so delivery/reply events can update `tc_communications` and inbound showing feedback replies can land back in TC reporting automatically.
- TC now has signed mobile action links for approvals and alerts, plus agent-portal copy-link actions, so one-tap phone execution exists even before the full mobile review/sign surface is built.
- TC now has official-feed ingestion endpoints for MLS market snapshots and showing-system events, normalized into canonical TC reporting data before weekly reports/health scoring.
- TC now also has provider-specific TC webhook endpoints for Postmark and Twilio, layered over the canonical callback service so live delivery/reply events can update communication state without manual polling.
- TC Asana sync now also carries unsent communications and analyzed interactions into the ops surface so human follow-up work does not drift out of canonical state.
- ClientCare Collections Control Center now auto-hydrates the live backlog into the KPI strip and account board, instead of leaving the top row tied to the empty local claim ledger.
- ClientCare operator chat is now explicitly `Operations Assistant` with pinned/unpinned behavior, and the overlay layout is split into overview, accounts needing action, account recovery detail, and collapsible tools.
- ClientCare billing now has a first actionable ops layer: optimization checklist, patient AR summary, insurance-verification preview, workflow runner, capability queue, and assistant routing through `clientcare-ops-service` instead of raw chat-only behavior.
- ClientCare Account Recovery Detail now supports controlled repair preview/apply for billing status, provider type, and payment status, with save feedback and unsupported-item warnings for insurer-entry or payer-order changes that still need manual/payer-specific handling.
- SSOT discipline now explicitly requires timing truth: estimates before implementation, actuals after completion, and variance notes when estimates miss materially so programming-speed forecasts can improve over time.
- ClientCare billing now supports payment-history import for paid claims / ERA / remit CSV and exposes an underpayment queue so reimbursement learning can move from rescue-bucket assumptions toward actual insurer payment behavior.
- Project governance now includes explicit build-readiness routes/queue and mounts the builder supervisor runtime surface, but Command Center still needs the readiness/governance drill-down UI to operate that lane cleanly.
- ClientCare billing now adds an appeals queue and claim-level appeal packet preview on top of payment-history import and underpayment detection, so denied/follow-up claims can be worked by playbook instead of manually from memory.
- ClientCare billing now also lets operators queue follow-up work directly from the underpayment and appeals queues, so likely recovery items become tracked actions instead of remaining dashboard-only.
- ClientCare billing now also derives payer playbooks from imported claim/remit history, including average payment lag, top denial categories, and recommended next actions, so commercial follow-up can move beyond generic queue rules.
- ClientCare billing now also exposes ERA/remit insights (CARC/RARC/payment-method signals) and uses observed payer payment lag to calibrate collection forecasts when history exists.
- ClientCare billing now also supports visible-coverage insurer repair fields and provider-directed patient AR policy controls/escalation queue from the overlay, while multi-coverage payer-order changes remain guarded until a safer selector exists.
- `server.js` route composition has been reduced again: runtime route wiring now lives in `startup/register-runtime-routes.js`, and domain startup calls now go through `startup/boot-domains.js` instead of inline IIFEs.
- Project governance is now a first-class amendment (`AMENDMENT_19_PROJECT_GOVERNANCE.md`) with tracked manifest, migration, verifier scripts, CI workflow, and a seed script for populating the governance tables from amendment build plans.
- Project governance is now seeded in the real DB and the live governance endpoints (`/api/v1/projects`, `/api/v1/pending-adam`, `/api/v1/estimation/accuracy`) are verified against production; next work is wiring estimation accuracy and drill-downs into the Command Center.

## Update 2026-01-30 #1
- Hardware: MacBook Pro M2 Max, 32 GB RAM, 2 TB SSD running server-only mode; machine doubles as development host but being stripped down for LifeOS server.
- Models: Ollama hosts gemma2:27b-instruct-q4_0, deepseek variants (coder v2, v3, r1 70b/32b, coder 33b/6.7b, latest), qwen2.5 variants, qwen3-coder, llama3.3/3.2 70b/vision/1b, llava 7b, codestral, gpt-oss 20b/120b, phi3 mini, qllama reranker, nomic embed.
- Tools: ffmpeg missing, puppeteer present, playwright absent; python modules ok with only `piper` available.
- Priorities: real estate ideas (#1 Ad+Creative Pack, #2 Follow-Up & Script Assistant, #3 Showing Packet/CMA Snapshot). Auto-builder to work on 10 ideas, currently recycling one task; re-prioritize the queue to hit more ideas.
- Expectations: Always grade models, capture strengths/weaknesses, keep log for council. Use SSOT addendum for instructions, ensure brutal honesty, mention unknowns, track third-party solutions.
- Processes: lifeos server under PM2 via `npx pm2 start server.js --name lifeos --env production`, `pm2 save`; plan to run `sudo env PATH=$PATH:/Users/adamhopkins/.nvm/versions/node/v22.21.0/bin /Users/adamhopkins/Projects/Lumin-LifeOS/node_modules/pm2/bin/pm2 startup launchd -u adamhopkins --hp /Users/adamhopkins`. Monitor via `/api/v1/tools/status`, `pm2 logs lifeos`.
