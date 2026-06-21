<!-- SYNOPSIS: BUILDEROS EXECUTION PHASE PLAN -->

# BUILDEROS EXECUTION PHASE PLAN

**Status:** `DRAFT`
**Owner:** Adam
**Verifier:** OIL / CAI
**Last Updated:** 2026-05-25
**Derived from:** `BUILDEROS_A_TO_Z_BLUEPRINT.md` (76% Alpha state)
**Builder limitation ref:** `BUILDEROS_BUILDER_LIMITATIONS.md`

---

## Purpose

Convert the BuilderOS A-to-Z Blueprint into small, safe, executable build phases. Each phase has:
- audit-before step (observe runtime state first)
- build step (what to create or change)
- verify step (what runtime proof confirms success)
- receipt step (what gets logged)
- builder risk level (can builder do it, or is GAP-FILL likely)

**Rules:**
- One phase per capability — no multi-capability bundles
- No phase edits more than 1–2 files
- Large-file edits must be patch-sized (≤20 lines changed) and pre-audited
- Never accept builder stub output (verify line count matches expectation)
- Each phase must be independently verifiable without running another phase first

---

## Phase A — Telemetry Deduplication

**Capability:** Stop duplicate outer telemetry rows when inner service already emits.

**Audit before:**
- Run `GET /api/v1/lifeos/autonomous-telemetry/efficiency` — note if duplicate task_types appear
- Check `data/governed-autonomy-overnight-state.json` for `duplicate_instrumentation` field
- Confirm `services/autonomous-telemetry-instrumentation.js` already accepts `sessionId`, `cycleId` params

**What to build:**
- Add `emitsOwnTelemetry: true` flag to `deploy_prevention_hook` and `self_repair_dry_run` cycle defs in `services/autonomous-telemetry-session.js`
- Change `run` signature for those two defs to accept `({ sessionId, cycleId } = {})`
- Pass `sessionId`, `cycleId` to `runDeployDriftPreventionHook()` and `runSelfRepairExecutor()` calls within those defs
- Guard outer `emitCycleTelemetry` call: skip when `def.emitsOwnTelemetry === true`
- Change `def.run()` to `def.run({ sessionId, cycleId })` in cycle loop
- Add `sessionId`, `cycleId` params to `runSelfRepairExecutor()` and thread to `emitSelfRepairTelemetry()`
- Add `sessionId`, `cycleId` params to `runDeployRepairCheck()` and thread to all 3 `emitPreventionHookTelemetry()` call sites
- Rename task_types: `prevention_hook.deploy_check` → `prevention_hook.deploy_drift`, `self_repair.executor_dry_run` → `self_repair.dry_run`

**Files:** `services/autonomous-telemetry-session.js` (281 lines), `services/self-repair-executor.js` (534 lines), `services/self-repair-deploy-scheduler.js` (196 lines)

**Builder risk:** HIGH — all three files are >150 lines. Builder generates stubs for surgical edits on large files. Confirmed 2026-05-25 (builder produced 34/25/75-line stubs for these exact files).

**Mitigations:**
1. Extract the `emitsOwnTelemetry` guard logic into a new helper file (`services/telemetry-cycle-guard.js`) so the session file change is smaller
2. Add `sessionId`/`cycleId` to executor via a thin wrapper function rather than editing `runSelfRepairExecutor` internals
3. Use exact diff patches (show before/after for ≤10 lines at a time)
4. Verify file line count after any builder commit — stubs will be < 100 lines

**Verify:**
- `node --check` all 3 files
- Run `POST /api/v1/lifeos/autonomous-telemetry/session/run`
- Check `GET /api/v1/lifeos/autonomous-telemetry/events` — no duplicate rows for same cycle
- `data/governed-autonomy-overnight-state.json` — `duplicate_instrumentation` field should be empty or absent

**Receipt:** AMENDMENT_12 change receipt + overnight state snapshot

---

## Phase B — Memory Runtime Proof

**Capability:** Elevate Memory from WIRED to LIVE + PROVEN through approved runtime proof.

**Audit before:**
- Confirm `self_repair_memory_events` table exists in Neon (check migration file)
- Run `GET /api/v1/lifeos/command-center/self-repair/memory/latest` — confirm returns `{ok, source, lessons[], count}`
- Confirm `readLatestRepairMemory()` reads from DB table

