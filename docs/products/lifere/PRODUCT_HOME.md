<!-- SYNOPSIS: Canonical product home — LifeRE -->

# LifeRE Product Home

**Formerly called:** LIFERE

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `lifere` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/lifere/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-07-24 — LifeRE overlay auth headers match LifeOS key names; priorities no longer stick on “Loading…” after 401. |

---

## Product operations (preserved from prior home)

## Mission

LifeRE is the real-estate business operating system.

It owns the business-specific command, pipeline, coaching, communication, marketing, and performance layers for a real-estate operator, while reusing LifeOS as the human shell underneath.

## Active missions

Active LifeRE mission:
- `PRODUCT-LIFERE-OS-V1-0001`

## Owned runtime files

Primary owned files are defined in:
- `docs/products/lifere/FILE_MANIFEST.json`

High-signal owned surfaces:
- `services/lifere-os-v1.js`
- `services/lifere-boldtrail-bridge.js`
- `services/lifere-sales-simulator.js`
- `routes/lifere-os-routes.js`
- `routes/lifere-sales-coaching-routes.js`
- `public/overlay/lifeos-lifere.html`
- `config/lifere-objection-library.json`
- `db/migrations/20260629_lifere_sales_coaching.sql`

## Shared dependencies

LifeRE depends on:
- LifeOS shell and Chair front door
- BoldTrail as CRM system of record
- TC services
- MarketingOS shared adapters and doctrine

Use pointers, not duplication.

---
| Field | Value |
|---|---|
| **Product spec** | `docs/products/LIFERE.md` |
| **Status** | **FOUNDING** — doctrine + twin blueprint shipped 2026-06-13 |
| **Authority** | Subordinate to SSOT North Star Constitution |
| **Lifecycle** | `active` (program) / Alpha slice `technical_pass` |
| **Last Updated** | 2026-06-30 — sales coaching simulator machine path reached TECHNICAL_PASS; deterministic fallback + provider fallback added for coaching turns |
| **Verification (Alpha)** | `npm run lifeos:lifere-os:v1-acceptance` |
| **Verification (Alpha readiness)** | `npm run lifeos:lifere-alpha-readiness` |
| **Audit agent prompt** | `docs/LIFERE_ALPHA_AUDIT_AGENT_PROMPT.md` |
| **Manifest** | `docs/products/lifere/FILE_MANIFEST.json` |

> **Y-STATEMENT:** In the context of real estate agents drowning in disconnected CRM, marketing, transaction, and coaching tools,
> facing lost leads, generic AI, and no clear daily priority math,
> we decided to build **LifeRE** as the intelligence and operating layer above broker systems of record,
> to achieve more GCI with less chaos and protected life quality,
> accepting that BoldTrail, TC stacks, and MarketingOS remain integrated dependencies—not the whole product.

---

## WHAT THIS IS

LifeRE is the **real estate business operating system**: command center, digital twins, performance math, coaching, marketing module, transaction visibility, recruiting, and approval-gated execution—for solo agents and teams.

**Mission:** Help agents know what to do today, convert pipeline faster, communicate in their own voice, and see the numbers that create deals—without replacing broker CRM of record.

**LifeOS stack (NOT a separate product):** LifeRE plugs into the universal LifeOS shell (`lifeos-app.html`). It **inherits** `docs/LIFEOS_SERVICE_AND_EPISTEMOLOGY_DOCTRINE.md` in full — serve don't decide, per-person motivation (Personal Twin), truth labels, fluid adaptive OS, SMOS director law. **Verify:** `npm run lifeos:service-doctrine:verify`.

---

## RELATIONSHIP TO SIBLING AMENDMENTS

| Amendment | Relationship to LifeRE |
|-----------|------------------------|
| **21 LifeOS Core** | Parent personal OS + Lumin Chair; LifeRE extends for RE business lane |
| **11 BoldTrail RE** | **CRM SoR adapter** — contacts, pipeline sync; LifeRE owns intelligence layer above |
| **17 TC Service** | **Transaction execution spine** — portals, deadlines, comms; LifeRE surfaces status to agents |
| **08 Outreach CRM** | **Outbound sequences** — consent-gated email/SMS/call; LifeRE attributes leads |
| **15 Business Tools** | **RE training + recruiting** legacy blocks → migrate under LifeRE Recruiting OS |
| **29 AI Receptionist** | **Inbound call capture** → LifeRE Lead Twin + BoldTrail |
| **41 MarketingOS** | **Platform sibling** — LifeRE.MarketingModule shares adapters, not duplicate law |
| **44 Token Accounting** | Model cost routing for Lumin/Chair RE tasks |
| **04 Auto Builder** | Machine path for LifeRE missions |

**Consolidation rule:** New LifeRE product law lives **here + LIFERE.md**. Sibling amendments keep **integration contracts** only; duplicate LifeRE product prose should migrate to this amendment via receipt.

---

## PRODUCT LAW

### Layer model
```
LifeOS (personal) ──extends──▶ LifeRE (RE business OS)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              BoldTrail SoR    TC Am 17      MarketingModule
              (Am 11)          portals       (↔ Am 41)
```

