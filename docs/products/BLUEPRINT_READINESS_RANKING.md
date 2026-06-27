<!-- SYNOPSIS: Blueprint readiness ranking — all tracked products, scored as of 2026-06-27 -->

# Blueprint Readiness Ranking

**As of:** 2026-06-27  
**Scored by:** Claude (Sonnet 4.6) based on repo audit — code evidence, amendment depth, mission pack existence, env var status, acceptance criteria definition  
**Scale:** 10 = can run BuilderOS mission right now; 1 = concept only, no code

---

## Ranking (highest to lowest)

### 1. LifeRE — 9/10
**Canonical home:** `docs/products/lifere/PRODUCT_HOME.md`  
**Law:** `docs/projects/AMENDMENT_LIFERE.md`  
**Mission:** `PRODUCT-LIFERE-OS-V1-0001`

**Evidence:**
- Full technical stack complete: routes, services, DB, overlays
- E2E test suite 13/13 PASS (local + Railway production)
- Mission pack exists in `builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/`
- Deployed to Railway. All env vars set.

**Single remaining blocker:**  
Founder usability confirm. Adam must run Alpha Daily Cycle and submit a 12+ character quote.  
One action: `/overlay/lifeos-app.html → click "Run Alpha Daily Cycle" → confirm PASS`

---

### 2. LifeOS — 8/10
**Canonical home:** `docs/products/lifeos/PRODUCT_HOME.md`  
**Law:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`  
**Missions:** 4 in BP_PRIORITY

**Evidence:**
- Chair/Lumin front door: live in production
- 4 active BP missions queued
- Command Center overlay wired
- Conversation + capture pipeline built

**Blockers:**
- 4 missions are queued but status unclear (some may be in-progress or blocked)
- No acceptance command defined for the full LifeOS "product complete" state
- User auth system explicitly noted as missing (2026-04-18 audit)

---

### 3. TC Service — 7/10
**Canonical home:** `docs/products/tc-service/PRODUCT_HOME.md`  
**Law:** `docs/projects/AMENDMENT_17_TC_SERVICE.md`  
**Mission:** none yet

**Evidence:**
- 40+ services built — most code of any unmissioned product
- 3 public portals: agent-portal.html, client-portal.html, tc-assistant.html
- GLVAR monitoring, SkySlope integration, MLS deal scanning all coded
- Stripe/billing model defined with 3 tiers
- Live portals accessible at `/tc`

**Blockers:**
- No FOUNDER_PACKET.md, no BLUEPRINT.json, no mission in BP_PRIORITY
- No defined acceptance test (what does "TC Service is working" mean operationally?)
- IMAP / SkySlope credentials need Railway secrets set
- eXp Okta automation needs testing against live session

**Next:** Write FOUNDER_PACKET → BLUEPRINT.json → add to BP_PRIORITY. No code needed.

---

### 4. Site Builder — 7/10
**Canonical home:** `docs/products/site-builder/PRODUCT_HOME.md`  
**Law:** `docs/projects/AMENDMENT_05_SITE_BUILDER.md`  
**Mission:** none yet

**Evidence:**
- Code complete end-to-end: scrape → AI generate → prospect CRM → cold email
- DB tables confirmed live in Neon production (3 tables)
- 4 routes, 8 services, quality scorer, revenue tracker all wired
- Research brief for AI generation exists

**Blockers:**
- 4 Railway env vars not set: `POSTMARK_SERVER_TOKEN`, `EMAIL_FROM`, `SITE_BASE_URL`, `EMAIL_PROVIDER`
- No FOUNDER_PACKET.md, no BLUEPRINT.json, no mission in BP_PRIORITY
- POS affiliate URLs optional but unset

**Next:** Set 4 Railway env vars (no code needed) → write FOUNDER_PACKET → BLUEPRINT.json

---

### 5. BoldTrail — 6/10
**Canonical home:** `docs/products/boldtrail/PRODUCT_HOME.md`  
**Law:** `docs/projects/AMENDMENT_11_BOLDTRAIL_REALESTATE.md`  
**Mission:** none yet

**Evidence:**
- LIVE in production (last updated 2026-06-22)
- 4 routes, 2 services, 4 DB tables
- Real agent data flowing through it
- LifeRE and TC Service both depend on it

**Blockers:**
- Scope decision open: shared module vs. standalone agent-subscription product
- No FOUNDER_PACKET.md, no BLUEPRINT.json, no mission in BP_PRIORITY
- If standalone product: revenue lane ($97–$197/mo per agent) needs spec
- If shared module: this is "done" — just maintained, not queued

**Next:** Adam decides standalone vs. module. If standalone → FOUNDER_PACKET.

---

### 6. API Cost Savings — 6/10
**Canonical home:** `docs/products/api-cost-savings/PRODUCT_HOME.md`  
**Law:** `docs/projects/AMENDMENT_10_API_COST_SAVINGS.md`  
**Mission:** none yet

**Evidence:**
- 5-layer stack coded (IR Compiler, Token Optimizer, Delta Context, Cache Engine, Provider Router)
- 7 routes, 5 services all wired
- Landing page live at `/` (products/api-service/index.html)
- Stripe flow pages (success, cancel) exist

**Blockers:**
- No paying B2B customer yet
- No FOUNDER_PACKET.md, no BLUEPRINT.json, no mission in BP_PRIORITY
- Gap is customer acquisition spec, not code

**Next:** Write FOUNDER_PACKET defining "first paying customer" as acceptance test → BLUEPRINT.json

---

### 7. ClientCare Billing Recovery — 5/10
**Canonical home:** `docs/products/clientcare-billing-recovery/PRODUCT_HOME.md`  
**Law:** `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md`  
**Mission:** none yet

**Evidence:**
- 5 services + 1 route coded
- Puppeteer browser automation path defined
- Two-lane operating model documented (Insurance Recovery + Patient AR)

**Blockers:**
- No vendor API — browser automation only (fragile, session-dependent)
- No FOUNDER_PACKET.md, no BLUEPRINT.json, no mission in BP_PRIORITY
- Sensitive domain: human approval gate required for submissions
- No acceptance criteria ("billing rescue is working" needs to be defined by Sherry)

**Next:** Define acceptance test with Sherry → FOUNDER_PACKET → BLUEPRINT.json

---

### 8. MarketingOS — 5/10
**Canonical home:** none yet (no product home folder exists)  
**Law:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`  
**Mission:** none yet

