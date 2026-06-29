<!-- SYNOPSIS: BUILDEROS STRUCTURAL CONSOLIDATION BLUEPRINT -->

# BUILDEROS STRUCTURAL CONSOLIDATION BLUEPRINT

**Status:** `DRAFT`  
**Owner:** Adam  
**Verifier:** BuilderOS / OIL / PBB  
**Last Updated:** 2026-06-29 (scheduler boot-window detection: boot_at + in_boot_window + last_skip_reason in scheduler state; alpha-readiness suppresses false NOT_RECENT during boot window)

## Purpose

BuilderOS needs structural consolidation before broader Alpha claims.

This package exists to:

- separate BuilderOS from product lanes
- inventory what is real
- identify canonical authority paths
- expose duplicate and legacy paths without deleting them
- preserve good ideas while quarantining poor execution
- score BuilderOS from runtime truth instead of docs

## System vs Product Separation

### BuilderOS

The autonomous programming machine:

- Builder
- OIL
- Council AI
- BuilderOS-internal TSOS hooks
- Memory
- PB authority
- proof freshness
- self-repair
- prevention hooks
- telemetry
- overnight runner
- Command Center cockpit

### LifeOS

Product lane built by BuilderOS. Product features do not raise BuilderOS Alpha unless they directly prove BuilderOS capability.

### TSOS

External AI efficiency/routing product. Only BuilderOS-internal TSOS-facing hooks count here, not customer-facing TSOS product surfaces.

## Runtime Proof Sources

Only these sources can justify `LIVE`, `PROVEN`, or `ACTIVE`:

1. `GET /api/v1/lifeos/builder/ready`
2. `GET /api/v1/lifeos/command-center/proof-freshness`
3. `GET /api/v1/lifeos/command-center/supervised-autonomy/readiness`
4. `GET /api/v1/lifeos/command-center/self-repair/repair-queue`
5. `GET /api/v1/lifeos/command-center/self-repair/prevention/hooks`
6. `GET /api/v1/lifeos/autonomous-telemetry/efficiency`
7. `GET /api/v1/lifeos/autonomous-telemetry/events`
8. `data/governed-autonomy-overnight-state.json`
9. `data/governed-autonomy-overnight-log.jsonl`
10. `data/builder-continuous-queue-log.jsonl`
11. runtime-linked receipts/tables only when tied back to the sources above

Supporting context only:

- SSOT docs
- manifests
- local repo inspection
- blueprint files

Docs define intent and expected topology only. Docs cannot elevate runtime maturity.

## Status Vocabulary

Runtime maturity states:

- `NOT_WIRED`
- `WIRED`
- `LIVE`
- `PROVEN`
- `ACTIVE`
- `LEGACY`
- `ARCHIVED`
- `FORBIDDEN`
- `UNKNOWN_DO_NOT_TOUCH`

Rules:

- `WIRED` means code exists and is connected.
- `LIVE` means runtime surface responds now.
- `PROVEN` means receipts/logs/runtime evidence show successful operation.
- `ACTIVE` means the component is currently executing in scheduled/live cycles.
- Unknowns stay `UNKNOWN_DO_NOT_TOUCH` until proved.

Topology audit classifications are separate:

- `KEEP_CANONICAL`
- `KEEP_LEGACY`
- `SALVAGE_IDEAS_ONLY`
- `ARCHIVE_CANDIDATE`
- `FORBIDDEN_CANDIDATE`
- `UNKNOWN_DO_NOT_TOUCH`

## Phases

### Phase 1 — System Inventory

Inputs:

- runtime proof sources
- mounted code paths
- current BuilderOS blueprint

Outputs:

- `docs/architecture/BUILDEROS_SYSTEM_INVENTORY.md`

Pass checks:

- each BuilderOS component listed once
- each entry includes runtime proof source
- product lanes kept separate
- fake-green risks listed

Fail checks:

- LifeOS features treated as BuilderOS components
- ACTIVE/PROVEN claims without runtime proof

Audit after phase:

- Codex/CC/C2 verify status honesty and missing components

### Phase 2 — Authority Map

Inputs:

- system inventory
- mounted routes and services

Outputs:

- `docs/architecture/BUILDEROS_AUTHORITY_MAP.md`

Pass checks:

- exactly one canonical authority path per BuilderOS function
- duplicates listed with risk and replacement

Fail checks:

- multiple canonical paths for one function
- non-canonical paths left unexplained

Audit after phase:

- Codex/CC/C2 verify no legacy path still treated as canonical

### Phase 3 — Topology Audit

Inputs:

- inventory
- authority map
- mounted routes
- route files
- live logs

Outputs:

- `docs/architecture/BUILDEROS_TOPOLOGY_AUDIT.md`

Pass checks:

- duplicates identified
- legacy command-center surfaces called out
- stale or unknown systems not guessed

Fail checks:

- deletion proposals before classification
- silent classification drift

Audit after phase:

- Codex/CC/C2 verify highest-risk duplicates and unsafe active leftovers

### Phase 4 — Salvage Registry

Inputs:

- topology audit

Outputs:

- `docs/architecture/BUILDEROS_SALVAGE_REGISTRY.md`

Pass checks:

- useful ideas preserved without keeping bad execution paths active
- rebuild candidates and risks documented

Fail checks:

- preserving active drift because the idea was good

Audit after phase:

- Codex/CC/C2 verify salvage vs archive separation

### Phase 5 — Classification Review Lock

Inputs:

- phases 1–4 outputs

Outputs:

- `docs/architecture/BUILDEROS_CLASSIFICATION_LOCK.md`

Pass checks:

- canonical, legacy, archive, forbidden, and unknown sets frozen
- status changes cite reason and evidence

Fail checks:

- later phases silently mutating classification

Audit after phase:

- Codex/CC/C2 verify no unexplained classification drift

### Phase 6 — System Alpha Readiness API

Inputs:

- phases 1–5 docs
- runtime proof sources

Outputs:

- `GET /api/v1/lifeos/command-center/system-alpha-readiness`

Pass checks:

- endpoint returns real runtime-backed BuilderOS status
- every `LIVE` / `PROVEN` / `ACTIVE` claim cites proof source
- docs only influence expected structure, not runtime maturity

Fail checks:

- fake-green
- product features counted toward BuilderOS Alpha

Audit after phase:

- Codex/CC/C2 verify percentage discipline and blockers

### Phase 7 — Command Center Panel

Inputs:

- readiness API only

Outputs:

- read-only BuilderOS System Alpha panel in `/lifeos-command-center`

Pass checks:

- no action buttons
- panel reads only readiness API
- panel exposes blockers and unknowns

Fail checks:

- UI implying maturity not supported by runtime proof

Audit after phase:

- Codex/CC/C2 verify the panel reflects API truth only

## Alpha/Beta/Production Definitions

### Alpha

BuilderOS can detect, classify, authorize, execute bounded repair, verify, receipt, and continue or healthy-idle without Adam doing routine operations.

### Beta

Alpha loop is stable over repeated deploy cycles, duplicate authority paths are mostly consolidated, and prevention covers recurring failures.

### Production

BuilderOS can survive routine deploy drift, maintain truthful telemetry, avoid fake autonomy, and keep structural drift bounded under governance.

## Stop Conditions

Stop the package if any of the following appear:

- runtime proof contradicts docs
- unknown system ownership is guessed
- proof freshness becomes stale after deploy and cannot be repaired
- PBB finds product-intent ambiguity
- a phase requires deletion before classification
- a proposed change exits approved PB boundary

## Learning Contract

BuilderOS must learn from each phase by recording:

- what was classified
- what was found duplicate
- what was marked legacy
- what stayed unknown
- what created fake-green risk
- what should be prevented from recurring

## Unknowns

- whether all legacy route stacks are still reachable from runtime bootstrap paths
- whether BuilderOS-internal TSOS hooks should remain a separate scored component or a guarded dependency
- whether memory should earn `LIVE` from self-repair memory alone or wait for full memory-capsule consolidation

---

## Change Receipts

| Date | File | What | Why |
|---|---|---|---|
| 2026-06-28 | `services/builderos-system-alpha-readiness.js` | Memory component `runtime_proof` now includes `GET /api/v1/lifeos/command-center/memory/status` as approved proof source (route already live). | V1-04: memory LIVE must be endpoint-backed, not structural file existence alone. |
| 2026-05-25 | `services/builderos-system-alpha-readiness.js` | Alpha score `usefulWork` now live from telemetry, not hardcoded. | Fake-green risk eliminated from scoring path. |
| 2026-05-25 | `services/autonomous-telemetry-session.js` | Duplicate task_type names resolved: `prevention_hook.deploy_check` → `prevention_hook.deploy_drift`; `self_repair.executor_dry_run` → `self_repair.dry_run`. | Telemetry data was structurally noisy. Efficiency analysis was flagging both pairs as duplicates across all 9 overnight batches. |
| 2026-05-25 | `services/autonomy-scheduler.js` | Explicit `LEGACY_SCHEDULER_ENABLED=true` gate added. File classified LEGACY PRODUCT-LEVEL. | Ungoverned AI calls in BuilderOS runtime are a Zero-Waste + PB governance violation. |
| 2026-05-25 | `routes/command-center-routes.js` | Full LEGACY quarantine inventory added to file header. 27 routes documented as callable with explanation. | Duplicate command center surfaces were a known fake-green risk. Quarantine without deletion. |
| 2026-05-25 | `services/autonomy-orchestrator.js` | Classified `LEGACY_INACTIVE`. `.start()` confirmed never called. | Resolved UNKNOWN status from structural audit. |