### Execution doctrine
- **Internal automation:** allowed when bounded + receipted
- **External comms (email/SMS/post/call):** approval required unless Permission Twin grants tier
- **CRM write-back:** approval-gated (KNOW: follow-up approve route exists)

### Digital twin doctrine
Full twin set defined in `docs/LIFERE_FULL_DIGITAL_TWIN_BLUEPRINT.md`. No twin claim without labeled memory inputs + update receipts.

### Lumin Chair
LifeRE user-facing orchestration runs through **Lumin** in `/lifeos` — not Voice Rail (scrapped).

---

## NON-NEGOTIABLES

1. Agent voice preservation on all generated comms and content
2. No cross-agent lead access without authorization
3. No auto-send outbound without approval tier
4. Real estate commission / fair housing compliance — human gate on sensitive content
5. BoldTrail (or broker CRM) remains SoR where broker requires
6. No fake PASS / usability theater (`founder_usability_pass` required for Alpha honesty)
7. Performance claims labeled KNOW/THINK/GUESS/DON'T KNOW
8. LifeOS personal data wall for employer/broker views

---

## OWNED FILES

### Primary (LifeRE program)
```
docs/products/LIFERE.md
docs/LIFERE_MASTER_BLUEPRINT.md
docs/LIFERE_BUILDER_DIGITAL_TWIN.md
docs/LIFERE_FULL_DIGITAL_TWIN_BLUEPRINT.md
docs/LIFERE_A_TO_Z_FEATURE_MAP.md
docs/LIFERE_GAP_AUDIT.md
config/lifere-*.json
services/lifere-*.js
routes/lifere-os-routes.js
public/overlay/lifeos-lifere.html
db/migrations/20260613_lifere_twin_framework.sql
scripts/run-lifere-*-acceptance.mjs
tests/lifere-performance-twin.test.js
products/receipts/LIFERE_AZ_ACCEPTANCE.json
builderos-reboot/MISSIONS/PRODUCT-LIFERE-MASTER-BLUEPRINT-0001/
builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/   ← Alpha corridor (historical)
```

### Removed from planned (now shipped 2026-06-23)
```
services/lifere-performance-twin.js … lifere-council-router.js (26 services)
```

### Integration (read-only ownership — sibling amendments)
See Am 11, 17, 08, 29, 41 file lists in `LIFERE_GAP_AUDIT.md`.

---

## Sales Coaching & Training System — Vision (2026-06-29)

> Brainstorm capture: Adam + Claude. Not a build spec — raw product intelligence for BP writing. This module is industry-agnostic at the engine level; real estate is the first vertical.

### The Full Stack (EXP Recruiting Value Proposition)
Agents who come to EXP under Adam get the complete LifeRE stack:
- **SocialMediaOS** — content machine that builds their brand
- **TC** — transaction coordination, compliance, deadline management
- **AI Receptionist** — never misses an inbound inquiry
- **Contract writing** — from a voice note or a few words
- **Search setup automation** — texts clients, asks criteria questions, sets up MLS searches automatically
- **Just-in-time coaching** — knowledge delivered at the moment of need, not front-loaded
- **Real-time on-screen script coaching** — what to say, as they need to say it
- **Team building and management** — tools to build and train their own team
- **LifeOS personal shell** — organizes their life, eliminates chaos

### Three-Phase Coaching Architecture

**Phase 1 — Simulator**
AI plays the client. Agent plays themselves. Runs any scenario: cold call to expired listing, listing appointment with unrealistic price expectations, buyer burned out after 18 months, any named objection. Agent runs the same scenario until they nail it. System scores: talk/listen ratio, question frequency, close timing, silence tolerance. Real clients never experience a bad moment.

**Phase 2 — Live Call Coaching (heavy)**
Agent on real calls. System listens. On screen in real time: "You've been talking 90 seconds — ask a question." "They said 'I need to think about it' — that's not a no. Here are 3 responses." "This is a close moment — options: [assumptive] [puppy dog] [summary]." New agents get constant guidance.

**Phase 3 — Live Call Coaching (light)**
Experienced agent. Screen is mostly quiet. Only speaks at critical moments: "You're talking too much." "Close. They're ready." "Urgency — use it." The system earns its silence. Only interrupts when the data says they're drifting.

### Core Sales Principles (Hard-Wired Into System)

**The Listening Close**
Ask: "What are your expectations of your next agent?" Then: "What else? What else?" until they run dry. Confirm: "Do you feel I can handle all of those?" Trial close: "Do I seem like the right agent for you?" Recap every item in their words. Then: "Sign right here." The close is always inside what the client already said. Agent's job: ask the question, listen all the way through.

**Never Argue — The Bunkering Law**
When clients don't feel heard, they bunker. They stop evaluating the deal and start defending their position. Every coaching prompt, every simulation, every script begins with validation before redirection. Validate → acknowledge → redirect. Non-negotiable. System enforces this at every level.

