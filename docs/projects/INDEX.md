# PROJECT AMENDMENTS INDEX
**Last Updated:** 2026-03-26
**Parent:** SSOT North Star Constitution (`docs/SSOT_NORTH_STAR.md`)
**Authority:** All amendments subordinate to the North Star Constitution

---

## HOW THIS WORKS
Each file in this directory is a **SSOT Amendment** for one distinct project inside the platform.
Amendments define: what the project is, its revenue model, technical spec, current state, refactor plan, and non-negotiables.

They do NOT override the North Star — they add project-specific rules that operate within it.

---

## PROJECT REGISTRY

| # | Amendment | Status | Revenue Priority | Refactor Priority |
|---|-----------|--------|-----------------|-------------------|
| 01 | [AI Council System](AMENDMENT_01_AI_COUNCIL.md) | LIVE | Enabler (all projects) | Medium |
| 02 | [Memory System](AMENDMENT_02_MEMORY_SYSTEM.md) | LIVE | Enabler | Low |
| 03 | [Financial & Revenue](AMENDMENT_03_FINANCIAL_REVENUE.md) | LIVE | Core infrastructure | High |
| 04 | [Auto-Builder](AMENDMENT_04_AUTO_BUILDER.md) | LIVE (guarded) | Cost reduction | Medium |
| 05 | [Site Builder + Prospect Pipeline](AMENDMENT_05_SITE_BUILDER.md) | BUILDING | **#1 — Fastest to $500/day** | Done |
| 06 | [Game Publisher](AMENDMENT_06_GAME_PUBLISHER.md) | LIVE | Medium-term | Medium |
| 07 | [Video Pipeline](AMENDMENT_07_VIDEO_PIPELINE.md) | BUILDING | Medium-term | High |
| 08 | [Outreach & CRM](AMENDMENT_08_OUTREACH_CRM.md) | LIVE (partial) | **#2 — Feeds Site Builder** | High |
| 09 | [Life Coaching / Personal OS](AMENDMENT_09_LIFE_COACHING.md) | LIVE (local) | Subscription MRR | High |
| 10 | [API Cost Savings Service](AMENDMENT_10_API_COST_SAVINGS.md) | IN_BUILD | **#2 — Verified savings product** | Medium |
| 11 | [BoldTrail Real Estate CRM](AMENDMENT_11_BOLDTRAIL_REALESTATE.md) | BUILDING | Real-estate workflow expansion | Medium |
| 12 | [Command Center & Overlay](AMENDMENT_12_COMMAND_CENTER.md) | LIVE (dev) | UX/retention | High |
| 13 | [Knowledge Base & Web Intelligence](AMENDMENT_13_KNOWLEDGE_BASE.md) | LIVE | Enabler | Medium |
| 14 | [White-Label Platform](AMENDMENT_14_WHITE_LABEL.md) | BUILDING | High (long-term) | Low |
| 15 | [Business Tools Suite](AMENDMENT_15_BUSINESS_TOOLS.md) | LIVE (various) | Supporting | High |
| 16 | [Word Keeper & Integrity Engine](AMENDMENT_16_WORD_KEEPER.md) | LIVE | Accountability | Low |
| 17 | [TC Service — Transaction Coordinator](AMENDMENT_17_TC_SERVICE.md) | BUILDING | **#1 Active Revenue** | High |
| 18 | [ClientCare Billing Recovery](AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md) | BUILDING | **#1 Active Recovery** | High |

---

## NORTH STAR PRIORITY ORDER
Per the SSOT North Star: **ONE killer feature → ONE paying segment → ONE economic model → then expand.**

**Current Priority:**
1. **ClientCare Billing Recovery** (Amendment 18) — immediate claims-rescue / revenue-recovery lane while TC is paused
2. **TC Service** (Amendment 17) — hold state; resume after billing rescue priority clears
3. **API Cost Savings** (Amendment 10) — verified savings product / case-study-to-product path
4. **BoldTrail + Real Estate Workflow Systems** (Amendment 11) — adjacent expansion once active revenue lanes are stable

Everything else is supporting infrastructure, future-phase work, or must prove a tighter link to current revenue.

---

## REFACTOR STATUS
Server.js is thinner than the historical monolith but still a composition-root hotspot; continue extracting config, route mounting, and startup orchestration conservatively.
**Last verified:** 2026-03-25 | `node --check server.js` → PASS

