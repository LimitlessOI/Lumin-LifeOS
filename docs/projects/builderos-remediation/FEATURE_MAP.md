<!-- SYNOPSIS: BUILDEROS REMEDIATION FEATURE MAP -->

# BUILDEROS REMEDIATION FEATURE MAP

**Project key:** `builderos-remediation`

---

## Feature Set

### BR-F01 — Constitutional Machine Identity

Purpose:

- unify BuilderOS vs TSOS vs LifeOS definitions

Includes:

- SSOT alignment
- BuilderOS blueprint alignment
- one canonical machine vocabulary

Excludes:

- product rebranding
- TSOS product redesign

### BR-F02 — Fail-Closed Alpha Readiness

Purpose:

- prevent `ALPHA_READY` when runtime proof is stale or readiness is false

Includes:

- hard readiness gates
- blocker escalation from live proof
- honest percent vs status separation

### BR-F03 — Build Pipeline Root Stability

Purpose:

- make Builder verifier/script resolution deterministic

Includes:

- dirname-based root calculation
- local/Railway-safe script pathing

### BR-F04 — Pre-Commit Governance Wrapper

Purpose:

- create one canonical pre-commit BuilderOS gate

Includes:

- syntax gate
- anti-pattern gate
- stub/runtime verifier
- retry-once decision
- OIL gate result

Outputs:

- `allow_commit`
- `retry_once`
- `block_commit`

### BR-F05 — Builder Route Enforcement Patch

Purpose:

- make `/builder/build` consume the wrapper with minimal route change

Includes:

- tiny route patch only
- no large rewrite

### BR-F06 — Canonical BuilderOS Memory Proof

Purpose:

- score BuilderOS memory from the governed path, not convenience tables

Includes:

- canonical runtime proof definition
- Amendment 02 / 39 role clarification
- legacy path demotion for scoring

### BR-F07 — TSOS Internal Hook Boundary

Purpose:

- define real BuilderOS-internal TSOS proof boundary

Includes:

- canonical proof source
- honest maturity state

Excludes:

- TSOS customer features

### BR-F08 — Structural Proof Freshness

Purpose:

- compare expected BuilderOS structure vs live runtime

Includes:

- duplicate authority detection
- legacy/live conflict detection
- blueprint/runtime drift reporting

### BR-F09 — Remediation Certification Pass

Purpose:

- rerun BuilderOS system truth after all repairs

Includes:

- proof freshness
- readiness
- alpha readiness
- repair queue
- memory proof
- TSOS hook proof

---

## Dependency Order

1. `BR-F01`
2. `BR-F02`
3. `BR-F03`
4. `BR-F04`
5. `BR-F05`
6. `BR-F06`
7. `BR-F07`
8. `BR-F08`
9. `BR-F09`

---

## Risk Map

### High Risk

- `BR-F01`
- `BR-F02`
- `BR-F04`
- `BR-F05`

Reason:

- these affect constitutional authority, reported system truth, and commit safety

### Medium Risk

- `BR-F06`
- `BR-F07`
- `BR-F08`

Reason:

- these affect maturity honesty and structural drift visibility

### Low Risk

- `BR-F03`
- `BR-F09`

Reason:

- narrow repair or verification-only work

