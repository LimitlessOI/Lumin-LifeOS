<!-- SYNOPSIS: TSOS LIVE → PROVEN Advancement Plan -->

# TSOS LIVE → PROVEN Advancement Plan

**Created:** 2026-05-29  
**Status:** G3.2 IMPLEMENTED (2026-05-29) — baseline comparator refinement in SHADOW mode; G3.1 decision log live  
**Scope:** BuilderOS-internal TSOS hooks only (`tsos_internal_hooks` component)  
**Out of scope:** Memory systems (Codex mission), customer-facing TSOS features, new model integrations

---

## 1. Current maturity

| Field | Value (verified 2026-05-29) |
|-------|-----------------------------|
| Component | `tsos_internal_hooks` |
| Runtime statuses | `WIRED` + `LIVE` |
| Next target | `PROVEN` (0.75 maturity weight) |
| Hook event count | **5** (`task_type='tsos_internal_hook'`) |
| Proof route | `GET /api/v1/lifeos/builderos/tsos-efficiency` → `hook_status: LIVE` |
| Alpha impact | Component stuck at 0.5 scale index (LIVE max until PROVEN wired) |
| System gates | Proof CURRENT, ALPHA_READY, supervised=true — TSOS not blocking alpha |

**Authoritative scoring location:** `services/builderos-system-alpha-readiness.js` (lines ~139–197)

---

## 2. Exact gating logic (Phase 1 audit)

### 2.1 Canonical contract (`docs/projects/builderos-remediation/TSOS_HOOK_BOUNDARY.md`)

| Status | Condition | Maturity weight |
|--------|-----------|-----------------|
| `NOT_WIRED` | No dedicated TSOS hook route/function | 0.0 |
| `WIRED` | Route/function exists, not yet called by governed loop | 0.25 |
| `LIVE` | Route exists **and** called by governed loop ≥1 time | 0.5 |
| `PROVEN` | LIVE + structured efficiency data persisted **per cycle** | 0.75 |
| `ACTIVE` | PROVEN + efficiency decisions demonstrably changed routing | 1.0 |

**Hard rule:** Generic token telemetry (`total_token_estimate > 0` on non-hook rows) cannot elevate status above `NOT_WIRED`.

**Real hook requirements (all four must hold):**

1. Named interface — `emitTSOSHookReading()` + `GET /api/v1/lifeos/builderos/tsos-efficiency`
2. Called by governed loop — `builderos-governed-loop-executor.js` on `committed:true`
3. Structured BuilderOS data — token savings, routing efficiency, model substitution, or cost-per-build
4. Persisted per cycle — row in `autonomous_telemetry_events` with `task_type='tsos_internal_hook'`

### 2.2 Runtime implementation (`builderos-system-alpha-readiness.js`)

```javascript
// LIVE gate (implemented)
tsosHookCount = COUNT(*) FROM autonomous_telemetry_events
                WHERE task_type = 'tsos_internal_hook'

statuses = hasStatuses(
  tsosHookCount > 0 ? 'WIRED' : 'NOT_WIRED',
  tsosHookCount > 0 ? 'LIVE'     : null
)
// PROVEN gate: NOT IMPLEMENTED — no third status branch
```

**Blocker gate (implemented):**

```javascript
TSOS_INTERNAL_HOOKS_NOT_WIRED  when  tsosHookCount === 0
```

### 2.3 PROVEN criteria — contract vs runtime

| Criterion | Contract (TSOS_HOOK_BOUNDARY.md) | Runtime today |
|-----------|-----------------------------------|---------------|
| ≥1 hook event | Required for LIVE | ✅ 5 events |
| Governed loop caller | Required | ✅ executor lines ~214, ~286 |
| Structured efficiency per cycle | Required for PROVEN | ⚠️ Partial — metadata has `job_id`, `output_bytes`, `duration_ms`, `repair_attempts`, `committed`; `total_token_estimate` always **0** |
| Verifier PASS linked to hook | Implied by "real success" (BLUEPRINT §4) | ❌ Not cross-checked in scoring |
| Distinct successful cycles | Implied | ⚠️ ~5 events, not scored |
| Time stability window | Not defined for TSOS | ❌ Not implemented |
| PROVEN status in alpha service | Required to advance score | ❌ **Primary code gap** |

