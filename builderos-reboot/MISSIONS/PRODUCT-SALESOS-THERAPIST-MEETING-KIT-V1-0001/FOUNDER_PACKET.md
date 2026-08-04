<!-- SYNOPSIS: Founder Packet — SalesOS Therapist Meeting Kit Phase 1 -->

# Founder Packet: SalesOS Therapist Meeting Kit Phase 1

**Mission ID:** PRODUCT-SALESOS-THERAPIST-MEETING-KIT-V1-0001  
**Product:** SalesOS  
**SSOT:** docs/products/salesos/PRODUCT_HOME.md  
**Zero-state BP:** docs/products/salesos/SALESOS_ZERO_STATE_AND_BP.md

## WHAT

Build the Phase 1 Therapist Meeting Kit so Adam can get 1–2 therapist meetings today.

After this blueprint:
- Paste a therapist practice URL → system returns a one-screen meeting kit with decision maker, practice background, website score, review summary, technology signals, hooks, objections, value prop, and CRM record.
- Generate a Founder Brief for the specific meeting: who, what to ask, what to avoid, close.
- Create/update a lightweight CRM record for the practice with status and next action.
- Provide a bullet-point call script that ends with asking for the meeting.
- Offer one lead-magnet choice (AI Practice Intelligence Report, Patient Journey Review, Therapist AI Readiness Assessment) with pre-written follow-up email/text.
- All recording/transcript/tonality features are explicitly out of Phase 1; only manual call notes are supported.

## Grounded zero-state

SalesOS is **not starting from zero**. The production database already has `sales_call_recordings`, `coaching_clips`, `real_time_coaching_events`, `sales_technique_patterns`, `agent_activities`, `decision_outcome_ledger`, `consent_registry`, `crm_contacts`, and `outbound_consent` tables. The LifeRE sales-coaching simulator route is live at `/api/v1/lifere/sales-coach`. The decision-outcome ledger, communication-law guard, and deterministic crisis gate are proven.

What does **not** exist is SalesOS-specific runtime: practice research, meeting kit UI, CRM bridge, call script generator, or a consent-aware recording flow. This mission builds Phase 1 only.

## Problem

- We need meetings, not more features.
- Adam does not have a tool that turns a practice URL into a meeting-ready dossier.
- Existing Outreach CRM has contacts/consent but no research-driven meeting kit.
- Existing Site Builder has website scoring but no therapist-specific sales workflow.
- The Human Performance Engine concept is valuable but premature without real call data.

## Desired Outcome

Phase 1 of SalesOS lets Adam research a therapist practice in under 60 seconds, generate a meeting kit and Founder Brief, and have a bullet-point call script and follow-up email ready before dialing. The CRM records the outcome and next action.

## PASS

Machine runs `scripts/run-salesos-therapist-meeting-kit-acceptance.mjs` against production: research a real or fixture therapist URL, generate a meeting kit, Founder Brief, CRM record, and call script. All tests pass and `OBJECTIVE_VERDICT.json` is updated with `verdict: "TECHNICAL_PASS"`.

## Scope Boundary

This packet is only for Phase 1 (items 5–10 of the priority list + CRM + manual call notes). Live call recording, transcription, tonality analysis, coaching replay, Sales DNA, and the Human Performance Engine are Phase 2+.

## Constraints

- No outbound call/SMS automation in Phase 1 without explicit consent.
- All generated facts must be sourced; unsourced claims must be labeled KNOW/THINK/GUESS.
- Reuse Outreach CRM contact/consent tables where possible; do not duplicate CRM of record.
- Active founder interface remains `public/overlay/lifeos-app.html`; no new legacy overlays.
- Do not build the Human Performance Engine in Phase 1.

## SEQUENCE

1. Phase 0 — Lock schema strategy, consent policy, lead magnet, CRM ownership, and data retention.
2. DB migration — `salesos_practice_profiles`, `salesos_meeting_kits`, `salesos_call_sessions` tables.
3. Practice research service — orchestrate `web-search-service` + `site-builder-opportunity-scorer` + AI synthesis for therapist-specific fields.
4. Meeting kit service/route — return structured one-screen dossier.
5. Founder Brief generator — pre-meeting one-pager.
6. CRM integration — read/write practice records, status, next action.
7. Call script generator — therapist objection library + bullet script.
8. Follow-up email/text templates — manual send in Phase 1.
9. Acceptance test — end-to-end research → kit → brief → CRM → script.

## NOTES

- The lead magnet should be chosen before template finalization; default to AI Practice Intelligence Report if no decision.
- Website scoring reuses `services/site-builder-opportunity-scorer.js` but the output must be translated to therapist-specific observations (e.g., "patients can't book online").
- All unsourced fields (e.g., office manager name) must be editable by the founder and marked THINK/GUESS until confirmed.
- The `sales_call_recordings`, `coaching_clips`, `real_time_coaching_events`, and `sales_technique_patterns` tables in `db/migrations/20260313_core_schema.sql` are proven prior art for Phase 3–4, but they currently FK `boldtrail_agents(id)` and include BoldTrail-specific fields. A schema decision is required before reuse.

## PHASE ROADMAP

- Phase 0: decisions and schema (this mission).
- Phase 1: research packet, meeting kit, founder brief, CRM, call script, follow-up templates (this mission).
- Phase 2: call outcome logging, commitment ledger, meeting recap, referral engine.
- Phase 3: consent-aware recording + transcription, Evidence Layer.
- Phase 4: tonality engine, coaching replay, Sales DNA, Confidence Governor, Adaptive Attention, and Human Performance Engine decision.

## FOUNDER SUCCESS TEST

Open the SalesOS view, paste `https://example-therapy-practice.com`, and within 60 seconds see a complete meeting kit, a Founder Brief, a CRM record, and a bullet-point call script. Mark the call outcome and next action.

## WHAT WE ARE NOT BUILDING

- Live audio recording or transcription.
- Real-time coaching UI.
- Tonality analysis.
- Sales DNA / pattern learning.
- A standalone Human Performance Engine.

These belong to Phase 3–4 and depend on real call data and a founder decision about cross-domain scope.
