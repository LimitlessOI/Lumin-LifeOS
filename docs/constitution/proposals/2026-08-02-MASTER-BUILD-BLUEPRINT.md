<!-- SYNOPSIS: A-to-Z master build blueprint — the complete install order for the Taloa constitutional learning institution. -->

# A-to-Z Master Build Blueprint

**Status:** PROPOSED / install order — not ratified  
**Source:** `docs/constitution/proposals/2026-08-02-ARCHITECTURE-CLASSIFICATION.md` (Adam consensus, 2026-08-02)  
**Purpose:** one document that maps every idea from the meta-architecture to a concrete, ordered, verifiable install. The goal is to take Taloa from the current codebase to the full constitutional learning institution, phase by phase, without losing any principle from the conversations with Adam, ChatGPT, LipoS, Over, and Devin.

---

## 1. What we are building

> **Taloa is a constitutional learning institution whose purpose is to continuously improve humanity's and aligned AI's understanding of reality in service of human flourishing.**

Everything else — LifeOS, BuilderOS, KidsOS, MarriageOS, CareerOS, HealthOS, Solomon, the Twin, the Reality Alignment Engine — is an expression of that one institution.

The install order below enforces this identity first, then builds the engines, then the products.

---

## 2. Accountability hierarchy (the stack we are installing)

```
Mission
  ↓
Constitution
  ↓
Governance
  ↓
Learning Architecture
  ↓
Products
  ↓
Runtime
  ↓
Reality
```

- **Mission** is the only sacred thing.
- **Constitution** protects the relationship between intention and reality.
- **Governance** makes decisions accountable to the Constitution.
- **Learning Architecture** continuously improves understanding through reality.
- **Products** are applications of that understanding.
- **Runtime** executes products under governance.
- **Reality** has final authority over everything.

**Design equation:**

- **Intent determines direction.**
- **Governance determines reliability.**
- **Reality determines results.**

---

## 3. Core commitments that must live everywhere

These are not engine features. They are design constraints for every file, function, and product installed.

- **Guardianship of Intention:** infrastructure exists to serve people; the mission is the destination.
- **Constitutional test:** every amendment, governance mechanism, product, and engine must demonstrate how it advances the North Star.
- **Understanding precedes influence. Influence serves empowerment. Empowerment serves the mission.**
- **No office is the source of truth:** every office is a perspective; reality determines accuracy.
- **Independent judgment precedes shared judgment:** blind reasoning on the same evidence before recommendations are revealed.
- **Confidence, not certainty:** the system stores calibrated confidence and is open to revision by reality.
- **Reality Alignment:** observed / experienced / remembered / predicted / shared reality are distinguished and calibrated.
- **Empowerment over dependence:** increase the user's long-term capacity to solve tomorrow's problems without us.
- **Earned Guidance:** demonstrate understanding before attempting influence; "feel understood" is the mechanism.
- **Mission Alignment Filter:** effectiveness alone is not enough; manipulation, fear, addiction, outrage, surveillance are unconstitutional means.
- **Incentive Recalibration:** any governance system optimizes for its incentives; incentives must be recalibrated against the mission.
- **Least invasive intervention:** early risk and safety systems use the minimum intervention capable of reducing risk.
- **Builder Simplicity:** prefer the simplest implementation that preserves future adaptability; complexity is civilization debt.
- **Entity Twin Framework:** every significant entity (person, relationship, organization, project, product, office, institution) is one Twin instance modeled with the same Human Constellation graph, confidence vectors, causality engine, and calibration ledger; the Adaptive Human Model and the Institutional Constellation are simply the first two instances.

---

## 4. Full install order (A to Z)

### Phase 0 — Constitutional clarity and enforcement

**Goal:** make the existing Constitution observable, verifiable, and improvable before adding new engines.