**Known code debt:** `scripts/builderos-gap-report.mjs` line 40 — `no PROVEN condition in alpha readiness service — needs service edit (Zone 3)`.

---

## 3. Evidence gap analysis (Phase 2)

### 3.1 Evidence already collected

| Evidence | Source | Confidence |
|----------|--------|------------|
| 5 dedicated hook rows | `autonomous_telemetry_events` | HIGH |
| Hook emit on commit path | `builderos-governed-loop-executor.js` | HIGH |
| Hook service INSERT fixed | `builderos-tsos-hook-service.js` (task_goal + run_id) | HIGH |
| Efficiency read surface | `GET /api/v1/lifeos/builderos/tsos-efficiency` | HIGH |
| Latest hook metadata | job `08ade5fa`, `gemini_flash`, 3382 bytes, 9146ms | HIGH |
| Generic token telemetry (supplementary) | 161 token-tracked events, useful_work/1k=0.861 | MEDIUM — must not score TSOS |
| Governed commits tied to hooks | Jobs: `701e182c`, `a3e6a23f`, `3d5481b4`, `8cd69823`, `08ade5fa` (inferred from continuity + latest run_id) | MEDIUM |

### 3.2 Evidence still missing for PROVEN

| Gap | Severity | Blocks PROVEN? |
|-----|----------|----------------|
| No PROVEN branch in alpha readiness service | **P0** | Yes — cannot advance score regardless of hook count |
| Structured efficiency fields incomplete on hook rows | **P1** | Yes per contract |
| No hook↔verifier receipt join in scoring | **P1** | Yes per BLUEPRINT "receipts show real success" |
| Hook fires **after** commit, not before dispatch | **P2** | Weakens contract #2 interpretation |
| No deduplication guard (retry path could double-emit same job) | **P2** | Confidence risk |
| No 168h stability / failure-rate window | **P2** | Not in code yet; recommended for PROVEN honesty |
| `total_token_estimate=0` on all hook rows | **P2** | Efficiency metric surface incomplete |

### 3.3 Ranked gap list (weakest first)

1. **PROVEN gate absent in scoring service** — maturity cannot advance; accumulating hooks alone does nothing.
2. **Structured efficiency data incomplete** — metadata exists but lacks token/cost/routing fields contract requires.
3. **No verifier-linked proof chain** — hook proves commit happened, not that 4-gate verifier passed for that job.
4. **Post-commit-only hook timing** — does not prove TSOS informed pre-dispatch routing.
5. **No stability window** — single deploy/regression could invalidate PROVEN without detection.
6. **Supplementary telemetry conflation risk** — `useful_work_per_1k_tokens` on efficiency route uses generic rows; must stay supplementary.

### 3.4 Fake-green risks

| Risk | Mitigation |
|------|------------|
| Counting generic token events for TSOS | Fixed BR-09 — hook count only |
| Declaring PROVEN from hook count alone | Fail-closed: require structured metadata + verifier linkage |
| `hook_status: LIVE` on route while scoring stuck | Route label ≠ alpha maturity; alpha service is authority |
| Silent hook INSERT failures | try/catch logs error; executor continues — need hook emit receipt or failed-hook counter |

---

## 4. TSOS proof plan (Phase 3)

### 4.1 Target PROVEN definition (proposed — not yet implemented)

**PROVEN when ALL of:**

