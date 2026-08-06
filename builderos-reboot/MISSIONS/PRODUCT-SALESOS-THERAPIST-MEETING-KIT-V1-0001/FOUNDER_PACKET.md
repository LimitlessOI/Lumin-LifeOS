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

## Discovery Phase (added 2026-08-06)

**Why this exists:** Phase 1 below assumes Adam already has a therapist practice URL to paste in. He doesn't — he asked directly for "every single one" of the Nevada mental-health practices to be found, not researched one at a time. That's a genuinely different capability (finding candidates) from Phase 1 (researching a known candidate), and it didn't exist anywhere in this blueprint until now.

**What this phase is, and isn't:** Adam separately specified a full multi-agent architecture (Territory Planner, ~10 source connectors, extraction/resolution/scoring/QC bots, an evidence ledger, a model router, cost governance) for exhaustive statewide discovery. That full system is **not** what's being added to this mission — building all of it before proving the pattern works would repeat the exact "monolithic scope before validation" mistake his own spec explicitly warns against. This phase adds the **smallest real slice**: one territory, one Puppeteer-based browser-navigation connector (no paid search API — Adam's explicit direction, 2026-08-06: he doesn't want the system dependent on another company's paid API to search the internet, and cash-flow makes that a real constraint, not a preference), real evidence-ledger discipline, and a pilot acceptance test — proving the pattern before any expansion. Named-directory connectors beyond the pilot's primary target and full statewide, all-source discovery are explicitly the *next* mission, gated on this pilot's real cost-per-record and accuracy numbers, not assumed in advance.

**No paid API dependency, by design.** The connector reuses `scripts/prototype-overlay-action-v4.mjs`'s already-proven Puppeteer pattern — a real headless browser navigating directly to public pages, the same way a person would. Primary target is direct navigation to a public directory page (e.g. Psychology Today's NV listings); a real-browser Google search is the fallback only. This sidesteps the Brave/Perplexity funding question entirely rather than waiting on it. The honest tradeoff, not hidden: search engines actively try to detect and block automated browsing, so this needs real pacing/backoff and will report a page as blocked rather than ever inventing a field — it's not friction-free, it's just not gated on anyone else's billing.

**How it connects to Phase 1:** the discovery pilot's output — a real, source-verified list of Nevada therapy practices — is exactly the input Phase 1's `SALESOS-P1-002` (paste-a-URL research pipeline) already expects. Discovery feeds Phase 1; it doesn't replace or duplicate it.

## SEQUENCE

1. Phase 0 — Lock schema strategy, consent policy, lead magnet, CRM ownership, and data retention.
2. **Discovery pilot** — lock scope decisions, build the evidence ledger, one Territory Planner, one Puppeteer browser-navigation connector (no paid API), entity resolution, and a pilot acceptance test against one Nevada territory. See `SALESOS-PDISC-001` through `-007` in `BLUEPRINT.json`.
3. DB migration — `salesos_practice_profiles`, `salesos_meeting_kits`, `salesos_call_sessions` tables.
4. Practice research service — orchestrate `web-search-service` + `site-builder-opportunity-scorer` + AI synthesis for therapist-specific fields.
5. Meeting kit service/route — return structured one-screen dossier.
6. Founder Brief generator — pre-meeting one-pager.
7. CRM integration — read/write practice records, status, next action.
8. Call script generator — therapist objection library + bullet script.
9. Follow-up email/text templates — manual send in Phase 1.
10. Acceptance test — end-to-end research → kit → brief → CRM → script.

## NOTES

- The lead magnet should be chosen before template finalization; default to AI Practice Intelligence Report if no decision.
- Website scoring reuses `services/site-builder-opportunity-scorer.js` but the output must be translated to therapist-specific observations (e.g., "patients can't book online").
- All unsourced fields (e.g., office manager name) must be editable by the founder and marked THINK/GUESS until confirmed.
- The `sales_call_recordings`, `coaching_clips`, `real_time_coaching_events`, and `sales_technique_patterns` tables in `db/migrations/20260313_core_schema.sql` are proven prior art for Phase 3–4, but they currently FK `boldtrail_agents(id)` and include BoldTrail-specific fields. A schema decision is required before reuse.

## PHASE ROADMAP

- Phase 0: decisions and schema (this mission).
- Discovery pilot: one territory, one Puppeteer browser-navigation connector (no paid API), evidence ledger, entity resolution (this mission — added 2026-08-06, revised twice same day: first to a single general-search source, then to no-paid-API browser navigation per Adam's direct instruction).
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
- Full statewide, all-source-type discovery (the complete 10-connector, 15-bot architecture Adam specified). This mission builds a one-territory, two-connector pilot only — proving the pattern, not the whole system, comes first.
- Automated outbound dialing or texting to discovered candidates. Discovery produces a research-ready list; contacting them is still Phase 1/2's manual, consent-gated flow.

These belong to Phase 3–4 (recording/coaching) or a follow-on discovery-expansion mission (full-scale sourcing), and depend on real data from this mission's own pilot before either is justified.
