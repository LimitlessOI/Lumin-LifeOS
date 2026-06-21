<!-- SYNOPSIS: BUILDEROS SYSTEM INVENTORY -->

# BUILDEROS SYSTEM INVENTORY

**Status:** `DRAFT`  
**Source of truth type:** structural inventory  
**Last Updated:** 2026-05-25

Runtime baseline used for this inventory:

- Railway deploy SHA `aa7a3e5bad79f07aa428ff51a41aef7547981d80`
- proof freshness `CURRENT`
- readiness `ready_for_supervised=true`
- repair queue `open_count=0`
- overnight state `healthy_idle_no_authorized_work`

## Product Lanes (Not Scored as BuilderOS Components)

- LifeOS product routes and UX
- TC / ClientCare / family / coaching lanes
- TSOS customer-facing product surfaces

## BuilderOS Components

### 1. Builder

- `component_id`: `builder`
- `purpose`: execute bounded build/repair work and expose runtime readiness
- `canonical_files`:
  - `routes/builder-supervisor-routes.js`
  - `services/builder-truth-surface.js`
  - `scripts/lifeos-builder-continuous-queue.mjs`
- `runtime_endpoints`:
  - `GET /api/v1/lifeos/builder/ready`
  - `GET /api/v1/builder/status`
- `services`:
  - `builder-truth-surface`
  - `builder-supervisor`
- `db_tables`:
  - `builder_task_receipts`
  - `builder_halt_log`
  - `builder_audit_receipts`
- `receipt_types`:
  - builder task receipts
  - build audit receipts
- `scheduled_jobs`:
  - continuous queue runner
- `runtime_proof_source`:
  - `GET /api/v1/lifeos/builder/ready`
  - `data/builder-continuous-queue-log.jsonl`
- `upgrade_conditions`:
  - `WIRED -> LIVE`: `/builder/ready` returns `ok=true`
  - `LIVE -> PROVEN`: queue/build receipts exist in runtime logs/tables
  - `PROVEN -> ACTIVE`: queue runner currently cycling or producing current logs
- `status`:
  - `WIRED`
  - `LIVE`
  - `PROVEN`
- `fake_green_risk`: builder can look healthy from `/ready` even when no queue work is executing
- `unknowns`: no direct runtime endpoint yet proving current daemon PID/loop state
- `next_required_proof`: current daemon-active proof source separate from queue log tail

### 2. OIL

- `component_id`: `oil`
- `purpose`: governed audit, proof, and receipt spine
- `canonical_files`:
  - `routes/lifeos-command-center-routes.js`
  - `services/builder-audit-before-done.js`
  - `services/oil-security-receipts.js`
- `runtime_endpoints`:
  - `GET /api/v1/lifeos/command-center/phase14`
  - `GET /api/v1/lifeos/command-center/proof-freshness`
- `services`:
  - `builder-phase14-ledger`
  - `oil-proof-freshness`
  - `oil-security-receipts`
- `db_tables`:
  - `builder_audit_receipts`
  - `security_receipts`
- `receipt_types`:
  - `gemini_live_proof`
  - `daily_oil_summary`
  - `self_repair_audit`
- `scheduled_jobs`:
  - daily OIL summary
- `runtime_proof_source`:
  - proof freshness endpoint
  - live receipts
- `upgrade_conditions`:
  - `WIRED -> LIVE`: endpoints respond
  - `LIVE -> PROVEN`: Phase 14 cert + current proof receipts exist
  - `PROVEN -> ACTIVE`: scheduled OIL summary and repair audit receipts continue to appear
- `status`:
  - `WIRED`
  - `LIVE`
  - `PROVEN`
  - `ACTIVE`
- `fake_green_risk`: legacy receipts could be mistaken for current proof without freshness checks
- `unknowns`: none material for current runtime
- `next_required_proof`: longer-window regression proof over multiple deploy cycles

### 3. Council AI

- `component_id`: `council`
- `purpose`: bounded model reasoning for build and verification work
- `canonical_files`:
  - `services/council-prompt-adapter.js`
  - `routes/enhanced-council-routes.js`
- `runtime_endpoints`:
  - indirect via builder runtime and telemetry
- `services`:
  - `callCouncilMember`
  - council prompt adapter
- `db_tables`:
  - none canonical to BuilderOS runtime truth
- `receipt_types`:
  - reflected indirectly through build and telemetry receipts
