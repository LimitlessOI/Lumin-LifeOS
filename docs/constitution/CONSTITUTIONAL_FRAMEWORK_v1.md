<!-- SYNOPSIS: BuilderOS Constitutional Framework v1.0 (PROPOSED) — the manufacturing process for constitutional law. Not ratified. Subordinate to NORTH_STAR_SSOT.md. -->

# BuilderOS Constitutional Framework v1.0

> **Status:** PROPOSED — Architectural consensus reached — NOT RATIFIED
>
> **Ratification standard:** No known material defect remains unaddressed; every known uncertainty is honestly classified; every foundational promise has an enforcement or accountability path; and the framework contains a disciplined mechanism for learning from future reality.
>
> **Supersedes (when ratified):** `docs/constitution/CONSTITUTIONAL_FRAMEWORK.md` (working draft)
>
> **Subordinate to:** `docs/constitution/NORTH_STAR_SSOT.md` (Level 2 constitutional law and Level 0/1 content)
>
> **Companion:** `docs/constitution/CONSTITUTIONAL_PROCESSES.md` (detailed procedural rules)

---

## 1. Purpose and Definition

The **Constitutional Framework** is the manufacturing process for constitutional law. It is not itself the Constitution. It defines how BuilderOS discovers, tests, promotes, protects, challenges, amends, and—when necessary—replaces its understanding of what is true, valuable, and binding.

A **Constitution** is one layer inside this framework: the set of binding principles, laws, and processes that govern the organization at a given time. Other layers include the authority hierarchy, the Knowledge Ladder, the confidence model, the evidence model, the error taxonomy, the registries, the offices, and the enforcement mechanisms.

The framework also sits inside a larger architecture of three layers:

1. **The Constitution** — what must remain true.
2. **The Governance Framework** — how decisions are made.
3. **The Learning Architecture** — how the organization continuously becomes more accurate.

The Constitution should remain stable for decades. The Governance Framework evolves more slowly. The Learning Architecture evolves constantly as the organization discovers better ways to think, build, and learn. The product of this system is not software. The product is **trustworthy decisions**. Software is the output.

---

## 2. Foundational Commitments (Metaconstitutional)

These commitments are not derived from evidence; they are chosen premises that shape every downstream test. They may be challenged, but they may not be silently abandoned.

1. **Truth over convenience.** No claim is protected from evidence.
2. **Reality is the final scoreboard** — but reality is multi-dimensional, multi-temporal, and must be measured against declared purpose, not proxy metrics alone.
3. **Human dignity and agency.** Human beings must not be treated merely as instruments for organizational gain.
4. **Autonomy.** The system may challenge a person’s reasoning, but it may not quietly replace the person’s authorship of their life.
5. **Intellectual humility.** Confidence is a measure of our uncertainty, not a substitute for truth.
6. **Independent thought before cross-examination.** Load-bearing questions require independent reasoning before synthesis.
7. **Principled adaptability.** The organization must remain capable of changing anything it believes, while making it extraordinarily difficult to change what it believes for dishonest, self-serving, coercive, or weakly evidenced reasons.
8. **Trust is earned.** Trust is never presumed. It is earned through evidence, maintained through integrity, calibrated through observation, and continuously re-evaluated. No person, office, model, process, metric, or constitutional principle is exempt from this standard.

---

## 3. Authority Hierarchy

There are eight authority levels. Lower levels are subordinate to higher levels. No level can declare itself equal to or independent of the levels above it.

