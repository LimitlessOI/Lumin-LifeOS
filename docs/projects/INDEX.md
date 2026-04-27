# PROJECT AMENDMENTS INDEX
**Last Updated:** 2026-04-25 — **HOW THIS WORKS:** **`OPERATOR_BRAINSTORM_INBOX`** + **`CONVERSATION_DUMP` §10–§11** (skim + **~68% / ~32%** program; **38** §A.1 **3** L4 receipts through **L4-003**). **Candidate Concepts:** removed **ASH Ranch** row (operator: not pursuing). Prior: 2026-04-26 **Amendment 39** registry row + HOW THIS WORKS (**Memory Intelligence** + design brief). **Amendment 38** § **Seed catalog §D** squeeze. Prior: 2026-04-25 **Amendment 38** § **Seed catalog** + **Amendment 21** variation map + portfolio triage. Prior: **`AMENDMENT_38_IDEA_VAULT.md`** (vault SSOT). Prior: **`docs/CONVERSATION_DUMP_IDEAS_INDEX.md`** + **Candidate Concepts** rows. Prior: 2026-04-26 **`docs/REPO_MASTER_INDEX.md`** + **`docs/REPO_BUCKET_INDEX.md`**. Prior: **Repo inventory** `REPO_CATALOG.md` + `REPO_TRIAGE_NOTES` + `REPO_DEEP_AUDIT`. Prior: 2026-04-25 **`docs/SSOT_DUAL_CHANNEL.md`** + **`docs/SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md`**. Prior: **North Star §2.11c** + Companion **§0.5D**. Prior: 2026-04-22 **§2.15** + **§0.5I**; **§2.14** + `docs/TSOS_SYSTEM_LANGUAGE.md`. Prior: **`docs/SYSTEM_CAPABILITIES.md`**. Prior: Amendment 37.
**Parent:** SSOT North Star Constitution (`docs/SSOT_NORTH_STAR.md`)
**Authority:** All amendments subordinate to the North Star Constitution

**Platform name (whole repo):** **TokenSaverOS (TSOS)** — short **TSOS**. LifeOS, LimitlessOS, TokenOS, TC, etc. are **lanes / products inside TSOS**.

---

## HOW THIS WORKS

**Lost in the docs tree?** Start at [`docs/REPO_MASTER_INDEX.md`](../REPO_MASTER_INDEX.md) — maps amendments (this file), continuity, env, capabilities, repo catalog, and prompts.

**Forgotten build-time ideas?** [`AMENDMENT_38_IDEA_VAULT.md`](AMENDMENT_38_IDEA_VAULT.md) — **§ Seed catalog** (§A–D: ideas, nuances, actions, **Memory Intelligence squeeze**) + streams + **§ Portfolio triage queue**. **ChatGPT / external brainstorm pastes (verbatim):** [`docs/conversation_dumps/OPERATOR_BRAINSTORM_INBOX.md`](../conversation_dumps/OPERATOR_BRAINSTORM_INBOX.md). **One-page map + % remaining:** [`docs/CONVERSATION_DUMP_IDEAS_INDEX.md`](../CONVERSATION_DUMP_IDEAS_INDEX.md) **§10** (skim) + **§11** (progress ladder). **Evidence / confidence / debates / lessons:** [`AMENDMENT_39_MEMORY_INTELLIGENCE.md`](AMENDMENT_39_MEMORY_INTELLIGENCE.md) + [`docs/MEMORY_FRAMEWORK_DESIGN_BRIEF.md`](../MEMORY_FRAMEWORK_DESIGN_BRIEF.md). **LifeOS-native duplicates / variations** → [`AMENDMENT_21_LIFEOS_CORE.md`](AMENDMENT_21_LIFEOS_CORE.md) § **Idea Vault → LifeOS-native consolidation**.

Each file in this directory is a **SSOT Amendment** for one distinct project inside the platform.
Amendments define: what the project is, its revenue model, technical spec, current state, refactor plan, and non-negotiables.

They do NOT override the North Star — they add project-specific rules that operate within it.

**Cross-cutting ops (not an amendment file):** `docs/SYSTEM_CAPABILITIES.md` — matrix of self-serve HTTP routes + npm scripts, **required Railway env per capability**, and **gaps**; maintain next to `docs/ENV_REGISTRY.md`.

**TSOS machine channel (North Star §2.14):** `docs/TSOS_SYSTEM_LANGUAGE.md` — closed tokens + line grammar for Conductor ↔ **machinery**; **not** a substitute for **§2.11b** plain-language operator reports (`SSOT_COMPANION` §0.5G).