- `scheduled_jobs`: none canonical
- `runtime_proof_source`:
  - `/api/v1/lifeos/builder/ready` (`callCouncilMember=true`)
  - `/api/v1/lifeos/autonomous-telemetry/efficiency` (`by_model`)
- `upgrade_conditions`:
  - `WIRED -> LIVE`: builder runtime confirms council dependency live
  - `LIVE -> PROVEN`: runtime telemetry shows real model-backed BuilderOS work
  - `PROVEN -> ACTIVE`: governed Council tasks are currently running in cycles
- `status`:
  - `WIRED`
  - `LIVE`
  - `PROVEN`
- `fake_green_risk`: generic model availability can be mistaken for governed Council maturity
- `unknowns`: no dedicated Council runtime truth endpoint inside BuilderOS surfaces
- `next_required_proof`: direct governed Council proof source tied to BuilderOS tasks

### 4. BuilderOS-Internal TSOS Hooks

- `component_id`: `tsos_internal_hooks`
- `purpose`: internal efficiency/routing hooks usable by BuilderOS without exposing TSOS product internals
- `canonical_files`:
  - `routes/api-cost-savings-routes.js`
  - `routes/tokenos-routes.js`
- `runtime_endpoints`:
  - none in approved BuilderOS runtime proof set
- `services`:
  - token/cost savings support services
- `db_tables`:
  - none currently counted toward BuilderOS Alpha
- `receipt_types`:
  - none canonical
- `scheduled_jobs`: none canonical
- `runtime_proof_source`: none approved yet
- `upgrade_conditions`:
  - `NOT_WIRED -> WIRED`: explicit BuilderOS internal hook surface exists inside approved proof set
  - `WIRED -> LIVE`: runtime endpoint responds from BuilderOS path
  - `LIVE -> PROVEN`: receipts/logs show efficiency/routing hooks affected BuilderOS work safely
- `status`:
  - `NOT_WIRED`
- `fake_green_risk`: token-economics UI can imply TSOS maturity that BuilderOS has not proven
- `unknowns`: whether future scoring should treat this as independent component or guarded dependency
- `next_required_proof`: dedicated BuilderOS-internal TSOS hook runtime evidence

### 5. Memory

- `component_id`: `memory`
- `purpose`: institutional memory, self-repair memory, and future governed memory-capsule continuity
- `canonical_files`:
  - `routes/memory-capsule-routes.js`
  - `routes/memory-intelligence-routes.js`
  - `services/self-repair-memory.js`
- `runtime_endpoints`:
  - indirect current use through self-repair memory surfaces
- `services`:
  - `self-repair-memory`
  - memory intelligence services
- `db_tables`:
  - `epistemic_facts`
  - `lessons_learned`
  - `memory_capsules`
- `receipt_types`:
  - indirect via repair memory and memory receipts
- `scheduled_jobs`: none proven in BuilderOS runtime proof set
- `runtime_proof_source`:
  - structural only for now
- `upgrade_conditions`:
  - `WIRED -> LIVE`: approved runtime proof source exposes BuilderOS memory state directly
  - `LIVE -> PROVEN`: runtime evidence shows governed memory influencing BuilderOS safely
- `status`:
  - `WIRED`
- `fake_green_risk`: memory package docs are stronger than current BuilderOS memory runtime proof
- `unknowns`: whether self-repair memory alone should count as runtime-live memory
- `next_required_proof`: BuilderOS memory read/write proof inside approved runtime source set

### 6. PB Authority

- `component_id`: `pb_authority`
- `purpose`: classify bounded work as system-authorized or Adam-required
- `canonical_files`:
  - `services/pb-execution-authority.js`
  - `services/supervised-autonomy-readiness.js`
- `runtime_endpoints`:
  - `GET /api/v1/lifeos/command-center/supervised-autonomy/readiness`
- `services`:
  - `deriveExecutionActions`
- `db_tables`:
  - indirect through receipts and repair queue evidence
- `receipt_types`:
  - self-repair audit and executor receipts
- `scheduled_jobs`: none directly
- `runtime_proof_source`:
  - readiness endpoint
  - repair queue
- `upgrade_conditions`:
  - `WIRED -> LIVE`: readiness endpoint returns PB boundary data
  - `LIVE -> PROVEN`: authorized/system-required actions are surfaced correctly in runtime
  - `PROVEN -> ACTIVE`: runtime regularly emits PB-authorized action decisions
- `status`:
  - `WIRED`
  - `LIVE`
  - `PROVEN`
