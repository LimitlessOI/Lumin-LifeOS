<!-- SYNOPSIS: Phase 0 audit of existing cognitive-spine components and naming/authority collisions. -->

# Phase 0 Audit — FACTORY-MASTER-A-TO-Z-0001

**Audited at:** 2026-08-01  
**Auditor:** `FACTORY-MASTER-A-TO-Z-0001` mission, after ChatGPT/CloudCode input and web benchmark research.

## Existing cognitive-spine components

| Component | File(s) | Status | Why | First-step action |
|---|---|---|---|---|
| **Lens Registry** | `data/lenses/LENS_REGISTRY.json` + `data/lenses/*.json` | **EXISTS** | Six real lenses with `philosophy`, `strengths`, `blind_spots`, `performs_well/poorly`, `confidence`, `trust_score`, `disagreement_profile`. | Extend with `version`, `evidence_count`, `retirement_criteria` (MMAZ-013); add adversarial lenses (MMAZ-014). |
| **Cognitive Chair composer** | `services/cognitive-chair.mjs` | **EXISTS BUT UNWIRED** | Exports `composeReasoning`, `buildLensPrompt`, `buildChairSynthesisPrompt`, `loadLensRegistry`, `selectLensesForResponsibility`, `selectModelMemberForLens`, `resolveResponsibilities`. Tested (`tests/cognitive-chair.test.mjs`). | Wire into `services/chair-lumin-unified.js#runChairNativeTurn` (MMAZ-004). |
| **Cognitive Step Runner** | `factory-staging/factory-core/builder/cognitive-step-runner.mjs` | **EXISTS BUT UNWIRED** | Implements `runCognitiveStep` with Chair/Lens/Model/Execution separation, cheapest-capable model selection, `decideGate` confidence gating, and ROI ledger logging. | Expose via `run-step.js` dispatch, not just CLI/tests (MMAZ-004/MMAZ-017). |
| **Live Chair turn** | `services/chair-lumin-unified.js` | **EXISTS, NEEDS REASONING GATE** | `runChairNativeTurn` calls `translatePersonality` (real model) on every turn. SO-003 direct-answer bypass is already fixed. No lens reasoning. | Add a bounded trigger for `composeReasoning()`; record founder decisions; score model calls (MMAZ-003–006). |
| **Chair orchestrator** | `services/lumin-chair-orchestrator.js` | **LIVE CALLER** | Calls `runChairNativeTurn` with `callCouncilMember`. This is the real conversation entry point. | Pass `pool` and `chairContext` through; ensure `runChairNativeTurn` can call `composeReasoning` and write to DB. |
| **Founder Intent Model** | `services/founder-intent-model.js` | **EXISTS, UNWIRED FROM LIVE CONVERSATION** | `recordFounderDecision` is real and tested; only reachable from `routes/factory-mount-routes.js#POST /factory/founder-decisions/extract` (manual/backfill). | Call from `chair-lumin-unified.js` on positive reasoning trigger with `source: 'live_conversation'` (MMAZ-005). |
| **Model Capability Ledger** | `services/model-capability-ledger.js` | **EXISTS, MOST ROLES UNWIRED** | `recordModelOutcome` has 9 named roles; only `builderos_execution`, `aic_debate`, `bpb_blueprinting`, `oil_review`, `verifier` are wired. `founder_intent_modeling` is wired only in the founder-decisions extraction endpoint. | Wrap the answering model call in `chair-lumin-unified.js` under `founder_intent_modeling` (MMAZ-006). |
| **Cognitive Core Oracle** | `services/cognitive-core-oracle.js` | **REUSABLE MATH** | Pure functions `brierScore`, `decideGate`, `verdictFromReceipt`, `recalibrationMap` are generic and zero-coupled to person-judgment storage. Already reused by SENTRY, Receipt Auditor, ROI ledger. | Continue reusing; do **not** merge the person-judgment `createCognitiveCoreOracle` storage into BuilderOS. |
| **SENTRY Reality Station** | `services/sentry-reality-station.mjs` | **EXISTS, STANDALONE** | `runSentryRealityStation` is real, tested, and fail-closed; not called from the factory dispatch path. | Wire `assertSentryPassForStep` into `factory-staging/factory-core/builder/run-step.js` (MMAZ-017). |
| **Receipt Auditor** | `services/receipt-auditor.mjs` | **EXISTS, STANDALONE** | `auditReceipt` replays receipts; auto-reopen of false DONEs not wired into step dispatch. | Wire FAIL-verdict to step auto-reopen (MMAZ-018). |
| **ROI Ledger** | `services/model-roi-ledger.mjs` | **EXISTS, PARTIALLY WIRED** | Logs model calls from `cognitive-step-runner.mjs` and some call sites. | Ensure `chair-lumin-unified` model call is logged (MMAZ-006). |
| **Wisdom Loop** | `services/wisdom-reality-update.mjs` | **EXISTS, DATA-STARVED** | Updates `LENS_REGISTRY.json` trust scores from ledger + receipts; dry-run works. | Feed real outcomes from `chair-lumin-unified` / SENTRY / receipts (MMAZ-016/MMAZ-019). |
| **Council members** | `config/council-members.js` | **EXISTS** | Defines model tiers, costs, capabilities, disabled status, free-tier fallbacks. | Use `selectCheapestCapableModel` in `chair-lumin-unified` reasoning trigger. |

