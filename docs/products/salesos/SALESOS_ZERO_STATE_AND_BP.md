<!-- SYNOPSIS: SalesOS grounded zero-state and build plan -->

# SalesOS Zero-State and Build Plan

**Product:** `salesos` under LimitlessOS  
**Mission:** `PRODUCT-SALESOS-THERAPIST-MEETING-KIT-V1-0001`  
**Canonical home:** `docs/products/salesos/PRODUCT_HOME.md`  
**Status:** `draft` / `HOLD` — no runtime code built yet  
**Date:** 2026-07-23

## TL;DR

SalesOS is **not starting from zero**. The production database already contains the core tables for call recordings, coaching clips, real-time coaching events, and sales-technique patterns. LifeRE sales-coaching routes are live. The decision-outcome ledger, communication-law guard, and deterministic crisis gate are proven. What does **not** exist is any SalesOS-specific runtime, UI, consent policy, or connected call flow.

The right structure is **four phases**:

0. **Decisions and schema** — lock the schema strategy, consent policy, and lead magnet.
1. **Therapist Meeting Kit** — research packet, Founder Brief, CRM record, call script, manual follow-up.
2. **Call outcome logging** — manual call result, commitment ledger, simple scoring.
3. **Consent-aware recording + transcription** — Twilio call recording with affirmative consent and jurisdiction policy.
4. **Coaching replay / Sales DNA / Human Performance Engine** — audio analysis, tonality, adaptive coaching. **Not before Phase 3 has real call data and a second domain proves the same need.**

Only Phase 1 should be built now.

---

## What is already built and proven

### Database tables (verified on production, `public` schema)

| Table | Rows | Relevance to SalesOS |
|---|---|---|
| `sales_call_recordings` | 0 | Exact shape needed: `recording_url`, `transcript`, `transcript_segments`, `duration`, `status`, `ai_analysis`. Currently FKs `boldtrail_agents(id)` and has `property_address`; needs migration to be SalesOS-usable. |
| `coaching_clips` | 0 | Exact shape: `clip_type`, `start_time`, `end_time`, `transcript_segment`, `technique_detected`, `coaching_suggestion`. |
| `real_time_coaching_events` | 0 | Exact shape: `event_type`, `timestamp`, `message`, `severity`, `delivered`. This is the Confidence Governor table. |
| `sales_technique_patterns` | 0 | Exact shape: `technique_name`, `pattern_type`, `frequency`, `examples` = Sales DNA. |
| `agent_activities` | 0 | Call/meeting activity log with `activity_type`, `outcome`, `recording_id`. |
| `decision_outcome_ledger` | 6 | Live via `chair-decision-ledger.js`. Commitment/outcome tracking pattern already working. |
| `consent_registry` | 0 | Live via `consent-registry.js`. No `call_recording` feature yet. |
| `communication_patterns` | 0 | Reusable for per-user sales/communication DNA. |
| `crm_contacts` | unknown | Reusable as CRM of record. |
| `outbound_consent` | unknown | Email/SMS consent only (`consent_email`, `consent_sms`). No call/recording consent. |
| `lifeos_communication_log` | unknown | All inbound/outbound communication events logged here. |

### Services already in production

- `services/web-search-service.js` — Brave/Perplexity/AI fallback research.
- `services/site-builder-opportunity-scorer.js` — website quality scoring, booking-stack detection.
- `services/prospect-pipeline.js` — lead pipeline primitives.
- `services/communication-gateway.js` — Twilio inbound SMS/call webhook handling and voicemail. **Inbound only; no outbound recording flow.**
- `services/consent-registry.js` — append-only consent grants/revocations. **No `call_recording` feature.**
- `services/data-sovereignty.js` — user erasure. **Does not include sales/coaching tables.**
- `services/chair-decision-ledger.js` — decision → prediction → outcome → calibration. Commitment ledger pattern.
- `services/lumin-communication-guard.js` — forbidden-phrase detection, identity-safe language enforcement. Used by `chair-direct-agent.js`.
- `services/lifeos-crisis-language-detector.js` — deterministic intervention gate. Pattern for "only intervene when a threshold is met."
- `services/lifere-sales-simulator.js` — AI-plays-client sales simulator with quadrant detection and scored debrief.
- `routes/lifere-sales-coaching-routes.js` — mounted at `/api/v1/lifere/sales-coach`.

### Source of truth for the tables

The live `sales_call_recordings` shape comes from `db/migrations/20260313_core_schema.sql` (lines ~1086–1199), **not** the older `migrations/004_sales_coaching_tables.sql`. The older file is a partial snapshot; the core schema is the active source of truth.

---

## What is not built

- SalesOS-specific practice research pipeline (URL → structured practice profile).
- `salesos_practice_profiles` / `salesos_meeting_kits` / `salesos_call_sessions` tables (or a decision to generalize the existing tables).
- Meeting kit generator and one-screen UI.
- Founder Brief generator.
- SalesOS CRM bridge (practices ↔ `crm_contacts`).
- Bullet-point call script generator with therapist objection library.
- Follow-up email/text templates with manual send.
- `routes/salesos-routes.js` and a `lifeos-app.html` SalesOS view.
- Consent-aware call recording flow (Twilio `Record` or `Stream`).
- Audio ingestion, transcription, and analysis pipeline.
- Coaching replay, Sales DNA, tonality engine, and the cross-domain Human Performance Engine.

