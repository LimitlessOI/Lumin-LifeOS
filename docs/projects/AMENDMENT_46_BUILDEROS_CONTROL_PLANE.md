# BuilderOS Control Plane
_(formerly AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md)_
**Status:** IN_BUILD — Phase 1 infrastructure on disk
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-06-13 — kernel-managed `/builder/build` now defers route-level DONE/completion checks to kernel sequencing so `recordBuildComplete()` can write proof fields before authority checks. Prior **2026-06-13** — `/build` DONE-gate enforced in `routes/lifeos-council-builder-routes.js` before success response. Prior **2026-06-13** — DONE gate helper extracted for `/build` wiring.

> **Core law:** If it is not in the ledger, it did not happen.
> **Priority:** Higher than MarketingOS, SalesOS, CCL production integration.

**Note:** Amendment 44 (`AMENDMENT_44_TOKEN_ACCOUNTING_OS.md`) owns the **Token Ledger** sub-layer. This amendment owns the **supreme measurement/control plane** that aggregates all ledgers and enforces BuilderOS DONE gates.

---

## 1. Purpose

BuilderOS cannot improve what it does not measure. Adam has repeatedly requested token tracking, build time, failures, cost, and benchmarks. Pieces exist but are scattered and unenforced. This amendment defines one control plane that makes every AI agent accountable.

**Do not build product features under this amendment** — measurement and enforcement only.

### 1.1 Mission-first control-plane requirement

Jobs, ledger rows, logs, and route probes are not the parent object.
Missions are.

This control plane must evolve from job-centric truth to mission-centric truth:
- every meaningful build action should attach to a mission
- every mission should expose current state, authority class, and governing blueprint
- every measured outcome should roll back into trust, calibration, and lessons

---

## 2. Existing systems audit (2026-05-24)

| Ledger | Repo path | DB object | Mounted | Status |
|--------|-----------|-----------|---------|--------|
| **Token** | `services/savings-ledger.js`, `services/token-accounting-service.js` | `token_usage_log`, `unified_token_accounting_report`, `ai_unmetered_exceptions` | `/api/v1/tokens/*` | **PARTIALLY VERIFIED** — council metered; 52 historical rows; no 24h activity |
| **Build (legacy)** | `routes/tsos-task-ledger-routes.js` | `builder_task_ledger` (was missing migration) | **NOT MOUNTED** | **BLOCKED** — routes exist, table had no migration until `20260601` |
| **Build (trust spine)** | `db/migrations/20260519_builder_trust_spine.sql` | `builder_task_receipts` | via builder supervisor | **VERIFIED** schema |
| **Build (core)** | `db/migrations/20260313_core_schema.sql` | `build_history`, `task_tracking` | unknown | **UNVERIFIED** usage |
| **Task** | `routes/project-governance-routes.js` | `execution_tasks`, `pending_adam` | `/api/v1/pending-adam` | **PARTIALLY VERIFIED** |
| **Decision** | `routes/project-governance-routes.js`, SSOT amendments | `pending_adam`, amendment receipts | partial | **UNVERIFIED** unified decision ledger |
| **Model performance** | `services/model-performance.js`, `routes/model-performance-routes.js` | `model_verdicts`, `model_lens_scores` | `/api/v1/model-performance/*` | **VERIFIED** mounted |
| **OIL proof** | `services/oil-security-receipts.js` | `security_receipts` | `/api/v1/oil/receipts` | **VERIFIED** schema |
| **Lessons** | `services/memory-intelligence-service.js` | `lessons_learned` | `/api/v1/memory/evidence/*` | **VERIFIED** |
| **CCL/context** | Amendment 45 only | placeholder cols on `token_usage_log` | n/a | **BLOCKED** — no production CCL ledger |
| **Routing decisions** | `services/builderos-tsos-routing.js` | `builderos_tsos_routing_decisions` | internal | **VERIFIED** schema |
| **Command control jobs** | `services/builderos-command-control-service.js` | `builderos_command_control_jobs` | `/api/v1/lifeos/builderos/command-control/*` | **VERIFIED** |
| **Autonomous telemetry** | `services/autonomous-telemetry-instrumentation.js` | `autonomous_telemetry_events` | `/api/v1/lifeos/autonomous-telemetry/*` | **PARTIALLY VERIFIED** |
| **Enhanced AI usage tracker** | `core/enhanced-ai-usage-tracker.js` | n/a | **NOT MOUNTED** | **BLOCKED** — superseded by Token Accounting OS budgets |

