<!-- SYNOPSIS: Canonical product home — SalesOS -->

# SalesOS Product Home

**Product id:** `salesos`
**Parent platform:** LimitlessOS
**Constitutional law:** `docs/constitution/NORTH_STAR_SSOT.md`
**Machine manifest:** `docs/products/salesos/FILE_MANIFEST.json`
**Mission pack:** `builderos-reboot/MISSIONS/PRODUCT-SALESOS-THERAPIST-MEETING-KIT-V1-0001/`

||| **Last Updated** | 2026-08-06 — Revised the Discovery Phase again: replaced the general web-search connector (Brave/Perplexity-dependent) with a Puppeteer-based direct browser-navigation connector — no paid search API at all. Founder pushed back directly on the funding dependency and wanted self-controlled browser automation instead; pointed at real, already-tested infrastructure in this repo (`scripts/prototype-overlay-action-v4.mjs`) rather than building new. Primary target is direct navigation to public directory pages; real-browser Google search is fallback only, since search-engine bot detection is a real (not hypothetical) engineering risk named honestly in the updated risk register. Prior: Simplified the Discovery Phase to one general web-search connector (founder: "I don't care where we get the data from... just Googling"), dropping the two named-directory connectors and their Yelp ToS risk entirely. Surfaced a real, current dependency instead: the connector reuses `services/web-search-service.js`, whose Brave/Perplexity keys are both unfunded in production right now — connector must fail closed rather than ever fall back to ungrounded AI-knowledge guesses for a real call list. Prior: Added a Discovery Phase to the mission pack (`SALESOS-PDISC-001` through `-007`) — one-territory, two-connector pilot for finding Nevada therapy practices, feeding Phase 1's existing paste-a-URL research step. Amended, not forked; full statewide discovery deferred to a follow-on mission. Prior: 2026-07-23 — Added live CRM autofill + conversation map + real-time coaching vendor mapping to `HUMAN_PERFORMANCE_ENGINE_DEEP_DIVE.md` (Section 9). |

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

## Research and competitive landscape

See `docs/products/salesos/HUMAN_PERFORMANCE_ENGINE_DEEP_DIVE.md` for the market map, performance signals, what incumbent players are doing right/wrong, and concrete blueprint improvements. High-level takeaways:

- The component pieces are being built by Gong, Chorus/ZoomInfo, Outreach Kaia, Revenue.io, Balto, Cresta, Observe.AI, Cogito/Verint, Limitless, and wearable-second-brain startups.
- No one is building exactly the cross-domain, identity-safe, Best-Self-vs-Current-State, retrieval-over-generation engine described here.
- The common failure mode across the category is building intelligence before the proprietary data flywheel (recordings + outcomes) exists.
- Real-time feedback must be user-controlled to avoid the “scaffolding paradox” (disrupting flow and increasing cognitive load).
- Consent/jurisdiction is a trust moat, not just a compliance checkbox.

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