```
A. tsosHookCount >= 3
B. distinct_committed_run_ids >= 3
     WHERE task_type='tsos_internal_hook'
       AND metadata->>'committed' = 'true'
C. structured_hook_rows >= 3
     WHERE metadata has job_id, output_bytes, duration_ms, repair_attempts
D. verifier_linked_jobs >= 3
     builderos_command_control_jobs.status IN ('committed','complete')
       AND result_json shows verifier gates all true
       AND matching tsos_internal_hook.run_id = job.id
E. hook_failures_168h = 0
     (no logged [TSOS-HOOK] emit failed for jobs that reached committed:true)
F. PROVEN branch wired in builderos-system-alpha-readiness.js
```

**Optional 168h stability (recommended before ACTIVE, not PROVEN):**

- At least one hook event in each of the last 2 rolling 7-day windows, OR
- ≥3 hooks with `created_at` spanning ≥72h without deploy-induced gaps invalidating proof

### 4.2 Governed jobs needed

| # | Mission | Zone | Purpose |
|---|---------|------|---------|
| **G1** | Wire PROVEN gate in `builderos-system-alpha-readiness.js` | 3 | Unblock maturity scoring (builder or GAP-FILL) |
| **G2** | Enhance `emitTSOSHookReading` metadata: `verifier_ok`, `token_estimate`, `model_used`, `target_file` | 2 | Satisfy structured efficiency per cycle |
| **G3** | Run **3** governed Zone 1 jobs post-G2 | ops | Accumulate verifier-linked hook evidence |
| **G4** | (Optional) Pre-dispatch efficiency read hook before `dispatchBuilderPlan` | 3 | Close contract gap #2 fully |

**Suggested Zone 1 targets for G3 (low risk, no memory touch):**

- `scripts/builderos-tsos-cycle-marker.mjs` UPDATE — append cycle receipt line only
- `scripts/builderos-zone-audit.mjs` UPDATE — add TSOS proof section to output
- `scripts/builderos-stability-marker.mjs` UPDATE — record hook count snapshot

Each job must produce: OIL PASS → builder commit → 4-gate verifier PASS → `tsos_internal_hook` row → deploy parity auto-repair.

### 4.3 Verifier evidence needed

Per governed job, retain in `builderos_command_control_jobs.result_json`:

- `verifier.gates.syntax === true`
- `verifier.gates.antipattern === true`
- `verifier.gates.stub === true`
- `committed === true`
- Cross-reference `run_id = job.id` in hook row

**Read paths for audit:**

- `GET /api/v1/lifeos/builderos/tsos-efficiency`
- `GET /api/v1/lifeos/command-center/system-alpha-readiness`
- `GET /api/v1/lifeos/builderos/command-control/jobs/:id` (per job)

### 4.4 Estimated cycles and timeline

| Milestone | Cycles | Calendar (estimate) |
|-----------|--------|---------------------|
| G1 PROVEN gate wired | 1 governed build job | 1 session |
| G2 metadata enrichment | 1 governed build job | 1 session |
| G3 evidence accumulation | 3 governed execute cycles | 1–2 sessions |
| PROVEN visible in alpha | After G1+G2+≥3 linked hooks | **~2–4 sessions** |
| ACTIVE (routing changed by TSOS) | Not in scope — requires dispatch routing integration | Future |

**Current progress toward proposed PROVEN:** ~60% evidence, **0% scoring** (gate missing).

---

## 5. Low-risk improvement opportunities (Phase 4 — proposals only)

### 5.1 Hook deduplication

- Before INSERT, `SELECT 1 FROM autonomous_telemetry_events WHERE run_id=$1 AND task_type='tsos_internal_hook'`
- Skip duplicate on retry path if first commit path already emitted
- **Risk:** LOW | **Value:** HIGH confidence

### 5.2 Telemetry quality

- Populate `total_token_estimate` on hook rows from builder response token count (when available)
- Add `verifier_ok`, `target_file`, `commit_sha` to metadata JSON
- **Risk:** LOW | **Value:** satisfies contract §2.3

### 5.3 Proof receipts