## Naming and authority collisions resolved

| Risk | Resolution |
|---|---|
| **Office vs Responsibility** | `services/cognitive-chair.mjs` and all code use `responsibility`; `responsibility` remains the backend term. `Office` may be used only as founder-facing UI copy. No code changes. |
| **Efficiency Office vs CFO** | There is no separate `Efficiency Office` entity. The `cfo` responsibility already covers cost/ROI/efficiency. Extend `cfo` if a new efficiency-specific lens is needed. |
| **Capsule vs Lens vs Cognitive Asset** | `data/lenses/` and `LENS_REGISTRY.json` already own reusable cognitive assets. `capsule` in the memory product means memory storage; do not overload it. |
| **Cognitive Core vs Lens Registry** | `cognitive-core-oracle.js` generic math is reused; the person-specific `createCognitiveCoreOracle` storage (`judgment_decisions`/`judgment_outcomes` tables keyed by `userId`) stays under `docs/products/memory-intelligence/PRODUCT_HOME.md`. No merge. |
| **Mission 2A duplicate** | Mission ID for this work is `FACTORY-MASTER-A-TO-Z-0001`. It is new and checked against existing `BP_PRIORITY.json` and `MISSION_QUEUE.json`. |

## Honest gaps

1. **Proof of execution, not existence:** `cognitive-chair.mjs`, `cognitive-step-runner.mjs`, `model-roi-ledger.mjs`, and `wisdom-reality-update.mjs` are real and tested, but none are called from the live `runChairNativeTurn` or `run-step.js` hot path. They exist; they are not yet executing in the real flow.
2. **Lens independence is prompt-level, not structural:** `buildLensPrompt` receives `priorOutputs` and includes them in the prompt. The instruction says “awareness only,” but there is no enforcement that a lens cannot echo or be biased by earlier outputs. Phase 3 will make independence structural (compute all prompts before any model call, or strip `priorOutputs` until after all lens responses).
3. **No live founder-decision capture:** `founder_decision_log` is populated only by manual `/factory/founder-decisions/extract` or backfill scripts.
4. **No live model-outcome scoring for Chair answers:** `model_capability_ledger` does not see the actual answer to a founder turn; it only sees extraction outcomes and build outcomes.
5. **No Reasoning Plan artifact before lens selection:** `composeReasoning` runs directly on a mission string. Phase 2 will add a persisted `ReasoningPlan` schema.

## Audit verdict

Phase 0 is complete. The components are real; the wiring is not. Phase 1 will wire one bounded trigger in `runChairNativeTurn` to `composeReasoning`, `recordFounderDecision`, and `recordModelOutcome`.