**Operator instruction (North Star §2.15):** `docs/SSOT_COMPANION.md` **§0.5I** — clear session ask → comply or **HALT**; **INTENT DRIFT** in **§2.11b** if work ≠ ask. Does not cryptographically compel external LLMs; makes **violation visible** in receipts.

**Conductor = supervisor (North Star §2.11c):** `docs/SSOT_COMPANION.md` **§0.5D** *Supervisor mandate* — **system** `POST /build` for product; Conductor **audits**, **council**-reviews, **reports**; IDE default **forbidden** when scale path is the builder; **`docs/ENV_REGISTRY.md`** before “missing env” noise.

**Two “channels,” one law (avoid double edits):** `docs/SSOT_DUAL_CHANNEL.md` — **Channel A** = agents/Conductor (generated `AGENT_RULES.compact.md` + QUICK_LAUNCH + lane logs); **Channel B** = system whole picture (NSSOT + Companion + this INDEX + `SYSTEM_CAPABILITIES` + amendments). Policy changes live in **canonical** files; compact packet is **derived** via `npm run gen:rules`. **Build-readiness audit:** `docs/SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md`.

**Whole-repo file inventory (triage, not law):** `docs/REPO_CATALOG.md` — regenerated via `npm run repo:catalog`; lists tracked files with size, kind, and a one-line hint. Human **KEEP / GOLD / DELETE-CANDIDATE** judgments go in `docs/REPO_TRIAGE_NOTES.md`. Re-run the catalog after large tree changes or cleanup waves.

**Why does this folder exist? (spine vs barnacles):** `docs/REPO_DEEP_AUDIT.md` — traces **`server.js` → `startup/register-runtime-routes.js`**, value tiers, and **Wave 0–4** cleanup order for multi-agent drift.