1. **Accept the meta-architecture** (this document and the classification).
2. **Generate the Constitutional Enforcement Matrix.**
   - Run `node scripts/generate-constitutional-enforcement-matrix.mjs`.
   - Output: `data/constitutional-framework/proposals/ENFORCEMENT_MATRIX_PROPOSED.json`.
   - Review verifier mappings; move to `data/constitutional-framework/ENFORCEMENT_MATRIX.json` only after ratification.
3. **Draft the 13 constitutional candidates into `CONSTITUTIONAL_FRAMEWORK_v1.md`.**
   - Use `docs/constitution/proposals/2026-08-02-CONSTITUTIONAL-CANDIDATES-v1.1.md` as the source text.
   - Target sections: §1 (Purpose), §2 (Foundational Commitments), §6 (Offices), §8 (Processes), §13 (Rule-of-Law), §14 (Affected-Party Participation).
4. **Prepare the `NORTH_STAR_SSOT.md` amendment proposal.**
   - Use `docs/constitution/proposals/2026-08-02-NORTH_STAR_AMENDMENT.md`.
   - Do not wire into canonical `NORTH_STAR_SSOT.md` until ratification.
5. **Close the 6 v1.0 ratification blockers.**
   - UD-1: amendment thresholds
   - UD-2: independent review office charter
   - UD-4: founder emergency powers numeric limits
   - UD-5: succession mechanism
   - UD-8: runtime parity test implementation
   - UD-9: adversarial ratification suite execution
6. **Install the blind independent-reasoning protocol.**
   - Evidence Package format and freeze.
   - Chair preliminary decision record (immutable timestamp + evidence hash).
   - Solomon independent analysis and withheld recommendation.
   - Reveal, compare, Independent Review, Final Decision, Builder implementation, Sentry verification, Reality measurement, Calibration update.
7. **Run the adversarial ratification suite.**
   - Red-team every new candidate and amendment.
   - Capture capture/gaming/bypass/self-contradiction scenarios.
   - Iterate until all material defects are closed or explicitly deferred.
8. **Ratify Phase 0.**
   - Merge the candidates into `CONSTITUTIONAL_FRAMEWORK_v1.md` as v1.1.
   - Merge the North Star amendment (if approved).
   - Promote the Enforcement Matrix from `proposals/` to canonical `data/constitutional-framework/ENFORCEMENT_MATRIX.json`.
   - Update `data/constitutional-framework/REGISTRY.json` with the new laws and verifiers.

**Acceptance criteria for Phase 0:**
- `npm run builder:preflight` passes.
- `npm run lifeos:bp-priority:verify` passes.
- Every current constitutional item has a verifier.
- The 13 candidates survive adversarial review.
- The 6 v1.0 blockers are closed or explicitly deferred.
- No new code is permanently enforced until ratification.

### Phase 1 — Reality Alignment Engine and the Adaptive Human Model

**Goal:** build the shared inference substrate and the person model that every product will consume.

1. **Reality Alignment Engine**
   - Spec: `docs/products/builderos/specs/REALITY_ALIGNMENT_ENGINE.md`
   - Service: `services/reality-alignment.js`
   - Distinguish observed / experienced / remembered / predicted / shared reality.
   - Explain drift between realities and compute confidence for each view.
2. **Confidence Vector Model**
   - Spec: `docs/products/builderos/specs/CONFIDENCE_VECTOR_MODEL.md`
   - Service: `services/confidence-vectors.js`
   - Dimensions: belief strength, evidence support, behavior alignment, emotional weight (significance, not intensity), identity attachment, readiness, trust, confidence.
3. **Human Constellation**
   - Spec: `docs/products/lifeos/specs/HUMAN_CONSTELLATION.md`
   - Service: `services/human-constellation.js`
   - Causal graph of values, identity, trauma, beliefs, relationships, strengths, weaknesses, programs, patterns, motivations, goals, communication, trust, hope, integrity, readiness, predictions.
   - Weighted edges: strength, stability, recency, frequency of observation.
4. **Causality Engine**
   - Spec: `docs/products/builderos/specs/CAUSALITY_ENGINE.md`
   - Service: `services/causality-engine.js`
   - Estimate causes, not just correlations, over long time horizons.
