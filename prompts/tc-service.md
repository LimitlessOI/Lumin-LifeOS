# Domain: TC Service (Transaction Coordinator)

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md)

**Last updated:** 2026-04-22  
**SSOT:** `docs/projects/AMENDMENT_17_TC_SERVICE.md`  
**Lane log:** `docs/CONTINUITY_LOG_TC.md`  
**Owning services:** `services/tc-coordinator.js`, `services/tc-doc-intake.js`, `services/tc-browser-agent.js`, `services/tc-pricing.js`, `services/glvar-monitor.js`, `services/tc-status-engine.js`, `services/tc-document-validator.js`, `services/tc-portal-service.js`  
**Owning routes:** `routes/tc-routes.js`, `routes/mls-routes.js`  
**Mounted at:** `/api/v1/tc`

---

## What This Domain Does

Adam's Transaction Coordinator back-office — automated doc intake, deadline tracking, GLVAR compliance, client/agent portals, Puppeteer browser automation for SkySlope/eXp Okta/Transaction Desk.

Revenue: Founding $500 setup + $249/mo locked; Standard $149/mo; Pay-at-Closing $349/closed deal ($0 if deal falls).

---

## Key API Surface

```http
GET  /api/v1/tc/status                       — health (no auth)
GET  /api/v1/tc/dashboard                    — summary stats
POST /api/v1/tc/intake/workspace             — agent intake workspace
POST /api/v1/tc/assistant/chat               — TC-aware council chat
POST /api/v1/tc/access/readiness             — check IMAP/Okta/SkySlope access
POST /api/v1/tc/access/bootstrap             — store initial credentials
POST /api/v1/tc/email/send-attachment-package — pull + send attachment bundle from mailbox
POST /api/v1/tc/transactions/:id/email/forward-inspection-docs — forward inspection package
POST /api/v1/tc/browser/td-workflow          — long Puppeteer TD operation (returns 202 + job_id)
GET  /api/v1/tc/browser-jobs/:jobId          — poll async browser job
```

---

## Critical Constraints

- **SkySlope Puppeteer** requires Chromium on Railway runtime — root `Dockerfile` installs it. If Railway is not using that Dockerfile, browser automation fails.
- **IMAP credentials** resolve via `services/tc-imap-config.js` — supports alias env vars (`TC_IMAP_APP_Adam_PASSWORD`, `WORK_EMAIL_APP_PASSWORD`). Do NOT add new IMAP resolution logic elsewhere.
- **TC email triage** runs on 30-min cycle — do not shorten without checking Groq free-tier impact + `createUsefulWorkGuard()`.
- TC authentication uses `requireKey` (COMMAND_CENTER_KEY). TC-facing portal routes for agents/clients are authenticated differently — check existing pattern before adding auth.

---

## Tables (TC-owned)

- `tc_transactions` — master file: property address, parties, status, phase
- `tc_transaction_events` — audit trail of state changes
- `tc_document_requests` — what docs are needed, received, rejected per transaction
- `tc_parties` — agents, buyers, sellers, escrow, lender per transaction
- `tc_deadlines` — computed Nevada timeline deadlines + status
- `tc_agent_clients` — Adam's agent client registry with plan tier

---

## What NOT to Touch

- Do NOT modify `services/tc-imap-config.js` credential aliases without also updating the alias table in Amendment 17.
- Do NOT shorten polling intervals without going through useful-work-guard.
- Do NOT wire Stripe directly — billing plans exist in DB but Stripe integration is a separate task (Amendment 18).

---

## Next Approved Task

Per Amendment 17 Agent Handoff Notes:
1. **First-file intake** — open the **6453 Mahogany Peak** file via the intake workspace transaction board; confirm TC mailbox credentials in Railway/vault; run first real SRPD/photo package search and send via portal.
2. **Portal polish** — agent portal loads by default to intake workspace; transaction board is the primary operator surface.
3. **Document QA** — validate `tc-document-validator.js` fail-closed completeness gate is triggered on all intake paths (email + manual upload).

Check `docs/CONTINUITY_LOG_TC.md` for latest slice state before starting any TC work.
