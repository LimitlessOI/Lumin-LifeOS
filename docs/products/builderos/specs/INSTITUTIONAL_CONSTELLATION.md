<!-- SYNOPSIS: Institutional Constellation — Taloa's self-model using the same graph machinery as Human Constellation. -->

# Institutional Constellation

**SSOT:** `docs/products/builderos/PRODUCT_HOME.md`

## Purpose

The Institutional Constellation is the same Human Constellation graph machinery applied to Taloa itself. It models the institution's beliefs, offices, products, governance mechanisms, constitutional principles, hypotheses, models, predictions, outcomes, drift signals, and blind spots. Weighted edges record agreement, calibration, causal confidence, and recency.

## Design principle

> The institution shall understand itself using the same epistemological standards it applies to understanding people, relationships, and organizations.

No model of the institution, including the Constitution's own interpretations, is exempt from calibration by reality.

## Node types

| Type | Meaning |
|---|---|
| `belief` | Something Taloa currently holds true (with confidence). |
| `office` | A governance or operational office (Chair, Solomon, Sentry, Builder, TSOS). |
| `product` | A product or system (LifeOS, BuilderOS, Site Builder). |
| `governance_mechanism` | A process, gate, or enforcement mechanism. |
| `constitutional_principle` | A principle from the Constitution. |
| `hypothesis` | A testable claim not yet promoted. |
| `model` | A pattern used to explain or predict. |
| `prediction` | A forecast with confidence and outcome reference. |
| `outcome` | Observed reality result. |
| `drift_signal` | Detected divergence, overconfidence, or stale edge. |
| `blind_spot` | Low-evidence or low-calibration area. |

## Edge weights

Every edge carries:

- `strength` — how strongly the source influences or agrees with the target.
- `stability` — how often the edge has been observed.
- `recency` — timestamp of last update.
- `frequency` — number of observations.
- `causal_confidence` — 0–1 estimate that the source causes or predicts the target.
- `source` — what produced the edge (`chair`, `solomon`, `sentry`, `builder`, `reality`).

## Exports (service API)

- `createInstitutionalConstellation()` — return a fresh institutional constellation.
- `addBelief(constellation, belief, evidence, confidence)` — add a belief node.
- `addOffice(constellation, officeId, attributes)` — add an office node.
- `addProduct(constellation, productId, attributes)` — add a product node.
- `weightAgreement(constellation, from, to, weights)` — record agreement/disagreement edge.
- `recordPrediction(constellation, officeId, prediction, confidence)` — attach a prediction.
- `recordOutcome(constellation, predictionId, outcome)` — record observed outcome and calibrate.
- `getCalibrationReport(constellation)` — summary of confidence, agreement, and accuracy.
- `getDriftSignals(constellation)` — list contradictions, overconfidence, and stale edges.
- `getBlindSpots(constellation)` — list low-confidence / low-evidence nodes.
- `getConstellationSummary(constellation)` — human-readable overview.

## Acceptance

- `node --check services/institutional-constellation.js` passes.
- `node --test tests/institutional-constellation-smoke.test.mjs` passes.
- `npm run builder:preflight` passes.

## Relation to other engines

- Uses the same weighted-edge graph pattern as `services/human-constellation.js`.
- Reads `confidence-vectors.js`, `causality-engine.js`, `reality-alignment.js`, and `calibration-ledger.js` as inputs when available.
- Produces inputs for `builderos-self-improvement-loop.js` and `chair-solomon-calibration.js`.