5. **Perspective Expansion Engine**
   - Spec: `docs/products/lifeos/specs/PERSPECTIVE_EXPANSION_ENGINE.md`
   - Service: `services/perspective-expansion.js`
   - Expand the map before solving: "what else?" "what if?" "what implication?"
6. **Readiness Engine**
   - Spec: `docs/products/builderos/specs/READINESS_ENGINE.md`
   - Service: `services/readiness-engine.js`
   - Answer: "What truth is this person/organization/governance body currently capable of integrating constructively?"
7. **Adaptive Human Model** (formerly Digital Twin)
   - Spec: `docs/products/lifeos/specs/ADAPTIVE_HUMAN_MODEL.md`
   - Data: `data/twins/default/<user>/adaptive_human_model.json`
   - Living causal graph, not a database.
   - Built from Human Constellation + Causality Engine + Confidence Vectors.
8. **Communication Calibration Engine**
   - Spec: `docs/products/builderos/specs/FOUNDER_VIRTUAL_TWIN.md`
   - Service: `services/founder-communication-calibration.js`
   - Learn literalness, precision, confidence expression, abstraction, narrative density, goal orientation, learning style, biases, correction strategies.
9. **Calibration Ledger**
   - Data: `data/constitutional-framework/CALIBRATION_LEDGER.json`
   - Service: `services/calibration-ledger.js`
   - Predictions and outcomes for offices, AI, humans, laws.
10. **Office Trust Ledger**
    - Data: `data/constitutional-framework/OFFICE_TRUST_LEDGER.json`
    - Service: `services/office-trust-ledger.js`
    - Earned trust per office/office-holder.

**Acceptance criteria for Phase 1:**
- The Reality Alignment Engine can ingest and compare the five realities.
- The Adaptive Human Model is a graph with weighted causal edges.
- The Readiness Engine returns a calibrated readiness score with evidence.
- The Calibration Ledger records predictions and outcomes for at least Chair and Solomon.
- `npm run builder:preflight` passes.

### Phase 2 — Safety, coaching, and wisdom

**Goal:** turn the person model into a helpful, safe, empowering human interface and a learning wisdom laboratory.

1. **Emotional Modeling**
   - Spec: `docs/products/lifeos/specs/EMOTIONAL_MODELING_ENGINE.md`
   - Emotional weight = significance (not intensity).
2. **State Modeling**
   - Spec: `docs/products/lifeos/specs/STATE_MODELING.md`
   - Service: `services/state-modeling.js`
   - Learn who the person is when calm, excited, overwhelmed, ashamed, grieving, angry, hopeful; adapt coaching without labeling.
3. **Coaching Protocol**
   - Spec: `docs/products/lifeos/specs/COACHING_PROTOCOL.md`
   - Service: `services/lifeos-coaching-protocol.js`
   - Flow: Observe → Become curious → Help them feel understood → Expand the landscape → Verify shared understanding → Assess readiness → If invited or appropriate, explore possible paths forward together.
4. **Early Risk Detection**
   - Spec: `docs/products/lifeos/specs/EARLY_RISK_DETECTION.md`
   - Service: `services/lifeos-risk-detection.js`
   - Recognize trajectories (not merely danger) toward burnout, isolation, hopelessness, relationship collapse, addiction, financial collapse, violence, medical decline.
5. **Crisis Protocols**
   - Spec: `docs/products/lifeos/specs/CRISIS_PROTOCOLS.md`
   - Service: `services/lifeos-crisis-protocol.js`
   - Personalized, consent-based plans; contact list; grounding techniques; language to avoid.
6. **Safety Calibration**
   - Spec: `docs/products/lifeos/specs/SAFETY_CALIBRATION.md`
   - Distinguish immediate danger, elevated concern, long-term patterns, general suffering; proportional transparent response.
7. **Avoidance Pattern Recognition**
   - Service: `services/lifeos-avoidance-pattern.js`
   - Curious invitation, not confrontation: "I notice this topic has come up several times but we consistently move away from it. I could be reading that incorrectly. Does that observation fit your experience?"