**Close in the Room**
Every hour without a commitment, probability drains from the deal. System never lets the agent leave without attempting the close. If conversation wraps without commitment: on-screen flag. The close sequence: recap their list → confirm you can deliver → trial close → signature.

**The Three Options Framework**
At the end of every listing appointment:
1. "You choose to work with me — great, let's go."
2. "You choose not to work with me — totally fine, I respect that."
3. "You need to think about it — for me, a maybe is a no."

By making "no" a respected option, false yeses disappear. By making "maybe" a no for you, the client is forced to actually decide. Most powerful thing about it: it communicates that your time has value.

**The Car Move**
When both decision makers are present and "I need to think about it" comes up: "Absolutely — I'll step outside, sit in my car. Take as long as you need. When you're done talking and have questions, come get me and we'll just get this done." Removes the audience. The real conversation happens. Agent returns to questions, not a second presentation. The car is where the deal actually gets made.

**False Yes Detection**

### Change receipt — 2026-06-30

- Added the Phase 1 sales coaching runtime slice to owned LifeRE surfaces:
  - `routes/lifere-sales-coaching-routes.js`
  - `services/lifere-sales-simulator.js`
  - `config/lifere-objection-library.json`
  - `db/migrations/20260629_lifere_sales_coaching.sql`
- Machine path now proves:
  - scenario list
  - session start
  - three coached turns
  - end-session debrief
  - score readback
- Hardening added so the slice does not die on missing provider availability:
  - corrected `callCouncilMember(member, prompt, options)` usage
  - provider fallback path in route layer
  - deterministic client/coaching/debrief fallback in simulator layer
Real yes vs. false yes sound different: energy drops, response time lags, the word is followed by a qualifying "but." System flags: "This was not a committed yes. Probe here before moving forward." By quadrant: amiable gives false yeses to avoid conflict; analytical gives tentative yeses mid-process; driver gives sharp real yeses; expressive gives enthusiastic yeses that can fade without follow-through.

### Personality Quadrant Detection
System infers quadrant from first 3-5 minutes: speaking pace, linguistic markers, response to rapport, whether they reference facts or feelings, push-back style.

| Quadrant | Profile | Coaching Adjustment |
|----------|---------|---------------------|
| **Analytical** | Data-driven, methodical, fears wrong decisions | Never rush. Give comparables. Expect questions — they're warming up, not stalling. Close too early = lost trust permanently. |
| **Driver** | Direct, results-oriented, impatient | Get to the point. Skip small talk. Offer choices, not recommendations. Give them control. |
| **Expressive** | Buys the agent first, then the house | Build rapport first. Use vision and emotion. Testimonials beat statistics. |
| **Amiable** | Needs safety, defers to others | Never rush. Find the invisible influencer (spouse, parent, friend). Get them in the conversation. |

All real-time coaching prompts, objection responses, close suggestions, and silence coaching adapt to detected quadrant.

### The 10 Core Objections (mastered, not memorized)
Any industry has ~10 real objections underneath all the surface variations. System identifies the 10 for each vertical, builds mastery through:
1. Simulation: agent faces it 20+ times until the response is automatic
2. Failure loop: when they fail it in real life → write 5 different responses → system helps perfect each → practice until mastered
3. Live coaching: objection detected in real call → ideal response on screen within 2 seconds, adapted to this client's quadrant

### Auto CRM Intelligence Capture
System listens to every call and auto-logs:
- Names, relationships, personal details mentioned in passing
- Timeline signals ("lease ends in October")
- Budget signals (even unstated anchors)
- Decision-making style and influencers
- Kids' names, job, interests, fears, what motivates them
- Every expectation they stated about their ideal outcome

Pre-call brief (60 seconds before every scheduled call): full history, emotional style, previous objections, what close almost worked, current market stats for their situation. Agent walks in fully briefed every time.

### Objection Origin Detector
Surface objection → real driver:
- "I need to think about it" → trust deficit, price concern, need spouse input, or genuinely analytical
- "I want to wait" → status quo bias, fear of commitment, or legitimate timing
- "Your commission is too high" → doesn't yet see the value, price-sensitive, or using it as a deflection

System classifies the real driver and changes the entire response strategy accordingly. Same surface words, completely different approach underneath.

