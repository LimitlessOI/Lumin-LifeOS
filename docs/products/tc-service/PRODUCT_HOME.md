<!-- SYNOPSIS: Canonical product home — TC Service (Transaction Coordinator) -->

# TC Service Product Home

**Canonical home:** this file  
**Product id:** `tc-service`  
**Primary runtime surfaces:** `/tc` (agent portal), `/tc/client` (client portal), `/tc/assistant`  
**Law anchor:** `docs/projects/AMENDMENT_17_TC_SERVICE.md`  
**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md`

## Mission

TC Service is Adam's fully automated Transaction Coordinator back-office.

It handles document intake from email and manual upload into SkySlope, deadline tracking, automated reminders, GLVAR dues and violation monitoring, MLS deal scanning for investor clients, TC pricing and billing across three plan tiers, eXp Realty Okta SSO browser automation, agent portal + client portal with real-time file status, and a communication engine for milestone updates, missing docs, approvals, and weekly seller reports.

**Mission statement:** Give Adam a fully automated TC back-office so he can service multiple agent clients with near-zero manual overhead while delivering premium communication, visibility, and compliance discipline.

## Readiness state

`PARTIAL_CODE_PRESENT`

Code base is the most built-out of any unmissioned product in the repo. No mission pack (FOUNDER_PACKET / BLUEPRINT.json) exists yet. Cannot enter the BuilderOS queue without one.

## Owned runtime files

Defined in full at `docs/products/tc-service/FILE_MANIFEST.json`.

Routes:
- `routes/tc-routes.js`
- `routes/mls-routes.js`
- `routes/boldtrail-routes.js` (TC-facing BoldTrail endpoints)
- `routes/boldtrail-coaching-routes.js`

Services (40+):
- `services/tc-coordinator.js` — core transaction management
- `services/tc-doc-intake.js` — IMAP email scan + manual upload → SkySlope
- `services/tc-pricing.js` — three-tier billing model
- `services/tc-status-engine.js` — derived file stage, health, next action
- `services/tc-browser-agent.js` — Puppeteer: eXp Okta SSO, SkySlope, BoldTrail
- `services/tc-workflow-service.js`, `services/tc-workflow-specs.js`
- `services/tc-stripe-service.js`
- `services/tc-portal-service.js`
- `services/glvar-monitor.js` — GLVAR dues (monthly) + violations (4× daily)
- `services/mls-deal-scanner.js` — investor deal scoring
- `services/email-triage.js` — inbox classifier
- `services/tc-imap-config.js`, `services/tc-email-monitor.js`
- `services/tc-alert-service.js`, `services/tc-automation-service.js`
- `services/tc-communication-callback-service.js`
- `services/tc-inspection-service.js`, `services/tc-inspection-forward-service.js`
- `services/tc-offer-prep-service.js`, `services/tc-review-package-service.js`
- `services/tc-report-service.js`, `services/tc-morning-digest-service.js`
- `services/tc-asana-sync-service.js`, `services/tc-listing-skyslope-sync.js`
- `services/tc-access-service.js`, `services/tc-approval-service.js`
- `services/tc-document-validator.js`, `services/tc-r4r-attachment-classify.js`
- `services/tc-email-document-service.js`, `services/tc-intake-workspace-service.js`
- `services/tc-interaction-service.js`, `services/tc-assistant-service.js`
- `services/tc-feed-ingest-service.js`, `services/tc-td-workflow-runner.js`
- `services/tc-td-party-sync.js`, `services/tc-td-form-knowledge-service.js`
- `services/tc-pdf-signature-stamp.js`, `services/tc-mobile-link-service.js`
- `services/tc-webhook-validator.js`, `services/tc-hello-test.js`

Public surfaces:
- `public/tc/agent-portal.html`
- `public/tc/client-portal.html`
- `public/tc/tc-assistant.html`
- `public/tc/tc-portal.js`

## Receipts

No formal mission receipts exist yet. No BuilderOS acceptance command defined.

## Revenue model

| Plan | Setup | Monthly | Closing Fee |
|------|-------|---------|-------------|
| Founding Member | $500 one-time | $249/mo locked | $0 |
| Monthly Standard | $0 | $149/mo | $0 |
| Pay at Closing | $0 | $0 | $349/closed deal |

## Shared dependencies

TC Service depends on shared systems but does not own them:

| System | Owner | Pointer |
|--------|-------|---------|
| AI Council (email drafting, deal scoring) | Platform | `docs/projects/AMENDMENT_01_AI_COUNCIL.md` |
| Memory (agent/client history) | Platform | `docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md` |
| Billing / Stripe | Platform | `docs/projects/AMENDMENT_03_FINANCIAL_REVENUE.md` |
| BoldTrail CRM | BoldTrail product | `docs/products/boldtrail/PRODUCT_HOME.md` |
| Command Center runtime surface | Platform | `docs/projects/AMENDMENT_12_COMMAND_CENTER.md` |
| BuilderOS missions | Machine | `builderos-reboot/BP_PRIORITY.json` |

Do not duplicate shared doctrine here. Use pointers.

## Exact next step to become blueprint-ready

1. Write `FOUNDER_PACKET.md` in `builderos-reboot/MISSIONS/PRODUCT-TC-SERVICE-V1-0001/` — describe the 1–3 things a live agent client needs to do and see for TC to be considered working.
2. Convert to `BLUEPRINT.json` with steps and acceptance criteria.
3. Add mission to `builderos-reboot/BP_PRIORITY.json`.
4. BuilderOS or Codex runs it.

No code scaffolding needed. Code exists. Gap is spec → mission formalization only.

## History anchor

`docs/projects/AMENDMENT_17_TC_SERVICE.md` — full law, technical spec, receipts, session history.