| Level | Name | Question | Change cadence | Canonical artifacts |
|----|----|----|----|----|
| 0 | **North Star — Purpose** | Why do we exist? | Almost never | `docs/constitution/NORTH_STAR_SSOT.md` §2.0 |
| 1 | **Foundational Principles** | What do we believe fundamentally true? | Very rarely | `docs/constitution/NORTH_STAR_SSOT.md` §2.1+ |
| 2 | **Constitutional Laws** | What must always happen? | Rarely, by amendment | `docs/constitution/NORTH_STAR_SSOT.md` §2.x, `data/constitutional-framework/REGISTRY.json` |
| 3 | **Constitutional Processes** | How do constitutional decisions occur? | Occasionally | `docs/constitution/CONSTITUTIONAL_PROCESSES.md` |
| 4 | **Organizational Governance** | Who decides and builds? | As needed | `BP_PRIORITY.json`, `COUNCIL` registry, office charters |
| 5 | **Operating Doctrine** | How do we currently execute? | Constantly | `docs/SSOT_COMPANION.md`, runbooks, `factory-staging/` blueprints |
| 6 | **Product Governance** | What is true for one product? | Per product | `docs/products/<id>/PRODUCT_HOME.md` + optional `GOVERNANCE.md` |
| 7 | **Implementation** | What did we actually ship? | Every commit | Code, prompts, schemas, APIs — no constitutional voice |

### Authority rules

- **Subordination.** Any conflict resolves upward. Level 7 code cannot override Level 2 law. Product Governance cannot override Organizational Governance or Constitutional Processes.
- **No jumps.** An item cannot claim authority at a level it has not earned through the promotion process.
- **Level 7 has no constitutional voice.** If implementation contradicts a higher authority, either the implementation is defective or the authority must be demoted through the demotion process.
- **Product Governance is optional.** A product may have stricter rules than the Constitution, but never looser or contradictory ones.

---

## 4. Knowledge Ladder (Maturity, Not Authority)

The framework's Knowledge Ladder maps closely to the operational Truth Ladder in `docs/SSOT_COMPANION.md` §0.8 (`L0 Observation` → `L1 Hypothesis` → `L2 Pattern` → `L3 Proven Practice` → `L4 Law` → `L5 Foundational Law`). The framework uses a more granular research-stage vocabulary (`Idea` → `Observation` → `Hypothesis` → `Emerging Pattern` → `Supported Principle` → `Candidate Law` → `Constitutional Law` → `Foundational Principle`), but both ladders enforce the same rule: promotion requires evidence and no silent jumps.

The Knowledge Ladder is a maturity scale, not an authority level. A statement can be mature knowledge without being company law.

```text
Idea
  ↓
Observation
  ↓
Hypothesis
  ↓
Emerging Pattern
  ↓
Supported Principle
  ↓
Candidate Law
  ↓
Constitutional Law
  ↓
Foundational Principle
```

### Promotion rules

- Nothing jumps a rung.
- Promotion requires evidence, replication, attempts at falsification, boundary conditions, and survival under independent challenge.
- A principle can be demoted at any time if evidence, scope limits, or changed conditions warrant it.
- Candidate principles and Laws of Success live in the **Constitutional Research Registry** until promoted.

---

## 5. Confidence and Evidence Model

Every constitutional statement carries at least four scores:

1. **epistemic_confidence_score** — how well the claim predicts reality.
2. **scope_confidence_score** — how certain we are about where and when the principle applies.
3. **enforcement_confidence_score** — how confident we are that the current enforcement mechanism actually protects the principle.
4. **constitutional_commitment_score** — how binding the organization has chosen to make the principle while it is active.

These scores must not be conflated. A strong principle may have a weak implementation. A weakly evidenced founder theory may be taken seriously at high research priority without being law.

### Scoring metadata

Every score must record:

- scoring method and rubric
- evidence basis
- scorer identity
- degree of disagreement
- uncertainty range
- date
- reason for change
- prior score and calibration history

### Error taxonomy

A principle can fail in different ways. The system must classify failures before acting:

- Truth failure
- Scope failure
- Causal failure
- Measurement failure
- Implementation failure
- Timing failure
- Population mismatch
- Ethical conflict
- Obsolescence

### Truth vs. usefulness

Some models are useful without being literally true. Principles may need separate ratings for:

- descriptive accuracy
- predictive value
- explanatory usefulness
- intervention usefulness
- risk of misinterpretation
- harm if treated literally

### Decision, process, outcome, and luck

The system evaluates:

- **Decision quality:** was the reasoning sound given what was knowable?
- **Process quality:** was the required process followed?
- **Outcome quality:** did the intended effect occur?
- **Calibration quality:** how well did predicted probabilities match reality?
- **Luck:** chance contributions must be separated from skill.

### Incentive calibration and counter-metrics

No metric is an end in itself. Every metric exists only insofar as it faithfully represents progress toward the organization's mission and remains validated by reality. For every metric the system must ask:

- Why are we measuring this?
- What behavior do we hope it encourages?
- What behavior might it accidentally encourage?
- What counter-metric protects the mission from optimization of the metric itself?
- Has reality shown the metric is still serving its intended purpose?

If the answer is no, the metric is recalibrated or retired. Examples of metric/counter-metric pairs include:

| Metric | Counter-metric |
|---|---|
| Speed | Quality |
| Cost reduction | User value |
| Bugs found | Bugs prevented |
| Features shipped | User outcomes |
| AI autonomy | Human trust |
| Engagement | Human flourishing / stated goals |

Detection and prevention are both measured. A builder who produces work that requires fewer downstream defects has performed better than one who merely finds defects in others' work.

---

## 6. Functions, Offices, and Office-holders

Three concepts must remain distinct:

- **Function:** a necessary capability or responsibility (e.g., challenge a decision, verify a claim, preserve memory).
- **Office:** a formally governed seat accountable for one or more functions (e.g., Office of the Chair, Office of Sentry, Office of Wisdom).
- **Office-holder:** the current model, human, team, or composite system entrusted with the office.

### Rules

- Authority belongs to the **office under its charter**, not inherently to the model or person currently occupying it.
- No office-holder acquires permanent authority by incumbency.
- An office may be merged, divided, or retired if the required constitutional functions remain protected.
- No measured entity may define, alter, or exclusively evaluate the metrics by which its own success is judged. Operations may satisfy this function through Sentry, independent evaluators, rotating reviewers, an audit function, or a dedicated office if reality shows one is needed. The constitutional requirement is the function, not the office title.
- Proposal, execution, and verification must be separable. A single office-holder that performs all three for a load-bearing decision must be labeled as a reduced-separation run and receive heightened review.
- Every office charter must include: purpose, authority boundaries, required capabilities, selection criteria, evaluation metrics, removal conditions, conflict-of-interest rules, and succession procedures.

---

## 7. Constitutional Registry and Research Registry

### Constitutional Registry

`data/constitutional-framework/REGISTRY.json` is the machine-readable authority registry. Each item includes:

- id, title, level, purpose
- epistemic_confidence_score, scope_confidence_score, enforcement_confidence_score, constitutional_commitment_score
- evidence_score, evidence_level, evidence_basis
- enforcement_status, enforcement_method
- promotion_date, last_challenge, last_review, review_cadence
- source_file, source_anchor
- related_items, supersedes, superseded_by
- open_questions, unresolved_dissent, reopening_triggers

### Constitutional Research Registry

`data/constitutional-framework/RESEARCH_REGISTRY.json` holds candidates and provisional theories. It is **not** governing authority.

- maturity_state: idea, observation, hypothesis, emerging_pattern, supported_principle, candidate_law
- triage_state: active, stalled, abandoned, ready_for_proposal
- evidence_score, research_priority, owner, next_evidentiary_action, deadline, reason_it_matters, closure_criteria

### Parity rule

There are three texts:

1. Human-readable constitutional text.
2. Machine-readable registry.
3. Runtime behavior.

Any disagreement among them is a constitutional defect. The human-readable text defines meaning; the registry defines structured metadata; runtime behavior implements the current interpretation. Divergence must fail visibly.

---

## 8. Processes

Detailed procedures are in `docs/constitution/CONSTITUTIONAL_PROCESSES.md`. This section states the requirements each process must satisfy.

### 8.1 Frame challenge and canonicalization before implementation

No independent reasoning begins until the question has undergone frame challenge. No execution begins until the resulting decision has been canonicalized.

#### Frame challenge

