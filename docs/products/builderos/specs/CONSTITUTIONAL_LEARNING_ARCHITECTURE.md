<!-- SYNOPSIS: Constitutional Learning Architecture — Phase 1-3 Spec -->

# Constitutional Learning Architecture — Phase 1-3 Spec

**Status:** PROPOSED / builder-ready
**SSOT:** `docs/products/builderos/PRODUCT_HOME.md`
**Version:** 2026-08-02

This document defines the engines and data schemas that make Taloa a constitutional learning institution. Each engine is a projection of one principle: *continuously improve understanding through reality.*

---

## 1. Reality Alignment Engine

**Purpose:** Determine how well a model, statement, or decision matches the many layers of reality.

**Inputs:**
- `RealityPackage`: `{ observed, experienced, remembered, predicted, shared, source_weights }`
- `Claim` or `Decision` to align

**Outputs:**
- `alignment_score` (0-1)
- `drift_report`: list of divergences between realities
- `reconciliation`: explanation of how to hold multiple truths without forcing one

**Core Functions:**
- `computeRealityAlignment(package, claim)`
- `explainDrift(package)`
- `promoteConfidence(package, claim, outcome)`

**Data:** `data/constitutional-framework/CALIBRATION_LEDGER_SCHEMA.json`

---

## 2. Confidence Vector Model

**Purpose:** Store calibrated confidence as two dimensions: epistemic confidence (how well the evidence supports the claim) and constitutional commitment (how binding the claim is on action).

**Vector:** `{ epistemic: 0-1, commitment: 0-1 }`

**Promotion Criteria:**
- Observation → repeated, documented
- Inference → single-step logical consequence
- Hypothesis → testable, not yet tested
- Model → predicts outcomes across multiple cases
- Principle → survives adversarial challenge
- Law → encoded in governance and enforced
- Constitutional Principle → ratified and woven into `CONSTITUTIONAL_FRAMEWORK`

**Function:** `promoteEvidenceTier(evidence, currentTier)` returns `{ newTier, confidence, requiredEvidence }`

---

## 3. Human Constellation

**Purpose:** The canonical person model. All OS products (LifeOS, MarriageOS, CareerOS, etc.) are projections of this graph.

**Nodes:** values, goals, needs, beliefs, patterns, states, triggers, resources, risks, avoidances

**Edges:** weighted by strength, stability, recency, frequency, causal_confidence, source

**Core Functions:**
- `addObservation(constellation, nodeType, payload)`
- `weightEdge(constellation, from, to, update)`
- `projectForProduct(constellation, productId)` returns product-specific view

**Data:** `data/human-constellation/SCHEMA.json`

---

## 4. Causality Engine

**Purpose:** Estimate causes, not correlations. Ask: "What probably causes this?" not "What often happens with this?"

**Inputs:**
- Human Constellation subgraph
- Temporal sequence of events
- Counterfactual candidates

**Outputs:**
- `causal_graph`: directed edges with causal confidence
- `interventions`: ranked least-invasive actions with predicted effects

**Core Functions:**
- `estimateCauses(eventStream, constellation)`
- `proposeInterventions(targetState, constraints)`
- `scoreCausalModel(model, outcomes)`

---

## 5. Readiness Engine

**Purpose:** Civilization-level readiness. Determine what truth a person, office, or product can integrate right now. Timing is wisdom.

**Inputs:**
- Target state or insight
- Recipient profile (cognitive load, emotional state, context, history)

**Outputs:**
- `readiness_score` (0-1)
- `recommended_form` (micro-insight, dialogue, exercise, wait)
- `risk_if_forced` (overwhelm, rejection, dependency)

**Core Functions:**
- `assessReadiness(recipient, insight)`
- `selectForm(recipient, insight)`
- `detectAvoidancePattern(constellation, topic)`

---

## 6. Perspective Expansion Engine

**Purpose:** Before attempting influence, the system must demonstrate it understands. This earns guidance.

**Core Functions:**
- `generatePerspectiveSummary(constellation, userInput)` — captures the user's view in their own frame
- `identifyUnstatedNeeds(constellation)`
- `askBetterQuestion(constellation)` — improve the quality of the user's question

**Output:** "You seem to be feeling X because Y. Is that right?" before any recommendation.

---

## 7. State Modeling

**Purpose:** Model the user's current state (calm, overwhelmed, grieving, hopeful, etc.) without labeling or pathologizing.

**Inputs:** signals from Human Constellation and recent interactions
**Outputs:** `state_vector` with confidence, `state_history`, `state_transitions`

---

## 8. Emotional Weight as Significance

**Purpose:** Emotional weight is significance, not intensity. A quiet grief can carry more weight than a loud anger.

**Function:** `computeEmotionalWeight(event, constellation)` returns `{ intensity, significance, duration, relational_impact }`

---

## 9. Early Risk Detection

**Purpose:** Detect trajectory-based risk early, then apply the least invasive intervention that reduces risk.

**Inputs:** state trajectory, constellation, external signals
**Outputs:** risk level, recommended intervention, agency cost

**Core Function:** `assessTrajectoryRisk(trajectory, thresholds)` returns `{ risk, intervention, confidence }`

---

## 10. Mission Contribution Field

**Every proposal, feature, engine, and amendment must answer:**

```
Mission Contribution: How does this move humanity and aligned AI toward the North Star?
```

If the field is weak, the burden of proof goes up.

---

## 11. Office Trust Ledger

**Purpose:** No office is the source of truth. Trust is earned through calibration, not authority.

**Data:** `data/constitutional-framework/OFFICE_TRUST_LEDGER_SCHEMA.json`

---

## 12. Solomon Wisdom Lab

**Purpose:** Solomon studies how wisdom forms, not merely collects it.

**Responsibilities:**
- Gather evidence
- Expand perspectives
- Evaluate long-term implications
- Compare competing models
- Identify constitutional tensions
- Record confidence, assumptions, uncertainties, reasoning
- Withhold recommendation until Chair records preliminary decision

**Output:** evidence package with findings, implications, models, tensions, and recommended course.

---

## 13. BuilderOS Self-Improvement Instruments

- **Blueprint Quality Index** — measure complexity vs. intent clarity
- **Variance Attribution** — map failures to layer (Mission, Constitution, Governance, Architecture, Product, Runtime, Reality)
- **Governance Cost Index** — measure friction of a governance rule against its value
- **Meta-Learning Loop** — update the architecture only when reality demonstrates a missing capability

---

## Acceptance Criteria

- Every engine has a documented input, output, and core function set.
- Every engine has a data schema or references an existing one.
- No engine duplicates the Human Constellation; all products consume it.
- Every engine has a `Mission Contribution` field.
- `npm run builder:preflight` passes.
