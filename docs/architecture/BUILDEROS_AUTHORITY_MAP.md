<!-- SYNOPSIS: BUILDEROS AUTHORITY MAP -->

# BUILDEROS AUTHORITY MAP

**Status:** `DRAFT`  
**Last Updated:** 2026-05-25

Exactly one canonical authority path is defined per BuilderOS function. Duplicates are classified, not deleted, in this phase.

## 1. Builder Execution

- `canonical_service`: `routes/builder-supervisor-routes.js` + `services/builder-truth-surface.js`
- `canonical_route`: `/api/v1/lifeos/builder/ready` and `/api/v1/builder/*`
- `canonical_table_or_receipt`: `builder_task_receipts`, `builder_halt_log`
- `proof_source`: `/api/v1/lifeos/builder/ready`, `data/builder-continuous-queue-log.jsonl`
- `owner_component`: `builder`
- `legacy_duplicates`:
  - legacy overnight aliases in queue logs and runbooks
- `forbidden_candidates`:
  - direct unreceipted build execution paths
- `why_non_canonical_paths_are_dangerous`:
  - can bypass truth surface and receipt spine
- `authoritative_replacement`:
  - builder supervisor + truth surface
- `unknowns`:
  - none material

## 2. OIL Audit / Receipts

- `canonical_service`: `services/builder-audit-before-done.js`, `services/oil-security-receipts.js`
- `canonical_route`: `/api/v1/lifeos/command-center/phase14`, `/api/v1/oil/receipts*`
- `canonical_table_or_receipt`: `builder_audit_receipts`, `security_receipts`
- `proof_source`: Phase 14 cert endpoint, proof freshness endpoint
- `owner_component`: `oil`
- `legacy_duplicates`:
  - older receipt summaries and historical command-center docs
- `forbidden_candidates`:
  - docs-only certification claims
- `why_non_canonical_paths_are_dangerous`:
  - allows stale receipts or docs to masquerade as runtime truth
- `authoritative_replacement`:
  - receipt-backed OIL aggregate routes
- `unknowns`:
  - none material

## 3. Proof Freshness

- `canonical_service`: `services/oil-proof-freshness.js`
- `canonical_route`: `GET /api/v1/lifeos/command-center/proof-freshness`
- `canonical_table_or_receipt`: latest gemini proof receipt + latest Phase 14 cert + latest self-repair audit receipt
- `proof_source`: proof freshness endpoint itself
- `owner_component`: `proof_freshness`
- `legacy_duplicates`:
  - ad hoc SHA comparisons in shell scripts
- `forbidden_candidates`:
  - manual green-state assumptions without SHA parity
- `why_non_canonical_paths_are_dangerous`:
  - stale proof can appear current
- `authoritative_replacement`:
  - PF-001..003 evaluation path
- `unknowns`:
  - none material

## 4. Phase 14 Certification

- `canonical_service`: `services/builder-phase14-ledger.js`
- `canonical_route`: `GET /api/v1/lifeos/command-center/phase14`, `POST /api/v1/lifeos/command-center/phase14/run-proofs`
- `canonical_table_or_receipt`: `builder_audit_receipts`
- `proof_source`: Phase 14 endpoint + run-proofs receipts
- `owner_component`: `oil`
- `legacy_duplicates`:
  - manual cert scripts and old cert language in docs
- `forbidden_candidates`:
  - local-only cert results treated as Railway truth
- `why_non_canonical_paths_are_dangerous`:
  - proof store mismatch and fake-green risk
- `authoritative_replacement`:
  - Railway-canonical Phase 14 routes
- `unknowns`:
  - none material

## 5. Self-Repair Executor

- `canonical_service`: `services/self-repair-executor.js`
- `canonical_route`: `POST /api/v1/lifeos/command-center/self-repair/execute`
- `canonical_table_or_receipt`: executor receipts in `builder_audit_receipts` / `security_receipts`
- `proof_source`: repair queue + latest self-repair history
- `owner_component`: `self_repair`
- `legacy_duplicates`:
  - manual proof refresh sequences
- `forbidden_candidates`:
  - out-of-band operator repair without receipt chain
- `why_non_canonical_paths_are_dangerous`:
  - bypasses PB boundary and receipt verification
- `authoritative_replacement`:
  - governed executor route
- `unknowns`:
  - none material

## 6. Prevention Hooks

- `canonical_service`: `services/self-repair-prevention-hook-planner.js`, `services/self-repair-deploy-scheduler.js`
- `canonical_route`: `GET /api/v1/lifeos/command-center/self-repair/prevention/hooks`, `POST /api/v1/lifeos/command-center/self-repair/deploy-check`
- `canonical_table_or_receipt`: prevention-related receipts and telemetry rows
- `proof_source`: prevention hooks endpoint + telemetry events
- `owner_component`: `prevention`
- `legacy_duplicates`:
  - candidate-only prevention ideas not wired
