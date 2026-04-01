# AMENDMENT 17 — Transaction Coordinator (TC) Service

> **Y-STATEMENT:** In the context of Adam operating as a solo TC serving multiple real estate agents,
> facing unsustainable manual overhead for document intake, deadline tracking, and client communication,
> we decided to build a fully automated TC back-office system to achieve near-zero manual overhead
> while delivering premium visibility and communication, accepting that browser automation (SkySlope/Okta)
> creates a dependency on UI stability that could break without warning.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-04-01 (`tc-routes`: POST /browser/debug-portal — logs in to GLVAR, returns full link list + HTML snippet so we can see what the Clareity portal actually renders and find the real TD app-tile URL) |
| **Verification Command** | `node scripts/verify-project.mjs --project tc_service` |
| **Manifest** | `docs/projects/AMENDMENT_17_TC_SERVICE.manifest.json` |

**Status:** BUILDING — core infrastructure exists; portal, communication, QA, and compliance layers still in build
**Authority:** Subordinate to SSOT North Star Constitution

---

## WHAT THIS IS

A full Transaction Coordinator service that Adam operates for real estate agents.
The system handles:
- Document intake from email and manual upload → SkySlope
- Deadline tracking and automated reminders
- GLVAR dues monitoring (monthly) and violation monitoring (4× daily)
- MLS deal scanning for investor clients (flip/buy-and-hold/BRRRR)
- TC pricing and billing across three plan tiers
- eXp Realty Okta SSO browser automation for SkySlope and BoldTrail
- Agent portal + client portal with real-time file status
- Communication engine for milestone updates, missing docs, approvals, and weekly seller reports
- Escalation engine for urgent/critical deadlines that persists until acknowledged and resolved
- Commitment / integrity tracking, training review, and client-memory extraction where lawful and consented

**Mission:** Give Adam a fully automated TC back-office and client-facing service layer so he can service multiple agent clients with near-zero manual overhead while delivering premium communication, visibility, and compliance discipline.

---

## REVENUE MODEL

| Plan | Setup Fee | Monthly | Closing Fee | Notes |
|------|-----------|---------|-------------|-------|
| Founding Member | $500 (one-time) | $249/mo locked forever | $0 | Beta only — never increases |
| Monthly Standard | $0 | $149/mo | $0 | Standard after beta closes |
| Pay at Closing | $0 | $0 | $349/closed deal | $0 if deal falls through |

Setup fee is waivable. Closing fee for founding/monthly agents is $0 (covered by subscription).
Per-transaction agents pay $349 only on closed deals — no charge if the deal dies.

**Revenue triggers:**
- Agent signup → setup fee collected
- Monthly billing → subscription revenue
- Transaction closes → closing fee from escrow

**Strategic positioning:**
- This is not just "AI TC"
- The wedge is: inbox-to-compliance execution + premium visibility + premium communication
- The moat is: local-market specialization, real file-state visibility, document QA, portal automation, and closed-loop escalation

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `services/tc-browser-agent.js` | Puppeteer browser automation — eXp Okta SSO, SkySlope, BoldTrail, GLVAR |
| `services/tc-coordinator.js` | Core transaction management, deadline tracking, party coordination |
| `services/tc-doc-intake.js` | IMAP email scan for executed RPAs + manual upload → SkySlope |
| `services/tc-pricing.js` | Three-tier billing model, agent client registry, revenue summary |
| `services/glvar-monitor.js` | GLVAR dues scraping (monthly) + violation email monitoring (4× daily) |
| `services/email-triage.js` | Inbox scanner — classifies TC contracts, flags for immediate action |
| `services/mls-deal-scanner.js` | AI deal scoring, investor criteria matching, offer drafting |
| `services/tc-imap-config.js` | Canonical IMAP resolver shared by TC intake, triage, and GLVAR monitor |
| `services/tc-status-engine.js` | Computes derived file stage, health, next action, blockers, and portal-ready status views |
| `services/tc-document-validator.js` | Fail-closed completeness validator for doc intake and upload gating |
| `services/tc-portal-service.js` | Builds agent/client portal read models and tracks communications + document requests |
| `services/tc-report-service.js` | Showings, feedback, listing health scoring, and weekly seller/agent reports |
| `services/tc-automation-service.js` | Prepared-send automation for feedback requests, document requests, and weekly report delivery |
| `services/tc-communication-callback-service.js` | Normalizes delivery/reply callbacks into canonical communication status and showing-feedback capture |
| `services/tc-approval-service.js` | Approval cockpit state for review / approve / reject / snooze flows |
| `services/tc-alert-service.js` | Escalating alert engine for urgent/critical blockers with acknowledgement and resolution state |
| `services/tc-mobile-link-service.js` | Signed mobile one-tap links for approval and alert actions |
| `services/tc-feed-ingest-service.js` | Official MLS/showing-feed normalization into canonical TC reporting data |
| `services/tc-asana-sync-service.js` | Canonical TC -> Asana sync for parent transaction tasks and derived subtasks |
| `services/tc-workflow-specs.js` | Machine-readable listing and buyer workflow templates derived from TC operations |
| `services/tc-workflow-service.js` | Derived workflow task read model from canonical TC file state |
| `services/tc-offer-prep-service.js` | Client/property/comp-based offer recommendation engine for review-only offer prep |
| `services/tc-interaction-service.js` | Lawful interaction capture, disclosed/visible recording gate, commitment extraction, client-memory suggestions, and coaching review |
| `services/tc-access-service.js` | Access readiness and bootstrap for IMAP, GLVAR, TransactionDesk, and SkySlope prerequisites |
| `services/tc-intake-workspace-service.js` | Workspace summary for TC readiness, inbox triage, and transaction matching before filing |
| `services/tc-email-document-service.js` | TC mailbox: inbox attachment search/gather, Sent-mail resolution, prepared attachment email send |
| `services/tc-inspection-forward-service.js` | Seller/client email resolution; approval-time inspection package execution (stamp → send → optional TD) |
| `services/tc-pdf-signature-stamp.js` | Append listing-agent acknowledgment PDF page (`pdf-lib`) |
| `services/tc-td-party-sync.js` | GLVAR → TransactionDesk open file → `scrapeTransactionDeskParties` → `mergeTransactionParties` |
| `services/tc-td-workflow-runner.js` | Named bundles: `sync_parties`, `ui_inspection_prep`, `full_inspection_file_sync`, `scan_forms_catalog` |
| `services/tc-td-form-knowledge-service.js` | Persist TD form inventory snapshots + machine schema + handling playbook metadata |
| `services/tc-r4r-attachment-classify.js` | Filename-only R4R role classification (repair request vs inspection report) |
| `tests/tc-r4r.test.js` | Unit tests for R4R attachment classification |
| `scripts/tc-r4r-smoke.mjs` | Optional HTTP smoke: `r4r/scan` + relaxed `r4r/test-reject-all` |
| `scripts/tc-r4r-do-upload.mjs` | One-shot: `--address` / `--tx-id` → `POST r4r/scan` + `upload_to_td` (requires `TC_API_KEY` = Railway `COMMAND_CENTER_KEY`) |
| `services/tc-assistant-service.js` | TC-aware chat answers over workspace + file status; optional Groq council for open questions |
| `public/tc/tc-assistant.html` | Voice/dictation TC assistant UI at `/tc/assistant` |
| `services/tc-inspection-service.js` | **NEW** Inspection workflow: schedule → report → decision (accept/repair/reject); rejection fast path drafts cancellation notice, fires CRITICAL alert, cancels transaction |
| `db/migrations/20260327_tc_inspections.sql` | **NEW** tc_inspections table: inspector info, scheduling, report receipt, findings, buyer decision, repair request/response, cancellation notice, earnest money tracking |
| `routes/tc-routes.js` | All TC API endpoints |
| `routes/mls-routes.js` | MLS scanning and investor management endpoints |
| `public/tc/agent-portal.html` | Agent-facing at-a-glance portal for file health, blockers, docs, comms, and reports |
| `public/tc/client-portal.html` | Client-facing portal for simplified real-time status, requested docs, and updates |
| `public/tc/tc-portal.js` | Shared TC portal UI client for agent/client views |
| `db/migrations/20260322_tc_transactions.sql` | Core transactions table |
| `db/migrations/20260323_tc_fees.sql` | tc_agent_clients, tc_pricing_config, fee columns |
| `db/migrations/20260323_glvar_dues.sql` | glvar_dues_log, glvar_violations_log |
| `db/migrations/20260323_email_triage.sql` | email_triage_log |
| `db/migrations/20260327_email_triage_enrichment.sql` | Adds message_id + preview_text to triage log for better intake routing |
| `db/migrations/20260323_mls_investors.sql` | mls_investors, mls_deal_matches |
| `db/migrations/20260325_tc_portal.sql` | tc_document_requests, tc_communications for portal/service tracking |
| `db/migrations/20260325_tc_reporting.sql` | tc_showings, feedback, market snapshots, and weekly reports |
| `db/migrations/20260325_tc_approvals_automation.sql` | tc_approval_items for one-tap review / approve / send flows |
| `db/migrations/20260325_tc_alerts.sql` | tc_alerts, tc_alert_deliveries for closed-loop escalation |
| `db/migrations/20260326_tc_external_refs.sql` | tc_external_refs for Asana and future external sync mappings |
| `db/migrations/20260326_tc_interactions.sql` | tc_interactions for lawful capture, transcript review, commitments, profile updates, and coaching artifacts |

