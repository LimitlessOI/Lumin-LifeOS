# Continuity Log
> This file is the running continuity reference for every conversation and action. It is always checked before responding.

## Update 2026-03-26 #1
- Priority shifted temporarily from TC to ClientCare billing recovery because there is already earned revenue trapped in unpaid / unbilled / rejected / denied claims.
- New amendment added: `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` defines the no-API-first operating model for ClientCare West billing rescue.
- New backend foundation added for ClientCare billing rescue:
  - `services/clientcare-billing-service.js` — claim classification, timely-filing triage, rescue buckets, action planning
  - `services/clientcare-browser-service.js` — browser/export fallback readiness contract and workflow templates
  - `routes/clientcare-billing-routes.js` — dashboard, import, classification, actions, and ClientCare readiness endpoints
  - `db/migrations/20260326_clientcare_billing.sql` — `clientcare_claims` and `clientcare_claim_actions`
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

## Update 2026-01-30 #1
- Hardware: MacBook Pro M2 Max, 32 GB RAM, 2 TB SSD running server-only mode; machine doubles as development host but being stripped down for LifeOS server.
- Models: Ollama hosts gemma2:27b-instruct-q4_0, deepseek variants (coder v2, v3, r1 70b/32b, coder 33b/6.7b, latest), qwen2.5 variants, qwen3-coder, llama3.3/3.2 70b/vision/1b, llava 7b, codestral, gpt-oss 20b/120b, phi3 mini, qllama reranker, nomic embed.
- Tools: ffmpeg missing, puppeteer present, playwright absent; python modules ok with only `piper` available.
- Priorities: real estate ideas (#1 Ad+Creative Pack, #2 Follow-Up & Script Assistant, #3 Showing Packet/CMA Snapshot). Auto-builder to work on 10 ideas, currently recycling one task; re-prioritize the queue to hit more ideas.
- Expectations: Always grade models, capture strengths/weaknesses, keep log for council. Use SSOT addendum for instructions, ensure brutal honesty, mention unknowns, track third-party solutions.
- Processes: lifeos server under PM2 via `npx pm2 start server.js --name lifeos --env production`, `pm2 save`; plan to run `sudo env PATH=$PATH:/Users/adamhopkins/.nvm/versions/node/v22.21.0/bin /Users/adamhopkins/Projects/Lumin-LifeOS/node_modules/pm2/bin/pm2 startup launchd -u adamhopkins --hp /Users/adamhopkins`. Monitor via `/api/v1/tools/status`, `pm2 logs lifeos`.