**Evidence (THINK — not verified this session):**
- Blueprint locked per memory: Earn-It Philosophy, Retention Ladder, Platform Playbooks (7 channels), SocialMediaOS Studio System, Video Intelligence Engine
- Compute model decided: Hetzner VPS ($8/mo) for video encoding vs. Railway
- Pricing: ~$0.50/video cost (Replicate Kling 1.6 / Wan 2.1)

**Blockers:**
- No product home folder
- No code verified this session (blueprint may be spec-only)
- No FOUNDER_PACKET, no mission
- Hetzner VPS not provisioned

**Next:** Create `docs/products/marketingos/` product home → verify what code exists → FOUNDER_PACKET

---

### 9. IdeaVault — 4/10
**Canonical home:** `docs/products/ideavault/PRODUCT_HOME.md`  
**Law:** `docs/projects/AMENDMENT_38_IDEA_VAULT.md`  
**Mission:** none yet

**Evidence:**
- Large amendment as documentation/backlog SSOT — valuable as a routing system
- 1 route, 2 services coded for internal API access

**Blockers:**
- Not a user-facing SaaS product — fundamental scope ambiguity
- Decision required: standalone product vs. LifeOS admin feature
- No acceptance criteria can be written until scope is decided

**Next:** Adam decides standalone vs. LifeOS feature. If standalone → FOUNDER_PACKET with internal-tool acceptance criteria.

---

### 10. Word Keeper — 3/10
**Canonical home:** none (no product home folder)  
**Law:** unknown amendment — not read this session  
**Mission:** none verified

**Evidence (GUESS — not verified this session):**
- Name appears in repo inventory; amendment likely exists
- Product concept: vocabulary/dictionary/writing assistant or journaling tool
- No routes or services confirmed this session

**Blockers:**
- No product home created
- Code existence not verified this session
- No FOUNDER_PACKET, no mission

**Next:** Read amendment → verify what code exists → create product home → FOUNDER_PACKET

---

### 11. Kids OS — 2/10
**Canonical home:** none (no product home folder)  
**Law:** unknown amendment — not read this session  
**Mission:** none verified

**Evidence (GUESS — not verified this session):**
- Education pillar of the platform (protects love of learning, addresses Irlen Syndrome)
- Phaser.js 3 (games) in the stack suggests potential gaming/edu components
- No routes or services confirmed this session

**Blockers:**
- No product home created
- Code existence not verified this session
- No FOUNDER_PACKET, no mission, no acceptance criteria

**Next:** Read amendment → verify what code exists → create product home → FOUNDER_PACKET

---

### 12. Teacher OS — 2/10
**Canonical home:** none (no product home folder)  
**Law:** unknown amendment — not read this session  
**Mission:** none verified

**Evidence (GUESS — not verified this session):**
- Education pillar companion to Kids OS
- No routes or services confirmed this session

**Blockers:**
- No product home created
- Code existence not verified this session
- No FOUNDER_PACKET, no mission, no acceptance criteria

**Next:** Read amendment → verify what code exists → create product home → FOUNDER_PACKET

---

## What makes a 10/10

A product is 10/10 and can enter the BuilderOS autonomous queue when:

1. `FOUNDER_PACKET.md` exists in `builderos-reboot/MISSIONS/<id>/`
2. `BLUEPRINT.json` exists with explicit step list and acceptance criteria
3. Mission ID is in `builderos-reboot/BP_PRIORITY.json`
4. All required Railway env vars are set in production
5. An acceptance command (e.g., `npm run lifeos:lifere:accept`) exists or is defined in BLUEPRINT

**Currently at 10/10:** None. LifeRE is closest (9/10 — missing only founder usability confirm).

---

## What agent types should do with this doc

- **BuilderOS / BP chair:** Use `blueprint_score` in PRODUCT_REGISTRY.json to prioritize mission creation work.
- **Codex / C2:** Use the "Next" line in each entry above as the first task when assigned a product.
- **Cold agent:** Read the canonical home for the product first, not this ranking doc.
- **Founders:** This doc shows you where to spend 5 minutes to unlock the most autonomous output from the build system. TC Service and Site Builder are the two highest-leverage unlocks right now.