### Portal Access
| Portal | URL | Purpose |
|--------|-----|---------|
| TC voice assistant (same deployment) | `/tc/assistant` | Chat + mic dictation + dialog mode against TC workspace APIs |
| eXp Realty Okta | exprealty.okta.com | SSO for SkySlope + BoldTrail |
| GLVAR Clareity IAM | glvar.clareityiam.net | MLS + TransactionDesk + dues |
| SkySlope | Via eXp Okta tile | Transaction file management, doc upload |
| BoldTrail | Via eXp Okta tile | Real estate CRM |

### Key Environment Variables
**Canonical resolver:** `services/tc-imap-config.js` + `services/credential-aliases.js` — Railway may use legacy names without renames.

| Var | Purpose |
|-----|---------|
| `TC_IMAP_HOST` | TC mailbox IMAP host (optional if `IMAP_HOST` set — aliases merge in code) |
| `TC_IMAP_PORT` | TC mailbox IMAP port (optional if `IMAP_PORT` set; defaults to **993** when unset) |
| `TC_IMAP_USER` / `TC_IMAP_EMAIL` | TC mailbox login (falls back to `IMAP_USER`, `WORK_EMAIL`, or vault `email_imap`) |
| `TC_IMAP_APP_PASSWORD` / `TC_IMAP_APP_Adam_PASSWORD` | App password style secret (falls back to `WORK_EMAIL_APP_PASSWORD`, `IMAP_PASS`, vault) |
| `IMAP_HOST` / `IMAP_PORT` / `IMAP_USER` / `IMAP_PASS` | Shared naming convention; consumed when `TC_IMAP_*` not set |
| `ASANA_ACCESS_TOKEN` | Asana API token for TC sync |
| `ASANA_TC_PROJECT_GID` | Asana project GID for TC operational sync |
| `EMAIL_WEBHOOK_SECRET` | Validates Postmark and TC email callback webhooks |
| `TWILIO_WEBHOOK_SECRET` | Optional TC-specific secret for Twilio callbacks when different from email webhook secret |
| `GLVAR_mls_*` / `EXP_OKTA_*` / `exp_okta_*` | See `credential-aliases.js` for GLVAR and eXp Okta alias matrix |
| `TC_IMAP_SENT_MAILBOX` | Optional explicit IMAP path to Sent folder (e.g. Gmail `[Gmail]/Sent Mail`) when autodetect fails |
| `TC_LISTING_AGENT_SIGNATORY_NAME` | Display name on optional PDF acknowledgment pages (falls back to `TC_AGENT_DISPLAY_NAME` or literal “Listing agent”) |
| `TC_LISTING_AGENT_SIGNATURE_IMAGE_BASE64` | Optional PNG bytes (base64) embedded on acknowledgment page after operator approval |

### Product Surfaces
| Surface | User | Purpose |
|---------|------|---------|
| Agent Portal | Agent / TC team | At-a-glance file state, blockers, next action, missing docs, communications, approval queue |
| Client Portal | Seller / Buyer client | Real-time simplified status, requested documents, recent updates, weekly property report |
| Ops Layer | TC team | Asana task sync, exception handling, internal checklist execution |
| Approval Cockpit | Adam / agent | One-tap review → approve/reject/snooze/sign from phone |

### Portal Requirements
- Agent portal and client portal read from the same canonical transaction state
- Backend APIs for portal overview now exist; frontend pages should remain thin projections of those APIs
- Approval cockpit data now has a concrete backend path in code; agent portal can surface pending approvals and resolve them in-place
- Agent portal is detailed and operational
- Client portal is simplified, confidence-building, and real-time
- Client portal must answer:
  - where are we?
  - what is complete?
  - what is waiting?
  - what is blocking us?
  - what is next?
- Agent portal must answer:
  - what is the next best action?
  - what is overdue?
  - what was already sent?
  - what is waiting on seller / buyer / lender / title / admin?
  - what issue needs escalation now?

### File State Model (must be computed, not manual)
- `stage` — current transaction stage (now implemented in code via `services/tc-status-engine.js`)
- `health_status` — `green | yellow | red`
- `next_action`
- `next_action_owner`
- `waiting_on`
- `last_completed_step`
- `missing_doc_count`
- `blocker_count`
- `last_client_update_at`
- `next_client_update_due_at`
- `portal_sync_status` — SkySlope / BoldTrail / Asana / Dropbox where relevant

### File Timeline / Event Log
- Every transaction should maintain a full event trail:
  - intake found
  - document received
  - document reviewed
  - portal sync attempted
  - communication prepared
  - communication sent
  - approval requested
  - approval granted/rejected
  - issue/blocker raised
  - issue resolved
- Timeline is the base for both dashboards and audit

### Stage Machine (minimum)
- `intake`
- `docs_review`
- `awaiting_missing_items`
- `awaiting_internal_review`
- `awaiting_client_approval`
- `ready_for_filing`
- `filed`
- `active_listing` / `active_transaction`
- `closing_prep`
- `closed`
- `blocked`

### Document QA / Completeness Gate
- Every inbound file should be classified and validated before automatic filing
- Uploads must fail closed by default when required signals are missing
- Validator output must include:
  - pass / review / fail verdict
  - missing-items list
  - extracted facts (address / price / parties when possible)
  - confidence
- Automatic SkySlope filing should only proceed when the validator passes or a human force-approves the upload

### Portal Service Tracking
- Communications and requested-document records must be first-class data, not inferred only from ad-hoc tasks
- Agent/client portal overview must be able to show:
  - requested documents still open
  - communications drafted/sent/failed
  - recent updates and next required outreach
- Client portal view should be a filtered projection of the same canonical file state, not a separate system

### Communication Engine
- Every file must track what has been sent, what is waiting, and what is overdue
- Standard communication events include:
  - welcome / file opened
  - docs received / under review
  - missing docs / action needed
  - seller approval request
  - listing live / milestone reached
  - weekly seller update
  - issue escalation
- System prepares the communication, human reviews only where required

### Service Standard
- The product is not just doing work; it is communicating clearly and professionally
- A file is not "on track" unless both execution and communication are on track
- Default posture:
  - proactive updates
  - no client guessing
  - no agent hunting for status
- Communication quality is part of the product's definition of done

### Reporting Engine Implementation Notes
- Weekly report generation now has a concrete backend path in code: showings + feedback + latest market snapshot -> health score -> recommendations -> persisted report
- Market snapshot inputs are currently manual/API-fed placeholders until MLS/showing-system feeds are wired back in
- Feedback and showing capture are first-class records so weekly seller updates can be grounded in evidence, not memory
- Weekly report delivery can now be prepared as communication drafts and routed through approval flows instead of sending blindly

### Automation + Approval Cockpit
- Showing feedback requests can be prepared and optionally sent by SMS/email immediately after a showing
- Document requests can be prepared and optionally sent through the same communication ledger
- Weekly reports can be generated, turned into communication drafts, and queued for approval
- Approval items are first-class records with:
  - status: `pending | awaiting_review | approved | rejected | snoozed | completed`
  - priority: `low | normal | urgent | critical`
  - prepared action metadata so one tap can continue the workflow
- Product rule:
  - no urgent alert without a prepared next action
  - no irreversible submission without explicit approval

### Alert Escalation Engine
- Alerts are first-class records with:
  - severity: `info | action_required | urgent | critical`
  - status: `open | acknowledged | snoozed | resolved`
  - escalation step + next escalation timestamp
  - delivery receipts per escalation attempt
- For agent-facing urgent/critical items the system should escalate by policy until acknowledged, then continue reminding until resolved
- Portal/mobile UX should expose one-tap:
  - acknowledge
  - snooze
  - resolve
- System rule:
  - low-friction by default
  - repeated escalation only when the issue is still open
  - every urgent alert should include the prepared next step

### Weekly Listing Report (seller-facing + agent-facing)
- Showings completed and showing velocity trend
- Feedback requested from showing agents immediately after showing; summarize returned themes
- New competing listings, pendings, solds, price reductions, DOM trend
- Online engagement metrics only from lawful/compliant sources (MLS feed, showing system, CRM, official portal/API access)
- Listing health score: `Healthy | Watch | At Risk`
- Clear recommendation: hold / adjust price / improve presentation / improve access / follow up

### Listing Health Engine
- Inputs may include:
  - showing velocity
  - inquiry velocity
  - showing feedback sentiment/themes
  - comp movement
  - DOM pressure
  - price competitiveness
  - saves/views/leads where officially available
- Outputs:
  - `Healthy`
  - `Watch`
  - `At Risk`
- Goal is directional guidance with reasoning, not fake precision

### Data Source Hierarchy
- Prefer:
  1. official MLS/API/feed access
  2. official showing / CRM / task APIs
  3. direct provider integrations
  4. browser automation where no API exists
  5. scraping only as last resort and only where lawful/permitted
- Product rule:
  - API first
  - browser automation second
  - scraping last
- Client-facing reporting should not depend on brittle or non-compliant scraping

