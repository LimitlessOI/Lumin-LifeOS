<!-- SYNOPSIS: Founder Packet — LifeRE Sales Coaching System Phase 1 -->

# Founder Packet: LifeRE Sales Coaching Phase 1

**Mission ID:** PRODUCT-LIFERE-SALES-COACHING-V1-0001
**Product:** LifeRE
**SSOT:** docs/products/lifere/PRODUCT_HOME.md

## WHAT

Build the Phase 1 sales coaching system for LifeRE agents. The core capability: an AI plays the role of a real estate client while the agent practices live. After each agent turn, the system gives a real-time coaching note. At session end: scores and debrief. After this blueprint:

- Agent selects a scenario (expired listing, listing appointment, buyer call, cold call, objection drill)
- AI plays the client — stays in character, adapts difficulty to agent quality
- After every agent turn: real-time coaching prompt on-screen (≤40 words, one tactical move)
- AI detects personality quadrant from first exchange; adapts client persona + coaching advice accordingly
- Session ends with scored debrief: talk ratio, question quality, objection handling, close timing, quadrant adaptation
- 10 core real estate objections pre-loaded with response frameworks by personality quadrant
- Acceptance test passes end-to-end

## PASS

Machine runs `node scripts/run-lifere-sales-coaching-acceptance.mjs` — all tests pass.
`OBJECTIVE_VERDICT.json` written with `"verdict": "TECHNICAL_PASS"`.

## SEQUENCE

1. DB migration (`db/migrations/20260629_lifere_sales_coaching.sql`) — coaching sessions, objection attempts tables
2. Objection library (`config/lifere-objection-library.json`) — 10 core RE objections with quadrant-specific responses + 5 practice scenarios
3. Sales simulator service (`services/lifere-sales-simulator.js`) — AI client persona, real-time coaching, quadrant detection, debrief
4. Sales coaching routes (`routes/lifere-sales-coaching-routes.js`) — scenarios, session start/turn/end/score, session history
5. Acceptance test (`scripts/run-lifere-sales-coaching-acceptance.mjs`) — full simulator session end-to-end
6. Route wiring (`startup/register-runtime-routes.js`) — mounts at `/api/v1/lifere/sales-coach` (builds on SSM wiring)

## NOTES

- This BP depends on `PRODUCT-SOCIALMEDIAOS-SESSION-MVP-0001` executing first (step 6 builds on SSM's register-runtime-routes.js).
- Owner ID from `req.lifeosUser?.sub` or `req.body.owner_id` for testing.
- Each turn: (1) AI plays client, (2) AI gives coaching note — two callAI calls per turn.
- Debrief: one AI call at session end — returns structured JSON scores.
- Phase 2 (live call coaching) is not in scope — this BP covers simulator only.
- Quadrant detection from first agent message — informs all subsequent coaching.
- "Just-in-time" principle: coaching appears when agent needs it, not as a lecture before starting.

## PHASE ROADMAP (context only — not built here)

- Phase 1 (this BP): text simulator, AI plays client, real-time coaching, scored debrief
- Phase 2: live call listening (agent on real call, system listens, coaching appears on screen)
- Phase 3: voice integration (agent speaks, AI transcribes + coaches in real time)
- Phase 4: behavioral analytics (call pattern tracking, momentum coaching, win/loss library)

## FOUNDER SUCCESS TEST

Start an 'expired_listing' session → send 3 agent turns → receive client responses + coaching notes → end session → review debrief scores. Run acceptance test: PASS.
