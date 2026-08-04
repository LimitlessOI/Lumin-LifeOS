<!-- SYNOPSIS: Canonical product home — SalesOS -->

# SalesOS Product Home

**Product id:** `salesos`
**Parent platform:** LimitlessOS
**Constitutional law:** `docs/constitution/NORTH_STAR_SSOT.md`
**Machine manifest:** `docs/products/salesos/FILE_MANIFEST.json`
**Mission pack:** `builderos-reboot/MISSIONS/PRODUCT-SALESOS-THERAPIST-MEETING-KIT-V1-0001/`

||| **Last Updated** | 2026-07-23 — Grounded zero-state and phased build plan added; Human Performance Engine explicitly deferred to Phase 4. |

---

|| Field | Value |
|---|---|---|
| **Lifecycle** | `founder-vision` |
| **Status** | Planning — product home and draft blueprint only; no runtime code |
| **Reversibility** | `two-way-door` |
| **Stability** | `draft` |
| **Owner** | adam |
| **Parent System** | [LimitlessOS](../limitlessos/PRODUCT_HOME.md) |
| **Verification Command** | none yet |

> **Y-STATEMENT:** In the context of founders who need to book 1–2 real meetings today but hate generic cold outreach and do not have time to research every practice, we decided to build **SalesOS** in four phases: (0) lock schema/consent/lead-magnet decisions, (1) turn a practice URL into a one-screen meeting kit, Founder Brief, CRM record, and bullet-point call script, (2) log manual call outcomes and commitments, (3) add consent-aware call recording and transcription, and only then (4) build coaching replay, Sales DNA, and the cross-domain Human Performance Engine. We will not build the engine before Phase 3 has produced real call data and a second domain proves the same need.

## What SalesOS is

SalesOS is the **founder-led outbound operating system** inside LimitlessOS. It owns the research, preparation, execution, and follow-up for getting meetings with professional-service practices — starting with therapists.

The first deliverable is the **Therapist Meeting Kit**: one screen that tells the founder everything before the call.

For every practice:
- Decision maker and gatekeeper names
- Owner/therapist background
- Number of clinicians and specialties
- Reviews — strengths and complaints
- Technology signals (booking, website quality, social presence)
- AI adoption signals
- Shared interests / why this practice is a fit
- Three opening conversation hooks
- Five likely objections
- Best value proposition for that practice
- Follow-up email already written
- Follow-up text already written
- CRM record already created
- Meeting status and next action

## What SalesOS is not

- Not a replacement for a CRM of record (Outreach CRM, BoldTrail, etc.). It is an intelligence and meeting-prep layer.
- Not a robocaller or spam tool. Outreach is consent-gated and human-initiated.
- Not a clinical tool. It does not diagnose or treat.
- Not an automatic call recorder. Audio capture is opt-in, jurisdiction-aware, and Phase 2.

## Relationship to sibling systems

```
LimitlessOS
└── SalesOS (you are here)
    ├── Outreach CRM — contact records, consent, sequences, suppression
    ├── Site Builder — website scoring (`site-builder-opportunity-scorer.js`), web research (`web-search-service.js`)
    ├── MarketingOS — voice, content, brand stories
    ├── LifeOS — chair interface, commitments, Founder Brief generation
    └── BuilderOS — factory execution
```

