# AMENDMENT 17 — Transaction Coordinator (TC) Service
**Status:** BUILDING — core infrastructure exists; portal, communication, QA, and compliance layers still in build
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-25

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
| `routes/tc-routes.js` | All TC API endpoints |
| `routes/mls-routes.js` | MLS scanning and investor management endpoints |
| `public/tc/agent-portal.html` | Agent-facing at-a-glance portal for file health, blockers, docs, comms, and reports |
| `public/tc/client-portal.html` | Client-facing portal for simplified real-time status, requested docs, and updates |
| `public/tc/tc-portal.js` | Shared TC portal UI client for agent/client views |
| `db/migrations/20260322_tc_transactions.sql` | Core transactions table |
| `db/migrations/20260323_tc_fees.sql` | tc_agent_clients, tc_pricing_config, fee columns |
| `db/migrations/20260323_glvar_dues.sql` | glvar_dues_log, glvar_violations_log |
| `db/migrations/20260323_email_triage.sql` | email_triage_log |
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
| eXp Realty Okta | exprealty.okta.com | SSO for SkySlope + BoldTrail |
| GLVAR Clareity IAM | glvar.clareityiam.net | MLS + TransactionDesk + dues |
| SkySlope | Via eXp Okta tile | Transaction file management, doc upload |
| BoldTrail | Via eXp Okta tile | Real estate CRM |

### Key Environment Variables
| Var | Purpose |
|-----|---------|
| `IMAP_HOST` | Email server (imap.gmail.com for Google Workspace) |
| `IMAP_PORT` | IMAP port (993) |
| `IMAP_USER` | adam@hopkinsgroup.org |
| `IMAP_PASS` | Email account password (store via /api/v1/railway/managed-env/bulk) |
| `TC_IMAP_*` | TC-specific mailbox overrides when different from shared IMAP vars |
| `ASANA_ACCESS_TOKEN` | Asana API token for TC sync |
| `ASANA_TC_PROJECT_GID` | Asana project GID for TC operational sync |
| `EMAIL_WEBHOOK_SECRET` | Validates Postmark and TC email callback webhooks |
| `TWILIO_WEBHOOK_SECRET` | Optional TC-specific secret for Twilio callbacks when different from email webhook secret |

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
| GET | `/transactions` | List all transactions |
| POST | `/transactions` | Create transaction with fee assignment |
| GET | `/plans` | Public — TC pricing plans (no auth) |
| GET | `/clients` | List agent clients |
| POST | `/clients` | Enroll new agent client |
| GET | `/fees/revenue` | MRR, ARR, outstanding fees |
| POST | `/intake/run` | Full email→SkySlope intake run |
| POST | `/intake/email-search` | Dry-run email scan |
| POST | `/intake/upload` | Manual doc upload → SkySlope |
| GET | `/glvar/dues` | Current dues status |
| GET | `/glvar/violations` | Violation log |
| POST | `/test-skyslope-login` | Test eXp Okta → SkySlope connection |
| POST | `/test-boldtrail` | Test eXp Okta → BoldTrail connection |
| POST | `/offers/prepare` | Build offer recommendation set from property, client constraints, and comps |
| POST | `/transactions/:id/offers/prepare` | Build offer recommendation set using a transaction as the starting context |

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

### Blocking (must resolve before first real transaction)
- 🔲 IMAP vars not yet in Railway — set via `POST /api/v1/railway/managed-env/bulk`
- 🔲 eXp Okta credentials need rotation (shared in conversation — rotate before use)
- 🔲 adam@hopkinsgroup.org password needs rotation (shared in conversation)
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
- All feature code in `routes/tc-routes.js`, `routes/mls-routes.js` and service files
- No TC logic in `server.js` except service initialization
- Boot logic moves to `startup/boot-domains.js`
