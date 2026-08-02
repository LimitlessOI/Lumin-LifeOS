<!-- SYNOPSIS: BuilderOS Self-Improvement — Phase 3 Spec -->

# BuilderOS Self-Improvement — Phase 3 Spec

**Status:** PROPOSED / builder-ready
**SSOT:** `docs/products/builderos/PRODUCT_HOME.md`
**Version:** 2026-08-02

This document defines the engines that make BuilderOS capable of improving its own blueprints, governance, and output quality. Each engine is a projection of the Builder Simplicity Principle and the epistemological rule: *reality is the best teacher.*

---

## 1. Blueprint Quality Index

**Purpose:** Measure the quality of any blueprint or mission pack before and after execution.

**Inputs:**
- `blueprint`: object with `steps`, `acceptance`, `dependencies`, `risk_notes`
- `context`: optional historical execution data

**Outputs:**
- `quality_score` (0-1)
- `dimensions`: `{completeness, testability, traceability, simplicity, risk_awareness}`
- `recommendations`: array of concrete improvements

**Core Functions:**
- `scoreBlueprint(blueprint, context)`
- `compareBlueprints(before, after)`
- `recommendImprovements(score)`

---

## 2. Variance Attribution Engine

**Purpose:** When a build outcome differs from the blueprint prediction, attribute the variance to causes.

**Inputs:**
- `prediction`: expected outcome object
- `outcome`: actual outcome object
- `execution_log`: array of events

**Outputs:**
- `variance_score` (0-1)
- `attributions`: array of `{cause, contribution, confidence, evidence}`
- `learned_lesson`: string

**Core Functions:**
- `attributeVariance(prediction, outcome, execution_log)`
- `rankCauses(attributions)`
- `extractLesson(attributions)`

---

## 3. Governance Cost Index

**Purpose:** Measure the cost of governance in time, tokens, and decisions so anti-bureaucracy can be enforced.

**Inputs:**
- `decision`: decision record
- `process`: governance steps taken

**Outputs:**
- `cost_score` (0-1, lower is cheaper)
- `breakdown`: `{time_steps, token_calls, handoffs, blockers}`
- `bottlenecks`: array of strings

**Core Functions:**
- `measureGovernanceCost(decision, process)`
- `compareProcessCosts(processes)`
- `suggestCheaperPath(decision, process)`

---

## 4. Organizational Calibration Engine

**Purpose:** Calibrate trust and accuracy scores across offices (Chair, Solomon, Builder, Sentry, Historian) using reality outcomes.

**Inputs:**
- `office`: string identifier
- `predictions`: array of prediction/outcome pairs

**Outputs:**
- `calibration_score` (0-1)
- `bias_report`: `{overconfidence, underconfidence, directional_bias}`
- `recommendation`: string

**Core Functions:**
- `calibrateOffice(office, predictions)`
- `compareOffices(predictionsByOffice)`
- `suggestRecalibration(calibration_score)`

---

## 5. Discovery Classification Engine

**Purpose:** Classify new ideas as observation, inference, hypothesis, model, principle, law, or constitutional principle based on evidence and promotion criteria.

**Inputs:**
- `idea`: object with `statement`, `evidence`, `current_tier`
- `evidence_history`: array of prior evidence

**Outputs:**
- `classification`: current tier
- `next_tier`: next promotable tier
- `missing_evidence`: array of strings
- `confidence`: number 0-1

**Core Functions:**
- `classifyIdea(idea, evidence_history)`
- `promoteIdea(idea, evidence_history)`
- `listPromotionCriteria(tier)`

---

## 6. Independent Laboratory Architecture

**Purpose:** Run controlled experiments where Builder, Solomon, and Sentry independently analyze the same evidence and compare results before convergence.

**Inputs:**
- `evidence_package`: object
- `offices`: array of office names

**Outputs:**
- `independent_findings`: array per office
- `convergence_report`: `{agreed, disagreed, best_predictor}`
- `confidence`: number 0-1

**Core Functions:**
- `runIndependentAnalysis(evidence_package, offices)`
- `compareFindings(findings)`
- `recommendConvergence(findings)`

---

## 7. Meta-Learning System

**Purpose:** Learn how the system learns by measuring which model, prompt, and workflow choices produce better reality alignment.

**Inputs:**
- `experiment`: `{model, prompt_id, workflow, outcome}`
- `history`: array of prior experiments

**Outputs:**
- `meta_score`: number 0-1
- `insights`: array of strings
- `recommended_config`: object

**Core Functions:**
- `recordExperiment(experiment)`
- `rankApproaches(history)`
- `recommendConfig(history, constraints)`

---

## 8. BuilderOS Self-Improvement Loop

**Purpose:** Tie the Phase 3 engines into a continuous loop that improves blueprints, measures variance, bounds governance cost, and feeds reality back into the Learning Architecture.

**Inputs:**
- `mission_outcome`: outcome object
- `blueprint`: original blueprint
- `runtime_logs`: execution events

**Outputs:**
- `improved_blueprint`: blueprint object
- `improvement_report`: `{quality_delta, variance_lessons, governance_cost, meta_insights}`
- `next_actions`: array of strings

**Core Functions:**
- `runImprovementLoop(mission_outcome, blueprint, runtime_logs)`
- `generateNextBlueprint(product_id, previous_blueprint, feedback)`
- `summarizeImprovementReport(report)`

---

## Acceptance

- Every engine returns deterministic, JSON-serializable results.
- Every engine includes a `version` export.
- The Self-Improvement Loop can be run from `npm run builderos:self-improvement:loop`.
- `npm run builder:preflight` passes.