**Master map of every index:** `docs/REPO_MASTER_INDEX.md` — links **REPO_CATALOG**, **REPO_BUCKET_INDEX**, triage, SSOT, continuity, prompts, FEATURE_INDEX, spine code.

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
| 19 | [Project Governance](AMENDMENT_19_PROJECT_GOVERNANCE.md) | BUILDING | Infrastructure | High |
| 20 | [Capability Map](AMENDMENT_20_CAPABILITY_MAP.md) | experimental | Governance / intake | Medium |
| 21 | [LifeOS Core](AMENDMENT_21_LIFEOS_CORE.md) | founding | Personal OS + planned finance layer | High |
| 22 | [Story Studio](AMENDMENT_22_STORY_STUDIO.md) | experimental | Creator / family IP | Medium |
| 23 | [Creator Media OS](AMENDMENT_23_CREATOR_MEDIA_OS.md) | experimental | Video / channel scale | Medium |
| 24 | [Faith Studio](AMENDMENT_24_FAITH_STUDIO.md) | experimental | Sacred content | Medium |
| 25 | [Conflict Arbitrator](AMENDMENT_25_CONFLICT_ARBITRATOR.md) | planning | **HIGH — $2B market, overlay architecture** | Low (pre-build) |
| 26 | [Personal Finance OS](AMENDMENT_26_PERSONAL_FINANCE_OS.md) | planning | HIGH — LifeOS Core extension, subscription upsell | Low (pre-build) |
| 27 | [Productized Sprint Offers](AMENDMENT_27_PRODUCTIZED_SPRINT.md) | planning | **IMMEDIATE — first revenue before platform ships** | None (service delivery) |
| 28 | [Wellness Studio](AMENDMENT_28_WELLNESS_STUDIO.md) | planning | HIGH — recovery, special needs, therapist integration | Low (post LifeOS Core) |
| 29 | [AI Receptionist](AMENDMENT_29_AI_RECEPTIONIST.md) | planning | **HIGH — $99/mo SaaS, self-serve, near-ready** | Medium |
| 30 | [Enterprise AI Governance](AMENDMENT_30_ENTERPRISE_AI_GOVERNANCE.md) | planning | HIGH — B2B $5K–$25K/yr, consulting-first | Low (pre-build) |
| 31 | [Teacher OS](AMENDMENT_31_TEACHER_OS.md) | candidate | HIGH — recurring SaaS, mission-aligned, $29–$49/mo | Low (pre-build) |
| 32 | [Music Talent Studio](AMENDMENT_32_MUSIC_TALENT_STUDIO.md) | candidate | HIGH — instruction + talent discovery, multi-revenue | Low (pre-build) |
| 33 | [Kingsman Protocol](AMENDMENT_33_KINGSMAN_PROTOCOL.md) | constitutional | Non-revenue — mission obligation, funded by platform trust | Specification phase |
| 34 | [Kids OS](AMENDMENT_34_KIDS_OS.md) | candidate | HIGH — family subscription $19-$29/mo, mission-foundational, graduates into Lumin University | Low (pre-build) |
| 35 | [Lumin University](AMENDMENT_35_LUMIN_UNIVERSITY.md) | candidate | HIGH — long-arc competency-based institution, builds on Kids OS foundation | Long-range (post Kids OS) |
| 36 | [Zero-Drift Handoff Protocol](AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md) | LIVE | Infrastructure — cold-start packets, per-lane continuity, builder next-task, audit logs | High (every agent session) |
| 37 | [Universal Overlay Platform](AMENDMENT_37_UNIVERSAL_OVERLAY.md) | active-build | Infrastructure — browser extension, iframe overlay, form fill, real-time updates | High |
| 38 | [Idea Vault — Captured Conversation Backlog](AMENDMENT_38_IDEA_VAULT.md) | LIVE | **Documentation SSOT** — all mined multi-model ideas, provenance, amendment routing; relieves operator memory load | Medium (curation) |
| 39 | [Memory Intelligence System](AMENDMENT_39_MEMORY_INTELLIGENCE.md) | LIVE (Phase 1) | **Evidence engine** — epistemic facts, debates, lessons, agent accuracy, intent drift; `/api/v1/memory`; design brief in `docs/MEMORY_FRAMEWORK_DESIGN_BRIEF.md` | High (adoption Phases 2–4) |

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
- ✅ LifeOS Auth: `routes/lifeos-auth-routes.js`
- ✅ LifeOS Backtest (education-only): `routes/lifeos-backtest-routes.js`
- ✅ LifeOS Chat (Lumin AI): `routes/lifeos-chat-routes.js`
- ✅ LifeOS Children: `routes/lifeos-children-routes.js`
- ✅ LifeOS Conflict: `routes/lifeos-conflict-routes.js`
- ✅ LifeOS Copilot: `routes/lifeos-copilot-routes.js`
- ✅ LifeOS Core (mirror, joy, integrity, commitments, truth): `routes/lifeos-core-routes.js`
- ✅ LifeOS Decisions: `routes/lifeos-decisions-routes.js`
- ✅ LifeOS Emotional: `routes/lifeos-emotional-routes.js`
- ✅ LifeOS Engine (calendar, focus, privacy): `routes/lifeos-engine-routes.js`
- ✅ LifeOS Ethics: `routes/lifeos-ethics-routes.js`
- ✅ LifeOS Events (event stream, ingest): `routes/lifeos-events-routes.js`
- ✅ LifeOS Family: `routes/lifeos-family-routes.js`
- ✅ LifeOS Finance: `routes/lifeos-finance-routes.js`
- ✅ LifeOS Growth: `routes/lifeos-growth-routes.js`
- ✅ LifeOS Health: `routes/lifeos-health-routes.js`
- ✅ LifeOS Healing: `routes/lifeos-healing-routes.js`
- ✅ LifeOS Identity: `routes/lifeos-identity-routes.js`
- ✅ LifeOS Mediation: `routes/lifeos-mediation-routes.js`
- ✅ LifeOS Purpose: `routes/lifeos-purpose-routes.js`
- ✅ LifeOS Scorecard (MITs + daily score): `routes/lifeos-scorecard-routes.js`
- ✅ LifeOS Simulator: `routes/lifeos-simulator-routes.js`
- ✅ LifeOS Vision: `routes/lifeos-vision-routes.js`
- ✅ LifeOS Weekly Review: `routes/lifeos-weekly-review-routes.js`
- ✅ LifeOS Workshop: `routes/lifeos-workshop-routes.js`
- ✅ Universal Overlay (extension API): `routes/lifeos-extension-routes.js`
- ✅ Memory System: `routes/memory-routes.js`
- ✅ Outreach & CRM Sequences: `routes/outreach-crm-routes.js`
- ✅ Site Builder + Prospect Pipeline: `routes/site-builder-routes.js`
- ✅ Stripe Payments: `routes/stripe-routes.js`
- ✅ Two-Tier AI Council: `routes/two-tier-council-routes.js`
- ✅ Video Pipeline: `routes/video-routes.js`
- ✅ Web Intelligence & Scraper: `routes/web-intelligence-routes.js`
- ✅ Website Audit: `routes/website-audit-routes.js`