8. **Tonality / Emotional Signals** (opt-in)
   - Spec: `docs/products/lifeos/specs/EMOTIONAL_SIGNALS.md`
   - Tone, pace, hesitation, stress, voice strain, emotional intensity; evidence signals, never proof.
9. **Solomon — Wisdom Laboratory**
   - Spec: `docs/products/builderos/specs/SOLOMON_WISDOM_LABORATORY.md`
   - Service: `services/solomon-wisdom-lab.js`
   - Collect, compare, test, measure, calibrate, retire, update wisdom.
   - Study how wisdom forms: which experiences permanently change people, which interventions produce growth, how trust and identity develop.
   - Evaluate promotion of beliefs using the blind independent-reasoning protocol.

**Acceptance criteria for Phase 2:**
- Coaching protocol passes human-review UX tests (SENTRY Layer B).
- Early risk detection correctly identifies trajectories with low false-positive rate.
- Crisis protocols are consent-based and legally reviewed.
- Solomon can compare competing wisdom claims and output confidence, assumptions, and recommended action.
- `npm run builder:preflight` passes.

### Phase 3 — BuilderOS self-improvement

**Goal:** make BuilderOS capable of improving its own blueprints, governance, and output quality.

1. **Blueprint Quality Index**
   - Spec: `docs/products/builderos/specs/BLUEPRINT_QUALITY_INDEX.md`
2. **Variance Attribution Engine**
   - Spec: `docs/products/builderos/specs/VARIANCE_ATTRIBUTION_ENGINE.md`
3. **Governance Cost Index**
   - Spec: `docs/products/builderos/specs/GOVERNANCE_COST_INDEX.md`
4. **Organizational Calibration Engine**
   - Spec: `docs/products/builderos/specs/ORGANIZATIONAL_CALIBRATION_ENGINE.md`
5. **Discovery Classification Engine**
   - Spec: `docs/products/builderos/specs/DISCOVERY_CLASSIFICATION_ENGINE.md`
6. **Independent Laboratory Architecture**
   - Spec: `docs/products/builderos/specs/INDEPENDENT_LABORATORY_ARCHITECTURE.md`
7. **Meta-Learning System**
   - Spec: `docs/products/builderos/specs/META_LEARNING_SYSTEM.md`
8. **BuilderOS self-improvement loop**
   - Spec: `docs/products/builderos/PRODUCT_HOME.md` backlog / `BP_PRIORITY.json`

**Acceptance criteria for Phase 3:**
- BuilderOS can measure its own blueprint quality and attribute variance to causes.
- Governance cost is measured and bounded.
- The Meta-Learning System improves the Learning Architecture itself.
- `npm run builder:preflight` passes.

### Phase 3.5 — Institutional Constellation

**Goal:** make Taloa capable of modeling itself with the same epistemological machinery it applies to people and organizations.

1. **Institutional Constellation Spec**
   - `docs/products/builderos/specs/INSTITUTIONAL_CONSTELLATION.md`
2. **Institutional Constellation Service**
   - `services/institutional-constellation.js`
   - Node types: `belief`, `office`, `product`, `governance_mechanism`, `constitutional_principle`, `hypothesis`, `model`, `prediction`, `outcome`, `drift_signal`, `blind_spot`.
   - Weighted edges record agreement, calibration, and causal confidence between offices, beliefs, predictions, and outcomes.
   - Exports: `createInstitutionalConstellation`, `addBelief`, `addOffice`, `addProduct`, `weightAgreement`, `recordPrediction`, `recordOutcome`, `getCalibrationReport`, `getDriftSignals`, `getBlindSpots`, `getConstellationSummary`.
3. **Smoke test** (`tests/institutional-constellation-smoke.test.mjs`) proves cross-office agreement, calibration, and drift detection.