**What to build:**
- New file: `routes/memory-status-routes.js` — add `GET /api/v1/lifeos/command-center/memory/status` endpoint that queries `self_repair_memory_events` table row count, latest timestamp, and source
- Register in `startup/register-runtime-routes.js`
- Add endpoint to the approved proof source list in `services/builderos-system-alpha-readiness.js`

**Files:** `routes/memory-status-routes.js` (NEW — safe for builder), `startup/register-runtime-routes.js` (small wiring addition — medium risk), `services/builderos-system-alpha-readiness.js` (large file — GAP-FILL risk)

**Builder risk:** LOW for new route file. MEDIUM for wiring registration. HIGH if editing large readiness service.

**Mitigations:** Create new route file via builder. Wire manually with GAP-FILL receipt. Update readiness service via narrow edit (locate exact insertion point before builder call).

**Verify:**
- `GET /api/v1/lifeos/command-center/memory/status` returns 200 with row count > 0 post-deploy
- `GET /api/v1/lifeos/command-center/system-alpha-readiness` shows `memory` component with `LIVE` in statuses
- No fake-green: if table is empty, endpoint must return `{ok:false, status:"NO_DATA"}` not a fake count

**Receipt:** AMENDMENT_12 change receipt

---

## Phase C — Overnight Runner ACTIVE

**Capability:** Wire overnight runner to fire autonomously via scheduler without C2 manual trigger.

**Audit before:**
- Confirm `startup/register-schedulers.js` exists and has examples of `createUsefulWorkGuard()` usage
- Confirm `runGovernedTelemetrySession()` is importable from `services/autonomous-telemetry-session.js`
- Confirm `data/governed-autonomy-overnight-state.json` shows recent batch to set baseline

**What to build:**
- Add overnight runner schedule entry to `startup/register-schedulers.js` — fires once nightly via `setInterval` wrapped in `createUsefulWorkGuard()`
- Guard prereqs: `COMMAND_CENTER_KEY` present, `DATABASE_URL` present
- Guard workCheck: readiness endpoint returns `ready_for_supervised: true`
- Purpose: `"Run one governed telemetry session for BuilderOS overnight continuation"`
- Run at: `3:00 AM` (once daily, not on interval)

**Files:** `startup/register-schedulers.js` — BLOCKED by builder safe-scope (startup/ is blocked). Must be GAP-FILL.

**Builder risk:** N/A — startup/ is in BLOCKED_WRITE_PATHS. Direct edit required.

**Mitigations:** Make the smallest possible addition to register-schedulers.js (import + one guarded scheduler block). Document exact 10-line change in GAP-FILL receipt.

**Verify:**
- After deploy, check Railway logs for `[OVERNIGHT]` log line at scheduled time
- `data/governed-autonomy-overnight-state.json` shows `triggered_by: "overnight-scheduler"` (not `"C2"`)
- `GET /api/v1/lifeos/command-center/system-alpha-readiness` shows `overnight_runner` with `ACTIVE` status

**Receipt:** AMENDMENT_12 change receipt

---

## Phase D — Council AI Proven

**Capability:** Prove Council AI through governed model execution with receipts, separated from generic model availability.

**Audit before:**
- Confirm `GET /api/v1/lifeos/builder/ready` response shows `callCouncilMember: true`
- Check `autonomous_telemetry_events` for any rows where `task_type` contains `council` or `model_call`
- Check `builder_audit_receipts` for rows written by OIL_AUDITOR_ROLE via governed session

**What to build:**
- New file: `services/council-proof-reporter.js` — reads `builder_audit_receipts` where triggered by governed session, computes council-specific maturity signal
- New endpoint in `routes/lifeos-command-center-routes.js` or new route file: `GET /api/v1/lifeos/command-center/council/proof`

**Files:** New files only — LOW builder risk.

**Builder risk:** LOW for new service file. MEDIUM for adding endpoint to existing large routes file.

**Verify:**
- `GET /api/v1/lifeos/command-center/council/proof` returns 200 with evidence of governed council calls
- `system-alpha-readiness` shows `council` component with `PROVEN` in statuses

**Receipt:** AMENDMENT_01 (AI Council) change receipt + AMENDMENT_12 receipt

---

## Phase E — TSOS Internal Hooks Wired

**Capability:** Define and wire BuilderOS-internal TSOS hooks — token efficiency reporting within BuilderOS scope only.

