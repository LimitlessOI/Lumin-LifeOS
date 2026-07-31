<!-- SYNOPSIS: Phase 0 consensus decision for Mission 2 — BuilderOS Convergence. -->

# DECISION-0001 — Phase 0 Consensus: Stop False Seals and Repeated Rejected Generation

**Decision ID:** DECISION-0001  
**Mission / Blueprint:** Mission 2 — BuilderOS Convergence / `FACTORY-BUILDEROS-CONVERGENCE-0001`  
**Blueprint version:** `FACTORY-BUILDEROS-CONVERGENCE-0001-v2`  
**Decided at:** 2026-07-31T00:00:00Z  
**Authority:** `builderos-reboot/DECISIONS/DECISION-0001.md`

## Decision

Stop false seals and repeated rejected generation by adding deterministic grounding gates, an auditable unseal path, rejected-hash anti-reseal, sticky escalation, and overwrite-path control.

## Decision ID

DECISION-0001

## Blueprint / Product Affected

- Mission: FACTORY-BUILDEROS-CONVERGENCE-0001
- Product: builderos
- Blueprint: builderos-reboot/MISSIONS/FACTORY-BUILDEROS-CONVERGENCE-0001/BLUEPRINT.json

## Founder intent

BuilderOS must not certify structurally present but semantically false work as complete. A step may only be treated as done when the claim being made about it is semantically true. The immediate priority is to stop the seal path from certifying broken generated work, to provide an auditable unseal path, and to prevent the same rejected content from regenerating and overwriting verified repairs.

## Problem being solved

Direct evidence from 2026-07-31 showed that BuilderOS could:
1. Seal a generated file that imports a named export that does not exist.
2. Seal a generated file that queries a SQL table that does not exist.
3. Treat a step as DONE using only structural substring/export-name checks.
4. Overwrite a human-confirmed repair with the same broken generated content on the next autonomous cycle.
5. Revive a manually `blocked` step because `escalation_required` was not explicitly set.

## Alternatives considered

1. **Detect-and-route (warning-only) first.** Rejected because the directly evidenced checks are high-confidence and the system is already burning tokens on broken work. Warnings would allow false completion to continue during a calibration period.
2. **Rewrite the entire seal/rebuild machinery.** Rejected because the existing structural replay is still useful; the correct fix is additive correctness gates in front of it.
3. **Build a parallel decision table.** Rejected because `services/self-repair-decision-log.js` already provides a working primitive that should be extended.
4. **Place the grounding helper in `scripts/lib/`.** Rejected because `services/truth-ladder.js` owns the seal path; placing the helper elsewhere would create a less coherent design. The helper is classified as GAP-FILL governance infrastructure.

## Per-role reasoning

- **Chair:** The founder's intent is preserved: no false completion, no human message bus, mechanical enforcement. The helper stays in `services/` because that is where the seal path lives.
- **Architect:** The smallest additive gate is a deterministic grounding check inside `sealExactChangeIntoTwin` and before `status: DONE` in `runNextStep` / `claimPreExistingSatisfiedSteps`. The unseal path is a new function on `truth-ladder.js` that records rejected hashes. Sticky escalation is a new function on `product-build-orchestrator.js` that sets the existing `escalation_required` fields.
- **Sentry:** Each new gate must have behavioral tests that fail before the fix and pass after: missing export, missing table, rejected hash reseal, escalated blocked step stays blocked.
- **Wisdom:** Extend the existing `self_repair_decision_log` table with explicit lifecycle columns and a JSONB `metadata` column rather than building a parallel table. Old writes must keep working.
- **CFO:** Fail-closed-for-sealing but fail-open-for-factory-around means blocked steps stop consuming tokens while unrelated work continues. Rejected-content anti-reseal stops wasted codegen cycles.

## Assumptions

- Deterministic static checks are sufficient for the two directly evidenced defect classes (missing named exports, nonexistent SQL tables).
- A calibration period is needed only for reducing unsupported or indeterminate constructs, not for conclusively proven defects.
- The existing `truth-ladder.js` seal path is the correct integration point.
- The existing `product-build-orchestrator.js` `STEP_STATUS.BLOCKED` semantics are the correct integration point for sticky escalation.

## Predictions