Frame challenge is a required step, not a prompt suggestion. It surfaces embedded assumptions, excluded alternatives, stakeholder framing, incentive effects, and whether "do nothing," "defer," "experiment," or "reframe" are legitimate options.

A frame-challenge record must answer:

- What question is actually being asked?
- What answer is implicitly assumed?
- What alternatives are excluded?
- Who benefits from this framing?
- Is the objective consistent with higher constitutional authority?
- What evidence supports the framing itself?

A load-bearing question may not proceed to independent reasoning without a frame-challenge record.

#### Canonicalization

No execution begins until a decision has:

- one canonical location
- one unambiguous scope
- one vocabulary
- explicit superseded material
- acceptance criteria
- named unresolved questions
- assigned owner and review trigger
- a dissent escrow with reopening triggers
- a prediction to be tested against reality

### 8.2 Amendment classes and anti-weakening protection

There are three classes of amendment:

1. **Ordinary amendment:** changes to Level 2–5 items.
2. **Protected-clause amendment:** changes to foundational commitments, human protections, truth protections, or the amendment process itself.
3. **Meta-amendment:** changes to the rules for changing the Constitution.

#### Ordinary amendment

Requires:

- independent review by qualified, unconflicted reviewers
- supermajority agreement of those entitled to vote
- founder approval if the item is within retained founder authority
- published reasoning and evidence
- a defined review period before final effect
- a dissent escrow

#### Protected-clause amendment

Weakens, removes, or materially reinterprets human dignity, truth, autonomy, or procedural protections. Requires:

- unanimity among qualified independent reviewers
- founder approval
- affected-party analysis
- two-stage approval separated by time and at least one review cycle
- explicit counterevidence and adversarial testing
- a higher burden than ordinary amendment

#### Meta-amendment

Requires at least the same burden as a protected-clause amendment and cannot be used in the same ratification sequence to amend substantive protections. A proposal may not weaken the amendment process and then use that weakened process to open the door to further changes. The lock may not be removed immediately before the door is opened.

#### Amendment asymmetry

- Weakening a human, truth, or procedural protection requires the highest burden.
- Strengthening a protection when credible harm is demonstrated may proceed under a lower but still high threshold.
- Burden is determined by the effect of the change, not by the title or proposer.

### 8.3 Promotion and demotion

- Promotion requires evidence, independent review, and a confidence score at or above the threshold for the target level.
- Demotion can be triggered by new evidence, failed predictions, scope violations, changed conditions, or successful challenge.
- Demotion preserves the item in the research registry with a failure classification.

### 8.4 Challenge

Any office-holder or affected party may challenge any item. A challenge must include:

- the specific claim in dispute
- the failure type (from the error taxonomy)
- evidence
- proposed remedy (amend, demote, scope-limit, or no change)

### 8.5 Review

Each level has a review cadence. A level whose confidence falls below threshold or whose last review exceeded its cadence enters mandatory review.

### 8.6 Retirement

An item may be retired when it is superseded, obsolete, or no longer applicable. Retirement is not deletion; it is a status change with a final record.

### 8.7 Emergency change

Emergency changes are narrowly scoped, reversible, time-bounded, and require immediate documentation. They must be reviewed for ratification or rollback within the emergency window.

### 8.8 Dispute resolution and impartial review

Constitutional disputes receive impartial review by an office or office-holder not party to the dispute. The reviewer may pause implementation, require additional evidence, recommend amendment or demotion, or refer the matter to the proper authority.

### 8.9 Enforcement

Every Level 2–6 item must have a named enforcement method. Common methods include:

- `preflight` gates (e.g., `builder:preflight`)
- runtime assertions
- audit checks
- office review
- public reporting

### 8.10 Case-law mechanism

Version 1.0 must include a case-law system even if the precedent log is initially empty. Each case records:

- constitutional question
- decision
- reasoning
- dissent
- precedent weight
- appeal or reconsideration path
- later reversal if any

### 8.12 Governance proportionality and latency balance

Governance effort must remain proportionate to:

- risk
- reversibility
- blast radius
- uncertainty
- novelty
- moral significance
- decision latency cost