- `forbidden_candidates`:
  - autonomous prevention logic without no-op rollback contract
- `why_non_canonical_paths_are_dangerous`:
  - can silently mutate runtime outside governed PB authority
- `authoritative_replacement`:
  - wired deploy-drift hook
- `unknowns`:
  - future hook promotion path beyond deploy drift

## 7. PB Authority

- `canonical_service`: `services/pb-execution-authority.js`
- `canonical_route`: indirect via `GET /api/v1/lifeos/command-center/supervised-autonomy/readiness`
- `canonical_table_or_receipt`: readiness summary derived from runtime proof and repair queue
- `proof_source`: readiness endpoint
- `owner_component`: `pb_authority`
- `legacy_duplicates`:
  - ad hoc “Adam approval” wording in older scripts/docs
- `forbidden_candidates`:
  - human gating on routine system-authorized work inside approved PB boundary
- `why_non_canonical_paths_are_dangerous`:
  - fake autonomy or hidden Adam bottlenecks
- `authoritative_replacement`:
  - readiness-derived system/Adam split
- `unknowns`:
  - none material

## 8. Memory Write / Read

- `canonical_service`: `routes/memory-capsule-routes.js`, `routes/memory-intelligence-routes.js`, `services/self-repair-memory.js`
- `canonical_route`: `/api/v1/memory/*` for memory system, self-repair memory read surfaces for BuilderOS
- `canonical_table_or_receipt`: `epistemic_facts`, `memory_capsules`, `lessons_learned`
- `proof_source`: currently structural only for BuilderOS-wide Alpha
- `owner_component`: `memory`
- `legacy_duplicates`:
  - Amendment 02 legacy memory
  - SSOT prose as pseudo-memory
- `forbidden_candidates`:
  - uncited memory influence on BuilderOS action
- `why_non_canonical_paths_are_dangerous`:
  - competing truth stores and memory drift
- `authoritative_replacement`:
  - memory-capsule / Amendment 39 path
- `unknowns`:
  - BuilderOS runtime proof source for full memory maturity still missing

## 9. Telemetry / Efficiency

- `canonical_service`: `services/autonomous-telemetry-service.js`
- `canonical_route`: `/api/v1/lifeos/autonomous-telemetry/efficiency`, `/events`
- `canonical_table_or_receipt`: `autonomous_telemetry_events`
- `proof_source`: telemetry endpoints
- `owner_component`: `telemetry`
- `legacy_duplicates`:
  - older build/overnight logs that predate the current telemetry spine
- `forbidden_candidates`:
  - duplicate metric systems counted as equivalent truth
- `why_non_canonical_paths_are_dangerous`:
  - silent metric fragmentation and fake-green
- `authoritative_replacement`:
  - autonomous telemetry endpoints
- `unknowns`:
  - some metrics still intentionally `NOT_WIRED`

## 10. Overnight Runner

- `canonical_service`: governed autonomy overnight runner + continuous queue artifacts
- `canonical_route`: file-backed, no canonical HTTP endpoint yet
- `canonical_table_or_receipt`: `data/governed-autonomy-overnight-state.json`, `data/governed-autonomy-overnight-log.jsonl`
- `proof_source`: overnight state/log files
- `owner_component`: `overnight_runner`
- `legacy_duplicates`:
  - `builder-overnight-*` legacy naming
- `forbidden_candidates`:
  - old overnight aliases treated as separate active systems
- `why_non_canonical_paths_are_dangerous`:
  - can create false duplicate-runner narratives
- `authoritative_replacement`:
  - governed autonomy overnight state/log
- `unknowns`:
  - no canonical runtime endpoint yet

## 11. Command Center Cockpit

- `canonical_service`: `routes/lifeos-command-center-routes.js`
- `canonical_route`: `/lifeos-command-center` + `/api/v1/lifeos/command-center/*`
- `canonical_table_or_receipt`: reads runtime truth sources; owns none
- `proof_source`: cockpit HTML route + aggregate APIs
- `owner_component`: `command_center`
- `legacy_duplicates`:
  - `/command-center`
  - `public/overlay/command-center.html`
  - `routes/command-center-routes.js`
- `forbidden_candidates`:
  - old command-center surfaces treated as the governed cockpit
- `why_non_canonical_paths_are_dangerous`:
  - operator confusion and mixed authority paths
- `authoritative_replacement`:
  - `public/overlay/lifeos-command-center.html`
- `unknowns`:
  - whether every panel within the cockpit is already canonical