### Route Modules (36 files in `routes/`)
- ✅ AI Council enhanced: `routes/enhanced-council-routes.js`
- ✅ Agent Recruitment: `routes/agent-recruitment-routes.js`
- ✅ API Cost Savings: `routes/api-cost-savings-routes.js`
- ✅ Auto-Builder: `routes/auto-builder-routes.js`
- ✅ Billing & White-Label & Trials: `routes/billing-routes.js`
- ✅ BoldTrail Real Estate CRM: `routes/boldtrail-routes.js`
- ✅ Business Center & Tools: `routes/business-routes.js`
- ✅ Command Center & Overlay: `routes/command-center-routes.js`
- ✅ Conversation History: `routes/conversation-routes.js`
- ✅ Financial & Revenue: `routes/financial-routes.js`
- ✅ Game Publisher: `routes/game-routes.js`
- ✅ Knowledge Base: `routes/knowledge-routes.js`
- ✅ Life Coaching / Personal OS: `routes/life-coaching-routes.js`
- ✅ Memory System: `routes/memory-routes.js`
- ✅ Outreach & CRM Sequences: `routes/outreach-crm-routes.js`
- ✅ Outreach (legacy): `routes/outreach.js`
- ✅ Site Builder + Prospect Pipeline: `routes/site-builder-routes.js`
- ✅ Stripe Payments: `routes/stripe-routes.js`
- ✅ Two-Tier AI Council: `routes/two-tier-council-routes.js`
- ✅ Video Pipeline: `routes/video-routes.js`
- ✅ Web Intelligence & Scraper: `routes/web-intelligence-routes.js`
- ✅ Website Audit: `routes/website-audit-routes.js`

### Service Modules (35 files in `services/`)
- ✅ AI Guard: `services/ai-guard.js`
- ✅ AI Model Selector + Ollama bridge: `services/ai-model-selector.js`
- ✅ AI Performance Tracker: `services/ai-performance-tracker.js`
- ✅ Autonomy Scheduler: `services/autonomy-scheduler.js`
- ✅ Consensus Service: `services/consensus-service.js`
- ✅ Council Service: `services/council-service.js`
- ✅ Deployment Service: `services/deployment-service.js`
- ✅ Env Validator: `services/env-validator.js`
- ✅ Execution Queue: `services/execution-queue.js`
- ✅ Knowledge Context: `services/knowledge-context.js`
- ✅ Logger (Pino): `services/logger.js`
- ✅ Preview Expiry Cron: `services/preview-expiry-cron.js`
- ✅ Prospect Pipeline: `services/prospect-pipeline.js`
- ✅ Response Cache: `services/response-cache.js`
- ✅ Search Service: `services/searchService.js`
- ✅ Self-Improvement Loop: `services/self-improvement-loop.js`
- ✅ Self-Programming: `services/self-programming.js`
- ✅ Site Builder: `services/site-builder.js`
- ✅ Snapshot Service: `services/snapshot-service.js`
- ✅ Twilio (SMS/calls): `services/twilio-service.js`
- ✅ Video Pipeline: `services/video-pipeline.js`
- ✅ Web Search Integration: `services/web-search-integration.js`
- ✅ WebSocket Handler: `services/websocket-handler.js`

### Core Modules (new files in `core/`)
- ✅ Code Escalation: `core/code-escalation.js`
- ✅ Financial Dashboard: `core/financial-dashboard.js`
- ✅ Financial Revenue: `core/financial-revenue.js`
- ✅ Income Drone System: `core/income-drone-system.js`
- ✅ Self-Modification Engine: `core/self-modification-engine.js`
- ✅ Two-Tier System Init: `core/two-tier-system-init.js`

### DB Migrations
- ✅ `db/migrations/20260313_core_schema.sql` — main platform schema
- ✅ `db/migrations/20260313_site_builder_prospect_pipeline.sql` — prospect_sites, email_suppressions, outreach_log

### Production Readiness Checklist
- ✅ `node --check` passes on all 36 route + 35 service + 6 core files
- ✅ 5 critical runtime bugs fixed (undefined variables, init order)
- ✅ Env var validation at startup (`services/env-validator.js`)
- ✅ Rate limiting on site builder endpoints
- ✅ Preview site 30-day expiry cron (`services/preview-expiry-cron.js`)
- ✅ GitHub Actions smoke test (`.github/workflows/smoke-test.yml`)
- ✅ NotificationService (Postmark) wired for cold email with suppression
- ✅ POS affiliate URLs driven by env vars
- ✅ DB migrations confirmed live in Neon production
- 🔲 Replace remaining `console.*` with `logger.*` in server.js
- 🔲 Extract `initializeTwoTierSystem()` to `core/two-tier-system-init.js`
- 🔲 Set Railway env vars to go live (see Amendment 05)
- 🔲 Register POS affiliate programs + set AFFILIATE_*_URL in Railway
- 🔲 End-to-end test `POST /api/v1/sites/build` with real business URL

## AMENDMENT HYGIENE
- Each major product/subsystem needs one owning amendment.
- Add a new amendment only when an idea has its own mission, revenue path, technical surface, or non-negotiables.
- Otherwise, extend the existing owning amendment and cross-link related systems.
- Current candidate concepts that should stay nested for now:
  - TC recording / commitment / coaching features remain inside Amendment 17 and cross-link to Amendment 16 and Amendment 09.
  - Agent portal / client portal remains inside Amendment 17 until it becomes a shared cross-product portal.