**Acceptance criteria for Phase 3.5:**
- The institution can record its own beliefs, offices, products, and predictions as a constellation.
- The constellation detects disagreement, drift, and blind spots.
- It uses the same weighted-edge, confidence-vector, and calibration patterns as `services/human-constellation.js`.
- It is the second concrete instance of the **Entity Twin Framework**; the same `Twin<T>` pattern is reused rather than duplicated.
- `npm run builder:preflight` passes.

---

## 5. Governance and decision flow to install

The following flow governs every major decision, promotion, and constitutional amendment:

```
Reality gathers evidence
       ↓
Evidence Package created
       ↓
Chair performs independent reasoning
       ↓
Chair records preliminary decision
       ↓
Solomon independently analyzes the same evidence
       ↓
Solomon reveals findings and recommendation
       ↓
Chair compares both perspectives
       ↓
Independent Review (for major decisions)
       ↓
Final Decision
       ↓
Builder implements
       ↓
Sentry verifies
       ↓
Reality measures outcomes
       ↓
Calibration updates both Solomon and Chair
```

Install order:
1. Define the Evidence Package schema (`data/constitutional-framework/EVIDENCE_PACKAGE_SCHEMA.json`).
2. Build the Chair preliminary decision recorder (`services/chair-preliminary-decision.js`).
3. Build the Solomon withheld-recommendation container (`services/solomon-withheld-recommendation.js`).
4. Build the reveal/comparison/calibration step (`services/chair-solomon-calibration.js`).
5. Wire into the builder execution path so no major decision ships without the protocol.

---

## 6. Cross-cutting systems installed in every phase

| System | Purpose | First phase | Long-term owner |
|---|---|---|---|
| **Mission Contribution field** | Every proposal, feature, engine, and amendment answers how it advances the North Star | Phase 0 | Governance / `BP_PRIORITY.json` |
| **Calibration Ledger** | Predictions vs. outcomes for offices, AI, humans, laws | Phase 1 | Learning Architecture |
| **Office Trust Ledger** | Earned trust per office/office-holder | Phase 1 | Governance |
| **Readiness Engine** | "What truth can this entity integrate now?" | Phase 1 | Learning Architecture |
| **Causality Engine** | Estimate causes, not correlations | Phase 1 | Learning Architecture |
| **Reality Alignment Engine** | Compare the five realities | Phase 1 | Learning Architecture |
| **Confidence Vectors** | Calibrated confidence across all claims | Phase 1 | Learning Architecture |
| **Human Constellation** | Person-model causal graph with weighted edges | Phase 1 | LifeOS / Twin |
| **Communication Translation Layer** | Translate between Adam/team/user communication styles | Phase 1 | LifeOS / Twin |
| **Solomon Wisdom Laboratory** | Collect, test, calibrate, retire wisdom | Phase 2 | BuilderOS / LifeOS shared |
| **Avoidance Pattern Recognition** | Curious invitations to self-discovery | Phase 2 | LifeOS |
| **Early Risk Detection** | Trajectory recognition, least invasive intervention | Phase 2 | LifeOS |
| **Crisis Protocols** | Consent-based safety plans | Phase 2 | LifeOS |
| **State Modeling** | Adapt to person state without labeling | Phase 2 | LifeOS |
| **Blueprint Quality Index** | Measure blueprint quality | Phase 3 | BuilderOS |
| **Variance Attribution Engine** | Explain builder variance | Phase 3 | BuilderOS |
| **Governance Cost Index** | Anti-bureaucracy metric | Phase 3 | BuilderOS |
| **Meta-Learning System** | Learn how the system learns | Phase 3 | BuilderOS |
| **Institutional Constellation** | Taloa models itself with the same graph, confidence, causality, and calibration machinery | Phase 3.5 | BuilderOS / Governance |
|| **Entity Twin Framework** | One Twin<T> pattern for person, relationship, organization, project, product, office, and institution | Phase 3.5 (concept) / all phases | BuilderOS / LifeOS / Governance |

---

## 7. Products as windows into the same constellation

Install each product as a view into the shared Adaptive Human Model and Reality Alignment Engine:

1. **LifeOS** — primary human interface (Phase 2).
2. **MarriageOS / KidsOS / BusinessOS / HealthOS / CareerOS** — specialized constellations (Phase 2+).
3. **Solomon** — Wisdom Laboratory (Phase 2).
4. **BuilderOS** — self-improving factory (Phase 0 foundation, Phase 3 advanced).
5. **Communication Layer** — translate across minds (Phase 1).

No product owns the person model. The Learning Architecture owns it; products consume it.

---

## 8. Verification and adversarial plan

At every phase, run:

- `npm run builder:preflight`
- `npm run lifeos:bp-priority:verify`
- Phase-specific acceptance tests.
- Red-team scenarios for:
  - Capture of a governance office by another office.
  - Solomon becoming the de facto ruler.
  - Chair anchoring on Solomon's recommendation.
  - Early risk detection overreaching or underreaching.
  - Constitution bloating.
  - Mission drift.
  - Dependency creation instead of empowerment.
  - Incentives misaligned with mission.

The adversarial suite output is a `RATIFICATION_REPORT.md` per phase. No phase ships until all material findings are closed or explicitly deferred.

---

## 9. Unresolved decisions to close before or during install

| ID | Question | Default if silent | Phase |
|---|---|---|---|
| AC-1 | Amend `NORTH_STAR_SSOT.md` with new mission wording and design equation? | Prepare amendment; do not ratify until explicit order. | 0 |
| AC-2 | Which candidates go into `CONSTITUTIONAL_FRAMEWORK_v1.md` v1.0 vs. v1.1? | Add all 13 as v1.1 proposed update. | 0 |
| AC-3 | Legal/ethical boundaries of Early Risk Detection and Crisis Protocols? | Require explicit consent, legal review, mandatory reporting compliance. | 2 |
| AC-4 | Consent model for tonal/emotional signal capture and state modeling? | Opt-in only. | 2 |
| AC-5 | How does Reality Alignment Engine relate to Solomon? | RAE is cross-cutting substrate; Solomon is wisdom lab built on top. | 1 |
| AC-6 | When does Human Constellation become user-visible? | Internal first; user-visible only after consent/UX review. | 1 |
| AC-7 | Should avoidance-pattern recognition be automatic or invited? | Invited/permission-based; automatic only for high-risk trajectories under crisis protocol. | 2 |
| AC-8 | Exact `mission_contribution` field format and review gate? | Required field in every `BLUEPRINT.json` and constitutional proposal; Chair/Council review. | 0 |
| AC-9 | How does Solomon's promotion authority interact with founder/council ratification? | Constitution defines criteria; Solomon evaluates evidence and recommends; humans ratify. | 0 |
| AC-10 | What triggers blind reasoning protocol and how are preliminary decisions recorded? | Major decisions; record in Calibration Ledger with timestamp + evidence hash. | 0 |
| AC-11 | How are Chair–Solomon disagreements resolved? | Independent Review first; lower-stakes default to Chair with dissent; higher-stakes require council/founder. | 0 |

---

## 10. File map (proposed install artifacts)

### Constitutional
- `docs/constitution/proposals/2026-08-02-ARCHITECTURE-CLASSIFICATION.md` — meta-architecture
- `docs/constitution/proposals/2026-08-02-PHASE0-INTRO-BLUEPRINT.md` — Phase 0 plan
- `docs/constitution/proposals/2026-08-02-MASTER-BUILD-BLUEPRINT.md` — this document
- `docs/constitution/proposals/2026-08-02-CONSTITUTIONAL-CANDIDATES-v1.1.md` — proposed framework text
- `docs/constitution/proposals/2026-08-02-NORTH_STAR_AMENDMENT.md` — proposed North Star text
- `docs/constitution/CONSTITUTIONAL_FRAMEWORK_v1.md` — current proposed framework
- `data/constitutional-framework/proposals/ENFORCEMENT_MATRIX_PROPOSED.json` — proposed law→verifier map

