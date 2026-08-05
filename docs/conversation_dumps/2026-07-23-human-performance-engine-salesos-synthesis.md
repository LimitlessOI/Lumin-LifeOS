<!-- SYNOPSIS: The Human Performance Engine: What We Know Now -->

# The Human Performance Engine: What We Know Now

## The core realization

The thread you sent finally makes the underlying architecture visible: **SalesOS, TherapyOS, BuilderOS, and the other domain OSes are not separate products**. They are applications of one deeper system — a **Human Performance Engine** — that helps a person perform closer to their potential in a specific domain while preserving ownership, dignity, and agency.

That engine runs the same cycle everywhere:

1. **Observe** — capture real behavior and outcomes.
2. **Understand** — model the person, the context, and the goal.
3. **Demonstrate understanding** — reflect back the real situation.
4. **Permission** — ask before coaching or intervening.
5. **Explore alternatives** — let the person discover the next move.
6. **Evidence** — ground suggestions in the person's own data.
7. **Self-discovery** — the insight arrives from them, not from the AI.
8. **Choice** — they decide.
9. **Support** — the system helps them follow through.
10. **Learn** — outcomes feed back into the model.

Correction is not the goal. **Voluntary model updating** is.

## Three layers

| Layer | Role | What changes per domain |
|---|---|---|
| **Human Performance Engine (core)** | Universal improvement loop, identity-safe coaching, adaptive scaffolding, confidence calibration. | Nothing. |
| **Domain Intelligence** | Knowledge, signals, and workflows for a specific field. | SalesOS loads buying signals, objections, closing, rapport. TherapyOS loads modalities, outcomes, ethical boundaries. BuilderOS loads architecture, governance, engineering. |
| **Augmentation Interface** | How much help the system provides right now. | Same slider; different thresholds. |

## The augmentation slider

Support is not binary. It is a bandwidth that changes every second based on the person's **capability × discipline × current state × environment**:

`0` — silent observation → `20` — buying signal → `40` — bullet reminder → `60` — suggested question → `80` — suggested story or wording → `100` — full script.

A novice might run at 70–90. An elite performer needs only 5–10: context, memory, and pattern recognition, not instruction.

## Retrieval beats generation

One of the strongest ideas in the transcript: the AI should not invent stories or advice. It should **retrieve the person's own proven tools**.

> "Remember the Henderson clinic story?"  
> "The Johnson family analogy worked almost perfectly with a similar prospect."

This is not AI creativity. It is AI memory. It keeps the human in the foreground and the system in the background.

## The Confidence Governor

Real-time coaching is dangerous unless it knows when to stay quiet. The proposed governor:

- `0–60%` confidence → stay silent.
- `60–80%` → mention only if low-risk.
- `80–95%` → offer a subtle suggestion.
- `95%+` → interrupt if appropriate.

The hardest decision for the engine is often: **say nothing**.

## Identity-safe coaching

The transcript reinforces a constitutional-level principle: the system presents **observations before interpretations**, seeks understanding before recommendation, and preserves the learner's dignity throughout improvement.

- Not: "You missed the close."
- Instead: "The prospect had already answered most of their own objections. Would you like to look at one place where a small question might have changed the outcome?"

This is the same principle already written into `NORTH_STAR_SSOT.md` around user sovereignty, radical honesty, and no manipulation.

## How this maps onto SalesOS

SalesOS becomes the first battlefield for the engine because its feedback loop is almost instantaneous:

- **Before the call:** meeting kit, decision-maker profile, rapport points, discovery questions, appointment ask, recording-consent line.
- **During the call:** timer, recording status, key questions, live commitment marker, optional quiet prompt if the user is speaking too long.
- **After the call:** full audio + timestamped transcript, speaker separation, commitment ledger, Sales DNA, tonality timeline, audio highlights, follow-up drafts, next action, CRM update.

The Evidence Layer feeds everything: audio, transcript, CRM history, calendar, email, SMS, follow-up documents, and meeting outcome.

## Constitutional guardrails

The engine must be built inside existing constraints:

- **Consent-first recording.** Disclosure + affirmative consent as the universal operating rule, not minimum-state-law gaming. If declined, recording stops immediately.
- **No training on calls without explicit opt-in.**
- **User owns the data.** Export and deletion via `data-sovereignty.js`.
- **Truth labels.** KNOW / THINK / GUESS for every generated claim.
- **No surveillance framing.** It is practice, not grading.
- **Fail-closed.** If jurisdiction or consent is unclear, no recording.

## Where it lives in the existing stack

The engine should sit **below** the domain OSes and **above** raw services:

- `services/lumin-chair-orchestrator.js` and `services/chair-direct-agent.js` already handle command routing and decision tracking.
- `services/consent-registry.js` already captures explicit, revocable consent.
- `services/data-sovereignty.js` already handles erasure.
- `services/lifere-sales-simulator.js` is prior art for simulation + objection handling.
- `migrations/004_sales_coaching_tables.sql` is prior art for call recordings and coaching clips.
- `builderos-reboot/` is the factory that should build the engine, not a one-off SalesOS hack.
- `docs/constitution/NORTH_STAR_SSOT.md` already contains the dignity, sovereignty, and honesty principles the engine must enforce.

## What is still undefined

1. **Ownership.** Is the Human Performance Engine its own product/module, or a core service under BuilderOS/LimitlessOS?
2. **Data model.** How is "Best Self" represented, versioned, and compared to "Current State"?
3. **Real-time latency.** Audio streaming, inference, and UI update budgets are not yet specified.
4. **Audio capture provider.** Twilio Stream, Vapi, Ultravox, or a local/native recorder?
5. **Cross-product sharing.** A lesson learned in SalesOS must improve TherapyOS without leaking domain-specific data.
6. **Consent storage format.** How is the spoken disclosure verified and stored?
7. **Twin relationship.** Does the Best Self model live in `data/twins/`, the memory system, or a new performance profile store?

## Recommendation for Claude Code

Treat the Human Performance Engine as a **cross-platform core service** that SalesOS consumes first. Build it so that `salesos-practice-research.js`, `salesos-call-coach.js`, and `salesos-replay-analyzer.js` are thin domain adapters over the engine. Otherwise SalesOS will absorb the engine, and every other OS will have to re-implement it.

The engine's job is not to sell, coach, or build. Its job is to help a human close the gap between who they are today and who they have already proven they can be — without ever making them wrong in the process.