- Write `AUDIT_VERIFICATION` receipt `type: tsos_hook_emitted` with `job_id`, `hook_row_id`, `verifier_ok`
- Enables PROVEN scoring without parsing raw telemetry JSON
- **Risk:** LOW | **Value:** audit trail for OIL

### 5.4 Auditability

- Extend `GET /api/v1/lifeos/builderos/tsos-efficiency` with:
  - `distinct_committed_jobs`
  - `verifier_linked_count`
  - `latest_hook_failure` (from logs table or receipt)
- **Risk:** LOW | **Value:** operator visibility

### 5.5 Confidence scoring

- Add `tsos_confidence_score` (0–1) to alpha component block:
  - +0.25 hook exists
  - +0.25 ≥3 distinct commits
  - +0.25 verifier linked
  - +0.25 structured efficiency fields present
- Display separately from maturity status — no score inflation
- **Risk:** MEDIUM (Zone 3) | **Value:** honest partial progress visibility

---

## 6. Phase 5 verification snapshot (2026-05-29)

| Check | Result |
|-------|--------|
| Proof freshness | **CURRENT** — deploy `32fa2343` == receipt `32fa2343` |
| Alpha readiness | **ALPHA_READY** — 94.3%, blockers `[]` |
| Supervised readiness | **true**, 0 blockers |
| TSOS hooks | **5** events, statuses WIRED+LIVE |
| TSOS efficiency route | 200 OK, `hook_status: LIVE` |
| Builder ready | `ok: true` |
| Governed jobs API | Mounted at `/api/v1/lifeos/builderos/command-control/jobs` |
| Verifier pipeline | Local 4-gate PASS on last target; runtime linkage not scored |

---

## 7. Recommended next governed mission

**Mission ID:** `TSOS-G1-PROVEN-GATE`

**Task:** Surgical edit to `services/builderos-system-alpha-readiness.js` — add PROVEN branch per §4.1 criteria A–E (fail-closed: all must pass).

**Why first:** Without this gate, additional hook events do not advance maturity. This is the highest-leverage, lowest-risk unblocking step.

**Execute via:**

```http
POST /api/v1/lifeos/builderos/command-control/jobs
POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute
```

**Spec summary:** Add query for distinct committed hook run_ids with structured metadata; add `verifier_linked` count from `builderos_command_control_jobs`; set `PROVEN` only when counts ≥3 and failures = 0.

**Do not touch:** memory routes, epistemic_facts, capsule/evidence tables.

---

## 8. Exact next step

1. Submit governed job **TSOS-G1-PROVEN-GATE** (Zone 3 patch to alpha readiness service).
2. After deploy + proof parity auto-repair, verify `tsos_internal_hooks.statuses` includes `PROVEN` when ≥3 linked hooks exist.
3. Submit governed job **TSOS-G2-HOOK-METADATA** to enrich hook rows.
4. Run **3** Zone 1 governed execute cycles; re-read alpha readiness after each.

---

## 9. TSOS-G3 routing decision log (G3.1 + G3.2)

### 9.1 G3.1 complete (2026-05-29)

- Table: `builderos_tsos_routing_decisions`
- Service: `services/builderos-tsos-routing.js` — `logShadowRoutingDecision`, `insertRoutingDecision`, `listRoutingDecisions`
- Hook: `routes/lifeos-council-builder-routes.js` after baseline policy + availability
- Read path: `GET /api/v1/lifeos/builderos/tsos-routing-decisions`
- Verified: 3 shadow rows, `decision_changed=false`, TSOS remains PROVEN (not ACTIVE)

### 9.2 G3.2 baseline routing audit (Phase 1)

**Baseline routing inputs** (observed in `dispatchTask`):