### Service Modules (50+ files in `services/`)
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
- ✅ LifeOS Auth: `services/lifeos-auth.js`
- ✅ LifeOS Calendar: `services/lifeos-calendar.js`
- ✅ LifeOS Character Builder: `services/character-builder.js`
- ✅ LifeOS Communication Profile: `services/communication-profile.js`
- ✅ LifeOS Conflict Intelligence: `services/conflict-intelligence.js`
- ✅ LifeOS Daily Scorecard (MITs): `services/lifeos-daily-scorecard.js`
- ✅ LifeOS Emotional Patterns: `services/emotional-pattern-engine.js`
- ✅ LifeOS Finance: `services/lifeos-finance.js`
- ✅ LifeOS Focus/Privacy: `services/lifeos-focus-privacy.js`
- ✅ LifeOS Lumin AI: `services/lifeos-lumin.js`
- ✅ LifeOS Money Decision Bridge: `services/lifeos-money-decision-bridge.js`
- ✅ LifeOS Monetization Map: `services/monetization-map.js`
- ✅ LifeOS Request Helpers (input coercion): `services/lifeos-request-helpers.js`
- ✅ LifeOS Response Variety: `services/response-variety.js`
- ✅ LifeOS Scheduled Jobs: `services/lifeos-scheduled-jobs.js`
- ✅ LifeOS Scoreboard: `services/lifeos-scoreboard.js`
- ✅ LifeOS Truth Delivery: `services/truth-delivery.js`
- ✅ LifeOS User Resolver: `services/lifeos-user-resolver.js`
- ✅ LifeOS Weekly Review: `services/lifeos-weekly-review.js`

### Core Modules (new files in `core/`)
- ✅ Code Escalation: `core/code-escalation.js`
- ✅ Financial Dashboard: `core/financial-dashboard.js`
- ✅ Financial Revenue: `core/financial-revenue.js`
- ✅ Income Drone System: `core/income-drone-system.js`
- ✅ Self-Modification Engine: `core/self-modification-engine.js`
- ✅ Two-Tier System Init: `core/two-tier-system-init.js`

### DB Migrations (key milestones — see `db/migrations/` for full list)
- ✅ `db/migrations/20260313_core_schema.sql` — main platform schema
- ✅ `db/migrations/20260313_site_builder_prospect_pipeline.sql` — prospect_sites, email_suppressions, outreach_log
- ✅ `db/migrations/20260328_lifeos_core.sql` — LifeOS core tables (lifeos_users, commitments, joy_checkins, etc.)
- ✅ 30+ additional LifeOS migrations through `db/migrations/20260408_lifeos_finance_and_prefs.sql`
- ✅ `db/migrations/20260418_lifeos_auth.sql` — JWT auth tables
- ✅ `db/migrations/20260418_lifeos_chat.sql` — Lumin AI threads + messages
- ✅ `db/migrations/20260418_lifeos_daily_scorecard.sql` — MITs, daily scorecards, task deferrals
- ✅ `db/migrations/20260418_lifeos_weekly_review.sql` — weekly reviews + interactive sessions

### Production Readiness Checklist
- ✅ `node --check` passes on all route + service + core files
- ✅ 5 critical runtime bugs fixed (undefined variables, init order)
- ✅ Env var validation at startup (`services/env-validator.js`)
- ✅ Rate limiting on site builder endpoints
- ✅ Preview site 30-day expiry cron (`services/preview-expiry-cron.js`)
- ✅ GitHub Actions smoke test (`.github/workflows/smoke-test.yml`)
- ✅ NotificationService (Postmark) wired for cold email with suppression
- ✅ POS affiliate URLs driven by env vars
- ✅ LifeOS JWT auth live (register/login/refresh, Sherry invite pre-seeded)
- ✅ PWA service worker + manifest + icons
- ✅ Input coercion hardened on all LifeOS routes (no NaN reaches DB)
- ✅ Zero-Waste AI guards on all LifeOS scheduled ticks
- ✅ 8 orphan CJS route files deleted (routes/ is now ESM-consistent)
- ✅ Response variety + communication profile wired into Lumin AI
- 🔲 **callAI not passed to bootAllDomains** — LifeOS scheduled AI features (weekly review, early warning, event ingest) are silently skipping. Fix: add `callAI` to `bootAllDomains({...})` call in `server.js` line ~1080. Routes to `gemini_flash`.
- 🔲 Set Railway env vars to go live (see Amendment 05)
- 🔲 Register POS affiliate programs + set AFFILIATE_*_URL in Railway
- 🔲 End-to-end test `POST /api/v1/sites/build` with real business URL
- 🔲 Archive stale session reports in `docs/` (see Opus feedback 2026-04-19)