- `fake_green_risk`: empty action lists in healthy idle can mask whether classification would work under stress
- `unknowns`: none blocking current classification
- `next_required_proof`: repeated stress proof over multiple stale/repair incidents

### 7. Proof Freshness

- `component_id`: `proof_freshness`
- `purpose`: decide whether runtime proof is current, stale, or unknown
- `canonical_files`:
  - `services/oil-proof-freshness.js`
  - `routes/lifeos-command-center-routes.js`
- `runtime_endpoints`:
  - `GET /api/v1/lifeos/command-center/proof-freshness`
- `services`:
  - `evaluateProofFreshnessFromPool`
- `db_tables`:
  - `security_receipts`
  - `builder_audit_receipts`
- `receipt_types`:
  - `gemini_live_proof`
  - Phase 14 cert
  - self-repair audit
- `scheduled_jobs`: consumed by overnight runner and deploy-check
- `runtime_proof_source`:
  - proof freshness endpoint
- `upgrade_conditions`:
  - `WIRED -> LIVE`: endpoint responds
  - `LIVE -> PROVEN`: PF-001..003 all derive from live receipts and current deploy SHA
  - `PROVEN -> ACTIVE`: freshness used in live scheduled cycles
- `status`:
  - `WIRED`
  - `LIVE`
  - `PROVEN`
  - `ACTIVE`
- `fake_green_risk`: stale receipts could look valid without deploy-SHA comparison
- `unknowns`: none blocking
- `next_required_proof`: larger-window drift trend analytics

### 8. Self-Repair

- `component_id`: `self_repair`
- `purpose`: detect, queue, execute, audit, and log bounded repair work
- `canonical_files`:
  - `services/self-repair-executor.js`
  - `routes/self-repair-executor-routes.js`
  - `services/oil-self-repair-detector.js`
- `runtime_endpoints`:
  - `GET /api/v1/lifeos/command-center/self-repair/repair-queue`
  - `POST /api/v1/lifeos/command-center/self-repair/execute`
- `services`:
  - self-repair detector
  - self-repair executor
  - execution log
- `db_tables`:
  - `builder_audit_receipts`
  - `security_receipts`
- `receipt_types`:
  - `self_repair_audit`
  - executor receipts
- `scheduled_jobs`:
  - deploy-check hook may trigger executor
- `runtime_proof_source`:
  - repair queue
  - readiness latest receipts
- `upgrade_conditions`:
  - `WIRED -> LIVE`: queue and execute surfaces respond
  - `LIVE -> PROVEN`: end-to-end stale-proof repair chain succeeded with receipts
  - `PROVEN -> ACTIVE`: runtime currently repairing or automatically checking for repair conditions
- `status`:
  - `WIRED`
  - `LIVE`
  - `PROVEN`
- `fake_green_risk`: healthy idle can hide lack of current repair pressure
- `unknowns`: none blocking
- `next_required_proof`: repeated deploy-drift recovery over time without operator prompting

### 9. Prevention Hooks

- `component_id`: `prevention`
- `purpose`: convert recurring repair lessons into governed no-op-safe prevention checks
- `canonical_files`:
  - `services/self-repair-prevention-hook-planner.js`
  - `services/self-repair-deploy-scheduler.js`
- `runtime_endpoints`:
  - `GET /api/v1/lifeos/command-center/self-repair/prevention/hooks`
  - `POST /api/v1/lifeos/command-center/self-repair/deploy-check`
- `services`:
  - deploy-drift prevention hook
- `db_tables`:
  - runtime receipts only
- `receipt_types`:
  - prevention/deploy-check related receipts
- `scheduled_jobs`:
  - boot-time deploy check
  - overnight prevention checks
- `runtime_proof_source`:
  - prevention hooks endpoint
  - autonomous telemetry events
- `upgrade_conditions`:
  - `WIRED -> LIVE`: hooks endpoint responds and lists wired hook
  - `LIVE -> PROVEN`: hook runs with log/telemetry evidence
  - `PROVEN -> ACTIVE`: hook continues to run in current cycles
- `status`:
  - `WIRED`
  - `LIVE`
  - `PROVEN`
  - `ACTIVE`
- `fake_green_risk`: one hook can make the subsystem look broader than it is
- `unknowns`: broader prevention coverage still absent
- `next_required_proof`: more than one governed hook wired from lessons

### 10. Telemetry

- `component_id`: `telemetry`
- `purpose`: record useful work, repair cost, latency, and drift indicators
- `canonical_files`:
  - `services/autonomous-telemetry-service.js`
  - `routes/autonomous-telemetry-routes.js`