| Input | Source | Role |
|-------|--------|------|
| `mode`, `execution_only`, `model` | POST body | Mode + optional operator override |
| `target_file` | POST body | Task-class risk + prefix evidence |
| `routingKey` | Derived | `council.builder.{mode}` or `council.builder.code_execute` when execution-only |
| `requestedModel` | `model \|\| getModelForTask(routingKey) \|\| gemini_flash` | Static task map preference |
| `rawCandidateModels` | `getCandidateModelsForTask(routingKey)` or `[model]` | Candidate pool |
| `routingPolicy` | `applyBuilderRoutingPolicy()` | Task class + allowed/blocked models |
| `availability` | `filterAvailableCouncilMembers(filtered)` | Runtime provider availability |
| `preferredModel` | First available requested or first candidate | **Baseline model** (pre-memory) |

**Routing key generation:** `mode === 'code' && executionOnly && !model` → `council.builder.code_execute`; else `council.builder.${mode}`.

**Task classification path:** `classifyBuilderRoutingTask()` in `services/builderos-routing-policy.js` — uses routingKey, mode, executionOnly, targetFile extension/prefix.

**Model selection path (baseline):** `getModelForTask` → `applyBuilderRoutingPolicy` → `filterAvailableCouncilMembers` → `preferredModel`. Memory routing runs **after** shadow log (not part of G3.2 baseline).

**Policy filtering path:** `getBuilderRoutingPolicy()` returns `allowedModels`, `blockedModels`, escalation triggers per task class; `applyBuilderRoutingPolicy` filters candidates and blocks explicit overrides.

### 9.3 G3.2 comparator fields (shadow only)

Stored in `comparator_snapshot_json` + merged into GET response:

- `routing_key`, `task_class_baseline`, `task_class_selected`
- `baseline_model`, `selected_model` (equal in G3.2)
- `baseline_allowed_models`, `selected_allowed_models`
- `baseline_policy_source`, `selected_policy_source` — `builderos_routing_policy + task_model_map + availability`
- `operator_override` — true when explicit `model` in POST body
- `decision_changed` — always `false` in G3.2
- `change_reason_code` — always `null` in G3.2

**Evidence snapshot expansion (G3.2):** global hooks + prefix-scoped aggregates in `evidence_snapshot_json` — see `buildEvidenceSnapshot()` in `builderos-tsos-routing.js`.

### 9.4 G3.3 hypothetical shadow deltas (2026-05-29)

**Status:** IMPLEMENTED — shadow only; actual dispatch unchanged.

`computeTsosHypotheticalRouting()` applies three fail-open rules:

| Rule code | Trigger | Hypothetical effect |
|-----------|---------|---------------------|
| `tsos_target_prefix_risk` | `services/` or `routes/` prefix AND prefix `repair_count > 0` | Task class → `high_risk_repo_edit` |
| `tsos_repair_rate_escalation` | Prefix avg repair ≥ 1.5 AND verifier linkage ≥ 80% | Model escalate one tier within allowed set |
| `tsos_token_efficiency_downgrade` | Prefix token > global avg AND cheaper model verifier-passed success | Model downgrade one tier (skipped if escalation applied) |

**Hard rules (G3.3):**
- `decision_changed` column always `false` — actual dispatch uses baseline only
- Hypothetical fields stored in `comparator_snapshot_json`: `hypothetical_task_class`, `hypothetical_model`, `hypothetical_decision_changed`, `hypothetical_change_reason_code`, `hypothetical_change_reason_detail`, `hypothetical_policy_allowed`
- GET route labels: `shadow_only: true`, `actual_dispatch_changed: false`

### 9.5 Next: TSOS-G3.4

Apply TSOS adjustments in `mode=active` on bounded task classes only — still requires ACTIVE gate + verifier script before maturity promotion.

---

## References

- `docs/projects/builderos-remediation/TSOS_HOOK_BOUNDARY.md` — ratified maturity contract
- `services/builderos-system-alpha-readiness.js` — runtime scorer (PROVEN gap)
- `services/builderos-tsos-hook-service.js` — hook emitter
- `services/builderos-governed-loop-executor.js` — hook caller
- `routes/tsos-efficiency-routes.js` — proof read surface
- `scripts/builderos-gap-report.mjs` — known blocker registry