---

## 3. Scattered system owners

| Concern | Owner amendment | Primary file |
|---------|-----------------|--------------|
| Token receipts | Am 44 | `services/token-accounting-service.js` |
| Council metering | Am 01 | `services/council-service.js` → `recordMetered` |
| Build receipts | Am 19 / Blueprint | `builder_task_receipts`, `builderos-governed-loop-executor.js` |
| OIL proof | Am 40 | `services/oil-security-receipts.js` |
| Model scores | Am 04 | `services/model-performance.js` |
| Lessons | Am 39 | `services/memory-intelligence-service.js` |
| Operator/Cursor tokens | Am 44 OCL | `services/operator-consumption-ledger-service.js` |
| **Control plane (new)** | **Am 46** | `services/builderos-control-plane-service.js` |

---

## 4. Eight ledgers — target spec

### 4.1 Token Ledger (Am 44 subordinate)
Fields: provider, model, task_id, blueprint_id, product_lane, input/output/cached tokens, free_tier, estimated/actual cost, CCL_used, LCL_used, routing_decision, quality_result, OIL_result.

**Source of truth:** `token_usage_log` + `unified_token_accounting_report` + `ai_unmetered_exceptions`.

### 4.2 Build Ledger
**Canonical table:** `build_task_ledger` (migration `20260601`).

Fields per user spec: task_id, blueprint_id, timing, files, lines, commands, tests, failures, retries, model/agent, human intervention, deploy/rollback, proof links.

**Legacy:** `builder_task_ledger` — compat table for `routes/tsos-task-ledger-routes.js` (still not mounted).

### 4.3 Task Ledger
**Phase 2.** Target: unify `execution_tasks`, `pending_adam`, builder jobs into `control_plane_task_ledger`.

### 4.4 Decision Ledger
**Phase 3.** Target: `founder_decision_ledger` from SSOT receipts + `pending_adam` resolutions.

### 4.5 Model Performance Ledger
**Exists:** `services/model-performance.js` — extend to include build time + token cost joins.

### 4.6 OIL Proof Ledger
**Exists:** `security_receipts` — link to `build_task_ledger.oil_receipt_id`.

### 4.7 Lesson / Failure Pattern Ledger
**Exists:** `lessons_learned` + self-repair memory — add maturity enum in Phase 4.

### 4.8 CCL / Context Ledger
**Phase 5+.** Amendment 45 placeholders only until CCL production approved.

---

## 5. Phased implementation plan

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **1 (now)** | `build_task_ledger`, control plane health, token unified refs, verify script | ✅ on disk |
| 2 | Wire builder `/build` start/complete → `build_task_ledger`; mount tsos-task-ledger compat | ⚠️ next |
| 3 | Task + decision ledgers | planned |
| 4 | Model perf + lesson maturity joins in summary API | planned |
| 5 | CCL context ledger | blocked on Am 45 |
| 6 | BuilderOS DONE gate enforced in `lifeos-council-builder-routes.js` | ⚠️ next |

---

## 6. DB tables / views (Phase 1)

| Object | Migration | Role |
|--------|-----------|------|
| `build_task_ledger` | `20260601_build_task_ledger.sql` | Canonical build measurement |
| `builder_task_ledger` | same | Legacy compat |
| `token_usage_log` | `20260321` | Token receipts |
| `ai_unmetered_exceptions` | `20260531` | Unmetered exceptions |
| `unified_token_accounting_report` | `20260532` | Token rollup view |
| `security_receipts` | `20260524` | OIL proof |
| `lessons_learned` | `20260426` | Failure patterns |

---

