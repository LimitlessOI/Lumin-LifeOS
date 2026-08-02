<!-- SYNOPSIS: Phase 0 intro blueprint — the first buildable slice of the meta-architecture. -->

# Phase 0 Intro Blueprint — Constitutional Clarity and Enforcement

**Status:** PROPOSED / builder-ready blueprint — not ratified  
**Source:** `docs/constitution/proposals/2026-08-02-ARCHITECTURE-CLASSIFICATION.md` (Adam consensus, 2026-08-02)  
**Purpose:** turn the stable meta-architecture into the first concrete implementation: a machine-readable enforcement layer for the existing Constitution, a clean way to draft the 13 candidates into `CONSTITUTIONAL_FRAMEWORK_v1.md`, and a North Star amendment proposal.

---

## 1. What Phase 0 proves

Phase 0 does not build products. It proves that the Constitution can be observed, verified, and improved. The deliverables are:

1. **Constitutional Enforcement Matrix** — a machine-readable map from every current law to the script or process that verifies it.
2. **Generator script** — `scripts/generate-constitutional-enforcement-matrix.mjs` — regenerates the matrix from `data/constitutional-framework/REGISTRY.json` as the Constitution evolves.
3. **Candidate drafting** — the 13 constitutional candidates from the meta-architecture are written into `CONSTITUTIONAL_FRAMEWORK_v1.md` as a proposed v1.1.
4. **North Star amendment proposal** — a separate `NORTH_STAR_SSOT.md` amendment document, not wired into the canonical file until ratification.
5. **Adversarial ratification suite** — a set of red-team tests run against the drafted framework before any runtime enforcement is enabled.

---

## 2. Build order (smallest dependency first)

### 2.1 Enforcement Matrix and generator (in progress)

- **Done:** `scripts/generate-constitutional-enforcement-matrix.mjs` created.
- **Done:** `data/constitutional-framework/proposals/ENFORCEMENT_MATRIX_PROPOSED.json` generated from the canonical registry (103 entries).
- **Remaining:** review verifier mappings, add missing source anchors, and ratify the matrix as `data/constitutional-framework/ENFORCEMENT_MATRIX.json`.

### 2.2 Draft the 13 candidates into `CONSTITUTIONAL_FRAMEWORK_v1.md`

Create `CONSTITUTIONAL_FRAMEWORK_v1.1.md` (or a marked v1.1 section inside `CONSTITUTIONAL_FRAMEWORK_v1.md`) containing:

1. Guardianship of Intention
2. Epistemology principle
3. Reality Alignment
4. Empowerment Principle
5. Earned Guidance Principle
6. Incentive Recalibration Principle
7. Mission Alignment Filter
8. Institutional Humility
9. Least invasive intervention
10. "Understanding precedes influence. Influence serves empowerment. Empowerment serves the mission."
11. No office is the source of truth
12. Independent judgment precedes shared judgment
13. Builder Simplicity Principle

### 2.3 Close the 6 v1.0 ratification blockers

From `docs/constitution/UNRESOLVED.md` (or equivalent):

- UD-1: amendment thresholds
- UD-2: independent review office charter
- UD-4: founder emergency powers numeric limits
- UD-5: succession mechanism
- UD-8: runtime parity test implementation
- UD-9: adversarial ratification suite execution

### 2.4 Prepare `NORTH_STAR_SSOT.md` amendment proposal

Produce `docs/constitution/proposals/2026-08-02-NORTH_STAR_AMENDMENT.md` containing the mission re-articulation (human + aligned AI flourishing) and the Intent / Governance / Reality equation. Do not modify `NORTH_STAR_SSOT.md` until ratification.

### 2.5 Run adversarial ratification suite

Execute the red-team and adversarial tests. Capture findings. Iterate. Only then move to Phase 1.

---

## 3. Acceptance criteria for Phase 0

- `npm run builder:preflight` passes.
- `npm run lifeos:bp-priority:verify` passes.
- The Enforcement Matrix can be regenerated deterministically by `node scripts/generate-constitutional-enforcement-matrix.mjs`.
- Every item in the canonical registry has a proposed verifier.
- The 13 constitutional candidates are written into a proposed framework update.
- The 6 v1.0 ratification blockers are either closed or explicitly deferred with justification.
- The North Star amendment proposal exists as a separate document, not yet wired into the canonical file.
- Adversarial suite runs and all findings are recorded.

---

## 4. What Phase 0 does NOT do

- It does not build the Reality Alignment Engine, Adaptive Human Model, or LifeOS coaching protocol (Phase 1).
- It does not implement early risk detection, crisis protocols, or Solomon Wisdom Laboratory (Phase 2).
- It does not implement BuilderOS self-improvement engines (Phase 3).
- It does not ratify anything. All outputs remain `PROPOSED` until Adam orders ratification.

---

## 5. Design principles for Phase 0

- **Builder Simplicity:** use the simplest implementation that preserves future adaptability. The generator script is one example: one source of truth (the registry), one derived artifact (the matrix).
- **No office is the source of truth:** the matrix is generated from the registry, not hand-authored, so the registry remains the canonical source and the matrix can be regenerated when reality changes.
- **Independent judgment precedes shared judgment:** the Phase 0 artifacts are reviewed by the Chair, Solomon, and Independent Review before ratification.
- **Do not expand the architecture unless reality demonstrates a missing capability:** Phase 0 intentionally does not add new engines. It makes the existing Constitution enforceable and observable.

---

## 6. Unresolved decisions carried into Phase 0

See `docs/constitution/proposals/2026-08-02-ARCHITECTURE-CLASSIFICATION.md` §7. The most urgent for Phase 0 are:

- AC-1: Should the North Star amendment be drafted now? (Default: yes, as a proposal.)
- AC-2: Which candidates go into v1.0 vs. v1.1? (Default: all 13 into a proposed v1.1 update.)
- AC-10: What triggers the blind independent-reasoning protocol, and how are preliminary decisions recorded immutably?
- AC-11: How are Chair–Solomon disagreements resolved without either becoming the default authority?

---

## 7. Next step

Review the generated Enforcement Matrix and generator script. If acceptable, proceed to draft the 13 candidates into `CONSTITUTIONAL_FRAMEWORK_v1.md` and prepare the North Star amendment proposal.