---

## Proposed phase structure

### Phase 0 — Decisions and schema (no user-facing code)

1. **Schema decision.** Reuse/generalize existing `sales_call_recordings` etc., or create new `salesos_*` tables? Recommendation: create new `salesos_*` tables mirroring the proven shape, with `user_id` and `practice_id` FKs, to avoid coupling SalesOS to `boldtrail_agents` and `property_address`.
2. **Consent policy.** Choose universal disclosure + affirmative consent, Nevada one-party with interstate disclosure, or no recording until legal review.
3. **Lead magnet.** Choose AI Practice Intelligence Report, Patient Journey Review, or Therapist AI Readiness Assessment.
4. **CRM strategy.** Confirm `crm_contacts` is CRM of record and `salesos_practice_profiles` is research-derived intelligence side table.

### Phase 1 — Therapist Meeting Kit (manual founder workflow)

1. DB migration: `salesos_practice_profiles`, `salesos_meeting_kits`, `salesos_call_sessions`.
2. Practice research service: orchestrate `web-search-service` + `site-builder-opportunity-scorer` + AI synthesis for therapist fields.
3. Meeting kit service: return one-screen dossier.
4. Founder Brief generator.
5. CRM bridge: read/write practice records, status, next action.
6. Call script generator: therapist objection library + bullet script.
7. Follow-up email/text templates: manual send only.
8. Routes and `lifeos-app.html` view.
9. Acceptance test.

### Phase 2 — Call outcome logging (still no audio)

1. Manual call result entry: meeting/curiosity/referral score.
2. Commitment extraction from notes (not audio) into `decision_outcome_ledger`.
3. Update `crm_contacts`/`salesos_call_sessions` with status and next action.
4. Simple "did we get the meeting?" dashboard.

### Phase 3 — Consent-aware recording and transcription

1. Add `call_recording` to `consent_registry` features.
2. Implement jurisdiction-aware policy engine (Nevada↔Nevada vs. Nevada↔other-state).
3. Twilio outbound call with `Record` and/or `Stream` + live transcription.
4. Persist recording URL, transcript, transcript segments to `salesos_call_sessions` (or generalized table).
5. Post-call automatic status/commitment draft (still human-confirmed).

### Phase 4 — Coaching replay, Sales DNA, and Human Performance Engine

1. Audio analysis: pace, pauses, interruptions, energy, warmth, certainty, etc.
2. Tonality timeline per call.
3. Coaching clip extraction (strong moments, missed opportunities).
4. Pattern learning across calls → Sales DNA.
5. Confidence Governor for real-time coaching suggestions.
6. Adaptive Attention Allocation — coach the bottleneck, not everything.
7. Identity-Safe Coaching language via `lumin-communication-guard`.
8. Retrieval-over-generation: surface the user's own proven stories and best calls.

**Phase 4 should only start after:**
- Phase 3 has produced real call recordings.
- The same improvement-loop need appears in at least one other domain (therapy, brainstorming, leadership, etc.).
- A concrete decision is made on whether the Human Performance Engine lives as a shared core service or as a domain-specific SalesOS layer.

---

## Decisions required before any code

| Decision | Options | Recommendation |
|---|---|---|
| **Schema reuse** | (a) migrate existing BoldTrail tables, (b) create new `salesos_*` tables, (c) side-table overlay | **(b)** — mirror shape, avoid coupling |
| **Recording policy** | universal disclosure + consent / Nevada one-party + interstate disclosure / no recording until review | **universal disclosure + affirmative consent** (safest default) |
| **Lead magnet** | AI Practice Intelligence Report / Patient Journey Review / Therapist AI Readiness Assessment | **AI Practice Intelligence Report** (most directly tied to website/research data) |
| **CRM owner** | extend `crm_contacts` vs separate SalesOS CRM | **`crm_contacts` + `salesos_practice_profiles`** |
| **Outbound channel** | Twilio call/SMS with consent in Phase 1 vs. manual founder action only | **manual action only in Phase 1** |
| **Data retention** | 30/90/365 days / user-controlled | **user-controlled with 90-day default** |
| **HPE timing** | build now / defer until Phase 3 + second domain | **defer** |

---

## Recommendation

Do **not** build the Human Performance Engine now. Build the Phase 1 Therapist Meeting Kit using the existing research and website-scoring services, then use the first manual calls to validate whether the kit actually produces meetings. Once Phase 3 is recording real calls, reuse the existing `sales_call_recordings`/`coaching_clips` schema patterns and the live `decision_outcome_ledger` to produce evidence-based coaching. Only then decide if the engine should become a shared cross-product service.

The competitive advantage is not the engine itself yet — it is the **speed of the feedback loop** in sales. Start there.