**Shared dependencies** (do not duplicate; point to owning product):
- `services/web-search-service.js` — Brave/Perplexity research
- `services/site-builder-opportunity-scorer.js` — website quality scoring
- `services/prospect-pipeline.js` — lead pipeline primitives
- `services/communication-gateway.js` — Twilio inbound SMS/call handling and voicemail (**inbound only**; no outbound recording flow)
- `services/consent-registry.js` — explicit consent for recording/analysis features
- `services/data-sovereignty.js` — deletion and data ownership
- `services/chair-decision-ledger.js` — decision → prediction → outcome → calibration (commitment ledger pattern)
- `services/lumin-communication-guard.js` — forbidden-phrase detection and identity-safe language
- `services/lifeos-crisis-language-detector.js` — deterministic intervention gate (pattern for the Confidence Governor)
- `services/lifere-sales-simulator.js` — prior art for sales coaching simulator
- `db/migrations/20260313_core_schema.sql` — active source of truth for `sales_call_recordings`, `coaching_clips`, `real_time_coaching_events`, `sales_technique_patterns`, and `agent_activities` (proven schema, currently FK'd to `boldtrail_agents`; adapt before reuse)

## Priority order (founder lock)

- **Phase 0 — Decisions and schema**
  1. Schema strategy (reuse vs. new `salesos_*` tables)
  2. Recording legal policy and consent workflow
  3. Lead magnet default
  4. CRM ownership and data retention
- **Phase 1 — Therapist Meeting Kit**
  5. Research packet generation
  6. Founder Brief
  7. Therapist CRM
  8. Call script (bullet points only)
  9. Follow-up email
  10. Follow-up text
- **Phase 2 — Call outcome logging**
  11. Manual call result and commitment ledger
  12. Meeting recap generator
  13. Referral engine
- **Phase 3 — Consent-aware recording**
  14. Call recording, transcript, and transcript segments
  15. Evidence Layer integration (CRM, calendar, email, SMS)
- **Phase 4 — Coaching and Human Performance Engine**
  16. Tonality engine and coaching replay
  17. Sales DNA and pattern learning
  18. Confidence Governor and Adaptive Attention Allocation
  19. Cross-domain Human Performance Engine (only after real call data + second domain)

Phase 1 scope: items 5–10 plus the CRM record and a manual call-notes mode. Phase 2–4 are explicitly out of the initial mission.

## North-star capabilities (not Phase 1)

These are captured from the latest founder direction and are **explicitly deferred**:

- **Human Performance Engine** — the shared cross-domain improvement loop (observe → understand → demonstrate understanding → permission → explore → evidence → self-discovery → choice → support → learn).
- **Adaptive Attention Allocation** — continuously estimate where the human's attention is constrained and allocate coaching to the highest-leverage gap.
- **Confidence Governor** — real-time coaching thresholds: stay silent below 60% confidence, subtle suggestion at 80–95%, interrupt only at 95%+.
- **Identity-Safe Coaching** — observations before interpretations; never frame feedback as "you did X wrong."
- **Retrieval-over-Generation** — surface the user's own proven stories, calls, and patterns instead of inventing advice.
- **Best Self vs. Current State** — compare today's performance to the user's own historical best, not a generic average.

These depend on Phase 3 producing real call recordings and on at least one other domain needing the same loop.

## Non-negotiables

- **Consent-first recording.** No call is recorded, transcribed, or analyzed without explicit, revocable consent captured in `consent_registry` with the exact language shown. Jurisdiction-aware policy: at minimum support `nevada_one_party`, `disclosure_required`, and `disable_recording` modes.
- **No dark patterns.** No fake scarcity, no spoofed calls, no hidden auto-dialers.
- **No training on user calls without explicit opt-in.**
- **User owns the data.** Full export and deletion available via `data-sovereignty.js`.
- **Truth labels.** Every generated claim (e.g., "review says X") is labeled KNOW / THINK / GUESS based on source.
- **Fail-closed on missing consent.** If the recording policy cannot be determined, the call is not recorded.
- **Do not fabricate practice facts.** If research cannot find a name, phone, or background, the system says "not found" and prompts the founder to fill it.
- **Crisis routing.** If any message indicates self-harm, the system returns crisis resources and does not continue the sales workflow.

## Pre-build readiness

**Status:** NOT_READY — Phase 0 decisions below must be resolved before blueprinting moves to execution.

**Known (from existing code and production DB):**
- `services/site-builder-opportunity-scorer.js` can score a practice website for booking, mobile, SSL, social proof, CTA, etc.
- `services/web-search-service.js` can run Brave/Perplexity research.
- `outreach-crm` has `crm_contacts`, `outbound_consent`, `crm_messages` tables and a consent model.
- `consent-registry.js` supports append-only consent grants/revocations and `requireConsent`.
- `data-sovereignty.js` provides full user erasure.
- `services/chair-decision-ledger.js` and the `decision_outcome_ledger` table are live (6 seeded rows).
- `services/lumin-communication-guard.js` enforces identity-safe language in `chair-direct-agent.js`.
- `services/lifeos-crisis-language-detector.js` is a deterministic intervention gate.
- `db/migrations/20260313_core_schema.sql` is the active source of truth for `sales_call_recordings`, `coaching_clips`, `real_time_coaching_events`, `sales_technique_patterns`, and `agent_activities`. These tables exist in production with zero rows but are currently FK'd to `boldtrail_agents`.
- `routes/lifere-sales-coaching-routes.js` is mounted at `/api/v1/lifere/sales-coach` and provides simulator/scoring prior art.

**Assumed:**
- The first vertical is therapists; vertical-specific hooks/objections will be therapist-first.
- `crm_contacts` is the CRM of record and `salesos_practice_profiles` is a research-derived intelligence side table.
- A founder-facing page can live in `public/overlay/lifeos-app.html` as a new stack view (per legacy-interfaces rule).
- The Human Performance Engine is not built in Phase 1.

**Missing / open decisions:**
1. **Schema strategy.** Migrate existing `sales_call_recordings`/`coaching_clips` etc. to add `user_id`/`practice_id` and nullable `agent_id`, or create new `salesos_*` tables? Engineering decision.
2. **Recording legal policy.** Founder must choose: (a) universal disclosure + affirmative consent, (b) Nevada one-party with interstate disclosure, or (c) no recording in Phase 1. Vision/Risk decision.
3. **CRM ownership.** Reuse `crm_contacts` + new `salesos_practice_profiles` table, or build a separate SalesOS CRM? Engineering decision.
4. **Outbound channel.** Use Twilio for calls/SMS (existing) or manual founder action only in Phase 1? Engineering + Business decision.
5. **First meeting offer.** Choose the lead magnet: AI Practice Intelligence Report, Patient Journey Review, or Therapist AI Readiness Assessment. Vision decision.
6. **Data retention.** How long are research packets and call artifacts retained? Risk/Compliance decision.
7. **Queue priority.** SalesOS is not yet in `builderos-reboot/BP_PRIORITY.json`. Business decision.
8. **Human Performance Engine timing.** Build inside SalesOS after Phase 3, or wait for a second domain to prove a shared core is needed? Vision/Architecture decision.

## Change Receipts

| 2026-07-23 | Initial product home, FILE_MANIFEST, and mission pack `PRODUCT-SALESOS-THERAPIST-MEETING-KIT-V1-0001` created from founder vision. No runtime code; not yet queued. | Capture the vision in canonical form and surface open decisions before execution. | `npm run builder:preflight` PASS after doc-only changes. | Resolve open decisions and queue Phase 1 in BP_PRIORITY. |
| 2026-07-23 | Grounded zero-state and phased build plan added (`SALESOS_ZERO_STATE_AND_BP.md`); Human Performance Engine deferred to Phase 4. Existing `sales_call_recordings`/`coaching_clips`/`real_time_coaching_events`/`sales_technique_patterns` tables in `20260313_core_schema.sql` identified as proven prior art. Decision count expanded from 6 to 8. | Refine blueprint from wishlist to a build plan that starts from verified infrastructure and defers the engine until real evidence exists. | `npm run builder:preflight` PASS after doc-only changes. | Resolve Phase 0 decisions and queue Phase 1 in BP_PRIORITY. |
