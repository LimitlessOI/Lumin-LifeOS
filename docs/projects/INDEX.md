# PROJECT AMENDMENTS INDEX
**Last Updated:** 2026-03-13
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
| 10 | [API Cost Savings Service](AMENDMENT_10_API_COST_SAVINGS.md) | LIVE | **#3 — B2B SaaS** | Medium |
| 11 | [BoldTrail Real Estate CRM](AMENDMENT_11_BOLDTRAIL_REALESTATE.md) | LIVE | Per-agent subscription | Medium |
| 12 | [Command Center & Overlay](AMENDMENT_12_COMMAND_CENTER.md) | LIVE (dev) | UX/retention | High |
| 13 | [Knowledge Base & Web Intelligence](AMENDMENT_13_KNOWLEDGE_BASE.md) | LIVE | Enabler | Medium |
| 14 | [White-Label Platform](AMENDMENT_14_WHITE_LABEL.md) | BUILDING | High (long-term) | Low |
| 15 | [Business Tools Suite](AMENDMENT_15_BUSINESS_TOOLS.md) | LIVE (various) | Supporting | High |

---

## NORTH STAR PRIORITY ORDER
Per the SSOT North Star: **ONE killer feature → ONE paying segment → ONE economic model → then expand.**

**Current Priority:**
1. **Site Builder** (Amendment 05) — fastest path to $500/day with wellness businesses
2. **Outreach CRM** (Amendment 08) — powers Site Builder cold email pipeline
3. **API Cost Savings** (Amendment 10) — B2B SaaS, easiest to demo value

Everything else is infrastructure that supports these three or future-phase products.

---

## REFACTOR STATUS
Server.js reduced from ~12,000 → **6,490 lines**. Target: <3,000 lines (pure routing only).

### Extracted (own route files) — ALL 15 PROJECTS ✅
- ✅ AI Council: `services/council-service.js`
- ✅ Site Builder: `routes/site-builder-routes.js`
- ✅ Website Audit: `routes/website-audit-routes.js`
- ✅ Enhanced Council: `routes/enhanced-council-routes.js`
- ✅ Outreach: `routes/outreach.js`
- ✅ Memory: `routes/memory-routes.js`
- ✅ Stripe: `routes/stripe-routes.js`
- ✅ Financial & Revenue: `routes/financial-routes.js`
- ✅ Business Tools: `routes/business-routes.js`
- ✅ Game Publisher: `routes/game-routes.js`
- ✅ Video Pipeline: `routes/video-routes.js`
- ✅ Agent Recruitment: `routes/agent-recruitment-routes.js`
- ✅ BoldTrail CRM: `routes/boldtrail-routes.js`
- ✅ API Cost Savings: `routes/api-cost-savings-routes.js`
- ✅ Web Intelligence: `routes/web-intelligence-routes.js`
- ✅ Auto-Builder: `routes/auto-builder-routes.js`
- ✅ Life Coaching: `routes/life-coaching-routes.js`
- ✅ Two-Tier Council: `routes/two-tier-council-routes.js`
- ✅ Outreach & CRM: `routes/outreach-crm-routes.js`
- ✅ Billing & White-Label: `routes/billing-routes.js`
- ✅ Knowledge Base: `routes/knowledge-routes.js`
- ✅ Conversation History: `routes/conversation-routes.js`
- ✅ Command Center: `routes/command-center-routes.js`

### Next Phase: Revenue Activation
- 🔲 Register POS affiliate links (Jane App, Mindbody, Square) in `services/site-builder.js`
- 🔲 Configure email sender (Postmark or SendGrid) for prospect cold emails
- 🔲 End-to-end test: `POST /api/v1/sites/build` with real wellness business URL
- 🔲 Continue reducing server.js → <3,000 lines (inline utility code still present)