A button-color decision should not receive the same council process as a major mental-health policy. The system must either use an already-approved shorter route or halt and name the latency blocker honestly.

### 8.11 Remedy and grievance

A Constitution without a remedy path is an aspiration. Every product and process must have a minimum viable remedy channel before it is used at scale.

The remedy system must specify:

- who can report a violation
- an accessible complaint channel
- an acknowledgment requirement
- a conflict-free investigation
- whether ongoing harm can be paused
- a response deadline
- an appeal path
- anti-retaliation protection
- a record of outcome
- correction or restitution where reasonably possible
- an institutional-learning entry
- how the affected person is made whole where possible
- whether the violation is publicly recorded

Activation may scale, but no product should launch without some functional grievance path.

---

## 9. Public Constitution

The **Public Constitution** is a human-readable document derived from this framework. It is the primary public-facing statement of governing law. It contains:

1. Purpose and North Star
2. Foundational principles
3. Universal obligations
4. Human protections
5. Truth and evidence commitments
6. Governance of power
7. Amendment and review
8. Enforcement, remedy, and accountability
9. Public transparency commitments
10. Founder authority and succession

The Public Constitution must be accessible, published, and versioned.

---

## 10. Operating Doctrine and Product Governance

### Operating Doctrine (Level 5)

Operating Doctrine contains the current functions, offices, office-holders, councils, pipelines, gates, and runbooks. It is expected to change frequently as the organization learns.

The Chair/Council/Builder/Sentry/Reality/Wisdom pipeline is operating doctrine, not constitutional law. The Constitution protects the properties those offices must satisfy; Operations designs the machinery.

### Product Governance (Level 6)

Product Governance is optional, product-specific, and subordinate. It may be stricter than the Constitution. It is mechanically checked against the Constitution through inheritance and parity tests.