1. After WP0.1, a generated file importing a nonexistent export or querying a nonexistent table will fail to seal with a clear `GROUNDING_FAIL` reason.
2. After WP0.2, a proven-wrong seal can be unsealed and the same `content_sha256` cannot be resealed.
3. After WP0.3, a step marked with the new escalation operation will not auto-revive.
4. After WP0.4, the exact path that overwrites repairs will be traced and controlled.
5. After WP0.5, the extended decision log will round-trip without breaking existing readers.

## Success criteria

- `npm run builder:preflight` passes after all WP0 changes.
- Behavioral tests prove each gate catches its targeted defect and passes a known-good file.
- `routes/factory-mount-routes.js` does not seal a grounded-fail artifact.
- `services/product-build-orchestrator.js` does not mark a grounded-fail artifact as `DONE`.
- The decision log migration is additive and backward-compatible.

## Failure criteria

- A known-broken generated artifact can still seal or be marked DONE.
- Existing valid seals break due to false positives.
- Existing decision-log writes fail.

## Consensus

The five consensus points from the founder, ChatGPT, and Claude Code are adopted verbatim:

1. **Grounding gate:** FAIL CLOSED FOR SEALING, NOT FACTORY-WIDE. Conclusively proven defects (missing exports, nonexistent tables, rejected content hashes) prevent seal. Indeterminate cases are recorded without claiming semantic verification. The factory continues around blocked steps.
2. **Grounding helper location:** `services/blueprint-grounding-check.js`, classified as GAP-FILL governance infrastructure.
3. **WP0.4 overwrite-path trace:** HARD PHASE 0 STOP-GATE. Trace the chain, identify the root cause, record evidence, implement only the narrow unambiguous correction or stop for consensus.
4. **Decision-log schema:** HYBRID SCHEMA. Explicit columns for stable lifecycle fields, JSONB `metadata` for structured per-role/alternatives/evidence fields.
5. **Revenue-loop ordering:** Defer SMOS revenue execution until the blueprint-authority spine is proven. Revenue remains a protected, mandatory Mission 2 lane.

## Why this decision

It stops the directly evidenced bleeding first without rebuilding the factory from scratch. It uses existing primitives (`truth-ladder.js`, `product-build-orchestrator.js`, `self-repair-decision-log.js`) and adds deterministic, testable gates. It keeps the factory moving on unrelated work while preventing false completion.

## Reality judgment

- **Status:** CONFIRMED
- **Evidence:** `services/blueprint-grounding-check.js` and `services/truth-ladder.js` prevent missing-export/missing-table seals; `product-build-orchestrator.js` sticky escalation keeps blocked steps from auto-reviving; `tests/blueprint-grounding-check.test.js` (7/7), `tests/truth-ladder.test.js` (23/23), `tests/product-build-orchestrator.test.js` (21/21), `tests/run-step-overwrite-guard.test.js` (2/2), `tests/self-repair-decision-log.test.js` (3/3) all pass; `npm run builder:preflight` PASS 416/416; `products/receipts/PHASE_0_STOP_GATE.json` and `docs/audits/builderos-mission-2/MISSION_2_CONVERGENCE_HANDOFF.md` produced.
- **Next action:** Phase 0 closed; proceed with Mission 2 convergence work.

## Implementation trace

- `services/blueprint-grounding-check.js` — new helper.
- `services/truth-ladder.js` — call grounding check inside `sealExactChangeIntoTwin`.
- `services/product-build-orchestrator.js` — call grounding check before `status: DONE` in `runNextStep` and `claimPreExistingSatisfiedSteps`; add `escalateBlockedStep`.
- `routes/factory-mount-routes.js` — handle seal grounding failures and surface them in response.
- `services/self-repair-decision-log.js` — extend schema with explicit columns and `metadata` JSONB.
- `tests/blueprint-grounding-check.test.js` — behavioral tests.
- `tests/truth-ladder.test.js` — extend for grounding failures.
- `tests/product-build-orchestrator.test.js` — extend for escalation and grounding.

## Sentry verification

To be filled after implementation.

## Actual real-world outcome

Pending Phase 0 stop-gate evidence.

## Prediction-versus-reality comparison

Pending.

## Resulting lessons / wisdom update

Pending.

## Blueprint Version Affected

FACTORY-BUILDEROS-CONVERGENCE-0001 BLUEPRINT.json v2

## Status

APPROVED — implementation authorized by founder consensus on 2026-07-31.