| 2026-08-06 | **Replaced the general web-search connector with a Puppeteer-based direct browser-navigation connector — eliminating the paid-search-API dependency entirely rather than waiting on it to be funded.** Adam pushed back directly on the prior revision: "I don't really understand that the connector can't produce because it's some limitation... that's the only way for us to be able to search the internet? ... I don't want to rely on other companies to do that... I have cash, but I don't have money in the bank account." Pointed him at real, already-tested infrastructure in this repo rather than proposing something new: `scripts/prototype-overlay-action-v4.mjs` is a working Puppeteer browser-automation prototype, personally verified running earlier this same session. Revised `SALESOS-PDISC-004` to use direct browser navigation to public directory pages as the primary source (more robust than scraping a search engine) with real-browser Google search as fallback only — no `BRAVE_SEARCH_API_KEY`/`PERPLEXITY_API_KEY` dependency at all. Named the honest tradeoff directly rather than presenting this as friction-free: search engines actively detect and block automated browsing, so the connector needs real pacing/backoff and must report a blocked page rather than invent a field — recorded as risk R8, replacing the now-moot Brave/Perplexity-funding risk. Updated `KNOWN_ASSUMPTIONS.json` (A8) and `KNOWN_RISKS.json` (R8) to match. | Direct founder pushback on a real constraint (cash-flow, not preference) plus an explicit architectural direction: self-controlled browser automation over third-party API dependency. | `BLUEPRINT.json` re-parsed as valid JSON after edit (version 2026-08-06-0005, 27 steps). `npm run builder:preflight` PASS. |
| 2026-08-06 | **Simplified the Discovery Phase from two named-directory connectors to one general web-search connector, per the founder's own explicit simplification.** Adam: "I don't care where we get the data from... just Googling all the psychiatrists... I don't really care how we do it." Replaced `SALESOS-PDISC-004` (Psychology Today) and `SALESOS-PDISC-005` (Yelp) with a single connector reusing the real, already-live `services/web-search-service.js` — simpler, and removes the Yelp ToS risk entirely rather than mitigating it. Surfaced a real, current dependency this connects to rather than treating the simplification as free: `web-search-service.js`'s Brave/Perplexity chain has both keys unfunded in production right now (same finding from earlier tonight's Chair-search investigation), so it currently degrades to the AI's own training knowledge with no live search behind it. For a real prospect list, that's a fabrication risk, not just a capability gap — set the connector's acceptance criteria to fail closed (report "no verified search," never guess) rather than silently produce candidates from ungrounded model knowledge. Connected this back to the still-open $5/month Brave-funding decision from earlier in the same session rather than treating it as a new, separate ask. Updated `KNOWN_ASSUMPTIONS.json` (A8) and `KNOWN_RISKS.json` (R8) to match. | Direct founder simplification of an open decision he'd previously left for me to propose — I don't care how, just make it real. | `BLUEPRINT.json` re-parsed as valid JSON after edit (27 steps, one connector). `npm run builder:preflight` PASS. |
| 2026-07-23 | Initial product home, FILE_MANIFEST, and mission pack `PRODUCT-SALESOS-THERAPIST-MEETING-KIT-V1-0001` created from founder vision. No runtime code; not yet queued. | Capture the vision in canonical form and surface open decisions before execution. | `npm run builder:preflight` PASS after doc-only changes. | Resolve open decisions and queue Phase 1 in BP_PRIORITY. |
| 2026-07-23 | Grounded zero-state and phased build plan added (`SALESOS_ZERO_STATE_AND_BP.md`); Human Performance Engine deferred to Phase 4. Existing `sales_call_recordings`/`coaching_clips`/`real_time_coaching_events`/`sales_technique_patterns` tables in `20260313_core_schema.sql` identified as proven prior art. Decision count expanded from 6 to 8. | Refine blueprint from wishlist to a build plan that starts from verified infrastructure and defers the engine until real evidence exists. | `npm run builder:preflight` PASS after doc-only changes. | Resolve Phase 0 decisions and queue Phase 1 in BP_PRIORITY. |
| 2026-07-23 | Market and competitive deep-dive added (`HUMAN_PERFORMANCE_ENGINE_DEEP_DIVE.md`) with player performance, failure modes, and blueprint improvements; product home updated with research summary. | Provide founder with evidence on who is building similar systems, how they are performing, and what to improve. | `npm run builder:preflight` PASS after doc-only changes. | Resolve Phase 0 decisions and queue Phase 1 in BP_PRIORITY. |
| 2026-07-23 | Added Section 9 to `HUMAN_PERFORMANCE_ENGINE_DEEP_DIVE.md` mapping live CRM autofill, conversation map/wheel, real-time recording/tonality/coaching, and post-call coaching replay vendors (Praiz, Convo, Insyghtful, Aircover, Klu, Bloks, Granola, etc.) to the founder's exact question. | Answer the founder's question about whether integrated “conversation flows → CRM blueprint → tonality → coaching” already exists and where the gap is. | `npm run builder:preflight` PASS after doc-only changes. | Resolve Phase 0 decisions and queue Phase 1 in BP_PRIORITY. |
| 2026-08-06 | **Added a Discovery Phase to the mission pack — amended, not forked.** Adam asked directly for "every single one" of the Nevada mental-health practices to be found via Yelp/directories, calling it "the bot's job" — a genuinely new capability (finding candidates) that Phase 1 never covered (Phase 1 only researches a URL Adam already has). Checked the existing mission pack first rather than starting a new blueprint, per this session's own established discipline against forking competing blueprints. Added 7 new steps (`SALESOS-PDISC-001` through `-007`) to `BLUEPRINT.json`, scoped to the smallest real slice — one Nevada territory, two source connectors (Psychology Today + Yelp), a real evidence ledger (source, retrieval date, confidence on every field, never invented), and deterministic-first entity resolution — explicitly deferring the founder's full 10-connector/15-bot architecture to a follow-on mission gated on this pilot's real cost/accuracy numbers. Added 3 assumptions (A8-A10) and 4 risks (R8-R10) to the mission's registries, including a real, named legal risk this session found worth flagging directly: Yelp's Terms of Service restrict unauthorized scraping outside their official Fusion API, so `SALESOS-PDISC-005` requires the official API path, not scraping — surfaced before any connector code ships, not discovered after. Discovery's output is explicitly wired to feed Phase 1's existing paste-a-URL step, not replace it. Hand-authored as spec/blueprint amendment only (SO-001 carve-out); no bot code was written — the actual services still route through the governed factory. | Direct founder request, with an explicit boundary I flagged and he didn't contest: the full bot architecture is factory-authored code, not something I hand-write, but the mission spec defining it is mine to draft. | `BLUEPRINT.json` re-parsed as valid JSON after edit (28 steps, 12 open_decisions). `npm run builder:preflight` PASS. |
