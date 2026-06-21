<!-- SYNOPSIS: BUILDEROS REMEDIATION BLUEPRINT -->

# BUILDEROS REMEDIATION BLUEPRINT

**Project key:** `builderos-remediation`  
**Status:** `DRAFT`  
**Owner:** Adam  
**Verifier:** OIL / PBB / Codex audit  
**Priority:** runtime truth > authority coherence > pre-commit governance > autonomous continuity

---

## 0. Purpose

This package fixes the exact BuilderOS system issues found in the full-system audit:

1. constitutional naming drift between BuilderOS and TSOS
2. fake-green Alpha reporting while runtime proof is stale
3. post-commit verification gap in the Builder repair loop
4. memory authority fragmentation and wrong proof-source scoring
5. TSOS maturity overclaim from generic token telemetry
6. brittle build-pipeline path resolution
7. missing structural proof freshness for duplicate/legacy authority paths

This is not a product build package.

It does not build:

- LifeOS product features
- TSOS customer-facing product features
- UI polish
- new autonomous schedulers
- broad rewrites

---

## 1. Core Principle

BuilderOS must not claim autonomy from docs, partial runtime, or stale proof.

BuilderOS must become a governed machine that:

- detects drift
- classifies it
- authorizes bounded work
- verifies before claiming success
- writes receipts
- learns from failure
- continues useful work without Adam handling routine operations

---

## 2. Canonical System Boundary

### 2.1 BuilderOS
Internal autonomous programming machine.

Includes:

- Builder
- OIL
- Council AI
- Memory used by BuilderOS
- PB/PBB execution authority
- proof freshness
- self-repair
- prevention hooks
- telemetry
- overnight runner
- Command Center cockpit

### 2.2 TSOS
External AI efficiency/routing product.

BuilderOS may consume bounded internal TSOS-facing hooks, but TSOS is not the autonomous machine.

### 2.3 LifeOS
Customer-facing product built by BuilderOS.

LifeOS product features do not raise BuilderOS maturity unless they directly prove BuilderOS capability.

---

## 3. Findings This Package Repairs

### BR-01 Constitutional Authority Drift

Conflict:

- `docs/SSOT_NORTH_STAR.md` names TSOS as the unified platform
- `docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md` names BuilderOS as the autonomous machine

Required outcome:

- one canonical machine identity
- one product/system separation model
- no agent can honestly infer the wrong machine name from top-level docs

### BR-02 Fake-Green Alpha Status

Conflict:

- live runtime can be `STALE`
- supervised readiness can be `false`
- `system-alpha-readiness` can still report `ALPHA_READY`

Required outcome:

- stale proof or readiness false hard-blocks `ALPHA_READY`
- docs and scoring never outrank live truth

### BR-03 Post-Commit Verification Gap

Conflict:

- current governed loop can commit
- then verify
- then retry

Required outcome:

- verifier and OIL gate run before final commit claim
- first-pass bad output never lands as a “successful” commit

### BR-04 Memory Authority Fragmentation

Conflict:

- BuilderOS scores memory from `self_repair_memory_events`
- actual governed memory architecture spans Amendment 39 + memory capsules + legacy memory

Required outcome:

- one canonical BuilderOS memory proof contract
- legacy memory explicitly non-canonical
- BuilderOS memory maturity tied to the governed path, not a convenience table

### BR-05 TSOS Boundary Overclaim

Conflict:

- generic token telemetry is being used as proof of BuilderOS-internal TSOS hook maturity

Required outcome:

- dedicated internal TSOS hook proof boundary
- no maturity inflation from token-estimated telemetry alone

### BR-06 Build Pipeline Path Fragility

Conflict:

- build pipeline root resolution uses file-path join logic that is brittle

Required outcome:

- deterministic repo-root/script resolution locally and on Railway

### BR-07 Structural Drift Blindness

Conflict:

- duplicate and legacy authority paths can stay live without a canonical runtime drift proof

Required outcome:

- blueprint-vs-runtime structural proof
- duplicate authority paths visible at runtime
- legacy/live conflicts surfaced as fake-green risks or blockers

---

## 4. Runtime Truth Sources

Only these count as runtime proof for this package:

1. `GET /api/v1/lifeos/builder/ready`
2. `GET /api/v1/lifeos/command-center/proof-freshness`
3. `GET /api/v1/lifeos/command-center/supervised-autonomy/readiness`
4. `GET /api/v1/lifeos/command-center/self-repair/repair-queue`
5. `GET /api/v1/lifeos/command-center/system-alpha-readiness`
6. `GET /api/v1/lifeos/command-center/memory/status`
7. `GET /api/v1/memory/health`
8. `GET /api/v1/lifeos/builderos/tsos-efficiency`
9. `GET /api/v1/lifeos/autonomous-telemetry/efficiency`
10. approved DB receipts/logs when tied to live runtime claims

Supporting-only sources:

- SSOT docs
- manifests
- repo inspection
- overlays
- local scripts

Docs alone earn zero runtime maturity.

---

## 5. Build Phases

### Phase 1 — Constitutional Alignment

Create one ratified BuilderOS/TSOS/LifeOS separation across top-level docs.

Inputs:

- `docs/SSOT_NORTH_STAR.md`
- `docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md`
- current BuilderOS runtime routes

Outputs:

- one canonical machine identity
- one product/system separation rule
- amendment/receipt trail

Pass:

- no top-level doc still defines TSOS as the autonomous machine

Fail:

- any SSOT still leaves machine identity ambiguous

### Phase 2 — Alpha Truth Hardening

Make readiness fail closed.

Inputs:

- live proof freshness
- live supervised readiness
- repair queue
- current `services/builderos-system-alpha-readiness.js`

Outputs:

- `ALPHA_READY` impossible when stale or not ready
- blockers reflect live proof truth

Pass:

- stale runtime returns non-ready status every time

Fail:

- any stale runtime can still surface as `ALPHA_READY`

### Phase 3 — Build Pipeline Path Repair

Repair root/script resolution before deeper loop wiring.

Inputs:

- `services/builderos-build-pipeline.js`

Outputs:

- deterministic root resolution

Pass:

- verifier/scan script paths resolve in local and Railway-equivalent runs

### Phase 4 — Pre-Commit Governance Gate

Move verifier and OIL gating before final commit claim.

Inputs:

- current build route
- current build pipeline
- governed loop executor

Outputs:

- wrapper service for canonical pre-commit governance
- tiny route patch to consume wrapper

Pass:

- bad output never lands with `committed:true`
- retry happens before commit

Fail:

- any failed verifier path can still commit first

### Phase 5 — Memory Authority Consolidation

Define one BuilderOS memory proof contract.

Inputs:

- Amendment 02
- Amendment 39
- memory capsule routes
- BuilderOS memory status path

Outputs:

- canonical memory proof source for BuilderOS scoring
- explicit role for legacy memory

Pass:

- BuilderOS memory is not scored from `self_repair_memory_events` alone

### Phase 6 — TSOS Hook Boundary Proof

Define actual internal TSOS hook maturity.

Inputs:

- TSOS efficiency route
- telemetry routes
- BuilderOS alpha scoring

Outputs:

- explicit internal hook definition
- honest maturity scoring

Pass:

- token telemetry alone cannot prove TSOS internal hook maturity

### Phase 7 — Structural Proof Freshness

Add runtime drift proof for topology and authority duplication.

Inputs:

- BuilderOS structural consolidation docs
- runtime mounted routes
- canonical authority map

Outputs:

- structural proof report/service
- duplicate authority paths exposed in runtime truth

Pass:

- duplicate command center / memory / proof paths are visible in runtime truth

### Phase 8 — Autonomous Build Readiness Certification

Re-run BuilderOS Alpha only after Phases 1–7 land.

Pass only if:

1. constitutional identity is coherent
2. stale proof cannot report ready
3. bad first-pass builds do not commit
4. memory proof source is canonical
5. TSOS maturity is honest
6. structural drift is visible
7. useful-work-guard coverage remains a gate
8. overnight/runtime truth still holds

---

## 6. Stop Conditions

Halt this package if:

- PBB finds a system/product intent ambiguity that changes mission
- any phase requires broad rewrite instead of bounded repair
- runtime truth contradicts the intended fix
- a proposed fix expands into LifeOS/TSOS product work
- pre-commit governance cannot be inserted without architectural escalation

---

## 7. Out of Scope

Do not add in this package:

- full component rewind execution
- product command center redesign
- new product lanes
- new memory philosophy
- autonomous deletion/archive migration
- TSOS customer delivery surfaces

---

## 8. Success Condition

This package succeeds when BuilderOS can honestly say:

“Our machine identity is coherent, our alpha status is fail-closed, our build loop verifies before commit, our memory proof source is canonical, our TSOS boundary is honest, and our structural drift is visible in runtime truth.”

