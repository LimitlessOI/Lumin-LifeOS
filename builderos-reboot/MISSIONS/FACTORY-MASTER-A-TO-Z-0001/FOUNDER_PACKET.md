<!-- SYNOPSIS: Founder packet for FACTORY-MASTER-A-TO-Z-0001 -->

# FACTORY-MASTER-A-TO-Z-0001 — Founder Packet

## WHAT

Make BuilderOS + LifeOS the best autonomous cognitive operating system for building real products, measured against every comparable AI coding agent, product builder, and multi-agent framework that exists today.

The system must:

- Separate Mission, Responsibility, Lens/Cognitive Asset, Model, and Execution as independent, verifiable concepts.
- Wire the existing Chair/Lens/Responsibility reasoning runtime into the live LifeOS conversation path so the founder never has to act as the communication bus.
- Capture real founder decisions and score real model calls into the existing `founder_decision_log` and `model_capability_ledger`.
- Prove end-to-end autonomous completion: founder intent → reasoning plan → blueprint → deployed code → SENTRY PASS → Wisdom update.
- Keep all constitutional governance, receipt truth, and SENTRY verification fail-closed and continuously verified.

## PASS

- `npm run builder:preflight` passes.
- `npm run lifeos:bp-priority:verify` passes.
- A real LifeOS conversation produces a `founder_decision_log` row with `source: 'live_conversation'`.
- The same conversation's answering model call produces a `model_capability_ledger` row under `founder_intent_modeling`.
- A sample product mission executes from intent through deploy with a SENTRY PASS receipt and a Wisdom update.
- `OBJECTIVE_VERDICT.json` for this mission shows `rating_current: 10` and `verdict: TECHNICAL_PASS`.

## Constraints

- Use existing code first (`cognitive-chair.mjs`, `cognitive-step-runner.mjs`, `founder-intent-model.js`, `model-capability-ledger.js`, `chair-lumin-unified.js`).
- Do not rename "responsibility" to "office" in code; keep the existing constitutional term.
- Do not introduce a separate "Efficiency Office"; extend the existing `cfo` responsibility if needed.
- Do not merge the person-judgment Cognitive Core with the BuilderOS Lens Registry; reuse only the generic math (`cognitive-core-oracle.js`).
- Outcome scoring must come from an independent signal, never the answering model grading itself.
- No cheap-tier model on decision-classification or high-stakes reasoning calls (SO-003).