## 7. APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/builderos/control-plane/health` | GREEN/YELLOW/RED measurement coverage |
| GET | `/api/v1/builderos/control-plane/summary` | Answers: calls, spend, top task, longest build, worst model |
| POST | `/api/v1/builderos/control-plane/builds/start` | Open build ledger row |
| POST | `/api/v1/builderos/control-plane/builds/complete` | Close build (DONE gate) |
| GET | `/api/v1/builderos/control-plane/builds/:task_id/done-gate` | Pre-check DONE eligibility |
| GET | `/api/v1/builderos/control-plane/tasks-without-proof` | Audit gap list |
| GET | `/api/v1/tokens/unified/health` | Token sub-layer health (Am 44) |

### 7.1 Mission-state display requirements

The control plane should ultimately expose, at minimum:
- `mission_id`
- current mission state
- governing blueprint path
- authority zone / routing class
- predicted outcome
- measured outcome
- challenge history
- trust escalation status

Current runtime does not yet provide this full mission object. Until code support exists, docs must not imply that it does.

---

## 8. Verification

```bash
npm run builderos:control-plane:verify
node scripts/verify-builderos-control-plane.mjs
node scripts/verify-token-accounting-current-state.mjs
```

---

## 9. BuilderOS DONE gate

No task may be marked **DONE** unless:
1. **Token receipt** in `token_usage_log` OR **unmetered exception** for `task_id`
2. **Build receipt** in `build_task_ledger` with `end_time`
3. **OIL receipt** in `security_receipts` linked to task

If measurement health is **RED** → DONE blocked unless explicit exception.

Implemented in: `controlPlane.canMarkBuildDone()` + `POST /builds/complete` returns 409 when blocked.

✅ Wired: `routes/lifeos-council-builder-routes.js` now runs `evaluateBuildDoneGateForBuildResponse(...)` before returning success from `/build`. On failure it returns blocker `BUILDEROS_DONE_BLOCKED` with reason/receipt/missing evidence.

### 9.1 Governance routing display

The control plane should distinguish:
- Autonomous
- Supervised
- Founder Required
- Pre-Authorized
- Mission-Critical

These are display and routing requirements for future enforcement mapping.
Current code/runtime truth still primarily exposes job and receipt state, not full mission routing state.

---

## 10. Health endpoint semantics

| Status | Meaning |
|--------|---------|
| **GREEN** | All core tables/views exist; activity today; no unmetered exceptions |
| **YELLOW** | Partial coverage, stale activity, or builds without proof |
| **RED** | Missing core tables or pool unavailable |

---

## 11. Acceptance criteria (system must answer)

| Question | Source (Phase 1) |
|----------|------------------|
| How many AI calls today? | `getTokenMetricsToday()` |
| How many metered? | `token_usage_log` count today |
| How many unmetered? | `ai_unmetered_exceptions` count today |
| How much spent? | SUM `cost_usd` today |
| Top token task? | GROUP BY request_id |
| Longest build? | MAX `duration_ms` in `build_task_ledger` |
| Worst failing model? | `getWorstPerformingModels()` |
| Tasks without proof? | `getTasksWithoutProof()` |

**Honesty:** Cursor/operator tokens require manual OCL until automatic IDE metering exists.

---

## 12. First exact coding task (next)

Wire `routes/lifeos-council-builder-routes.js`:
- On `/build` start → `POST` internal `recordBuildStart({ task_id, blueprint_id, model_used })`
- On `/build` complete → `recordBuildComplete` with token + OIL receipt IDs
- Return 409 if `canMarkBuildDone` fails when health RED

## 13. Trust Escalation Tracking

The control plane must eventually support trust escalation based on evidence, not vibes.

For any expandable autonomy path, track:
- governing mission
- actor or model class
- historical accuracy
- challenge survival
- failure rate
- decision latency saved
- whether delegation was pre-authorized, supervised, or founder-required

Until this is implemented, trust escalation remains a constitutional requirement without full runtime enforcement.

---

## Agent Handoff Notes

Phase 1 control plane is on disk. Amendment 44 remains token sub-layer. Deploy migrations `20260531`, `20260532`, `20260601` then run verify scripts.

---

## Change Receipts