- `runtime_endpoints`:
  - `GET /api/v1/lifeos/autonomous-telemetry/efficiency`
  - `GET /api/v1/lifeos/autonomous-telemetry/events`
- `services`:
  - `emitAutonomousTelemetry`
- `db_tables`:
  - `autonomous_telemetry_events`
- `receipt_types`:
  - telemetry rows rather than receipt type
- `scheduled_jobs`:
  - overnight sessions
  - prevention checks
- `runtime_proof_source`:
  - telemetry endpoints
- `upgrade_conditions`:
  - `WIRED -> LIVE`: endpoints respond
  - `LIVE -> PROVEN`: event rows and computed metrics are returned
  - `PROVEN -> ACTIVE`: new current-window events continue appearing
- `status`:
  - `WIRED`
  - `LIVE`
  - `PROVEN`
  - `ACTIVE`
- `fake_green_risk`: some key metrics still return `null` / `NOT_WIRED`
- `unknowns`: no canonical PB-violation counter yet
- `next_required_proof`: fill current telemetry gaps without adding duplicate telemetry systems

### 11. Overnight Runner

- `component_id`: `overnight_runner`
- `purpose`: run governed overnight/continuous analysis and useful work
- `canonical_files`:
  - `data/governed-autonomy-overnight-state.json`
  - `data/governed-autonomy-overnight-log.jsonl`
  - `scripts/lifeos-builder-continuous-queue.mjs`
- `runtime_endpoints`:
  - indirect via state/log files
- `services`:
  - governed overnight autonomy runner
- `db_tables`:
  - indirect through telemetry
- `receipt_types`: none direct
- `scheduled_jobs`:
  - governed overnight analysis loop
- `runtime_proof_source`:
  - overnight state
  - overnight log
- `upgrade_conditions`:
  - `WIRED -> LIVE`: state/log files exist and update
  - `LIVE -> PROVEN`: logs show truthful healthy-idle or work execution decisions
  - `PROVEN -> ACTIVE`: current batches continue to run
- `status`:
  - `WIRED`
  - `LIVE`
  - `PROVEN`
  - `ACTIVE`
- `fake_green_risk`: idle posture could be confused with inactivity rather than healthy governance
- `unknowns`: whether current overnight scope is enough to prove broader autonomous continuation
- `next_required_proof`: useful-work throughput under non-idle authorized load

### 12. Command Center Cockpit

- `component_id`: `command_center`
- `purpose`: read-only governed cockpit for BuilderOS runtime truth
- `canonical_files`:
  - `public/overlay/lifeos-command-center.html`
  - `routes/lifeos-command-center-routes.js`
  - `routes/public-routes.js`
- `runtime_endpoints`:
  - `/lifeos-command-center`
  - `/api/v1/lifeos/command-center/*`
- `services`:
  - command-center aggregate routes
- `db_tables`:
  - reads receipts and telemetry; owns none
- `receipt_types`: reads many receipt types
- `scheduled_jobs`: none
- `runtime_proof_source`:
  - command-center aggregate endpoints
  - public cockpit route
- `upgrade_conditions`:
  - `WIRED -> LIVE`: overlay and aggregate endpoints respond
  - `LIVE -> PROVEN`: panel reflects real receipt-backed runtime truth only
  - `PROVEN -> ACTIVE`: cockpit continuously refreshed by current runtime data
- `status`:
  - `WIRED`
  - `LIVE`
  - `PROVEN`
- `fake_green_risk`: legacy command-center surfaces remain mounted and can confuse canonical cockpit status
- `unknowns`: no direct runtime proof that every visible panel is canonical
- `next_required_proof`: eliminate remaining legacy/operator confusion paths

## Useful-Work-Guard Gate

Useful-work-guard is a BuilderOS Alpha gate, not a separate scored product feature.

Current evidence:

- `startup/boot-domains.js` uses `createUsefulWorkGuard()`
- `services/lifeos-scheduled-jobs.js` uses `createUsefulWorkGuard()`
- overnight logs show healthy idle decisions instead of token burn

Current status:

- `WIRED`
- `PROVEN`

Remaining gap:

- full autonomous AI path sweep still needs its own explicit coverage audit

## Current Counts

- `ACTIVE`: 5
- `PROVEN`: 9
- `LIVE`: 10
- `WIRED`: 12
- `NOT_WIRED`: 1
- `LEGACY`: 0 at component level
- `UNKNOWN_DO_NOT_TOUCH`: 0 at component level
