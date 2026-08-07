<!-- SYNOPSIS: LifeOS — 2026-08-07 founder conversation proposing the Truthful Capability Principle, four confidence types, and an interactive confidence dashboard; grounded in a real AI-honesty failure (Sherry's flyer). Captured per SO-004. -->

# Truthful Capability Principle + interactive confidence dashboard (2026-08-07)

**Intake source:** direct continuation of the same session as the Communication System architecture review, IdeaVault reactivation, and the Constitutional Pattern Library discussion.
**Status: PRINCIPLE ADOPTED into `docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md` §6.2. Interactive UI is CAPTURED, NOT BUILT — filed in IdeaVault (id `1a69002f-6164-46ba-82ae-10160a784e96`).**

---

## The proposal

Adam (via a pasted cross-AI exchange, engaged with directly): confidence scores should not be a static report card shown after an answer — they should be an interactive control surface. Click a confidence icon, see the evidence breakdown by factor, see the main source of uncertainty in plain language, and get real actions to increase it: research more, ask higher-tier models, gather more evidence, ask clarifying questions. Extended into a Council-expansion example (Solomon/Architect/Efficiency Officer/Sentry each contributing a confidence delta) and a hard rule: confidence must never rise just from more models agreeing — only from better evidence, verification, reasoning, or calibration.

## The grounding real-world case — why this isn't a theoretical feature

Adam described a real incident: his wife asked an AI assistant to adjust a flyer "we made yesterday." The assistant proceeded on guesses — wrong address, wrong state — across multiple attempts, before finally admitting "I don't have access to it anymore." Real time was wasted; the actual fix required her to find and re-post the original flyer herself. Adam's framing, verbatim in substance: **that's theater, and theater is deception** — the system optimized for sounding helpful over being truthful about what it actually had access to.

**Not confirmed which AI system this happened on** — recorded honestly rather than assumed to be ours, since Adam didn't specify. The principle applies regardless of which system it was.

## What I found already real before treating this as a net-new idea

Checked before capturing, not assumed: `services/chair-direct-agent.js`'s live system prompt already has a section literally titled **"HONESTY (theater = deception)"** — *"Never invent capability. If no tool can do it this turn, say so and the smallest unblock... Do not pretend."* This is the same principle, already adopted, already live — but narrowly scoped to the `act`/`build` tool-call path (never claim a commit/deploy/scheduled item happened without a real receipt). It does not currently cover general capability claims outside that path — file access, memory of a prior artifact, image/document editing capability, which is exactly the class of failure the flyer story describes. The real gap is coverage, not an absent principle.

## What's genuinely new, adopted into the blueprint

Four separate confidence types, not one collapsed score — Knowledge, Context, Capability, Outcome. My own addition during this exchange: **Capability Confidence is architecturally different from the other three and should run as a gate first**, not just a fourth slider scored after the fact — it's often checkable deterministically and cheaply ("do I have the file, yes or no") before any model reasoning happens, unlike the other three which usually require doing the reasoning to know. That single behavior — check capability before attempting, stop and ask if it's low — is what would have prevented the flyer failure specifically.

Adopted in full: the Truthful Capability Principle text, the four confidence types, the "never buy confidence" rule (validated against something real — the mechanical Pre-ARC gate already proved tonight that a structural check catches gaps no amount of additional model opinion would have), and "every consequential answer should carry an Evidence Confidence Profile with a path to improvement," including sharing real simulation probabilities with their variables rather than a bare number.

## What's deferred, and why

The interactive UI (click-to-drill-down, the four action buttons, the Council-expansion visualization) is real build work needing a real design pass — filed in IdeaVault, not scoped into a mission yet, matching the exact sequencing discipline just established for the Constitutional Pattern Library: capture the idea for real, don't build it before it has a clear first consumer and real design work behind it.

## Where this connects to other work this session
- Directly follows the Constitutional Pattern Library discussion (same session) — same sequencing discipline applied (principle/text adopted now if cheap and real; interactive build deferred).
- Connects to SO-004 (this file is a direct instance of it) and to the IdeaVault reactivation (the interactive dashboard idea is filed for real via the now-live `POST /api/v1/ideas`, not just described here).
- Connects to `chair-direct-agent.js`'s existing honesty design, found and confirmed real rather than assumed — the next real technical step (not scoped tonight) is generalizing that file's capability-honesty coverage beyond the `act`/`build` path.