## AMENDMENT HYGIENE
- Each major product/subsystem needs one owning amendment.
- Add a new amendment only when an idea has its own mission, revenue path, technical surface, or non-negotiables.
- Otherwise, extend the existing owning amendment and cross-link related systems.
- Current candidate concepts that should stay nested for now:
  - TC recording / commitment / coaching features remain inside Amendment 17 and cross-link to Amendment 16 and Amendment 09.
  - Agent portal / client portal remains inside Amendment 17 until it becomes a shared cross-product portal.

### Candidate Concepts (from conversation dump mining — not yet elevated to amendments)
These ideas were found in GPT/Gemini/Grok/LifeOS conversation dumps. Not ready for full amendments — keep here until they have their own revenue path, technical surface, or non-negotiables.

**Deep index (file locations + theme clusters):** [`docs/CONVERSATION_DUMP_IDEAS_INDEX.md`](../CONVERSATION_DUMP_IDEAS_INDEX.md)

| Concept | Source | Nest Under / Notes |
|---|---|---|
| Billing-as-a-Service for Therapists & Rehab Clinics | LifeOS dump 002 | Distinct from Amendment 18 (ClientCare targets PT/behavioral); EMR billing automation for therapy/rehab clinics. Elevate when ClientCare is live. |
| Wellness Product & Supplement Recommender | LifeOS dump 002 | Nest under Amendment 28 (Wellness Studio) as Module 8 |
| Emotional Media / Entertainment Recommender | LifeOS dump 002 | Nest under Amendment 21 (LifeOS Core Layer 5 / Emotional Intelligence) |
| Self-Sabotage Coaching System | LifeOS dump 002 | Already added to Amendment 21 Layer 5 |
| Emotional AI Dating / Compatibility Engine | LifeOS dump 002 | Long-term standalone product; elevate when LifeOS Core has 6+ months of emotional pattern data |
| LifeOS Ecosystem ("Trusted Amazon" Marketplace | LifeOS dump 002 | Long-term ecosystem feature; requires established user base |
| Legal Document Automation (trusts, wills, contracts) | Miscellaneous dump | Elevate if attorney partnership secured; high regulatory complexity |
| RAG Hardening Sprint / AI Truth Verification Service | LifeOS dump 002 | Nest under Amendment 30 (Enterprise AI Governance) as a specialized service offering |
| Zoom AI Receptionist (voice-only overlay variant) | LifeOS dump 002, GPT dump 01 | Fully captured in Amendment 29 |
| Capsule Marketplace (idea sharing / reuse economy) | Grok dump 001 | Interesting long-term platform play; nest under Amendment 02 (Memory System) for now |
| Programmatic SEO Engine | GPT dump 02 | Nest under Amendment 05 (Site Builder) — SEO page generation is a natural extension |
| WellRoundedMomma vertical + 25 Lumin capability SKUs | `system-ideas.txt` | Midwifery/wellness site + automation marketplace; nest **05** + **28**; GTM items under **27** — detail in **CONVERSATION_DUMP_IDEAS_INDEX** §4A |
| Shoppable media / visual-commerce overlay (click object → buy) | Mission & North Star | Overlay + affiliate + privacy; long-term consumer — **CONVERSATION_DUMP_IDEAS_INDEX** §4B |
| KeepMyWordTracker + explicit “release from your word” UX | Mission & North Star | **21** + existing integrity thread; promise→task reconciliation — §4B |
| AI homework helper + overlay tutoring | Mission & North Star | Education lane (**32** area); fun + video tie-in — §4B |
| Off-market commercial property signal miner | Mission & North Star | **17** (TC/intel) or standalone CRE scout — §4B |
| Employee onboarding / training overlay (“Apple Care” coach) | Mission & North Star | **11** + **12**; guided click-through training — §4B |
| Habit tracker in BoldTrail CRM + salesman spinoff | Mission & North Star | **11** extension — §4B |
| Lumea meta-directives (DAPIR, CDS/SIL/ETL, idea market) | Directives and ideas log.md | Conductor/platform backlog — **36** / **02** / **01**; not one product — §4C |
| 35-day sprint offer ladder + Limitless Command Table | Miscellaneous | GTM playbook **27** + Zapier/Notion ops — §4D |
