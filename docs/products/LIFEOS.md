<!-- SYNOPSIS: LifeOS — Product Spec -->

# LifeOS — Product Spec
**Amendment:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` (full history + receipts)
**Platform:** `docs/products/PLATFORM.md` (Council, Memory, C2 — required enablers)
**Law:** `docs/constitution/NORTH_STAR.md`
**Last State:** 2026-06-11

---

## MISSION

Purpose is medicine. The single most treatable root cause of human suffering is living out of alignment with what you are actually built for. LifeOS finds that alignment, holds it up like a mirror, and then does the work to make it real.

**North Star test:** Does this help the person become what THEY said they want? If yes, build it. If it pushes them somewhere they didn't ask to go, do not build it.

**Framework:** Be (identity) → Do (action) → Have (results). Identity is upstream of behavior. The system works at the identity layer first.

---

## CONSTITUTIONAL CONSTRAINTS (non-negotiable)

- **Sovereignty:** Never manipulate. Never steer. Help each person become their own stated version of themselves.
- **Honesty over comfort:** Hard truths, calibrated to how each person can actually receive them.
- **Data belongs to the person:** Deletion = full erasure on demand. No soft-delete. No retained anonymized signals without consent.
- **Household features:** Both parties must independently opt in. Either party can revoke silently at any time. Quarterly re-confirmation required.
- **Hardship Protocol:** When financial hardship detected → stop charging, maintain full access. No shame.
- **Never gate:** Crisis routing, children's dream builder, emergency detection, data deletion.
- **Investment boundary:** Surface the user's own stated policy and data. Never tell them what to buy. No gamified trading, no signals, no leverage prompts.

---

## Service & epistemology doctrine (HARD — all stacks inherit)

**Full law:** `docs/LIFEOS_SERVICE_AND_EPISTEMOLOGY_DOCTRINE.md`  
**Verify:** `npm run lifeos:service-doctrine:verify` (in `builder:preflight`)

LifeOS is a **fluid adaptive OS** — one shell, stacks plug in (LifeRE, SMOS, etc.). We **serve, don't decide**: costs, benefits, pros, cons with best attainable truth. Motivation is **per-person** (Personal Twin), not one-size GCI templates. **Time** is the root resource. **Truth** is proven in the world, labeled KNOW/THINK/GUESS, law always open to scrutiny. Remove unwanted busywork; organize liked busywork; amplify superpowers. No manipulation, hype, or theater.

---

## PRODUCT LAYERS (what it is)

| Layer | Name | Core capability |
|-------|------|-----------------|
| 1 | **The Mirror** | Daily truth view: Be-Do-Have snapshot, open commitments, health, integrity score, joy score, one hard truth |
| 2 | **The Engine** | Automation: commitment capture, outreach, call screening, SMS triage, calendar protection |
| 3 | **Health Intelligence** | Wearables (Apple Watch), CGM, food logging, pattern engine, emergency detection, pre-disease flags, medical context generator |
| 4 | **Family OS** | Household sync, shared commitments, relationship debrief, tone intelligence, truth delivery calibration |
| 5 | **Emotional Intelligence** | Daily check-ins, pattern observation, integrity alignment, victory vault, self-sabotage monitor, emotional wealth engine |
| 6 | **Parenting** | After-moment coaching, repair paths, generational pattern tracking, age-specific scripts |
| 7 | **Children's App** | Dream Builder, curiosity engine, character building, parent transparency view |
| 8 | **Dream Funding** | Purpose-identified dreams, no-repayment funding, 10% pay-forward chain |
| 9 | **Purpose Discovery** | Inventory, pattern synthesis, monetization map, role rehearsal, live CoPilot sessions |
| 10 | **Human Flourishing Data** | Privacy-first aggregate research layer, openly published findings |
| 11 | **Community & Legacy** | Trusted containers, accountability partnerships, quarterly life review |
| 12 | **Personal Finance OS** | Cashflow truth, budget modes, runway/resilience, debt visibility, IPS, allocation vs target — mirror-first, never advisory |

---

## LUMIN (front door, cross-cutting)

Lumin is the default way in. Persistent "Ask Lumin…" strip in the overlay. Learns from natural conversation with consent. Adapts tone via `services/communication-profile.js` + `services/response-variety.js`. Thread modes steer behavior without locking personality. Anti-formulaic rotation enforced.

**Shipped:** shell strip, drawer, voice hooks, onboarding conversation, commitment auto-ingest.
**Backlog:** deeper conversation → structured fields / calendar automation (Commitments v1 is the first proof mission).

### Founder conversation archive (Cursor)

**Full index (all sessions):** [`docs/conversation_dumps/CURSOR_SESSIONS_INDEX.md`](../conversation_dumps/CURSOR_SESSIONS_INDEX.md)

| Session | Topic | Archive |
|---------|-------|---------|
| `e9b7659e` | Direct Lumin/Chair, listening, BuilderOS overnight, TC/SkySlope, browser verify | [`by-product/sessions/e9b7659e/`](../conversation_dumps/by-product/sessions/e9b7659e/) |
| `7449d204` | SSOT + LifeOS programming review/fix | [`by-product/sessions/7449d204/`](../conversation_dumps/by-product/sessions/7449d204/) |

Re-archive all: `npm run lifeos:archive-cursor-transcripts:all`

---

## BUILD STATE

### Phase 1 — Mirror ✅
DB: `commitments`, `integrity_score_log`, `joy_checkins`, `daily_mirror_log`, `health_checkins`, `inner_work_log`
Services: commitment tracker, integrity score, joy score
Routes: `/api/v1/lifeos/*` (mirror, commitments, integrity, joy, health, inner-work)
UI: `lifeos-mirror.html`, `lifeos-today.html`

### Phase 2 — Engine ✅
Twilio communication gateway, call screening, SMS triage, outreach automation (`outreach-engine.js`), calendar rules

### Phase 3 — Health ✅
HealthKit bridge, sleep/mood correlation engine, food logging, pre-disease patterns, medical context generator, emergency detection + alert chain

### Phase 4 — Family OS ✅
DB: `household_links`, `shared_commitments`, `relationship_checkins`, `conversation_debriefs`
Services: `household-sync.js`, `relationship-debrief.js`, `tone-intelligence.js`
Routes: `/api/v1/lifeos/family/*` (11 endpoints)
UI: `lifeos-family.html`
**⚠️ INCOMPLETE:** Sherry onboarding (separate login) not yet built

### Phase 5 — Emotional + Parenting ✅
DB: `emotional_patterns`, `parenting_moments`, `repair_actions`, `inner_work_effectiveness`, `daily_emotional_checkins`
Services: `emotional-pattern-engine.js`, `parenting-coach.js`, `inner-work-effectiveness.js`
Routes: `/api/v1/lifeos/emotional/*` (9 endpoints), `/api/v1/lifeos/emotional/daily*`
UI: `lifeos-inner.html`

### Phase 6 — Purpose + Dream ✅
DB: `purpose_profiles`, `energy_observations`, `dreams`, `fulfillment_orders`, `monetization_paths`, `monetization_outreach`
Services: `purpose-discovery.js`, `dream-funding.js`, `fulfillment-engine.js`, `monetization-map.js`
Routes: `/api/v1/lifeos/purpose/*` (13 endpoints + 6 monetization endpoints)
UI: `lifeos-purpose.html` (Purpose / Dreams / Fulfillment / Monetization tabs)

### Phase 7 — Children's App ✅
DB: `child_profiles`, `child_dreams`, `child_sessions`, `curiosity_threads`, `character_profiles`, `character_stories`, `character_moments`
Services: `child-learning-engine.js`, `dream-builder-child.js`, `character-builder.js`
Routes: `/api/v1/lifeos/children/*` (12 endpoints + 7 character endpoints)
UI: `lifeos-child.html`, `lifeos-parent-view.html`

### Phase 8 — Data Sovereignty ✅
Research aggregate log, differential privacy, consent registry, multi-party constitutional lock (declared, not yet architecturally enforced)

### Phase 9 — Mediation ✅
DB: `mediation_sessions`, `mediation_turns`, `mediation_agreements`
Service: `mediation-engine.js`
Routes: `/api/v1/lifeos/mediation` (10 endpoints)
UI: `lifeos-mediation.html`

### Phase 11 — Future Vision + Video ✅
DB: `vision_sessions`, `future_videos`, `timeline_projections`
Services: `future-vision.js`, `video-production.js`
Routes: `/api/v1/lifeos/vision` (10 endpoints)
UI: `lifeos-vision.html`

### Phase 12 — Identity Intelligence ✅
DB: `contradiction_log`, `belief_patterns`, `identity_reviews`, `honest_witness_sessions`
Service: `contradiction-engine.js`
Routes: `/api/v1/lifeos/identity` (11 endpoints)

### Phase 13 — Decision Intelligence ✅
DB: `decisions`, `second_opinions`, `bias_detections`, `energy_patterns`
Service: `decision-intelligence.js`
Routes: `/api/v1/lifeos/decisions` (11 endpoints)
UI: `lifeos-decisions.html`

### Cross-Cutting (shipped)
- `services/response-variety.js` + `db/migrations/20260407_response_variety.sql`
- `services/communication-profile.js` + `db/migrations/20260407_communication_profile.sql`
- `services/truth-delivery.js` — truth delivery calibration with timing/receptivity learning
- `services/communication-coach.js` — communication OS (wired with variety + profile)

---

## KEY SERVICES (quick reference)

| Service | Does |
|---------|------|
| `services/lifeos-lumin.js` | Main Lumin chat, thread modes, commitment auto-ingest |
| `services/lifeos-lumin-build.js` | Lumin programming bridge (build mode) |
| `services/commitment-tracker.js` | Log, keep, break, snooze, AI extraction from conversation |
| `services/integrity-score.js` | Compute, save, trend integrity score |
| `services/joy-score.js` | Check-in, rolling avg, pattern analysis |
| `services/health-pattern-engine.js` | Sleep/HRV/mood/food correlation (30-day AI analysis) |
| `services/emergency-detection.js` | Apple Watch abnormal signals → alert chain |
| `services/emotional-pattern-engine.js` | analyzePatterns, earlyWarning |
| `services/truth-delivery.js` | Hard truth generation calibrated to user style |
| `services/communication-profile.js` | Per-user receptivity + style weighting |
| `services/lifeos-notification-router.js` | Routes notifications (SMS/push/overlay) with guard |
| `services/lifeos-scheduled-jobs.js` | guarded prod scheduler: prod ticks, early warning, calibration |

---

## KEY ROUTES (quick reference)

| Prefix | File | Covers |
|--------|------|--------|
| `/api/v1/lifeos` | `routes/lifeos-core-routes.js` | Mirror, commitments, integrity, joy, health, inner-work |
| `/api/v1/lifeos/family` | `routes/lifeos-family-routes.js` | Household sync, shared commitments, debriefs |
| `/api/v1/lifeos/emotional` | `routes/lifeos-emotional-routes.js` | Emotional patterns, parenting, daily check-in |
| `/api/v1/lifeos/purpose` | `routes/lifeos-purpose-routes.js` | Purpose, dreams, fulfillment, monetization |
| `/api/v1/lifeos/children` | `routes/lifeos-children-routes.js` | Profiles, explore, sessions, dreams, character |
| `/api/v1/lifeos/mediation` | `routes/lifeos-mediation-routes.js` | Mediation sessions and turns |
| `/api/v1/lifeos/vision` | `routes/lifeos-vision-routes.js` | Vision sessions, timelines, videos |
| `/api/v1/lifeos/decisions` | `routes/lifeos-decisions-routes.js` | Decision log, biases, energy profile |
| `/api/v1/lifeos/identity` | `routes/lifeos-identity-routes.js` | Contradictions, beliefs, witness sessions |
| `/api/v1/lifeos/chat` | `routes/lifeos-chat-routes.js` | Lumin conversation surface |

---

## CURRENT POINT B TARGET — LifeRE Alpha

**Mission ID:** `PRODUCT-LIFERE-OS-V1-0001`  
**Authority:** `builderos-reboot/POINT_B_TARGET.json` + `builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/FOUNDER_PACKET.md`

**Target doctrine:** Point B is not the same thing as queue rank. The active product work queue lives in `builderos-reboot/BP_PRIORITY.json`. The current Point B lock for the foundation loop is `LifeRE Alpha`.

**FOUNDER SUCCESS TEST:** Open `/overlay/lifeos-app.html` on the LifeRE path, complete one daily command center cycle, and confirm top-3 priorities plus nightly debrief are visible without Cursor.

**Acceptance command:** `npm run lifeos:lifere-os:v1-acceptance`

**PASS (both required):**
1. Technical — command exit 0 + `products/receipts/LIFERE_OS_V1_ACCEPTANCE.json` verdict PASS
2. Founder usability — Adam confirms the LifeRE path is founder-usable in the real overlay, not just structurally present

**Status:** TECHNICAL_PASS_ONLY — `OBJECTIVE_VERDICT.json` says `founder_usability_pass: false`, so Point B is not yet honestly complete.

**Queue authority:** `builderos-reboot/BP_PRIORITY.json` is the ordered BP queue for product work. Do not infer queue rank from the Point B target block and do not infer Point B from queue rank alone.

**System path:** Founder packet → PSSOT / target lock → BLUEPRINT.json (HOW) → execute → acceptance → founder usability truth.

---

## KNOWN INCOMPLETE

| Item | Status |
|------|--------|
| Sherry separate login (Phase 4) | ⚠️ INCOMPLETE — blocks full Family OS |
| Architectural constitutional lock (multi-party cryptographic) | Declared, not yet built |
| Lumin conversation → calendar auto-wire (beyond event-ingest) | Backlog — Commitments v1 is the proof slice |
| Finance connectors (Plaid/MX) | → AMENDMENT_26 scope, not here |
| Crisis-language detector + clinical handoff | → AMENDMENT_28 scope |
| Recovery / relapse workspace | → AMENDMENT_28 scope |

---

## PRICING (reference)

| Tier | Price | Includes |
|------|-------|---------|
| Free | $0 | Mirror (7-day), 5 commitments, 1 Future Self session, 1 month Coach, Children's Dream Builder (forever), Hardship Protocol (forever) |
| Core | $29/mo | Full Mirror, unlimited commitments, emotional layer, basic health, parenting, decisions, mediation |
| Premium | $67/mo | Core + wearables, identity intelligence, conflict coach, vision/video, finance OS, growth/mastery |
| Family | $97/mo | Premium × 5 + children's full + partner sync |
| Wellness Add-on | +$29/mo | Recovery, special needs, caregiver, therapist integration, conflict repair |

**Never gate:** Hardship protocol, data deletion, crisis routing, children's dream builder, emergency detection.
