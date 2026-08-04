<!-- SYNOPSIS: Founder Packet — SalesOS Therapist Meeting Kit Phase 1 -->

# Founder Packet: SalesOS Therapist Meeting Kit Phase 1

**Mission ID:** PRODUCT-SALESOS-THERAPIST-MEETING-KIT-V1-0001
**Product:** SalesOS
**SSOT:** docs/products/salesos/PRODUCT_HOME.md

## WHAT

Build the Phase 1 Therapist Meeting Kit so Adam can get 1–2 therapist meetings today.

After this blueprint:
- Paste a therapist practice URL → system returns a one-screen meeting kit with decision maker, practice background, website score, review summary, technology signals, hooks, objections, value prop, and CRM record.
- Generate a Founder Brief for the specific meeting: who, what to ask, what to avoid, close.
- Create/update a lightweight CRM record for the practice with status and next action.
- Provide a bullet-point call script that ends with asking for the meeting.
- Offer one lead-magnet choice (AI Practice Intelligence Report, Patient Journey Review, Therapist AI Readiness Assessment) with pre-written follow-up email/text.
- All recording/transcript/tonality features are explicitly out of Phase 1; only manual call notes are supported.

## Problem

- We need meetings, not more features.
- Adam does not have a tool that turns a practice URL into a meeting-ready dossier.
- Existing Outreach CRM has contacts/consent but no research-driven meeting kit.
- Existing Site Builder has website scoring but no therapist-specific sales workflow.
- Recording/tonality is valuable but legally risky without a chosen policy.

## Desired Outcome

Phase 1 of SalesOS lets Adam research a therapist practice in under 60 seconds, generate a meeting kit and Founder Brief, and have a bullet-point call script and follow-up email ready before dialing. The CRM records the outcome and next action.

## PASS

Machine runs `scripts/run-salesos-therapist-meeting-kit-acceptance.mjs` against production: research a real or fixture therapist URL, generate a meeting kit, Founder Brief, CRM record, and call script. All tests pass and `OBJECTIVE_VERDICT.json` is updated with `verdict: "TECHNICAL_PASS"`.

## Scope Boundary

This packet is only for Phase 1 (items 1–4 of the priority list + CRM + lead magnet/follow-up). Live call recording, transcription, tonality analysis, and coaching replay are Phase 2+.

## Constraints

- No outbound call/SMS automation in Phase 1 without explicit consent.
- All generated facts must be sourced; unsourced claims must be labeled.
- Reuse Outreach CRM contact/consent tables where possible; do not duplicate CRM of record.
- Active founder interface remains `public/overlay/lifeos-app.html`; no new legacy overlays.

## SEQUENCE

1. DB migration — `salesos_practice_profiles`, `salesos_meeting_kits`, `salesos_call_sessions` tables.
2. Practice research service — orchestrate `web-search-service` + `site-builder-opportunity-scorer` + AI synthesis for therapist-specific fields.
3. Meeting kit service/route — return structured one-screen dossier.
4. Founder Brief generator — pre-meeting one-pager.
5. CRM integration — read/write practice records, status, next action.
6. Call script generator — therapist objection library + bullet script.
7. Follow-up email/text templates — manual send in Phase 1.
8. Acceptance test — end-to-end research → kit → brief → CRM → script.

## NOTES

- The lead magnet should be chosen before template finalization; default to AI Practice Intelligence Report if no decision.
- Website scoring reuses `services/site-builder-opportunity-scorer.js` but the output must be translated to therapist-specific observations (e.g., "patients can't book online").
- All unsourced fields (e.g., office manager name) must be editable by the founder and marked THINK/GUESS until confirmed.

## PHASE ROADMAP

- Phase 1: research packet, meeting kit, founder brief, CRM, call script, follow-up templates (manual).
- Phase 2: live call recording + transcription (consent-gated, jurisdiction-aware).
- Phase 3: tonality engine + coaching replay + Sales DNA.
- Phase 4: referral engine + meeting prep/recap automation.

## FOUNDER SUCCESS TEST

Open the SalesOS view, paste `https://example-therapy-practice.com`, and within 60 seconds see a complete meeting kit, a Founder Brief, a CRM record, and a bullet-point call script. Mark the call outcome and next action.