**Audit before:**
- Confirm TSOS customer-facing features are clearly separate (gateway, proxy, decoder packets — not BuilderOS)
- Check `GET /api/v1/lifeos/autonomous-telemetry/efficiency` for any token_estimate fields
- Confirm `autonomous_telemetry_events` has `token_input_estimate`, `token_output_estimate`, `total_token_estimate` columns

**What to build:**
- New endpoint: `GET /api/v1/lifeos/autonomous-telemetry/token-efficiency` — reads token estimate totals from `autonomous_telemetry_events` grouped by session, returns per-session token spend and `useful_work_per_1k_tokens` metric
- This is the BuilderOS-internal TSOS hook — not customer-facing TSOS, not gateway/proxy

**Files:** New route endpoint in `routes/autonomous-telemetry-routes.js` (existing file — medium risk) OR new file (low risk).

**Builder risk:** LOW for new file. MEDIUM if editing existing route file.

**Verify:**
- `GET /api/v1/lifeos/autonomous-telemetry/token-efficiency` returns 200 with token totals
- `system-alpha-readiness` shows `tsos_internal_hooks` with at least `WIRED` status
- Does NOT expose any customer-facing TSOS data — only BuilderOS internal token accounting

**Receipt:** AMENDMENT_12 change receipt

---

## Phase F — Useful-Work-Guard Coverage Audit

**Capability:** Document full coverage of all autonomous AI call paths through useful-work-guard.

**Audit before:**
- `grep -r "callCouncilMember\|callCouncilWithFailover\|setInterval\|cron" services/ routes/ startup/` — list all AI call sites
- `grep -r "createUsefulWorkGuard" services/ startup/` — list all guarded call sites
- Diff: unguarded = AI call sites minus guarded sites

**What to build:**
- New doc (GAP-FILL — docs/ blocked for builder): `docs/architecture/BUILDEROS_USEFUL_WORK_GUARD_AUDIT.md`
- OR new script: `scripts/useful-work-guard-audit.mjs` (builder CAN write to scripts/) — scans codebase and outputs unguarded paths

**Files:** `scripts/useful-work-guard-audit.mjs` (NEW — LOW builder risk). Doc requires GAP-FILL.

**Builder risk:** LOW for new script.

**Verify:**
- Script runs without error: `node scripts/useful-work-guard-audit.mjs`
- Output identifies 0 unguarded scheduled AI calls (or lists them as explicit Alpha blockers)
- `system-alpha-readiness` blocker `USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE` resolved

**Receipt:** AMENDMENT_12 change receipt

---

## Phase G — Telemetry Metric Completeness

**Capability:** Wire all 15 required BuilderOS Alpha metrics.

**Audit before:**
- Run `GET /api/v1/lifeos/autonomous-telemetry/efficiency` — identify which of 15 required metrics are `null` or absent
- Required metrics (from BUILDEROS_ALPHA_BLUEPRINT.md): avg_useful_work_score, repair_success_pct, failed_build_pct, retry_waste_pct, proof_recovery_time_ms, average_repair_cost_ms, average_build_latency_ms, average_verification_latency_ms, token_estimate_sum, useful_work_per_1k_tokens, drift_frequency, hallucination_frequency, repair_queue_depth, overnight_throughput, autonomous_continuation_rate

**What to build:**
- Extend `services/autonomous-efficiency-intelligence.js` with computation for missing metrics
- Or create new `services/builderos-metrics-reporter.js` (safer — new file, LOW builder risk)
- New endpoint or extend efficiency endpoint to expose all 15 metrics

**Files:** New service file preferred (LOW builder risk). Extending existing large service file = MEDIUM risk.

**Builder risk:** LOW for new file. MEDIUM for extending existing efficiency service (large file).

**Verify:**
- `GET /api/v1/lifeos/autonomous-telemetry/efficiency` returns all 15 metrics (null allowed if truly no data, but must be present in response)
- `system-alpha-readiness` blocker `TELEMETRY_GAPS_REMAIN` resolved

**Receipt:** AMENDMENT_12 change receipt

---

## Phase H — Legacy Authority Surface Cleanup

**Capability:** Define canonical replacements for all 27 legacy command-center routes and begin retirement.

**Audit before:**
- Read `routes/command-center-routes.js` header — 27 routes inventoried
- For each route: is there a canonical replacement in `routes/lifeos-command-center-routes.js`?
- Identify which routes have no replacement (must remain callable)