### Additional Intelligence Features (Priority Ideas)
1. Voice biomarker stress detection — client's stress level from pitch, micro-pauses, intensity; adjust pressure in real time
2. Mirroring coach — detect client's speaking pace and energy, coach agent to match for rapport
3. Pause coach — count seconds after key questions; don't fill silence; first to speak loses
4. Agent energy tracker — analyze agent's own voice throughout; flag when energy drops or tone gets too aggressive
5. Emotional arc mapping — chart full emotional journey of every call; identify exact moments that created or killed warmth
6. Loss aversion framing — reframe pitches as loss prevention when gain framing isn't landing; twice as motivating
7. Anchoring coach — set your number before they set theirs; whoever anchors first wins
8. Status quo bias breaker — make the cost of inaction concrete and specific: "what does waiting cost you each month?"
9. Commitment ladder — track micro-yeses, build toward the macro-yes; flag when ladder is complete and agent should close
10. "What would need to be true" probe — unlocks stalled deals: "what would need to be true for you to move forward today?"
11. Win/loss pattern library — extract patterns from every closed and lost deal; searchable by situation type
12. Behavioral style profiler — detect DISC quadrant from first 5 minutes, adjust all prompts accordingly
13. Reluctance profiler — predict how many touches this client needs; don't push too early or give up too soon
14. Call scoring dashboard — 10 dimensions scored every call; growth map not grades
15. Streak and momentum management — book hardest calls during winning streaks; rest before calls when energy is flagged low
16. Post-call debrief AI — 2-minute structured reflection immediately after call; system pre-populates from analysis
17. Referral harvest prompt — detect emotional peaks (offer accepted, deal closed) and prompt referral ask in real time
18. Competitive battle cards — competitor mentioned → instant card with differentiators and what to say
19. Legacy close — when stuck in transaction-mode, prompt agent to ask one vision question that reframes the decision as a life move
20. Pre-call intelligence brief — 60-second briefing before every scheduled call, every relevant detail surfaced
21. Live cultural/language adaptation — coaching adjusts for cultural communication style; collectivist vs. individualist dynamics
22. Referral partner intelligence loop — track adjacent professionals per transaction; map relationships; prompt reconnection at 90-day intervals

### Industry-Agnostic Architecture
Same engine adapts to any sales vertical. Only the objection library, close scripts, and compliance rules change. Real estate is vertical one. Insurance, financial advisory, SaaS sales follow the same architecture. Every vertical contributes back to cross-industry pattern learning.

---

## HISTORY (condensed)

| When | Event |
|------|-------|
| Pre-2026 | RE capabilities scattered: Am 11 BoldTrail, Am 17 TC, Am 08 outreach, Am 15 training/recruiting, Am 29 receptionist |
| 2026-06-21 | Point B locked to LifeRE Alpha mission `PRODUCT-LIFERE-OS-V1-0001` |
| 2026-06-22 | Alpha shipped: `lifere-os-v1`, routes, overlay, BoldTrail bridge; technical acceptance PASS |
| 2026-06-22 | `founder_usability_pass: false` — honest blocker documented |
| 2026-06-13 | **Founder Handoff packet** — full end-state doctrine, twins, feature map, gap audit; LifeRE founding amendment created |

---

## Change Receipts

