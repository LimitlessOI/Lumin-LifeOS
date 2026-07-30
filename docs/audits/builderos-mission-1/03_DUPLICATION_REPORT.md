<!-- SYNOPSIS: 3. Duplication Report -->


# 3. Duplication Report

## 3.1 Duplicate queues/orderings
| File | Item Count |
|---|---|
| BP_PRIORITY.json | 13 |
| MISSION_QUEUE.json | 38 |
| MISSION_PACK_INDEX.json | 57 |
| BUILDEROS_WORKING_DEFINITION | 4 |
| PRODUCT_READINESS_REPORT.json | 44 |
**Finding:** Multiple machine-readable work queues coexist. `CURRENT_BP_GAPS_V1.md` says `BP_PRIORITY` is canonical for scheduling, but `MISSION_QUEUE.json` is Hist-owned and still referenced by legacy autopilot.

## 3.2 Duplicate builders/execution paths
| Builder / Executor | Role |
|---|---|
| routes/lifeos-council-builder-routes.js | Production builder (commit+redeploy) |
| factory-staging/factory-core/builder/execute-step.js | Factory builder (BPB->SENTRY->TSOS->Historian) |
| services/never-stop-product-factory.js | Autonomous never-stop builder (services path) |
| scripts/bp-priority-never-stop.mjs | BP priority never-stop runner |
| services/governed-autonomous-shipping-loop.js | Governed autonomous shipping loop |
| services/builderos-governed-loop-executor.js | Governed loop executor |

## 3.3 Duplicate schedulers
| Scheduler File | Pattern |
|---|---|
| factory-staging/startup/register-routes.js | register |
| lumin-factory-bundle/factory-staging/startup/register-routes.js | register |
| startup/auto-register-product-modules.js | register |
| startup/boot-domains.js | setInterval |
| startup/register-founder-runtime-routes.js | register |
| startup/register-runtime-routes.js | register |
| builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/2026-06-12T20-06-17Z/files/services/factory-autopilot-scheduler.js | setInterval |
| services/builderos-bp-priority-scheduler.js | setInterval |
| services/chair-prediction-score-scheduler.js | setInterval |
| services/factory-autopilot-scheduler.js | setInterval |
| services/go-vegas-outreach-scheduler.js | setInterval |
| services/governance-review-scheduler.js | setInterval |
| services/lifere-outreach-scheduler.js | setInterval |
| services/never-stop-product-factory-scheduler.js | setInterval |

## 3.4 Duplicate SSOT/authority docs
- `docs/products/builderos/PRODUCT_HOME.md` and `builderos-reboot/BUILDEROS_WORKING_DEFINITION.json` both define BuilderOS.
- `CURRENT_BP_GAPS_V1.md`, `WORKSPACE_STATUS.md`, `HANDOFF.md` all report current state.
- `PRODUCT_HOME.md` contains **five** `## Change Receipts` tables (different schemas).
- `NORTH_STAR_SSOT.md` and `UNIFIED_DOCTRINE_MAP.md` overlap principles.
- `MISSIONS/*/BLUEPRINT.json` and `MISSIONS/*/FOUNDER_PACKET.md` duplicate intent.

## 3.5 Duplicate route registration
| Route Registration File | Route Pattern Count |
|---|---|
| startup/register-runtime-routes.js | 131 |
| startup/register-founder-runtime-routes.js | 23 |
| factory-staging/startup/register-routes.js | 13 |
| server-founder-runtime.js | 6 |
| server-full-runtime.js | 13 |