**What to build:**
- Phase H-1: For each route WITH a canonical replacement, add HTTP 301 redirect from legacy route to canonical path (safe — no deletion)
- Phase H-2: For routes WITHOUT a canonical replacement, create the canonical endpoint (new route file — LOW builder risk)
- Phase H-3: After H-1+H-2, run 30-day grace period, then move LEGACY → ARCHIVE_CANDIDATE

**Files:** H-1 edits `routes/command-center-routes.js` (large file — HIGH builder risk). H-2 creates new files (LOW builder risk).

**Builder risk:** H-1 = HIGH (large existing route file). H-2 = LOW (new files). Do H-2 before H-1.

**Verify:**
- All 27 legacy routes either redirect or have canonical replacement
- No LIVE endpoint is deleted without canonical replacement confirmed LIVE
- `system-alpha-readiness` blocker `LEGACY_AUTHORITY_SURFACES_STILL_LIVE` resolved

**Receipt:** AMENDMENT_12 change receipt

---

## Phase I — Alpha Loop Stress Verification

**Capability:** Run and document the full Alpha acceptance loop under induced drift conditions.

**Audit before:**
- Confirm proof is CURRENT (fresh start baseline)
- Confirm executor runs dry-run successfully
- Have a test deploy SHA available (can use current SHA for simulation)

**What to build:**
- New script: `scripts/alpha-loop-stress-test.mjs` (LOW builder risk) — induces stale proof condition, then observes whether system detects, authorizes, executes repair, verifies CURRENT, and writes receipts without Adam intervention
- New doc (GAP-FILL): receipt documenting stress test result

**Files:** New script only — LOW builder risk. Receipt doc = GAP-FILL (docs/ blocked).

**Builder risk:** LOW for new script.

**Verify:**
- Script completes the full 8-step Alpha acceptance loop
- After run: proof is CURRENT, receipt exists, repair queue is 0
- No manual Adam step required in the loop

**Receipt:** AMENDMENT_12 change receipt + standalone stress test receipt doc

---

## Phase J — Beta Readiness Gate

**Capability:** Confirm BuilderOS has sustained autonomous useful work over a 7-day window.

**Audit before:**
- After Phase C (overnight runner ACTIVE), wait 7 calendar days
- Run `GET /api/v1/lifeos/autonomous-telemetry/efficiency` with `sinceHours: 168`
- Check `avg_useful_work_score > 0.50` over the 7-day window

**What to build:**
- No new code if Phase C is complete and overnight runner fires nightly
- Update `GET /api/v1/lifeos/command-center/system-alpha-readiness` with Beta gate check: if 7-day avg > 0.50 AND overnight_runner is ACTIVE AND all 5 blockers resolved → `verdict: "BETA_READY"`

**Files:** `services/builderos-system-alpha-readiness.js` (large file — HIGH builder risk). Consider wrapper approach.

**Builder risk:** HIGH if editing large readiness service. LOW if Beta gate is a new standalone checker.

**Verify:**
- `system-alpha-readiness` returns `verdict: "BETA_READY"` or equivalent
- 7-day avg_useful_work_score confirmed > 0.50 from live telemetry events

**Receipt:** AMENDMENT_12 change receipt + BuilderOS Beta declaration doc (GAP-FILL)

---

## Phase Ordering Summary

```
IMMEDIATE (no blockers):
  Phase B — Memory Runtime Proof (new file, LOW risk)
  Phase D — Council AI Proven (new file, LOW risk)
  Phase E — TSOS Internal Hooks Wired (new file, LOW risk)
  Phase F — Useful-Work-Guard Coverage Audit (new script, LOW risk)

MEDIUM TERM (requires strategy):
  Phase A — Telemetry Deduplication (HIGH risk — large files, need mitigation plan)
  Phase C — Overnight Runner ACTIVE (startup/ blocked, GAP-FILL required)
  Phase G — Telemetry Metric Completeness (prefer new file over extending large service)

LATER (depends on earlier phases):
  Phase H — Legacy Cleanup (do H-2 before H-1; H-1 is HIGH risk)
  Phase I — Alpha Loop Stress Test (after A, B, C confirmed stable)
  Phase J — Beta Gate (after C + 7-day wait)
```

---

## Change Receipts

| Date | What | Why |
|---|---|---|
| 2026-05-25 | File created | Execution Phase Plan derived from BUILDEROS_A_TO_Z_BLUEPRINT.md (76% Alpha). 10 phases with builder risk levels and mitigations. GAP-FILL: builder safe-scope blocks docs/ directory. |