| Date | Change | Why | State | Next |
|------|--------|-----|-------|------|
| 2026-07-28 | **Removed a spurious dependency blocking step 10 (`services/livePhoneService.js`, live phone answering via Vapi/Twilio) — the real reason nothing about LifeRE's phone service could ship.** Traced with the new `tier_errors` diagnostic: after fixing the DeepSeek scoping bug, step 8 (`routes/opsTcBlockerCardsRoutes.js`, TC blocker cards — a completely unrelated feature) generated real content but hit `import_resolution_failed` because its spec requires `services/opsTcBlockerCardsService.js`, which was never built (a genuine blueprint gap, separate issue). Step 10 had `depends_on: ["8"]` despite its own spec having zero technical relationship to blocker cards — confirmed by re-reading step 10's full spec (target file, expected export `answerLivePhone`, route `/api/v1/lifere/live-phone`) — an artifact of sequential blueprint generation, not a real requirement. Removed the dependency so step 10 can ship independently. | Founder, mid-session: "make sure the system is building. LifeRE." | Verified step 10's spec has no real coupling to step 8 before removing the dependency, not assumed | Dispatch step 10 for real now that it's unblocked; separately, step 8's real missing-service gap is a legitimate small follow-up if TC blocker cards are still wanted. |
| 2026-07-27 | **Found and fixed the real reason the LifeRE queue reported "no shippable steps": step `10` (`services/livePhoneService.js`, live phone answering) depends on step `8`, which was `skipped` — not `done` — so step 10 could never become shippable no matter how many cycles ran.** Step `8` (`routes/opsTcBlockerCardsRoutes.js`) had failed 9 times in a row on 2026-07-18, always the same `codegen_empty: import_resolution_failed` error on `openai_builder_mini` — the cheapest, last-priority model tier under the OLD (buggy) `TRUSTED_FALLBACK_MODELS` ordering, since fixed twice this session so `claude_sonnet` is genuinely tried first. Reset step 8 to `pending` (cleared `demoted`/`revive_count`/`last_error`) so it gets a real retry under the corrected model ordering instead of staying permanently stuck. | Founder, direct, mid-session: "While you're implementing all these things, make sure the system is building. LifeRE." | Queue reset committed; dispatch + result to be confirmed live next. | If step 8 succeeds under the fixed model ordering, step 10 (live phone service) becomes genuinely shippable for the first time since 2026-07-18. If it fails again with the same signature even on a strong model, that's real evidence the *spec* itself is the problem (unresolvable import target), not the model — a live test case for the new `root_cause_class` classification work. |
| 2026-07-27 | **Built the "superpowers" system — confirmed missing last session, now real and shipped: `services/lifere-agent-superpowers.js` (`getAgentProfile`, `recommendNextModule`), `GET /api/v1/lifere/coaching/superpowers` and `.../coaching/recommend-next`.** Grounded entirely on data that already existed — every real drill completion (`services/lifere-skill-coaching.js`) writes a per-module `score` (measured performance) and `practice_hours` (voluntary time invested) into the agent's real skill twin. No personality quiz, no invented AI judgment: strengths come from measured score, interests come from measured voluntary engagement. Recommendation logic is fully explicit and auditable — no drill history yet → honest cold-start default (fundamentals module, `confidence: low`, reason stated); top-interest module not yet mastered → double down there (`confidence: high`, "direct them to what they like to do" literally implemented); top interest mastered → fall to next-highest real interest; everything mastered → expand into an untried module. Directly tested against 4 real scenarios using the real file-backed twin store (no mocks) before shipping — all passed. | Founder, direct, twice: "find out what their superpowers are and direct them to do the things they like to do" (confirmed missing in the prior session's audit), then "start building them from highest priority to the lowest... every one of these things have to be done." | `node --check` clean on both files; 4 real logic tests run against the actual `readTwin`/`writeTwin` file store (no data → cold start; top-interest-unmastered → recommend it; top-interest-mastered → fall to next; profile shape correct) — all PASS | Verify live once deployed: real curl round-trip against a real (or freshly-drilled) LifeRE user. Fast-follow, not done here: surface this in the LifeRE dashboard UI (a "Your Superpowers" panel) and/or have the "Ask Chair" panel reference it when an agent asks what to work on next — currently API-only. |
| 2026-07-27 | **Added a real chat interface to the LifeRE dashboard (`public/overlay/lifeos-lifere.html`) — direct answer to the founder's design/communication request.** Audited first: the dashboard (2,321 lines) was purely a forms/cards UI with zero real back-and-forth conversation — the one `/api/v1/lifere/council/deliberate` call in the file only fired once as a background trace label, never a real thread. Found the real, working conversational engine already exists and powers LifeOS's own chat (`public/overlay/lifeos-app.html`'s `DIRECT_SYSTEM_ENDPOINT` = `POST /api/v1/lifeos/builderos/command-control/founder-interface/message`, real per-account JWT/command-key auth via `requireFounderInterfaceAuth`, real Chair reasoning, real `human_summary` field) — so this reuses that exact engine rather than building a second, lesser one. Added: a prominent "Ask Chair" chat panel (real message log, composer, 3 suggested prompts, sends real `conversation_history` every turn, renders the real `human_summary` reply — no template strings anywhere in the new code) placed directly under the page header; a lightweight first-run guided walkthrough (`initLifereTour()`, localStorage-gated, 4 steps: chat → today's top 3 → coaching/curriculum tab → deals tab, replayable via a "Take the tour" header button) answering the founder's ask to "help people walk them through these capabilities." Styled entirely within the page's existing design tokens (`--lifere-accent`, `--lifere-elevated`, `--card`, `--border`) — no new visual language invented, both light/dark theme already supported by the existing token system. | Founder, directly: "have our new design engine... design this to be easier, more intuitive, better aesthetically, and it needs to help people walk them through these capabilities... it needs to have genuinely good communication back and forth... the same engine that we're supposed to have for LifeOS of communication. not fake bullshit." | `node --check` on the extracted inline script block (98,438 chars) clean; HTML tag-balance sanity check (`<section>`/`</section>` 19/19, `<div>`/`</div>` 131/131) | Verify live once deployed: open the dashboard fresh (clear `lifere_tour_done` from localStorage) and confirm the tour fires, then send a real message through Ask Chair and confirm a real, non-templated `human_summary` comes back. Full visual redesign of the remaining panels (deals, coaching, marketing tabs) is still open — this shipped the two most-requested, highest-leverage pieces (real communication + walkthrough) first rather than a slower full redesign pass. |
| 2026-07-27 | **Fixed: CFO role in LifeRE council deliberation never called a real model, ever — deterministic, not intermittent.** Direct root cause of Adam's own question about whether Chair/Architect/century-tier reasoning is silently degraded (his hypothesis: low funds → free-tier cascade). Live-tested `POST /api/v1/lifere/council/deliberate` first: **Chair** produced real, on-topic, substantive reasoning (calls `claude_sonnet` via alias `anthropic`) — refutes the degraded-Chair hypothesis, at least right now. But **CFO**'s output was the exact shallow-echo template seen before (`"CFO reviewed: <first 120 chars of prompt>"`) — traced to `services/lifere-council-router.js` line 59: `if (callCouncilMember && role !== 'CFO')` permanently excluded CFO from the real-model branch, unconditional on spend, errors, or anything else. Every CFO "review" in every council deliberation, ever, was fake — presented to the founder as real financial analysis via the receipt/API response. Not a spend-cap bug; a hardcoded dead-code exclusion, same class as the earlier `hasHeroImage`-always-false bug. Fix: removed the `&& role !== 'CFO'` condition — CFO now calls the real model too, routed through the already-existing cheap tier (`member = role === 'Chair' ? 'anthropic' : 'gemini'`), preserving cost-consciousness for a budget role while making the output real instead of fabricated. | Direct answer to founder: "what model are we using for the chair? For architect, for century... It's supposed to move up to the next level of AI if it's not doing a good job" + "Most likely, it's because I'm out of money." | `node --check` clean; Chair path independently confirmed live via real behavioral test, not assumed | Verify live once deployed: CFO output in a fresh `/lifere/council/deliberate` call should no longer match the `"${role} reviewed:"` template pattern. Separately, still open: `TRUSTED_FALLBACK_MODELS` codegen-tier reorder (fixed same session) is unrelated to this Chair-channel path — Chair/century task-routing table was already independently confirmed correct (`config/task-model-routing.js`). |
| 2026-07-27 | **Verified two flagged "stub" references — both confirmed genuine, well-guarded dev-only fallbacks, not production gaps.** `services/lifere-funnel-ingress.js`'s SYNOPSIS comment "stub without secret" describes the intentional fail-open mode when no `CLICKFUNNELS_WEBHOOK_SECRET` is configured (real, working webhook-ingestion code otherwise — its actual security bug was found and fixed separately this session). `services/lifere-transaction-surface.js`'s `source:'stub_no_db'` only fires inside an `if (!pool)` branch — `pool` is always a real, live injected DB connection in production (confirmed throughout tonight's session), so this path is dev/test-only, never reachable live. No fix needed. | Founder: "audit everything... fix gaps/bugs as you find them." Closing an open item from tonight's TC Service/LifeRE/AI Receptionist audit rather than leaving it unverified. | ✅ Verified clean, no action needed | — |
| 2026-07-27 | **SECURITY: fixed a real auth-bypass logic bug in the ClickFunnels webhook ingress.** `handleClickFunnelsWebhook` (`services/lifere-funnel-ingress.js`) only rejected a request when a secret WAS sent and was wrong (`if (secret && secret !== ENV_SECRET)`); omitting the `x-webhook-secret` header entirely made the check a no-op, so an unauthenticated caller could inject fabricated funnel events into `lifere_funnel_events` even with `CLICKFUNNELS_WEBHOOK_SECRET` configured. Found by an independent security audit tonight, verified directly. Fixed: `if (ENV_SECRET && secret !== ENV_SECRET)` — now rejects whenever the env secret is configured and the provided value doesn't match it, regardless of whether a header was sent. The intentional "not configured yet" soft-accept path (both env and provided secret absent) is unchanged. | Founder: "audit everything... fix gaps/bugs as you find them... make it fucking happen" — real crisis-mode security audit. | `node --check` clean | Verify live once deployed: a request with no secret header should now 401 when `CLICKFUNNELS_WEBHOOK_SECRET` is set. |
| 2026-07-24 | **LifeRE overlay auth harden.** `apiFetch` reads `command_key`/`lifeos_command_key`/JWT (not only `commandKey`); 401 surfaces clear sign-in copy instead of infinite “Loading priorities…”. | Market UI walk: LifeRE stuck loading when key lived under LifeOS’s canonical localStorage name. | ✅ tip after deploy | founder usability confirm still open |
| 2026-07-10 | **LifeRE Marketing → SocialMediaOS** — Marketing tab links canonical standalone app `/marketing` (coach→export). | Adam: SMOS inside LifeRE + standalone. | ✅ local | tip-sync + UI walk |
| 2026-07-03 | **Founder/base-origin cleanup for LifeRE machine probes** — `scripts/audit-founder-alpha-ready.mjs`, `scripts/crm-alpha-test.mjs`, `scripts/run-lifere-alpha-readiness.mjs`, and `scripts/run-lifere-full-audit.mjs` now resolve `PUBLIC_BASE_URL`/live target through the shared public-origin helper instead of carrying stale `robust-magic` assumptions. | Founder alpha and LifeRE audit receipts are only truthful if they grade the same live origin the founder is actually using; stale host defaults were a hidden false-negative / false-positive path. | ✅ local syntax | deploy + rerun LifeRE founder/audit probes |
| 2026-06-26 | **Sentry UI routes (GAP-FILL)** — `routes/lifere-os-routes.js`: `GET /buyer/:ref/workspace`, `POST .../objection-coach`, `GET /seller/:ref/workspace`, `POST .../weekly-report`, `GET /client-comms/suggest-vars`; **`services/lifere-deal-side-os.js`** workspace/coach/weekly; **`services/lifere-client-comms.js`** `suggestVarsFromDeal`; **`services/lifere-boot.js`** `ensureDemoDealTwins` (merge demo_buyer_001/demo_listing_001); agent-alpha + break-it probes | Sentry found overlay buttons 404 on production — routes UI called but agent battery missed | ✅ local 124/124 | redeploy + live founder-alpha audit |
| 2026-06-26 | **`public/overlay/lifeos-lifere.html`** — standalone page redirects to login when no JWT; 401 shows "Sign in" not "Alpha not ready"; shell hint links canonical `/lifeos?...&page=lifeos-lifere.html` | Misleading banner blocked Adam alpha | ✅ UX | deploy |
| 2026-06-26 | **Alpha banner fix** — `lifere-alpha-readiness-surface.js` uses `OBJECTIVE_VERDICT.agent_alpha_pass` (products/receipts excluded from Docker); adds `ready_for_founder_alpha`; `lifeos-alpha-break-it.mjs` (16 stress checks); overlay battery includes break-it | Adam: alpha test use it break it | ✅ live break-it 16/16 | deploy banner fix |
| 2026-06-26 | **Restored agent alpha scripts** — `run-lifere-agent-alpha.mjs` (119 checks incl BoldTrail), `verify-agent-alpha-gate.mjs`; live mode via `LIFERE_AGENT_ALPHA_LIVE=1`; overlay battery loads `.env` | Scripts were never committed — overlay battery failed file-not-found | ✅ live 119/119 + battery PASS | deploy migration |
| 2026-06-25 | **`src/integrations/boldtrail.js`** — kvCORE create tries `POST /contact` then fallbacks; notes use `POST/PUT /contact/:id/action/note`; **`services/lumin-ambient-moment-router.js`** wires BoldTrail auto-capture; **`scripts/crm-alpha-test.mjs`** + **`scripts/alpha-test-lumin-connection.mjs`**; pipeline top-level `contacts` | Adam: fix CRM alpha — BoldTrail create 405 + ambient→CRM write-back | ✅ node --check | deploy + `npm run lifeos:crm:alpha:test` |
| 2026-06-25 | **`routes/lifere-os-routes.js`** — `POST /api/v1/lifere/boldtrail/contacts` wraps `createOrUpdateContact` (prior commit missed route body) | Adam CRM alpha — add bogus BoldTrail client | ✅ node --check | redeploy + crm-alpha-test |
| 2026-06-25 | **`POST /api/v1/lifere/boldtrail/contacts`** + **`scripts/crm-alpha-test.mjs`** — alpha CRM: create bogus BoldTrail contact, ambient capture, internal crm_contacts, note write-back probe | Adam: alpha test CRM connection + add bogus client | ✅ partial live (BoldTrail connected; create route pending deploy) | redeploy + `npm run lifeos:crm:alpha:test` |
| 2026-06-25 | **`services/lifere-alpha-surface-api.js`** (NEW) + **`routes/lifere-os-routes.js`** — 18 missing LifeRE UI API routes (follow-up metrics, education, motivation, funnel, market, community, comms preview, YouTube coach, opportunity scan, lifeos integration) | Agent alpha 99/117 → 117/117; LifeRE tabs were 404 | ✅ `npm run lifeos:lifere-agent-alpha` PASS | deploy; Adam alpha |
| 2026-06-25 | **`services/founder-overlay-surgical-patch.js`** + **`founder-build-self-repair.js`** + **`founder-intent-clarify.js`** — mechanical HTML comment inserts without whole-file regen | Lumin build sliver failed overlay-shrink guard | ✅ local patch test | deploy; live build verify |
| 2026-06-25 | **`scripts/run-overlay-alpha-battery.mjs`** + **`npm run lifeos:overlay:alpha:battery`** — conductor alpha battery | Adam: don't stop until founder-alpha ready | ✅ local battery PASS | `lifeos:overlay:alpha:battery:live` after deploy |
| 2026-06-25 | **`products/receipts/LUMIN_OVERLAY_ALPHA_READINESS.json`** — founder alpha entry steps | Single readiness receipt for Adam | ✅ | Adam opens `/lifeos?layout=desktop` after deploy |
| 2026-07-01 | **Founder-builder LifeRE alpha path hardening** — `startup/register-founder-runtime-routes.js` now mounts `createLifeRERoutes()` inside the founder-builder minimal runtime, and both `scripts/run-lifere-alpha-e2e.mjs` and `scripts/run-lifere-full-audit.mjs` now honor `PUBLIC_BASE_URL` first when targeting live or local founder-builder surfaces. | The machine alpha/founder-builder lane was being graded against LifeRE routes that were not mounted in the minimal runtime, and the audit scripts could silently drift to the wrong base URL. Founder alpha must test the same narrow lane the founder actually uses. | ✅ local founder-builder mount + script base resolution PASS | `PUBLIC_BASE_URL=http://127.0.0.1:4331 node scripts/run-lifere-alpha-e2e.mjs` |
| 2026-06-24 | **Full audit fix batch** — SMOS council signature, alpha PG checklist, outreach user_id fail-closed + adam boot seed, Vapi webhook guard, context router in lifeos-app, dead route imports removed, PG verify 12 tables, `run-lifere-full-audit.mjs` | Adam: audit broken/gaps/disconnected/enforcement | ✅ full-audit 12/12 PASS | deploy; Adam founder confirm |
| 2026-06-24 | **Alpha live verification + founder confirm persist** — live E2E T11–T13, readiness checks live banner/API, `lifere-founder-usability-persist.js` commits verdict to GitHub | Live was 1 deploy behind alpha banner; confirm was ephemeral on Railway | ✅ | redeploy + Adam confirm |
| 2026-06-24 | **SMOS Content Brief v1** — `lifere-content-brief-engine.js`, migration, brief-before-coach gate, UI panel, routes | Adam: brief-first workflow is hard law | ✅ tests + self-audit | deploy; Record Mode v1 |
| 2026-06-13 | **LifeOS Service Doctrine proxy** — LifeRE + SMOS inherit `LIFEOS_SERVICE_AND_EPISTEMOLOGY_DOCTRINE.md`; stack registry; doctrine in bridge + verify gate | Adam: hard-wire philosophy across all stacks | ✅ verify PASS | deploy |
| 2026-06-13 | **SocialMediaOS + builder twin BP** — `lifere-socialmediaos-bridge.js`, routes `/marketing/socialmediaos/*`, UI panel; `BLUEPRINT_BUILDER_TWIN.json` as build authority; TC/outreach 502 fixes | Adam: BP must be twin you build from | ✅ | deploy + founder test |
| 2026-06-13 | **Audit fix batch** — approval resolve → Am 08 execute + comms log; Chair/Deals readable UI; gap report updated | Adam: audit + fill gaps + keep going | ✅ self-audit + readiness | Adam alpha test |
| 2026-06-13 | **Outreach scheduler + founder attempt + approval UI** — `lifere-outreach-scheduler.js` on boot; `POST /alpha/founder-attempt` + `LIFERE_FOUNDER_ATTEMPT.json`; `GET /follow-up/queue`; approval approve/reject in overlay | Adam: keep pushing integration depth | ✅ readiness PASS | deploy; Adam alpha test + quote |
| 2026-06-13 | **Alpha daily cycle** — `lifere-alpha-daily-cycle.js`, `POST /alpha/daily-cycle`, UI button, `/health/deep`, E2E T10 | Adam: one-click alpha test path | ✅ RT-13 | deploy + Adam test |
| 2026-06-13 | **Alpha audit prompt + readiness gate** — `LIFERE_ALPHA_AUDIT_AGENT_PROMPT.md`, `run-lifere-alpha-readiness.mjs`, cred-less THINK fallbacks for YouTube/ClickFunnels | Adam: agent audit then alpha test | ✅ readiness script | Adam alpha test |
| 2026-06-13 | **Product Z push** — outreach approve/execute, Vapi→LifeRE fan-out, TC deal detail, buyer workflow, self-audit script | Adam: no stopping until Z; debug + audit | ✅ self-audit + RT-12 | deploy; founder usability |
| 2026-06-13 | **Learning pipeline + Vapi ingest + Chair relationship** — `lifere-learning-pipeline.js`, `/learning/*`, `/receptionist/vapi-end`, marriage edge seed, UI panels | Adam: keep building past structural PASS | ✅ RT-10 PASS | Founder usability; live PG |
| 2026-06-23 | **A–Z runtime W1–W6** — 26 services, full routes, migration, UI tabs, acceptance PASS | Adam: coder build A-to-Z from blueprint | ✅ `npm run lifeos:lifere-az-acceptance` PASS | Founder usability; live PG; external API creds |
| 2026-06-13 | **Founder Handoff packet** — `docs/products/LIFERE.md`, `AMENDMENT_LIFERE.md`, twin blueprint, A-to-Z map, gap audit | Adam: LifeRE scattered across 5 amendments; need full chair drawing for ARC, not v1-only | ✅ docs | INDEX row; Adam founder usability |
| 2026-06-22 | LifeRE ↔ BoldTrail bridge (recorded in Am 11; law migrates here) | CRM SoR + LifeRE command layer | ✅ runtime | Webhooks phase 2 |
| 2026-06-22 | Alpha acceptance PASS, usability false | Machine vs founder truth split | ✅ technical | Adam opens LifeRE path |

---

## Agent Handoff Notes

| Field | Value |
|-------|--------|
| **Read first** | `docs/LIFERE_BUILDER_DIGITAL_TWIN.md` → `LIFERE_GAP_AUDIT.md` |
| **A–Z receipt** | `products/receipts/LIFERE_AZ_ACCEPTANCE.json` — structural PASS |
| **Alpha mission** | `PRODUCT-LIFERE-OS-V1-0001` — historical corridor |
| **@ssot** | New lifere services → `AMENDMENT_LIFERE.md`; `lifere-os-v1.js` still Am 21 until repoint |
| **Agent alpha** | `npm run lifeos:lifere-agent-alpha:live` — **124/124 PASS** (2026-06-26 sentry routes). Receipt: `products/receipts/LIFERE_AGENT_ALPHA.json` |
| **Founder alpha** | **CLEARED pending deploy** — sentry fixed 5 UI 404s locally; production still 404 until redeploy. Run `npm run lifeos:founder-alpha:audit` after deploy. |
| **Adam entry** | `https://lumin-web-production-e3a9.up.railway.app/lifeos?layout=desktop&direct_system=1&page=lifeos-lifere.html` — sign in first. **`founder_usability_pass`** = Adam-only via Confirm PASS. |
| **Next** | Adam founder session → confirm PASS quote → optional BoldTrail test contact cleanup |