### Offer Prep Command Engine
- Natural-language command target:
  - `prepare an offer for X client on Z property`
- System should pull:
  - client profile and constraints
  - comp set / market context
  - contingency needs
  - urgency, financing, appraisal-gap tolerance, sale-of-home dependency
- Output:
  - recommended range
  - confidence
  - assumptions
  - contingency suggestions
  - prepared docs/tasks for review
- Never pretend certainty or use fake precision; ranges + rationale only

### Client Profile Memory
- Offer prep and communication should use structured client knowledge such as:
  - budget / max stretch
  - financing type
  - sale contingency requirement
  - appraisal-gap tolerance
  - inspection tolerance
  - urgency / timing
  - communication preferences
  - deal-breakers / must-haves
- Profile updates suggested by the system must be reviewable before becoming authoritative

### Mobile Approval Flow
- Every urgent review should open directly on phone
- One tap should bring up:
  - exact file
  - exact document
  - issue summary
  - prepared recommendation
  - deadline
- One-tap actions:
  - approve
  - reject
  - snooze
  - sign
  - escalate
- Goal: Adam can step out briefly, approve, and let automation continue

### Escalation Engine
- Severity classes: `info`, `action_required`, `urgent`, `critical`
- Alerts escalate until one of: `acknowledged`, `snoozed`, `approved`, `completed`, `resolved`
- For Adam specifically:
  - SMS / push first
  - repeated escalation for urgent deadlines
  - critical path may escalate to call/alarm-style behavior where technically and legally permitted
- Alert payload must always include:
  - what happened
  - why it matters
  - what is already prepared
  - deadline
  - one-tap next step

### Closed-Loop Task Model
- The system should do the setup work first
- Human role is reduced to review / approve / sign where needed
- Task states:
  - `open`
  - `prepared`
  - `awaiting_review`
  - `approved`
  - `completed`
  - `blocked`
- Alert states:
  - `sent`
  - `acknowledged`
  - `snoozed`
  - `resolved`
- Product principle:
  - never escalate noise
  - escalate prepared work with a clear next step

### Recording / Commitment / Coaching Layer
- Personal operating preference: rolling one-hour buffer for memory support and missed-detail recovery
- Commitment tracking:
  - capture promises/commitments where lawful and consented
  - require completion, renegotiation, or ethical withdrawal — never silent forgetting
- Client memory extraction:
  - automatically suggest profile updates from interactions
  - only store high-signal, relevant facts
- Coaching review:
  - what happened
  - result
  - what was missed
  - how client reacted
  - how to improve next time
- Recording must fail closed where legal/consent conditions are not satisfied

### Training / Improvement Loop
- The system should ask reflective review questions after key interactions:
  - what happened?
  - what were the results?
  - how did the client react?
  - what did we miss?
  - how can we improve next time?
- Goal is structured learning, not generic motivational coaching
- Coaching outputs should feed:
  - agent improvement notes
  - commitment review
  - client profile refinement
  - future communication quality

### Recording / Consent Rules
- System follows only what is lawful in the applicable jurisdiction
- Phone calls must use disclosed recording when required; if disclosure/consent path is unavailable, recording is disabled
- No stealth or hidden call recording flows
- In-person / local recording features are permissioned and must expose visible recording state
- If legal status is uncertain for a given interaction type → no recording, notes-only mode
- Recording is for service quality, commitment tracking, and coaching — not for blanket retention of irrelevant private conversation
- System should support rolling-buffer capture preferences for Adam where lawful, but only preserve relevant segments after a trigger or review action

### Asana Role
- Asana is the human operations surface, not the source of truth
- System DB is canonical for transaction state, communications, blockers, and portal status
- Asana sync should focus on:
  - project/task generation from templates
  - exceptions
  - ownership
  - human review work
  - analyzed interactions and unsent communications that still need action
- Avoid making agents manage status manually in two places
- Asana templates are a useful base, but must be converted into machine-readable workflow specs that the system can execute against
- Initial backend support now exists to:
  - preview the Asana sync plan from canonical TC state
  - upsert a parent task per transaction
  - upsert subtasks for open document requests, approvals, and alerts
  - persist external ID mappings in `tc_external_refs`

### Workflow Specs
- Listing-side and buyer-side workflow templates must exist as machine-readable specs, not screenshots only
- Workflow specs should include:
  - stage grouping
  - task labels
  - trigger/completion signals
  - communication hooks
  - exceptions / review gates
- Initial backend support now exists to derive workflow tasks from canonical file state and expose them for portal/Asana use

### API Endpoints (all under `/api/v1/tc/`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/status` | **No auth** — deploy smoke (Node + DB + auth flags); use before debugging portal |
| GET | `/transactions` | List all transactions |
| POST | `/transactions` | Create transaction with fee assignment |
| GET | `/plans` | Public — TC pricing plans (no auth) |
| GET | `/clients` | List agent clients |
| POST | `/clients` | Enroll new agent client |
| GET | `/fees/revenue` | MRR, ARR, outstanding fees |
| POST | `/intake/run` | Full email→SkySlope intake run |
| POST | `/intake/email-search` | Dry-run email scan |
| GET | `/intake/workspace` | Agent intake workspace for readiness, triage queue, and suggested transaction matches |
| POST | `/intake/upload` | Manual doc upload → SkySlope |
| POST | `/transactions/:id/browser/listing-to-skyslope` | Async job: GLVAR→TransactionDesk search→download executed listing agreement→SkySlope (default `dry_run:true`) |
| GET | `/browser-jobs/:jobId` | Poll listing→SkySlope job steps and status |
| POST | `/email/send-attachment-package` | Find a matching email, combine photo attachments into one PDF, and email the package out immediately |
| POST | `/transactions/:id/email/preview-inspection-mailbox` | IMAP search only — list messages with attachments matching address-derived hints (+ overrides) |
| POST | `/transactions/:id/email/gather-inspection-attachments` | Download PDFs (default) from **all** matching messages; returns paths for operator review |
| POST | `/transactions/:id/email/prepare-inspection-forward-approval` | Resolve seller/client email (`parties.seller`, or Sent-mail search via hints), preview attachments, create **`tc_approval_items`** with `prepared_action.kind=forward_inspection_docs`; operator **PATCH approves** to send. Optional `requires_listing_agent_signature:true` appends acknowledgment PDF pages on approve; optional `upload_to_td:true` uploads after send |
| POST | `/transactions/:id/email/forward-inspection-docs` | Same as gather+send but **immediate**; `recipient_email` optional if resolvable from `parties` or Sent search (`seller_name_hints`, `seller_name_loose`, `sent_subject_contains`, `sent_search_days`) |
| POST | `/transactions/:id/email/upload-gathered-to-td` | Gather + upload each PDF to linked TransactionDesk file (browser agent; validator + `force_upload` supported) |
| POST | `/transactions/:id/browser/td-sync-parties` | Login → TD → open file (`transaction_desk_id` and/or `address_search`) → scrape mailto + labeled rows → **`mergeTransactionParties`** (default persists; set `dry_run:true` to preview only). Options: `overwrite_parties` |
| POST | `/transactions/:id/browser/td-ui-plan` | Open TD file then run a named **`TD_UI_PLANS`** step list (`open_forms`, `open_esign`, `open_documents`, `inspection_seller_signing_prep`) — best-effort clicks + full-page screenshots for operator verification; **does not** complete platform e-sign or form fields |
| GET | `/td-workflows/catalog` | List stable **`workflow`** ids + summaries for `POST .../browser/td-workflow` |
| POST | `/transactions/:id/browser/td-workflow` | Run a catalog workflow: **`sync_parties`**, **`ui_inspection_prep`**, **`full_inspection_file_sync`**, **`scan_forms_catalog`**. Default **`async`** (HTTP 202) — poll **`GET /browser-jobs/:jobId`** (same as listing job). Set **`async:false`** for inline response (timeout risk). Body passes through options (`dry_run`, `overwrite_parties`, `address_search`, `plan`, `parties_dry_run`, `persist`, `include_machine_fields`, `max_schema_forms`, `max_fields_per_form`) |
| GET | `/td/forms-knowledge` | List persisted TD form inventory (+ optional `transaction_id`, `limit`) |
| POST | `/td/forms-knowledge/generate-playbooks` | Bulk infer handling playbooks (`flow`, signer role, required-field list, routing defaults, confidence) from `machine_schema`; supports `transaction_id`, `limit`, `overwrite` |
| POST | `/td/forms-knowledge/:id/resolve-plan` | Resolve executable plan by merging template defaults + intent profile + per-case overrides |
| PATCH | `/td/forms-knowledge/:id` | Attach/update handling playbook JSON + confidence for a known TD form row |
| POST | `/transactions/:id/r4r/scan` | R4R intake scan: mailbox gather + attachment role classification (`repair_request` / `inspection_report` / `other`), optional TD upload with `doc_type_prefix` |
| POST | `/transactions/:id/r4r/send-seller-review` | Queue approval to send seller review package (inspection + repair request) with call script; approve via `/approvals/:id` |
| POST | `/transactions/:id/r4r/record-seller-choice` | Record seller decision (`accept` / `reject` / `counter`) into inspection `repair_response`, then create review approval for buyer-side finalization |
| POST | `/transactions/:id/r4r/test-reject-all` | First-test scenario: verify R4R+inspection files found, resolve template plan with `reject_all_repairs` intent/overrides, and create review approval before final response recording |
| GET | `/access/readiness` | Show which email/browser prerequisites are configured vs still missing |
| POST | `/access/bootstrap` | Store non-secret defaults and optional secret access inputs for TC |
| GET | `/glvar/dues` | Current dues status |
| GET | `/glvar/violations` | Violation log |
| POST | `/email/triage/:id/create-transaction` | Create a placeholder transaction from a triaged contract email |
| POST | `/test-skyslope-login` | Test eXp Okta → SkySlope connection |
| POST | `/test-boldtrail` | Test eXp Okta → BoldTrail connection |
| POST | `/offers/prepare` | Build offer recommendation set from property, client constraints, and comps |
| POST | `/transactions/:id/offers/prepare` | Build offer recommendation set using a transaction as the starting context |
| GET | `/transactions/:id/inspection` | Inspection state + contingency countdown |
| POST | `/transactions/:id/inspection/schedule` | Record inspector + scheduled date |
| POST | `/transactions/:id/inspection/report` | Mark report received + findings |
| POST | `/transactions/:id/inspection/decision` | Buyer decision: accept / repair request / reject+cancel path |
| POST | `/transactions/:id/inspection/repair-response` | Seller response to repair request |
| POST | `/transactions/:id/inspection/send-cancellation` | Mark cancellation notice sent (reject path) |
| POST | `/webhooks/postmark` | Inbound Postmark delivery/open callbacks (when wired) |
| POST | `/webhooks/twilio` | Inbound Twilio SMS status callbacks (when wired) |

