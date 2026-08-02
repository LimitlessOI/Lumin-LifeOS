<!-- SYNOPSIS: Unresolved decisions for CONSTITUTIONAL_FRAMEWORK_v1.md. Not ratified. -->

# Constitutional Framework v1.0 — Unresolved Decisions

These questions are deliberately left open in the proposed framework. They must be resolved before ratification or explicitly deferred with an owner and a reopening trigger.

| ID | Topic | Status | Why unresolved | Next step |
|---|---|---|---|---|
| UD-1 | Amendment thresholds | **Ratification blocker** | The principle of escalating burden is agreed; numeric thresholds depend on council composition, which is not yet fixed. | Propose thresholds after council composition and office-holder selection rules are designed. |
| UD-2 | Independent review office | **Ratification blocker** | The function is identified; the specific office and selection mechanism require an organizational design pass. | Define the Office of Constitutional Review charter. |
| UD-3 | Scoring rubrics and calibration ledger | Operational design | The framework requires scores; the scoring process and ledger schema need a separate technical design. | Draft `data/constitutional-framework/SCORING_RUBRIC_V1.md` and implement the calibration ledger before scores are used to block or permit action. |
| UD-4 | Founder emergency powers | **Ratification blocker** | The founder retains authority; emergency boundaries must be explicit to prevent creep. | Add a Founder Emergency Powers clause to the Public Constitution with numeric limits and a cooling-off review. |
| UD-5 | Succession mechanism | **Ratification blocker** (may be deferred with trigger) | Tightly linked to corporate structure and ownership, which is outside the current design scope. | Resolve in conjunction with legal embodiment (§18); if not resolved, add a mandatory trigger to define it. |
| UD-6 | Public participation mechanisms | Operational design | Participation is proportional to impact; thresholds need operational definitions. | Draft a Product Governance participation matrix and public-participation impact statement template. |
| UD-7 | Legal entity and fiduciary form | Activation threshold | Requires legal advice and founder decision. | Mark as deferred to legal embodiment stage (§18) with measurable triggers (first equity, first employee, first licensed deployment, defined user/revenue threshold, etc.). |
| UD-8 | Runtime parity test implementation | **Ratification blocker** | Technical enforcement mechanism; depends on registry schema and runtime instrumentation. | Design the `verify-constitutional-parity` gate and wire it into `builder:preflight`. |
| UD-9 | Adversarial ratification suite execution | **Ratification blocker** | The suite is described conceptually; the execution playbook is not yet written. | Create `scripts/constitutional-adversarial-ratification.mjs` and execute it. |
| UD-10 | First Public Constitution content | Post-ratification deliverable | The framework is drafted first; the Public Constitution is derived from it in a separate step. | After framework ratification, draft the Public Constitution v1.0. |

## Detailed entries

### UD-1: Amendment thresholds

**Question:** What are the exact supermajority or unanimity thresholds for ordinary, protected-clause, and meta-amendments?

### UD-2: Independent review office

**Question:** Which office or office-holder conducts impartial constitutional review, and how is it insulated from founder or builder influence?

### UD-3: Scoring rubrics and calibration ledger

**Question:** What is the exact rubric for converting evidence into the four confidence scores? Where is the calibration ledger stored and who maintains it?

### UD-4: Founder emergency powers

**Question:** Under what conditions and for how long can the founder bypass ordinary process in an emergency? What is the mandatory review window and what numeric limits prevent emergency creep?

### UD-5: Succession mechanism

**Question:** How is a successor founder or controller selected, and what constitutional constraints bind them from day one?

### UD-6: Public participation mechanisms

**Question:** For which decisions are user councils, practitioner panels, public consultation, or grievance evidence required? What quorum or representativeness standard applies?

### UD-7: Legal entity and fiduciary form

**Question:** Will the organization adopt a public-benefit corporation structure, a trust, a charter-based non-profit, or another form? Which constitutional provisions will be legally enforceable and when?

### UD-8: Runtime parity test implementation

**Question:** What is the specific test that detects divergence among human text, registry, and runtime behavior, and what happens when it fails?

### UD-9: Adversarial ratification suite execution

**Question:** Who runs the adversarial scenarios, how are they scored, and what counts as a pass?

### UD-10: First Public Constitution content

**Question:** Which items from `NORTH_STAR_SSOT.md` and this framework are included in the first Public Constitution, and which remain in the internal framework?

---

## Phase 0 Ratification Blocker Resolutions

| ID | Status | Resolution | Reference |
|---|---|---|---|
| UD-1 | **Closed with defaults** | Default amendment thresholds proposed for ordinary, protected-clause, and meta-amendments. Subject to ratification and council composition. | `CONSTITUTIONAL_FRAMEWORK_v1.md` §24.1 |
| UD-2 | **Closed with default charter** | Office of Independent Review charter defined; temporary appointment process specified until council composition is ratified. | `CONSTITUTIONAL_FRAMEWORK_v1.md` §24.2 |
| UD-4 | **Closed with numeric limits** | Founder emergency powers bounded to 72 hours, protected-clause override prohibited, mandatory review, 14-day cumulative cap per 90 days. | `CONSTITUTIONAL_FRAMEWORK_v1.md` §24.3 |
| UD-5 | **Deferred with trigger** | Formal succession plan required before first equity, first non-founder FTE, first regulated licensed deployment, $1M revenue, or 30-day founder incapacity. | `CONSTITUTIONAL_FRAMEWORK_v1.md` §24.4 |
| UD-8 | **Closed** | `scripts/verify-constitutional-parity.mjs` implemented and wired into `npm run builder:preflight`. | `CONSTITUTIONAL_FRAMEWORK_v1.md` §24.5 |
| UD-9 | **Closed** | `scripts/adversarial-ratification-suite.mjs` executed and passing; report generated. | `CONSTITUTIONAL_FRAMEWORK_v1.md` §24.6 |