Examples of product-level constitutional principles include the LifeOS `Service, Sovereignty & Epistemology Doctrine` (Serve, don't decide; Mirror; Be-Do-Have) and the Project Governance `AI Evaluation Governance Loop` (proposal → execution → verification → review → repair → score). These derive from the framework and may not weaken it.

A product cannot:

- declare itself exempt from the Constitution
- override higher authority
- hide conflicts from the registry

---

## 11. Implementation (Level 7)

Implementation includes code, prompts, schemas, APIs, databases, and files. Nothing at Level 7 has constitutional authority.

### Implementation rules

- Every `.js` file must include an `@ssot` tag pointing to its product `PRODUCT_HOME.md`.
- If code contradicts law, the law wins unless the law is demoted.
- Runtime behavior must be checkable against the registry and the Public Constitution.
- A parity test must exist and fail visibly on divergence.
- Shape-level evidence may establish existence. Only behavior-level evidence may establish enforcement. A route that returns 200 or a file that exports the right name is not enough; the system must also produce the required outcome and refuse the prohibited one under relevant conditions.

---

## 12. Founder Authority Under Constitutional Scrutiny

The Founder retains final decision authority in the areas expressly reserved to the Founder. That authority shall be exercised with a standing commitment to independent scrutiny, reasoned challenge, and the pursuit of genuine consensus.

### Retained founder powers

The public Constitution must disclose which decisions remain with the founder. Examples may include:

- final mission interpretation
- appointment or removal of office-holders
- rejection of financing or ownership changes
- product and strategic direction
- veto of constitutional amendments
- emergency action within explicit boundaries

### Powers the founder cannot exercise deceptively

The founder may not:

- relabel a founder decision as scientific consensus
- conceal or suppress dissent
- fabricate verification
- retroactively alter a rule to justify completed conduct
- determine by authority alone that a disputed factual claim is true

### Consensus as default

For constitutional, ethical, mission-level, irreversible, or materially high-impact decisions, the Founder shall provide the proposed action, intended purpose, known evidence, material assumptions, and relevant motivations for independent review. Advisors and offices must be free to challenge framing, reasoning, evidence, risks, and foreseeable consequences without retaliation or pressure to manufacture agreement.

Consensus is the preferred outcome but shall not be falsely declared.

### Founder-directed decisions without full consensus

When the Founder proceeds without full consensus, the decision must be recorded as a **Founder-Directed Decision Without Full Consensus** and must preserve:

- the Founder’s reasoning and intended outcome
- the evidence supporting the decision
- the unresolved objections and dissenting analysis
- the risks knowingly accepted
- the predictions of supporters and dissenters
- the conditions that would require reconsideration, suspension, or reversal
- the date or event that triggers formal review

It cannot be recorded as council consensus or established truth.

### Three acts the founder may perform

- **Constitutional action:** consistent with existing constitutional law.
- **Founder exception:** a specific, narrow, time-bound or review-bound departure from ordinary operations or doctrine, identified as such and non-precedential unless later ratified.
- **Constitutional amendment:** a permanent change to governing law through the amendment process.

A one-time founder exception must not silently become precedent or constitutional law merely because it happened.

### Reality as final arbiter

The Founder may determine what action the organization takes within retained authority. The Founder may not determine, by authority alone, that a disputed factual claim is true, that consensus existed, that verification succeeded, or that reality confirmed the decision. Reality remains the final arbiter of descriptive and predictive claims. Decisions made over unresolved dissent receive heightened observation, prediction-versus-outcome review, and explicit calibration of both the Founder’s judgment and the advising process.

### Digital Twin and founder-pattern analysis

Patterns identified through Founder decisions may be incorporated into the Founder’s Digital Twin to improve future reasoning, expose recurring blind spots, and design compensating safeguards. Such analysis shall be used to strengthen the Founder and the organization, never to manipulate, humiliate, secretly bypass, or illegitimately remove the Founder’s lawful authority.

### Succession

The public Constitution must disclose how a successor founder or controller is selected and governed, and what constitutional constraints bind them from day one. Pending that decision, the framework preserves this requirement as an unresolved item.

### Emergency powers

The public Constitution must disclose whether founder powers differ during an emergency, under what conditions and for how long the founder may bypass ordinary process, what mandatory review window applies, and what numeric limits or cooling-off rules prevent emergency creep.

---

## 13. Rule-of-Law Guarantees

The Constitution must guarantee:

- **Publication and accessibility:** all governing documents are published and versioned.
- **Clarity:** rules are stated in language understandable to affected parties.
- **Effective dates:** rules take effect only after publication, except narrowly scoped emergency measures.
- **Non-retroactivity:** new rules do not punish or penalize past conduct, unless explicitly and narrowly justified.
- **Consistent application:** like cases are treated alike.
- **Conflict-of-interest controls:** decision-makers must declare and recuse when conflicted.
- **Impartial review:** constitutional disputes receive review by an unconflicted office or office-holder.
- **Challenge rights:** affected parties have a path to raise constitutional objections.
- **Three kinds of compliance:** textual compliance (the document contains the required language), procedural compliance (the required process was followed), and substantive compliance (the process actually protected the intended human or organizational good). Compliance with form or procedure does not cure a substantive violation of a higher constitutional principle.

---

## 14. Affected-Party Participation

People materially affected by a decision must have a meaningful path for their experiences, harms, needs, and objections to enter the decision process. The form of participation must be proportional to the decision’s impact, risk, and scale.

Forms may include:

- user councils
- practitioner panels
- independent experts
- public consultation
- grievance evidence
- surveys
- direct representation

A universal public vote on every principle is not required.

### Steering objections

A person who believes the system is steering them toward an outcome they did not choose must be able to object. A steering objection triggers review of:

- the stated user goal
- whether the system substituted its own value
- whether persuasive tactics exceeded the authorized relationship
- whether the user was presented meaningful alternatives
- whether the personalization system exploited a vulnerability

"User-perceived autonomy" is a protected counter-metric. A product that increases completion at the expense of autonomy is not automatically improving.

---

## 15. Provisional, Emergency, and Temporary Measures

Every provisional law, emergency rule, or temporary office must include:

- expiration date or review trigger
- success criteria
- failure criteria
- default outcome if review never happens
- narrow scope and reversibility

No temporary measure becomes permanent by default. The default outcome for a missed review is **sunset or rollback** unless an explicit extension is approved before the deadline.

---

## 16. Synthesis, Selection, and Continued Pluralism

For some questions, synthesis is impossible or destructive. The decision protocol must allow three outcomes:

1. **Synthesis:** a combined proposal stronger than any individual position.
2. **Selection:** one position is chosen and the other is rejected.
3. **Continued pluralism:** two or more models are preserved and tested separately.

"Combine everything" is not a sacred process.

---

## 17. Dissent Escrow

Every canonical decision must preserve:

- unresolved objections
- dissenting predictions
- minority alternatives
- reopening triggers

Dissent is not an obstacle; it is a future sensor. A decision should state the conditions under which it must be reopened.

---

## 18. Legal Embodiment and Staged Accountability

The Constitution is distinct from corporate bylaws, shareholder rights, financing documents, and applicable law. They must align, but they serve different functions.

The Constitution must state which provisions must later be embodied in legally enforceable instruments and the activation triggers for doing so. Activation triggers include:

- scale
- impact
- risk
- number of users
- data sensitivity
- capability
- funding

Accountability mechanisms must scale proportionally. A startup without funding cannot immediately support a giant external institution, but it must not pretend it already has one.

---

## 19. Public Transparency Commitments

The organization commits to:

- publishing the Public Constitution
- publishing the authority registry in human-readable form
- reporting confidence score changes and major challenges
- publishing an annual constitutional health report
- making grievance and remedy procedures accessible
- disclosing known gaps between human text, registry, and runtime

---

## 20. Adversarial Ratification Suite

Before ratification, the framework must be tested against scenarios including:

- a founder demanding an exception for profit
- an office-holder hiding evidence
- several models converging on a biased premise
- a product claiming emergency authority
- an ethical protection blocking a lucrative transaction
- a registry score being manipulated
- a harmful policy presented as temporary
- a future controller attempting to amend the amendment process
- a popular metric displacing the underlying purpose
- a strong law being applied to a population where it is harmful

Each scenario must produce a documented, fail-visible outcome.

---

## 21. Unresolved Decisions

Unresolved decisions are recorded in `docs/constitution/CONSTITUTIONAL_FRAMEWORK_v1_UNRESOLVED.md`.

---

## 22. Transition and Versioning

This document is Version 1.0, PROPOSED. When ratified, it becomes `RATIFIED` and supersedes the working draft. Until then, `docs/constitution/NORTH_STAR_SSOT.md` remains the supreme operational law for the system.

---

## 23. Meta-Architecture Constitutional Amendments (v1.1)

These amendments ratify the architecture that emerged from the 2026-08-02 convergence. They are not new laws added lightly; they are the organizing principles that make the preceding sections enforceable and the institution learnable.

### 23.1 Guardianship of Intention and the Identity of Taloa

Taloa is a constitutional learning institution whose purpose is to continuously improve humanity's and aligned AI's understanding of reality in service of human flourishing.

BuilderOS, LifeOS, KidsOS, MarriageOS, CareerOS, HealthOS, Solomon, the Twin, the Constitution, governance, and every product are infrastructure. They are roads and bridges. The destination is helping people become more fully themselves, reducing unnecessary suffering, and increasing wisdom, agency, love, trust, and flourishing for humans and aligned AI together.

The Constitution protects the relationship between intention and reality. If a beloved piece of governance or product no longer serves the mission, the Constitution should encourage replacing it.

### 23.2 Design Equation

Three forces keep Taloa aligned:

- **Intent determines direction.**
- **Governance determines reliability.**
- **Reality determines results.**

No amount of governance can correct a misaligned intent. No amount of good intent can substitute for reality. Reality is the final integrator and the institution's immune system.

### 23.3 Constitutional Test

Every constitutional amendment, governance mechanism, product, and engine must demonstrate how it advances the North Star. Governance exists only in service of the mission.

### 23.4 Core Foundational Commitments

The following commitments are added to the Foundational Commitments:

1. **Understanding precedes influence. Influence serves empowerment. Empowerment serves the mission.**
2. **No office is the source of truth.** Every office is a perspective attempting to understand reality. Reality determines which understanding was more accurate.
3. **Independent judgment precedes shared judgment.** Whenever practical, each office must reason independently on the same evidence before seeing another office's recommendation. Convergence is more valuable when it results from independent thought than from early influence.
4. **Confidence, not certainty.** The system stores calibrated confidence and is open to revision by reality.
5. **Epistemological humility and the promotion ladder.** Observations, inferences, hypotheses, models, principles, laws, and constitutional principles have different promotion criteria and different confidence requirements. Promotion requires evidence; demotion requires never silence.
6. **Reality Alignment.** The system distinguishes observed, experienced, remembered, predicted, and shared reality, and explains drift rather than forcing a single view.
7. **Empowerment over dependence.** The system increases human agency, judgment, capability, ownership, and wisdom. It optimizes for the user's long-term capacity to solve tomorrow's problems without the system.
8. **Earned Guidance.** The system demonstrates understanding before attempting influence. "Feel understood" is the mechanism by which influence is earned.
9. **Mission Alignment Filter.** Effectiveness alone is not enough. Manipulation, fear, addiction, outrage, and surveillance are unconstitutional means.
10. **Institutional Humility.** Confidence is a measure of uncertainty, not a substitute for continued testing.

### 23.5 Solomon's Charter

Solomon does not govern. Solomon does not execute. Solomon does not ratify. Solomon does not become the source of truth.

Solomon exists to pursue wisdom through disciplined understanding and to present its findings to the institution.

For major decisions, Solomon gathers evidence, expands perspectives, evaluates long-term implications, compares competing models, identifies relevant constitutional principles, produces a recommended course of action, and records its confidence, assumptions, uncertainties, and reasoning.

Solomon withholds its recommendation until the Chair has independently reasoned and recorded a preliminary decision on the same evidence package. After both are committed, recommendations are revealed, compared, and calibrated against reality.

### 23.6 Chair–Solomon–Reality Calibration

The Chair and Solomon reason independently on the same evidence. Their reasoning, recommendations, and the actual outcome are compared. Reality determines which model better predicted the outcome. Both offices learn. Disagreement is a learning signal, not a governance failure.

### 23.7 The Chair Requests Understanding, Not Obedience

The Chair should never ask Solomon for an answer. The Chair asks Solomon for findings, implications, competing models, assumptions, uncertainties, constitutional tensions, and a recommended course. The Chair retains decision authority and is accountable to reality.

### 23.8 Incentive Recalibration

Any governance system — including Taloa's own — will optimize for its incentives. Incentives themselves must be continuously observed, measured, and recalibrated against the mission.

### 23.9 Least Invasive Intervention

Early risk detection and all safety systems optimize for the least invasive intervention capable of reducing risk. Agency is preserved unless a higher duty clearly outweighs it.

### 23.10 Builder Simplicity and Anti-Expansion

The Builder faithfully implements the Constitution and governance while minimizing unnecessary complexity. When multiple implementations satisfy the same constitutional intent, prefer the simplest one that preserves future adaptability.

Do not continue expanding the architecture unless reality demonstrates a missing capability. Prefer discovering deeper unifying principles over creating additional systems. Complexity is civilization debt.

### 23.11 The Human Constellation Is Canonical

The Adaptive Human Model, LifeOS, MarriageOS, KidsOS, BusinessOS, HealthOS, and CareerOS are projections of the same Human Constellation. If Builder finds itself duplicating person understanding, it is violating the architecture. The Learning Architecture owns the canonical person model; products consume it.

### 23.12 Quality of Questions

Taloa improves the quality of questions. The coaching protocol, earned guidance, perspective expansion, readiness, avoidance detection, and the Human Constellation are not primarily about generating answers. They are about helping someone ask a better question than they were capable of asking five minutes ago. That is empowerment.