| Date | Change | Why |
|------|--------|-----|
| 2026-06-13 | **`services/tsos-platform-kernel.js`** — `wrapBuild()` now sets request marker `req.__kernel_managed_build = true` for wrapped `/builder/build` calls and clears it in `finally`, allowing route-layer guards to distinguish kernel-managed sequencing. **`routes/lifeos-council-builder-routes.js`** — `evaluateBuildDoneGateForBuildResponse()` and `evaluateBuildCompletionForBuildResponse()` now support `kernelManaged` deferral mode; `/build` passes this marker and, when set, defers terminal DONE/completion checks to kernel authority (`done_gate_deferred_to_kernel`, `completion_deferred_to_kernel`) instead of early route blocking. **`tests/builderos-build-done-gate-route-wiring.test.js`** and **`tests/builderos-completion-authority.test.js`** add regression coverage for kernel-managed deferral and non-kernel missing-proof blocking. | Fix circular proof ordering found in live job `881754fc-5674-4e49-8f63-4cfe137be606`: route-level DONE gate ran before kernel/control-plane could write `build_end_time`/token/OIL proof, causing false early `missing_proof` blocks. |
| 2026-06-13 | **`routes/lifeos-council-builder-routes.js`** — imports `evaluateBuildDoneGateAsync` and enforces DONE gate in `evaluateBuildDoneGateForBuildResponse(...)` before any `ok:true, committed:true, commit_sha` response. Returns `409` with `blocker: BUILDEROS_DONE_BLOCKED`, `reason`, `receipt_path`, and `missing_evidence` when present. Success now includes `done_gate_required: true`, `done_gate_passed: true`. **`tests/builderos-build-done-gate-route-wiring.test.js` (NEW)** covers: (A) commit_sha alone blocked, (B) done gate pass allows success, (C) missing evidence blocked, (D) non-success build path unchanged. | Phase 6 completion: make DONE/PASS impossible from commit SHA alone on production `/build` path. |
| 2026-06-13 | **`services/builderos-build-done-gate-helper.js` (NEW)** + **`tests/builderos-build-done-gate-helper.test.js`** — extracted DONE gate evaluation (rejects commit_sha-only success; requires control-plane evidence when available). This helper was later wired into `/build` in the receipt above. | Repair Lane GAP-FILL: unblock Phase 6 `/build` integration without Zone 3 route patch in same step. | ✅ 5 tests |
| 2026-05-24 | **Revert** voice-specific helpers from `bp-priority-queue.js` (v2.27 extension removed in v2.28). Loader stays canonical per `builderos-reboot/AGENTS.md`. | Adam: do not pollute control-plane loader with voice theater | GAP-FILL v2.28 |
| 2026-06-12 | **`services/bp-priority-sync.js`** — `checkOrphanProductPassReceipts()` (§2.18: no orphan PASS in `products/receipts/`); CI via `system-maturity-check.mjs`. **`services/bp-priority-queue.js`** — canonical BP_PRIORITY loader (tracked). | Adam: PASS without BP sync must be impossible; default push+deploy. | ✅ verify 26 checks |
| 2026-06-03 | **`services/decision-ledger.js` (NEW)** + **`db/migrations/20260606_decision_ledger.sql`** — `founder_decision_ledger` table; `createDecision()` used by model escalation gate receipts. | Builder Reliability Initiative Layer 1 — escalation audit trail. | ✅ migration applies on deploy |
| 2026-06-01 | Constitutional refactor alignment only. Added mission-first control-plane requirements, minimum mission-state display targets, governance-routing display requirements, and trust-escalation tracking while explicitly noting these are not yet fully implemented runtime surfaces. | Keep control-plane authority honest: mission-centric governance is canonical direction, not current fake-green runtime. |
| 2026-05-24 | Amendment 46 + `build_task_ledger` + control plane service/routes + verify script | Measure everything before more product build |
| 2026-05-24 | `services/tsos-platform-kernel.js` + `/api/v1/kernel/*` + `wrapBuild` DONE gate wiring | TSOS Platform Kernel Phase 0 orchestrates control plane + token accounting |
| 2026-05-31 | GAP-FILL: `verifyOilReceipt` query now also checks `payload->'details'->>'task_id'` (canonical OIL payload nests task_id under `details`, not top-level). `files_changed` fixed from integer `1` to `[target_file]` array (column is TEXT[]). Both fixes in `services/tsos-platform-kernel.js`. Root cause: OIL receipts were being written correctly but never found by verifier. |
