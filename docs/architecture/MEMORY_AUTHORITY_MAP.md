<!-- SYNOPSIS: Memory Authority Map -->

# Memory Authority Map

**Status:** Ratified  
**Last Updated:** 2026-05-28

## Classification Table

| Surface | Classification | Purpose | Canonical Route | Canonical Store | Can Score BuilderOS Alpha | Notes |
|---|---|---|---|---|---|---|
| `routes/memory-intelligence-routes.js` + Amendment 39 | `CANONICAL`, `BUILDEROS_EVIDENCE_MEMORY` | Evidence engine for governed facts, lessons, debates, authority, drift | `/api/v1/memory/evidence/*` | `epistemic_facts`, `fact_evidence`, `debate_records`, `lessons_learned` | Yes | Single canonical BuilderOS proof path; temporary compatibility alias remains at `/api/v1/memory/*` for evidence-only routes |
| `routes/memory-capsule-routes.js` + Amendment 02 capsule layer | `CANONICAL`, `PRODUCT_MEMORY` | Governed capsule intake, retrieval, provenance, contradiction, correction | `/api/v1/memory/capsules/*` | `memory_capsules`, `retrieval_events`, `memory_use_receipts`, `contradiction_records` | No | Product/runtime memory, not BuilderOS maturity proof |
| `services/self-repair-memory.js` + self-repair routes | `CANONICAL`, `SELF_REPAIR_MEMORY` | Repair lessons, prevention candidates, runtime repair memory diagnostics | `/api/v1/memory/self-repair/*` | `self_repair_memory_events`, `data/self-repair-memory.jsonl` | No | Diagnostic and prevention support only |
| `routes/memory-routes.js` + `core/memory-system.js` | `LEGACY_KEEP` | Old CRUD/session memory model | `/api/v1/memory/legacy/*` and legacy `/api/*` mount | `data/memories.json` | No | Preserve for history/migration; non-canonical |
| `docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md` legacy current-state sections | `LEGACY_ARCHIVE` | Historical narrative from pre-capsule memory era | Archive-only in doc | n/a | No | Must not define current authority |

## Canonical Proof Rules

### BuilderOS Alpha Memory Proof

Only Amendment 39 evidence memory may elevate BuilderOS memory maturity.

- Canonical endpoint: `GET /api/v1/lifeos/command-center/memory/status`
- Canonical proof source: `epistemic_facts`
- Non-canonical for alpha scoring:
  - `self_repair_memory_events`
  - `data/*.jsonl`
  - legacy CRUD memory
  - capsule-memory row counts by themselves

### Product Memory

Capsule memory is canonical for governed retrieval and correction flows, but it does not prove BuilderOS operational memory maturity by itself.

## Archive Rules

- Legacy CRUD memory remains callable only under legacy naming
- Legacy historical narratives remain preserved, but may not describe current canonical routes as if they are live
- No legacy store may be used for BuilderOS maturity scoring

## Route Ownership

- `/api/v1/memory/capsules/*` → capsule memory only
- `/api/v1/memory/evidence/*` → Amendment 39 evidence memory only
- `/api/v1/memory/self-repair/*` → self-repair memory only
- `/api/v1/memory/legacy/*` → legacy CRUD memory only

## Remaining Unknowns

- Whether legacy CRUD memory still serves a real product flow or only historical compatibility
- Whether `data/memories.json` should remain writable long-term or become import-only