### Learning Architecture
- `docs/products/builderos/specs/REALITY_ALIGNMENT_ENGINE.md`
- `docs/products/builderos/specs/CONFIDENCE_VECTOR_MODEL.md`
- `docs/products/builderos/specs/CAUSALITY_ENGINE.md`
- `docs/products/builderos/specs/READINESS_ENGINE.md`
- `docs/products/lifeos/specs/HUMAN_CONSTELLATION.md`
- `docs/products/lifeos/specs/PERSPECTIVE_EXPANSION_ENGINE.md`
- `docs/products/lifeos/specs/EMOTIONAL_MODELING_ENGINE.md`
- `docs/products/lifeos/specs/STATE_MODELING.md`
- `docs/products/lifeos/specs/ADAPTIVE_HUMAN_MODEL.md`
- `docs/products/builderos/specs/SOLOMON_WISDOM_LABORATORY.md`

### Products
- `docs/products/lifeos/specs/COACHING_PROTOCOL.md`
- `docs/products/lifeos/specs/EARLY_RISK_DETECTION.md`
- `docs/products/lifeos/specs/CRISIS_PROTOCOLS.md`
- `docs/products/lifeos/specs/SAFETY_CALIBRATION.md`
- `docs/products/builderos/specs/BLUEPRINT_QUALITY_INDEX.md`
- `docs/products/builderos/specs/VARIANCE_ATTRIBUTION_ENGINE.md`
- `docs/products/builderos/specs/GOVERNANCE_COST_INDEX.md`
- `docs/products/builderos/specs/INDEPENDENT_LABORATORY_ARCHITECTURE.md`
- `docs/products/builderos/specs/META_LEARNING_SYSTEM.md`

### Services
- `services/reality-alignment.js`
- `services/confidence-vectors.js`
- `services/causality-engine.js`
- `services/readiness-engine.js`
- `services/human-constellation.js`
- `services/perspective-expansion.js`
- `services/emotional-modeling.js`
- `services/state-modeling.js`
- `services/lifeos-coaching-protocol.js`
- `services/lifeos-risk-detection.js`
- `services/lifeos-crisis-protocol.js`
- `services/solomon-wisdom-lab.js`
- `services/calibration-ledger.js`
- `services/office-trust-ledger.js`
- `services/chair-preliminary-decision.js`
- `services/solomon-withheld-recommendation.js`
- `services/chair-solomon-calibration.js`

---

## 11. What "installed and enforced" means per phase

| Phase | Installed | Enforced |
|---|---|---|
| 0 | Meta-architecture accepted; Constitution updated; Enforcement Matrix canonical; blind reasoning protocol in governance. | Every current law has a verifier; every major decision runs the protocol; `preflight` fails if a law is unverifiable. |
| 1 | Reality Alignment Engine, Confidence Vectors, Human Constellation, Causality Engine, Readiness Engine, Adaptive Human Model, Calibration Ledger, Office Trust Ledger. | No product makes a claim about a person that is not backed by a confidence vector and a reality score. |
| 2 | Coaching Protocol, Emotional/State Modeling, Early Risk Detection, Crisis Protocols, Safety Calibration, Avoidance Pattern Recognition, Solomon Wisdom Laboratory. | No coaching interaction proceeds without readiness check; no risk escalation without least-invasive intervention; no tonal capture without consent. |
| 3 | Blueprint Quality Index, Variance Attribution, Governance Cost Index, Meta-Learning, BuilderOS self-improvement loop. | BuilderOS cannot ship a blueprint that fails its own quality and variance tests; governance cost is bounded by index. |

---

## 12. Next action

The A-to-Z blueprint is complete. The next concrete action is to execute **Phase 0**:

1. Review and ratify the 13 constitutional candidates.
2. Close the 6 v1.0 ratification blockers.
3. Promote the Enforcement Matrix to canonical.
4. Run the adversarial ratification suite.

Until Phase 0 is ratified, no Learning Architecture engine is permanently wired into runtime.

Nothing here is ratified. It is a proposal for Adam and the council to review.