### Offer Prep Command Engine
- Command shape should support:
  - client / buyer profile
  - subject property
  - comp set
  - seller/market signals
  - client-specific constraints like sale contingency, financing type, close window, and risk tolerance
- Output should include:
  - conservative / balanced / aggressive options
  - likely acceptance range
  - confidence band
  - rationale and assumption notes
- Product rule:
  - no fake precision
  - guidance must be review-oriented and clearly state constraints
  - Adam still reviews and signs all offers

### MLS Investor Endpoints (under `/api/v1/mls/`)
| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/investors` | Investor registry CRUD |
| POST | `/scan` | Score current MLS listings against all investors |
| GET | `/matches` | Deal matches ready for review |
| POST | `/matches/:id/draft` | Draft offer in TransactionDesk (Adam signs) |

---

## CURRENT STATE

### Done
- ✅ Browser agent — eXp Okta login, SkySlope nav, BoldTrail nav, GLVAR nav
- ✅ TC coordinator — transactions, deadlines, parties, Nevada standard timelines
- ✅ Doc intake — IMAP scan, attachment download, SkySlope upload pipeline
- ✅ Three-tier pricing — founding/monthly/per-transaction, agent registry, revenue dashboard
- ✅ GLVAR monitor — dues cron (monthly), violation cron (4× daily)
- ✅ Email triage — 30-min scan cycle, immediate alerts for TC contracts
- ✅ MLS deal scanner — AI scoring, investor criteria matching, offer draft workflow
- ✅ All DB migrations written
- ✅ Railway managed-env bootstrap — one-time token endpoint to self-manage vars
- ✅ `POST /bulk` now stores in Neon AND pushes to Railway in one call
- ✅ TC runtime wiring hardened — account-manager injection, notification service usage, IMAP config consistency, route/runtime fixes
- ✅ Inspection workflow — `tc-inspection-service.js`: schedule → report → decision (accept/repair/reject); rejection fast path: draft cancellation notice, fire CRITICAL/urgent alert, cancel transaction in DB, log full audit trail; seller repair response handling with auto-alert when rejected; Nevada 10-day inspection contingency default
- ✅ Inspection routes — under `/transactions/:id/inspection` (GET state; POST schedule, report, decision, repair-response, send-cancellation)

### Blocking (must resolve before first real transaction)
- 🔲 TC mailbox fully configured in Railway **or** credential vault — IMAP user + secret (see aliases in `credential-aliases.js`); optional: `POST /api/v1/railway/managed-env/bulk`
- 🔲 eXp Okta credentials present and **rotated** if they were ever exposed outside the vault
- 🔲 TC mailbox app password **rotated** if it was ever exposed outside the vault
- 🔲 Run `POST /api/v1/tc/intake/email-search` dry run to verify email scan works
- 🔲 Run `POST /api/v1/tc/test-skyslope-login` to verify SSO works
- 🔲 Build document completeness / missing-signature / missing-field QA before trusting automated filing
- 🔲 Strengthen form-specific Nevada/eXp validation packs beyond the current generic fail-closed gate
- 🔲 Polish agent/client portal UI on top of the now-live overview/report/approval APIs
- 🔲 Validate the new Postmark/Twilio TC webhook paths against live provider payloads and external-id mapping
- 🔲 Refine alert escalation cadence and device-specific mobile delivery behavior
- 🔲 Wire real Asana credentials/project and run first live sync
- 🔲 Extend the new mobile one-tap link flow into full document review / sign handoff and explicit device-side rolling-buffer UX
- 🔲 Refine machine-readable listing/buyer workflow specs against the full real Asana templates
- 🔲 Wire live official MLS/showing provider credentials into the new feed-ingest endpoints and validate the first production snapshots
- 🔲 Confirm **production deploy** uses the repo `Dockerfile` (Chromium + `PUPPETEER_EXECUTABLE_PATH`) — Nixpacks-only builds may not include Chromium unless separately configured

### Next milestones
- First real transaction intake end-to-end (email → SkySlope)
- First paying agent client enrolled
- MLS investor registry populated with at least one buyer profile
- First real-time file status card visible to agent at a glance
- First weekly seller property report generated from live market + showing + feedback data
- First one-tap mobile approval flow (review → approve/sign → continue automation)
- First automated showing-feedback request delivered and tracked through the TC communication ledger
- First structured Asana-to-LifeOS workflow mapping for listing side and buyer side templates
- First offer-prep command run using real client profile + comp set + contingency logic

---

## NON-NEGOTIABLES

- Adam signs ALL offers — system drafts for review only, never submits automatically
- Closing fees for per-transaction clients collected from escrow only — never charged if deal falls
- Setup fee can be waived at Adam's discretion — `waivedSetup: true` in createAgentClient()
- All browser sessions use screenshots at every step for audit trail
- IMAP credentials stored encrypted in Neon via managed-env service — never in plaintext
- Client portal shows real-time status, next step, blockers, and recent updates; client should not need to ask where the file stands
- Agent portal must show at a glance: current stage, next action, waiting_on, missing docs, blockers, communications sent, and file health
- Document QA must fail closed when uncertain — never file incomplete or questionable paperwork as if it passed review
- Communications are part of the product, not an afterthought; every major milestone should have a prepared update path
- Alerts for Adam should escalate until acknowledged and continue lighter pressure until approved/completed/resolved
- No urgent alert without a prepared next step
- Phone-call recording must only occur when legally and operationally permitted by the system's consent/disclosure policy
- If recording legality/consent is unclear, recording features are disabled and notes-only mode is used
- Extracted client-profile facts must be useful, relevant, and reviewable — never dump raw transcript noise into memory
- Asana is not the source of truth; canonical transaction state remains in LifeOS DB/services
- The best version of this product is API-first for MLS/CRM/tasks, browser-automation where APIs do not exist, and scraping only as a last resort
- Seller/Buyer weekly updates must be easy to read, professional, and clearly indicate whether the file/listing is healthy, watch, or at risk
- The system should reduce Adam's role to: review, approve, sign, and handle true exceptions

---

## REFACTOR STATUS
- All TC HTTP routes live in `routes/tc-routes.js` (portal, dashboard, webhooks, inspection, intake, etc.); MLS investor routes in `routes/mls-routes.js`
- No TC logic in `server.js` except service initialization
- Runtime mounting: `startup/register-runtime-routes.js` (not `boot-domains.js` for route registration)

---

## Owned Files
*(Sources of truth: this amendment + `AMENDMENT_17_TC_SERVICE.manifest.json` — keep them in sync.)*

```
routes/tc-routes.js
routes/mls-routes.js
services/tc-coordinator.js
services/tc-browser-agent.js
services/tc-doc-intake.js
services/tc-pricing.js
services/tc-status-engine.js
services/tc-document-validator.js
services/tc-portal-service.js
services/tc-report-service.js
services/tc-automation-service.js
services/tc-communication-callback-service.js
services/tc-approval-service.js
services/tc-alert-service.js
services/tc-mobile-link-service.js
services/tc-feed-ingest-service.js
services/tc-asana-sync-service.js
services/tc-workflow-specs.js
services/tc-workflow-service.js
services/tc-offer-prep-service.js
services/tc-interaction-service.js
services/tc-access-service.js
services/tc-intake-workspace-service.js
services/tc-inspection-service.js
services/tc-review-package-service.js
services/tc-email-document-service.js
services/tc-email-monitor.js
services/tc-imap-config.js
services/credential-aliases.js
services/email-triage.js
services/glvar-monitor.js
services/mls-deal-scanner.js
public/tc/agent-portal.html
public/tc/client-portal.html
public/tc/tc-portal.js
db/migrations/20260322_tc_transactions.sql
db/migrations/20260323_tc_fees.sql
db/migrations/20260323_email_triage.sql
db/migrations/20260323_glvar_dues.sql
db/migrations/20260323_mls_investors.sql
db/migrations/20260325_tc_portal.sql
db/migrations/20260325_tc_reporting.sql
db/migrations/20260325_tc_approvals_automation.sql
db/migrations/20260325_tc_alerts.sql
db/migrations/20260326_tc_external_refs.sql
db/migrations/20260326_tc_interactions.sql
db/migrations/20260326_tc_review_packages.sql
db/migrations/20260327_email_triage_enrichment.sql
db/migrations/20260327_tc_inspections.sql
Dockerfile
```

## Protected Files (read-only for this project)
```
server.js          — composition root only
services/email-triage.js  — shared with email domain
```

---

## Build Plan

- [x] **TC coordinator — core transaction/deadline/party model** *(est: 8h | actual: 10h)* `[high-risk]`
- [x] **Email triage — IMAP scan + TC contract detection** *(est: 6h | actual: 8h)* `[needs-review]`
- [x] **SkySlope browser agent — Okta SSO + doc upload** *(est: 8h | actual: 12h)* `[high-risk]`
- [x] **Three-tier pricing + agent registry** *(est: 4h | actual: 4h)* `[safe]`
- [x] **GLVAR monitor — dues + violation crons** *(est: 3h | actual: 3h)* `[safe]`
- [x] **MLS deal scanner — AI scoring + investor matching** *(est: 6h | actual: 8h)* `[needs-review]`
- [x] **DB migrations — all TC tables** *(est: 4h | actual: 5h)* `[safe]`
- [x] **Railway managed-env bootstrap + bulk push** *(est: 2h | actual: 2h)* `[safe]`
- [x] **TC runtime wiring hardened (account-manager, notification, IMAP)** *(est: 3h | actual: 4h)* `[needs-review]`
- [x] **Offer prep command engine** *(est: 5h | actual: 6h)* `[needs-review]`
- [x] **TC access readiness + bootstrap for email / GLVAR / SkySlope prerequisites** *(est: 3h | actual: 3h)* `[needs-review]`
- [x] **TC intake workspace in the agent portal for readiness, triage queue, and suggested transaction matching** *(est: 4h | actual: 4h)* `[needs-review]`
- [x] **Email triage enrichment with preview text and stronger workspace matching** *(est: 3h | actual: 3h)* `[needs-review]`
- [x] **Create placeholder transactions directly from triaged contract emails** *(est: 3h | actual: 3h)* `[needs-review]`
- [x] **Link triaged emails directly to existing transactions from the intake workspace** *(est: 3h | actual: 2h)* `[needs-review]`
- [x] **Expose recent intake routing activity in the workspace** *(est: 2h | actual: 1h)* `[safe]`
- [x] **Expose manual document QA and dry-run upload controls in the workspace** *(est: 2h | actual: 2h)* `[safe]`
- [x] **Expose dry-run intake execution in the workspace** *(est: 2h | actual: 1h)* `[safe]`
- [x] **Create document requests directly from failed workspace QA checks** *(est: 2h | actual: 1h)* `[safe]`
- [x] **Seed known TC env defaults automatically while leaving secrets blank for manual entry** *(est: 2h | actual: 2h)* `[safe]`
- [x] **Show which secret envs are already present so the workspace stops asking for secrets that already exist** *(est: 1h | actual: 1h)* `[safe]`
- [x] **Show a managed-env snapshot so TC setup can see runtime presence vs sync state in one place** *(est: 2h | actual: 1h)* `[safe]`
- [ ] **→ NEXT: First real transaction intake end-to-end (6453 Mahogany Peak)** *(est: 4h)* `[high-risk]`
- [ ] **IMAP vars set in Railway + dry-run email scan** *(est: 1h)* `[safe]`
- [ ] **SkySlope login test on Railway** *(est: 1h)* `[needs-review]`
- [ ] **Document QA — missing-signature / missing-field detection** *(est: 6h)* `[high-risk]`
- [ ] **Agent portal UI polish** *(est: 4h)* `[safe]`
- [ ] **Postmark/Twilio webhook validation** *(est: 2h)* `[needs-review]`
- [ ] **First paying agent client enrolled** *(est: 2h)* `[safe]`
- [ ] **Stripe billing wired to TC plan tiers** *(est: 4h)* `[needs-review]`

**Progress:** 22/30 steps complete | Est. remaining: ~12h

---

## Anti-Drift Assertions
```bash
# TC routes file exists and is syntax-clean
node --check routes/tc-routes.js

# TC coordinator exists
node --check services/tc-coordinator.js

# GLVAR monitor exists
node --check services/glvar-monitor.js

# TC transactions table exists in DB
psql $DATABASE_URL -c "\d tc_transactions" | grep -q "address"

# Adam-signs-all rule — no auto-submit in routes
grep -r "submitOffer\|autoSubmit\|auto_submit" routes/tc-routes.js
# Should return NOTHING (offers are drafted, never auto-submitted)

# TC routes are mounted
grep "createTCRoutes" startup/register-runtime-routes.js
```

*Automated: `node scripts/verify-project.mjs --project tc_service`*

---

## Decision Log

### Decision: Adam signs all offers — never auto-submit — 2026-03-13
> **Y-Statement:** In the context of a real estate TC system handling legally binding offers,
> facing the liability risk of an automated system submitting an offer at the wrong price or terms,
> we decided to always draft for review and require Adam's explicit sign-off to achieve
> zero legal exposure from automation errors, accepting that this creates a mandatory human step.

**Reversibility:** `one-way-door` — auto-submit would require E&O review and legal sign-off

### Decision: SkySlope via browser automation (Puppeteer), not API — 2026-03-22
> **Y-Statement:** In the context of needing SkySlope document management for Nevada TC compliance,
> facing the fact that SkySlope does not offer a public API for third-party access,
> we decided to use Puppeteer browser automation via Okta SSO to achieve programmatic doc upload,
> accepting the fragility risk that UI changes can break automation.

**Alternatives rejected:**
- *Direct SkySlope API* — no public API available
- *Manual upload by Adam* — defeats the TC automation value prop

**Reversibility:** `two-way-door` — switch to API if SkySlope ever opens one

### Decision: IMAP for email triage, not Gmail API — 2026-03-22
> **Y-Statement:** In the context of scanning adam@hopkinsgroup.org for TC contracts,
> facing the OAuth complexity and Google Workspace admin access requirements for Gmail API,
> we decided to use IMAP with app password to achieve simpler credential management,
> accepting that app passwords require Google security settings to be adjusted once.

**Reversibility:** `two-way-door`

---

## Why Not Other Approaches
| Approach | Why We Didn't Use It |
|---|---|
| Third-party TC software (DotLoop, Glide) | No programmatic control; can't integrate with our AI council or build revenue on top |
| SkySlope public API | Doesn't exist — browser automation is the only path |
| Full autopilot (no Adam review) | Legal liability — Nevada real estate law requires licensed agent on offers |
| Zapier/Make.com for email triage | No control over AI classification logic; can't route to our DB |

---

## Test Criteria
- [ ] `POST /api/v1/tc/transactions` creates a transaction row in tc_transactions
- [ ] `GET /api/v1/tc/transactions/:id` returns full transaction with deadlines, parties, documents
- [ ] GLVAR dues cron fires monthly without manual trigger
- [ ] Email triage detects a contract email, updates `tc_transactions.documents` or `tc_document_requests`, and logs the routing event
- [ ] SkySlope login test returns success screenshot (not error page)
- [ ] Offer prep returns conservative / balanced / aggressive options (not a single number)
- [ ] Per-transaction billing records in tc_fees on transaction close
- [ ] Agent portal shows current stage, next action, missing docs, blockers

---

## Handoff (Fresh AI Context)
**Current blocker:** Live secrets and first-file execution still need to be completed — the workspace now prefers `adam@hopkinsgroup.org` for TC intake, honors the current Railway alias vars (`TC_IMAP_APP_Adam_PASSWORD`, `GLVAR_mls_*`, `exp_okta_*`), surfaces only actionable setup gaps, and shows active files as red/yellow/green transaction cards with click-through action routing; **live** IMAP + GLVAR + eXp vault values are still required before first real intake and first real outbound package send run end-to-end.

**Last decision:** TC access should use managed env for defaults and the credential vault for secrets; startup guards now check real readiness instead of stale hard-coded env names

**Do NOT change:**
- `services/tc-coordinator.js`: Nevada standard timelines are hard-coded intentionally — they reflect actual NRS deadlines
- Adam-signs-all rule: no auto-submit logic should ever be added without explicit user approval
- IMAP credentials: stored in Railway managed env or the encrypted credential vault, never in code or .env files checked into git
- Agent portal without `?tx=` should remain the intake workspace, not a blank error page

**Read first:** `routes/tc-routes.js`, `services/tc-coordinator.js`, `services/glvar-monitor.js`

**Known traps:**
- SkySlope Puppeteer requires Chromium on the **runtime** image — the repo root `Dockerfile` installs Chromium and sets `PUPPETEER_EXECUTABLE_PATH`; if Railway is not using that Dockerfile, browser automation may still fail until Chromium is available in the build
- Rotate any Okta or mailbox credential that may have left the vault
- TC email triage runs on 30-min cycle — don't add shorter polling without checking Groq free tier impact

---

## Runbook (Operations)

| Symptom | Likely Cause | Fix |
|---|---|---|
| Email triage not picking up contracts | IMAP config missing from env/vault | Check `GET /api/v1/tc/access/readiness`, then bootstrap via `POST /api/v1/tc/access/bootstrap` or store `email_imap` via `POST /api/v1/accounts/store`; runtime also honors `TC_IMAP_APP_Adam_PASSWORD` and `WORK_EMAIL_APP_PASSWORD` as password aliases |
| Need to send photos/SRPD package from email fast | Matching photo email exists but attachments have not been packaged and sent yet | Use `POST /api/v1/tc/email/send-attachment-package` with subject/from search, recipient email, subject, and body; the route will pull attachments from the TC mailbox, combine renderable images into one PDF, and send it |
| Inspection report spread across several inbox messages; forward PDFs to buyer agent/TC; push same set to TD | Single-email `send-attachment-package` is insufficient | **Preview:** `POST /api/v1/tc/transactions/:id/email/preview-inspection-mailbox` — **Gather:** `.../gather-inspection-attachments` — **Forward:** `.../forward-inspection-docs` with `recipient_email`, optional `narrative`, `dry_run:false` to send — **TD:** `.../upload-gathered-to-td` (requires `transaction_desk_id`). Response includes `transaction_desk_playbook` for manual e-sign routing in TD |
| Need seller client email (Pam) without typing it | Email lives in TD or Sent mail | **`POST .../browser/td-sync-parties`** (link `transaction_desk_id` first) merges scraped mails into `parties`, or use **`sync_td_parties_first:true`** on prepare/forward. Fallback: `seller_name_hints` / Sent search — optional `requires_listing_agent_signature` + `TC_LISTING_AGENT_*` env for PDF acknowledgment pages |
| Need Forms / e-sign tabs opened in TD from LifeOS | TD UI is not a stable API | **`POST .../browser/td-ui-plan`** with `plan: inspection_seller_signing_prep` (or `open_forms`, `open_esign`, `open_documents`) — returns step log + screenshots; operator completes recipients, Nevada forms, and coop send inside TD |
| Run party scrape + inspection UI chain without timing out HTTP | Long Puppeteer runs | **`POST .../browser/td-workflow`** with `workflow: full_inspection_file_sync` (or `sync_parties` / `ui_inspection_prep`) — **202** + `job_id`, then **`GET /browser-jobs/:jobId`**. **`GET /td-workflows/catalog`** lists workflows |
| Keep TD forms knowledge in-system so operator does not reteach each file type | Form names and handling differ by package/template | Run **`POST .../browser/td-workflow`** with `workflow: scan_forms_catalog` to scrape visible Forms inventory and persist. Add **`include_machine_fields:true`** to scrape machine-readable controls per form (input/select/textarea schema). Read with **`GET /td/forms-knowledge`**, then store handling instructions via **`PATCH /td/forms-knowledge/:id`** |
| Agent portal opens with no transaction context | No `?tx=` parameter was supplied | Use the intake workspace that now loads by default and run setup/scan from there |
| SkySlope login fails | Okta session expired or credentials missing from vault/env aliases | Store/rotate `exp_okta` via `POST /api/v1/accounts/store`, or ensure `exp_okta_Username` / `exp_okta_Password` are set, then re-run readiness |
| GLVAR dues cron not firing | GLVAR_DUES_DAY env var not set or cron not registered | Check startup/register-schedulers.js mounts GLVAR cron |
| Transaction created but no deadlines | Nevada timeline generator not called | Check tc-coordinator.js generateNevadaTimeline() call after INSERT |
| Offer prep returns generic response | AI council falling back to Ollama with truncated prompt | Check token_usage_log — if Ollama, optimize system prompt |

---

## Decision Debt
- [ ] **TC access secrets still need real values** — readiness/bootstrap routes exist, but IMAP password plus GLVAR and eXp Okta credentials still need to be entered with live values
- [ ] **SkySlope Puppeteer on Railway** — confirm deploy uses Dockerfile Chromium (or equivalent); without it, browser automation fails at runtime
- [ ] **Stripe not wired to TC tiers** — billing plans exist in DB but Stripe integration not connected
- [ ] **Credential hygiene** — rotate Okta/mailbox secrets if they were ever exposed outside the vault
- [ ] **Nevada validation packs incomplete** — form-specific QA beyond generic fail-closed gate not built

---

## Change Receipts

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-03-30 | **`tc-browser-agent` `uploadDocument` (v2):** Documents tab search runs in **main + each iframe**; file upload tries **`uploadFile`** on every **`input[type=file]`** in every frame; **`_tdTriggerFileChooserFromFrames`** walks **open shadow roots** to click file inputs; **3 attempts** with re-open file; **`_tdConfirmUploadDialogs`** clicks save/done/apply across frames; **`_tdVerifyFilenameVisible`** scans all frames. **`openTransactionDeskFile`:** richer link selectors + **`goto`** path list (`TransactionDesk`, query `transactionId`, etc.) | ZipForm/Lone Wolf often embeds document UI in iframes/shadow DOM — single-frame selectors missed uploads | ✅ | ✅ | pending |
| 2026-03-30 | **`tc-browser-agent` `uploadDocument`:** removed invalid Puppeteer selector **`button:contains("Documents")`** (never matched). Added **`clickTransactionDeskDocumentsTab`** (text/tab/href Heuristics), **`openTransactionDeskFile`** before upload, **`input.uploadFile`** fallback to file chooser, optional metadata fill, **`verified`** DOM check. **`ok`** = browser upload succeeded. **`tc-routes`** (manual upload + mailbox batch) + **`tc-inspection-forward-service`:** **`ensureOnTransactionDesk`** instead of **`navigateToTransactionDesk`** | TD uploads were no-ops: Documents tab never opened; old code still returned **`ok: true`** | ✅ | ✅ | pending |
| 2026-03-30 | **`scripts/tc-r4r-from-railway.mjs`** + **`npm run tc:r4r-railway`** — runs **`railway variables --json`** in **`RAILWAY_VARS_PROJECT_DIR`** (default `~/lumin-railway` if present) to set **`TC_API_KEY`**, then delegates to **`tc-r4r-do-upload.mjs`**. Requires interactive **`railway login`** | Unblocks prod TC calls when local `.env` still has `local-dev-key-*` — no manual key copy | ✅ | ✅ | pending |
| 2026-03-30 | **`r4r/scan` + `upload_to_td`:** If `transaction_desk_id` is null, open TD by **`addressSearch`** from the TC address, parse URL → **`UPDATE tc_transactions.transaction_desk_id`**, then upload. After mailbox PDFs, uploads **`seller_response`** summary PDF (“Seller REJECTED repair request (LifeOS summary)”) unless `upload_seller_rejection_pdf:false`. **`tc-r4r-do-upload.mjs`:** **`--record-seller-reject`** → **`POST .../r4r/record-seller-choice`** `{ choice:'reject' }` after scan | Mahogany-style files missing TD id: still file to correct desk; TD shows explicit rejection doc; LifeOS DB can record seller reject after upload | ✅ | ✅ | pending |
| 2026-03-30 | **`tc-email-document-service`:** `getMailboxLock` for INBOX + Sent fetches; attachment **`download(uid, part, { uid: true })`** (seq was wrong for gathered mail); **`formatImapFailure`** for clearer errors. **`r4r/scan`:** 500 JSON includes **`self_service_apis`** (readiness / Railway env / redeploy via command key) | Fix ImapFlow 500s (`Command failed`); operators resolve env/deploy through APIs, not dashboard prose | ✅ | ✅ | pending |
| 2026-04-01 | **`tc-routes` POST /browser/debug-portal:** Logs into GLVAR via Clareity, waits 3s for portal tiles to render, returns full list of all `<a>`/button elements (text, href, onclick, class) + 4KB HTML body snippet. Purpose: diagnose why TD SSO navigation fails by seeing the actual portal DOM without a visible browser. | Unblock TransactionDesk navigation fix — need to see real portal link structure | ✅ | ✅ | pending |
| 2026-04-01 | **`tc-email-document-service` multi-mailbox search + `tc-routes` address_hint:** `findAttachmentEmails` now loops INBOX + Sent (when `include_sent:true`, the new default). Each matched email is tagged with `mailbox` so `downloadAttachmentsForEmail` opens the correct folder instead of hardcoded INBOX. IMAP server-side TEXT pre-filter via `address_hint` (most specific address token) reduces bandwidth before JS-level matching. `buildInspectionMailboxSearch` in `tc-routes` passes `include_sent:true` + `address_hint:tx.address` by default. R4Rs sent by Adam from Sent folder will now be found. | Fix: TC docs in Sent folder (R4Rs sent by listing agent) were never found; downloads would UID-mismatch when email was in non-INBOX folder | ✅ | ✅ | pending |
| 2026-04-01 | **`tc-email-document-service` `extractFilename` fix:** Added `extractFilename(structure)` helper that reads ImapFlow bodyStructure via `dispositionParameters?.filename`, `dispositionParameters?.name`, `parameters?.name`, `parameters?.filename` (ImapFlow does NOT expose `structure.filename` directly — the old code always fell back to `attachment_1` which failed `RELEVANT_EXT_RE`, causing `emails_scanned: 0`). Updated `normalizeAttachmentParts` to use it; inline parts <5KB are filtered as signature logos. Mailbox reverted to INBOX (not [Gmail]/All Mail) to keep UIDs consistent with `downloadAttachmentsForEmail`. | Root cause of 0 attachments found in all email scans | ✅ | ✅ | pending |
| 2026-03-31 | **Deploy bundle to `main`:** R4R routes (`r4r/scan`, seller review, TD helpers), `tc_td_form_knowledge` migration, mailbox **`subject_any_contains`**, inspection forward + PDF stamp, browser/approval/coordinator hooks — fixes production **`Cannot POST /r4r/scan`** (deploy lag) | Railway `robust-magic` was serving an older build without R4R endpoints | ✅ | ✅ | pending |
| 2026-03-31 | **`scripts/tc-r4r-do-upload.mjs`** + npm **`tc:r4r-upload`** — resolve tx by `--address`, call **`POST .../r4r/scan`** with **`upload_to_td:true`**; documents Railway **`COMMAND_CENTER_KEY`** must match shell **`TC_API_KEY`** (local `.env` often differs) | Unblock “find attachments + push to TD” without portal debugging when the only issue is key drift | ✅ | ✅ | pending |
| 2026-03-30 | **`tc-email-document-service`:** `emailMatches` uses token-AND on `subject_contains` / `subject_tokens`, plus optional **`subject_any_contains`** (OR). **`buildR4RMailboxSearch`** defaults: address-derived tokens + broad repair/inspection/response keywords — real subjects rarely say “R4R”. **`tests/tc-mailbox-subject.test.js`** | Match buyer “response to repairs” and inspection report threads when the address is in the subject | ✅ | ✅ | pending |
| 2026-03-30 | **`tc-r4r-attachment-classify.js`** + **`tests/tc-r4r.test.js`** + **`scripts/tc-r4r-smoke.mjs`**; **`r4r/test-reject-all`** supports **`strict_attachment_roles:false`** to stage an approval when mailbox PDFs exist but filenames omit repair/report hints; classifier matches `repair_request` / `buyer_inspection_response` style tokens | Prove R4R path in dev without perfect filenames; repeatable smoke against live API | ✅ | ✅ | pending |
| 2026-03-30 | Added template-override engine on TD form knowledge (`resolveExecutionPlan`) + route `POST /td/forms-knowledge/:id/resolve-plan`; added `POST /transactions/:id/r4r/test-reject-all` to validate non-default scenario and stage approval-ready response plan | Support your operating model: TD templates for common flow, but per-deal override when scenario is contrary (e.g. reject all repairs) | ✅ | ✅ | pending |
| 2026-03-30 | Added inferred playbook generation (`generatePlaybooks`) from TD `machine_schema`; new API `POST /td/forms-knowledge/generate-playbooks`; workflow option `infer_playbooks:true` on `scan_forms_catalog` | Convert raw scraped field schemas into operational defaults (signer role, required fields, review gate) so automation scales beyond one-off hardcoding | ✅ | ✅ | pending |
| 2026-03-30 | Option 1 shipped: machine-readable TD form schema extraction (`scrapeTransactionDeskFormFieldSchema`) + persisted `machine_schema` in `tc_td_form_knowledge`; `scan_forms_catalog` supports `include_machine_fields` | Build toward automatic form-filling/sign-routing decisions from observed controls instead of name-only catalog rows | ✅ | ✅ | pending |
| 2026-03-30 | Added TD forms intelligence path: `scan_forms_catalog` workflow, `tc-td-form-knowledge-service`, `GET /td/forms-knowledge`, `PATCH /td/forms-knowledge/:id`, and `scrapeTransactionDeskFormsCatalog` in browser agent | Let the system discover forms from TransactionDesk directly and retain handling knowledge so Adam does not manually reteach each form | ✅ | ✅ | pending |
| 2026-03-30 | **R4R flow routes:** `r4r/scan`, `r4r/send-seller-review`, `r4r/record-seller-choice`; filename-based R4R role classification + optional TD upload labels; seller-choice maps to `inspectionService.recordRepairResponse` + follow-up approval | Make “repair request / response” explicit in API language and operational workflow instead of generic inspection docs | ✅ | ✅ | pending |
| 2026-03-30 | **`tc-td-workflow-runner`** + **`POST /transactions/:id/browser/td-workflow`** (async job default, shares **`GET /browser-jobs/:jobId`**) + **`GET /td-workflows/catalog`** | One entry point to queue full TD chains without HTTP timeout; expand catalog over time for more TC screens | ✅ | ✅ | pending |
| 2026-03-30 | **TD gaps (partial):** `tc-browser-agent` — `openTransactionDeskFile`, `scrapeTransactionDeskParties`, `applyTransactionDeskUiPlan` + plans; `tc-coordinator.mergeTransactionParties`; `tc-td-party-sync`; routes **`td-sync-parties`**, **`td-ui-plan`**; `sync_td_parties_first` on inspection forward + prepare | Close “Pam’s email lives in TD” by scraping TD UI into `parties` (best-effort); chain plan runner surfaces Forms/e-sign screens with screenshots — operator still completes legally required TD steps where automation cannot | ✅ | ✅ | pending |
| 2026-03-30 | **Inspection forward v1:** `findSentContactsMatching` + `sendPreparedAttachmentPackage`; `tc-inspection-forward-service` + `tc-pdf-signature-stamp` (`pdf-lib`); `prepare-inspection-forward-approval` → `tc_approval_items` + **`forward_inspection_docs`** handler in `tc-approval-service`; optional listing-agent acknowledgment pages; seller auto-resolve for direct `forward-inspection-docs` | Pam-as-seller: pull email from `parties` or Sent mail; operator signs off in approval cockpit; only stamp PDFs when `requires_listing_agent_signature` is true; avoids claiming TD in-app e-sign is automated | ✅ | ✅ | pending |
| 2026-03-30 | **`tc-email-document-service`:** `deriveMailboxSearchFromTransactionAddress`, `max_results` on mailbox search, `gatherAttachmentsForSearch`, `sendGatheredAttachmentPackage` — **`tc-routes`:** `preview-inspection-mailbox`, `gather-inspection-attachments`, `forward-inspection-docs`, `upload-gathered-to-td` | Multi-message inspection PDF workflow (6453 Mahogany Peak–style): search → gather → forward with neutral coordination copy → batch TD upload; TD e-sign routing stays operator-facing | ✅ | ✅ | pending |
| 2026-03-30 | TC portal: move **Active transactions** card directly under readiness stats (above setup forms); version query on `tc-portal.js` in HTML; rely on Express `/tc` static `no-store` for fresh JS | User sees new board without scrolling past long forms; avoid browser cache of portal script | ✅ | ✅ | pending |
| 2026-03-30 | TC intake board: workspace list exposes `close_date`, `purchase_price`, fee fields; portal cards use green/yellow/red borders, role pill + pulse emoji strip (`buildMilestoneStrip`) for upcoming contingencies only (DD 🔍, appraisal 📋, loan 🏦, etc.), COE chip from `close_date`, fee strip, richer hover DL; milestone keys come from `key_dates` JSON | At-a-glance pipeline: deadlines, economics, and track status without opening each file | ✅ | ✅ | pending |
| 2026-03-30 | **TC voice assistant:** `services/tc-assistant-service.js`, `POST /api/v1/tc/assistant/chat`, `public/tc/tc-assistant.html` at `/tc/assistant` — dictation via shared voice helper, dialog mode (TTS then listen again), portal links from intake + file detail | Hands-free TC Q&A against real workspace data | ✅ | ✅ | pending |
| 2026-03-30 | **Ops:** committed `services/credential-aliases.js` (untracked; required by `tc-browser-agent` / TC access / IMAP — fixed Railway ERR_MODULE_NOT_FOUND) | Restore production boot | ✅ | ✅ | pending |
| 2026-03-30 | **Ops:** committed `services/tc-email-document-service.js` (was untracked while `tc-routes` imported it — fixed Railway ERR_MODULE_NOT_FOUND) | Restore production boot | ✅ | ✅ | pending |
| 2026-03-30 | `GET /api/v1/tc/status` (no API key): DB ping + auth flags + hints; portal pings status before workspace, shows banner and richer 401/DB failure HTML + link to status JSON | Faster “is production up” and clearer key mismatch recovery | ✅ | ✅ | pending |
| 2026-03-30 | TC access: `TC_ENV_HELP` + `setup_playbook` on readiness; env template includes GLVAR/Okta/COMMAND_CENTER_KEY rows with help metadata; managed-env name list extended; portal renders checklist + “Where / links” column on Env Template | Reduce setup friction; document that Cursor “Provider Error” is editor-side | ✅ | ✅ | pending |
| 2026-03-30 | **Listing agreement → SkySlope:** browser steps in `tc-browser-agent` (Transaction Launch, TD search/open, CDP download) + orchestrator `tc-listing-skyslope-sync` + async `POST /transactions/:id/browser/listing-to-skyslope` (default dry-run) and `GET /browser-jobs/:jobId`; portal intake card with rehearsal vs live + step log; each step also written to `tc_transaction_events` as `listing_td_skyslope_sync` | Automate GLVAR → TransactionDesk executed listing pull and SkySlope filing with visible progress | ✅ | ✅ | pending |
| 2026-03-30 | Workspace transaction cards: split **street number** + **street name** + city line, **client name · phone** on one line, **chips** for pending sign-offs / operator alerts / missing docs; transaction detail **hero** uses the same address layout; legend text updated | Match “see the house number and street at a glance” and surface approval/alert/doc gaps without hovering | ✅ | ✅ | pending |
| 2026-03-30 | Replaced the flat active-transactions table with a visual card board that shows address, client, phone, stage, and a red/yellow/green action ring, added hover summaries for what is happening on each file, added visible due-diligence / close-date countdown banners plus a who-needs-to-act todo list, added a detail-page action board that jumps directly to approvals, alerts, or document review, and added a one-click 'deal in morning' alert snooze path | Make the portal readable at a glance, keep time-sensitive contingency windows visible, show exactly who needs to act on each file, make clicking a file land on the exact work surface instead of a generic detail dump, and let Adam defer an escalation until morning without losing the follow-up | ✅ | ✅ | pending |
| 2026-03-30 | Added urgent email-attachment package delivery plus a dedicated intake-workspace card, corrected the workspace defaults so TC/work email fields prefer the real transaction mailbox instead of the LifeOS system mailbox when Adam inbox credentials are present, replaced the raw readiness dump with a click-to-fix missing-items panel that only surfaces actionable setup gaps, auto-filled buyer-agent recipient data from the selected transaction, added an SRPD preset, and filtered non-TC queue noise out of the intake queue | Unblock real-world cases like SRPD/photo delivery without waiting for terminal commands or manual recombination outside the system, stop steering TC setup toward the wrong inbox, make setup actionable instead of exposing low-signal env noise, and keep the portal focused on actual TC work instead of unrelated alert mail | ✅ | ✅ | pending |
| 2026-03-30 | Added alias-aware credential resolution for TC/system mailboxes and browser logins, so the runtime can consume the current Railway vars without forcing manual renames first | Unblock production use of the existing `TC_IMAP_APP_Adam_PASSWORD`, `SystemEmail_IMAP_APP_LifeOS_PASSWORD`, `GLVAR_mls_*`, and `exp_okta_*` envs while preserving canonical env support | ✅ | ✅ | pending |
| 2026-03-29 | Realigned TC verification to the shipped schema (`tc_transaction_events` / `tc_document_requests` and transaction-level document JSON) instead of stale `tc_deadlines` / `tc_documents` assumptions | Stop false verifier failures and keep SSOT aligned with the actual intake workspace data model | ✅ | ✅ | pending |
| 2026-03-30 | Agent portal: workspace cards now mark **red** only for TC-operator work (`next_action_owner=internal`, pending approvals, or open urgent alerts); **yellow** for external/blocker/watch; hover brief hidden until hover/focus; transaction detail approvals get expandable **review & edit** (PATCH summary + `prepared_action.body`) before sign-off; `tc-intake-workspace-service` adds `pending_approvals` + `open_operator_alerts` per active tx | Match Adam’s “at a glance” semantics and support review/edit/sign in one surface | ✅ | ✅ | pending |
| 2026-03-30 | SSOT drift cleanup: corrected owned-files list (removed non-existent `tc-portal-routes` / engine filenames), documented real inspection + webhook routes, aligned IMAP env story with `credential-aliases.js`, corrected route-mount anti-drift grep target, clarified Chromium is in root `Dockerfile` but deploy must actually use it | Keep TC amendment trustworthy for the next build sprint | ✅ | ✅ | pending |
| 2026-03-27 | Added Build Plan, Anti-Drift, Decision Log, Handoff, Runbook, Decision Debt, Change Receipts | SSOT template compliance | ✅ | ✅ | pending |
| 2026-03-27 | Added TC access readiness/bootstrap routes and corrected startup guards to use real env/vault readiness checks | Unblock first live email intake and browser access setup | ✅ | ✅ | pending |
| 2026-03-27 | Added agent intake workspace with access setup form, dry-run GLVAR/SkySlope checks, inbox triage queue, and suggested transaction matching | Give the operator a single place to enter secrets, verify access, monitor readiness, and route paperwork before live filing | ✅ | ✅ | pending |
| 2026-03-27 | Added triage preview-text enrichment, message-id capture, and stronger workspace matching signals | Improve inbox classification quality and make intake routing more useful before live filing credentials are entered | ✅ | ✅ | pending |
| 2026-03-27 | Added triage-to-transaction creation so contract emails can create placeholder TC files directly from the intake workspace | Reduce manual setup friction before full live filing access is available | ✅ | ✅ | pending |
| 2026-03-28 | Added triage-to-existing-transaction linking from the intake workspace, with transaction event logging, recent intake activity visibility, source-email backfill when missing, manual document QA / dry-run upload controls, a dry-run intake launcher, document-request creation from failed QA checks, automatic seeding of known TC env defaults while leaving secrets blank, runtime detection for secrets that are already present, and a managed-env snapshot in the workspace | Let the operator route important paperwork into the correct TC file without creating duplicate placeholder transactions, validate documents from the same workspace, rehearse the first live intake, request whatever signatures or fields are still missing, have the system fill in the non-secret TC env layer automatically, avoid asking for secrets that already exist, and see runtime-vs-sync env state in one place | ✅ | ✅ | pending |
| 2026-03-26 | TC runtime wiring hardened — account-manager, notification service, IMAP consistency | Fix runtime injection errors | ✅ | n/a | pending |
| 2026-03-25 | TC portal, reporting, approvals, alerts migrations | DB schema completion | ✅ | n/a | n/a |
| 2026-03-22 | Initial TC coordinator, email triage, SkySlope agent | Core TC infrastructure | ✅ | n/a | n/a |

---

## Pre-Build Readiness

**Status:** BUILD_READY (TC coordination core — gates 1-5 complete)
**Adaptability Score:** 82/100
**Council Persona:** edison (iterate fast, test every assumption, protect the core deadline logic)
**Last Updated:** 2026-04-01

### Gate 1 — Implementation Detail
- [x] Email triage, GLVAR monitor, deadline cron all have specific segment descriptions
- [x] DB schema complete (tc_transactions, tc_transaction_events, tc_document_requests, tc_communications)
- [x] API surface defined (`routes/tc-routes.js` includes portal/dashboard/webhooks; `routes/mls-routes.js` for investor flows)
- [ ] SkySlope Puppeteer **runtime** must use Chromium from root `Dockerfile` (or equivalent) on the deploy target — mark `needs-review` until production confirms the running image

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| SkySlope | Market leader, standard in Nevada/CA | Manual data entry, no AI, $150-300/mo/agent | AI auto-extracts deadlines from emails, zero manual entry |
| Dotloop (Zillow) | Huge network, e-sign built in | Locked to Zillow ecosystem, no AI triage | We're model-agnostic and agent-owned, not broker-controlled |
| TransactionDesk (Lone Wolf) | Used by many boards including GLVAR | 1990s UI, no automation | We surface the right alert at the moment of risk, not on a fixed schedule |
| Brokermint | Strong back-office integration | Enterprise-priced, no per-agent AI | Per-agent pricing, AI learns that agent's specific transaction patterns |
| Nekst | TC-specific workflow automation | No AI, rule-based only, no email parsing | Our AI reads the actual contract language, not just the dates Adam typed in |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| SkySlope adds AI email parsing | High (18 months) | High | We beat them to market AND have deeper council review — our edge is speed + depth |
| DocuSign/eSign eats TC market | Medium | Medium | We orchestrate around any e-sign tool; we're the deadline brain, not the signature tool |
| GLVAR API opened to third parties | Low | Low | Reduces our Puppeteer complexity, actually helps us |
| AI hallucinated deadline causes legal exposure | Medium | Critical | Hard fail-closed on all AI-extracted dates; Adam-signs-all rule; no auto-submit ever |
| Nevada RE commission changes TC regulations | Low | Medium | Monitor → Address as segment when it happens |

### Gate 4 — Adaptability Strategy
New TC tools plug in via the `tc-coordinator.js` facade — swap the underlying integration (SkySlope → another platform) without touching deadline logic or email triage. Score: 82/100.
- New e-sign providers: add adapter in `services/tc-document-processor.js` — no other changes
- New deadline standards (e.g., different state): add timeline generator variant in `tc-coordinator.js`
- New AI models: council failover handles this automatically
- If a competitor ships AI email parsing: we already have it; we add the comparison feature instead

### Gate 5 — How We Beat Them
While SkySlope sends a reminder that a deadline is in 3 days, we read the email thread, identify the specific clause at risk, find the counterparty contact, draft the curative email, and have it waiting for Adam's one-click approval — before he even opens his inbox.
