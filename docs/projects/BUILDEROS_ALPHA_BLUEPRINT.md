# BUILDEROS ALPHA BLUEPRINT

**Product key:** `builderos-alpha`  
**Product name:** BuilderOS Alpha — Autonomous Programming Machine  
**Status:** `DRAFT`  
**Owner:** Adam  
**Verifier:** OIL / CAI  
**Priority:** runtime truth > governance integrity > useful work > speed > cost  
**Last Updated:** 2026-05-25 (Instrumentation Consolidation + Legacy Quarantine phase)

---

## 0. Purpose

BuilderOS is the internal autonomous programming machine.

BuilderOS exists to safely:

- detect issues
- classify issues
- authorize bounded PB work
- execute repairs/builds
- verify runtime truth
- write receipts
- prevent repeated failures
- continue useful work

without Adam handling routine operational work.

BuilderOS is not LifeOS.
BuilderOS is not TSOS.

LifeOS is a product built by BuilderOS.  
TSOS is an external AI efficiency/routing product.  
BuilderOS is the internal governed machine.

---

## 1. System Boundary

BuilderOS includes:

- Builder
- OIL
- Council AI
- TSOS-facing internal efficiency hooks only when used by BuilderOS
- Memory
- PB execution authority
- proof freshness
- self-repair executor
- prevention hooks
- telemetry
- overnight runner
- Command Center cockpit
- useful-work-guard

BuilderOS does not include as scoring-positive product surface:

- LifeOS user features
- TSOS customer-facing features
- TC / coaching / family / consumer product UX
- overlay polish that does not prove system capability

---

## 2. Canonical Separation

### 2.1 BuilderOS
Internal autonomous programming machine.

### 2.2 TSOS / TokenSaverOS
External AI efficiency + routing + savings product:

- gateway/proxy
- prompt compression
- decoder packets
- routing
- drift checks
- savings ledger

TSOS must not expose BuilderOS internals.

### 2.3 LifeOS
Customer-facing product lane built by BuilderOS.

---

## 3. Runtime Truth Sources

Only these count as runtime proof for BuilderOS Alpha:

1. `GET /api/v1/lifeos/command-center/supervised-autonomy/readiness`
2. `GET /api/v1/lifeos/command-center/proof-freshness`
3. `GET /api/v1/lifeos/command-center/self-repair/repair-queue`
4. `GET /api/v1/lifeos/autonomous-telemetry/efficiency`
5. `GET /api/v1/lifeos/autonomous-telemetry/events`
6. `data/governed-autonomy-overnight-state.json`
7. `data/governed-autonomy-overnight-log.jsonl`
8. `data/builder-continuous-queue-log.jsonl`
9. Receipts/tables:
   - `builder_audit_receipts`
   - `security_receipts`
   - `autonomous_telemetry_events`
   - `builder_halt_log`
   - `builder_task_receipts`

Supporting context only:

- SSOT docs
- manifests
- repo inspection
- amendments
- overlays
- route existence

Docs alone earn zero Alpha credit.

---

## 4. Classification States

Every BuilderOS component must be classified using:

- `NOT_WIRED`
- `WIRED`
- `LIVE`
- `PROVEN`
- `ACTIVE`

Rules:

- `WIRED` means code exists and is connected
- `LIVE` means responding now
- `PROVEN` means receipts/logs/runtime evidence show real success
- `ACTIVE` means currently operating in scheduled/live cycles
- a component may hold multiple states at once
- `LIVE` does not imply `PROVEN`
- `PROVEN` does not imply `ACTIVE`

---

## 5. Alpha Definition

BuilderOS Alpha means:

The autonomous build system can safely detect issues, execute bounded PB-authorized work, verify outcomes with runtime proof, write receipts, prevent repeated failures, and continue useful work without Adam performing routine operations.

Healthy idle is a valid Alpha state when:

- proof is `CURRENT`
- readiness is true
- repair queue is `0`
- no authorized work is pending

---

## 6. Alpha Acceptance Loop

BuilderOS is not Alpha unless this loop succeeds in runtime:

1. deploy introduces drift or stale proof
2. system detects issue automatically
3. PB authority classifies and authorizes bounded work
4. self-repair executor runs
5. proof freshness returns `CURRENT`
6. receipts/logs are written
7. repair queue clears
8. system resumes healthy operation without Adam

This loop must be verified against:

- `services/oil-self-repair-detector.js`
- `services/pb-execution-authority.js`
- `services/self-repair-executor.js`
- `services/oil-proof-freshness.js`
- `services/self-repair-memory.js`
- `services/self-repair-prevention-registry.js`

---

## 7. Component Inventory

Canonical BuilderOS Alpha components:

1. Builder
2. OIL
3. Council
4. PB authority
5. Proof freshness
6. Self-repair
7. Prevention
8. Memory
9. Telemetry
10. Overnight orchestrator
11. Command Center
12. Useful-work-guard

---

## 8. Alpha Scoring

### 8.1 Loop Integrity — 40%

Equal-weight nodes:

- detect
- classify
- authorize
- execute
- verify
- receipt
- continue/halt

### 8.2 Component Readiness — 60%

Equal-weight components:

- Builder
- OIL
- Council
- PB authority
- Proof freshness
- Self-repair
- Prevention
- Memory
- Telemetry
- Overnight orchestrator
- Command Center
- Useful-work-guard

### 8.3 Scoring Rules

- runtime evidence only
- docs alone = 0
- fake-green deducts score
- `WIRED` < `LIVE` < `PROVEN` < `ACTIVE`
- partial credit only for real runtime proof

### 8.4 Bonus

`+5%` if `avg_useful_work_score > 0.50` over rolling 7-day window.

---

## 9. Required Metrics

BuilderOS Alpha must measure:

- `avg_useful_work_score`
- `repair_success_pct`
- `failed_build_pct`
- `retry_waste_pct`
- `proof_recovery_time_ms`
- `average_repair_cost_ms`
- `average_build_latency_ms`
- `average_verification_latency_ms`
- `token_estimate_sum`
- `useful_work_per_1k_tokens`
- `drift_frequency`
- `hallucination_frequency`
- `repair_queue_depth`
- `overnight_throughput`
- `autonomous_continuation_rate`

Decision latency and execution latency must remain separate metrics.

---

## 10. Useful-Work Guard Requirement

BuilderOS is not Alpha if autonomous AI calls can execute without useful-work-guard protection.

All scheduled/orchestrated/autonomous AI execution paths must be audited for:

- `createUsefulWorkGuard()`

Any unguarded autonomous AI execution path is an Alpha blocker.

---

## 11. Fake-Green Risks

Must be tracked explicitly:

- docs claiming more than runtime proves
- stale proof surfaces
- local-only proof paths
- duplicate telemetry systems
- hidden Adam dependency
- partial self-repair presented as full repair
- legacy fallbacks silently acting as truth
- multiple DB pools causing fragmented proof
- route existence mistaken for runtime health

---

## 12. Component-Level Drift + Rewind

BuilderOS must support targeted component rewind, not only whole-system rollback.

For each major subsystem track:

- `component_id`
- `blueprint_version`
- `code_commit_sha`
- `deployed_sha`
- `runtime_status`
- `useful_work_score`
- `drift_score`
- `last_known_good_commit`
- `peak_performance_window`
- `rollback_scope`
- `dependent_components`
- `safe_rewind_steps`

If a component degrades:

1. identify last known good state
2. compare blueprint vs code vs runtime behavior
3. isolate the smallest changed unit
4. propose or execute component-level rewind under PB authority
5. verify runtime proof after rewind
6. write receipts explaining what changed and why

Targetable examples:

- blueprint generator only
- OIL auditor only
- memory writer only
- telemetry scorer only
- self-repair executor only
- prevention hook only

---

## 13. Regression Resistance

Regression resistance matters more than feature count.

BuilderOS must survive:

- deploy drift
- stale proof
- partial subsystem failure
- queue starvation
- model degradation
- telemetry disagreement

without silently regressing into human babysitting.

---

## 14. Two-Year Lookback Filter

BuilderOS planning must include a 2-year hindsight audit for:

- what we are glad we built early
- what we regret delaying
- what became technical debt
- what created hidden fragility
- what caused token waste
- what falsely appeared autonomous
- what improved scaling
- what prevented collapse
- unintended consequences
- what became systemic contamination

Specific long-horizon risks:

- duplicate telemetry systems
- fake-green
- hidden human dependency
- unbounded loops
- silent drift
- stale proof surfaces
- weak runtime verification
- route duplication
- multiple DB pools
- memory fragmentation
- uncontrolled context growth
- silent degraded models
- prevention hooks not learning
- UI over runtime integrity

---

## 15. Alpha / Beta / Production Criteria

### Alpha

- self-repair loop proven at runtime
- proof freshness/governance honest
- PB authority working
- useful-work-guard coverage mostly known
- telemetry and overnight runner partially proven

### Beta

- overnight runner proves repeated useful work
- prevention hooks reduce repeat failures
- component drift scoring and rewind workflow working
- token efficiency metrics trusted

### Production

- sustained autonomous continuation without hidden Adam dependency
- repeatable regression resistance
- prevention learning outpaces repair recurrence
- truthful observability across all canonical stores

---

## 16. Initial Build Priorities

1. canonical BuilderOS system-alpha readiness endpoint
2. live component matrix
3. useful-work-guard coverage audit
4. overnight runner runtime audit
5. prevention registry effectiveness audit
6. component drift + rewind registry
7. fake-green detector expansion
8. telemetry reconciliation across stores
9. hidden Adam dependency measurement
10. autonomous continuation scoring
11. repair success analytics
12. retry waste analytics
13. hallucination frequency metric
14. drift frequency metric
15. regression-resistance benchmark suite
16. component-level rollback capsules
17. route duplication audit
18. proof-store fragmentation audit
19. memory fragmentation audit
20. model degradation detection
21. dynamic cognition depth routing
22. TSOS/BuilderOS boundary enforcement
23. system-vs-product scoring guardrails
24. continuous self-benchmarking
25. healthy-idle validation

---

## 17. Current Thesis

The real Alpha milestone is not “AI coding.”

It is:

Adam sleeps, BuilderOS continues useful governed work, repairs itself when needed, avoids waste, and is measurably better by morning.

---

## Change Receipts

| Date | File | What | Why |
|---|---|---|---|
| 2026-05-25 | `services/builderos-system-alpha-readiness.js` | Phase B — added `memoryDb` live DB query block (SELECT COUNT(*) + latest row from `self_repair_memory_events`). Updated memory component: `statuses` WIRED→['WIRED','LIVE'] when table queryable without error; proof_source changed from 'structural only' to `GET /api/v1/lifeos/command-center/memory/status` with live evidence string showing event count + latest timestamp. GAP-FILL: 442-line file — builder generates stubs for surgical edits to files >150 lines (documented BUILDEROS_BUILDER_LIMITATIONS.md). node --check PASS. | Move Memory from WIRED to LIVE in Alpha score using live DB truth. |
| 2026-05-25 | `services/builderos-system-alpha-readiness.js` | Removed hardcoded `usefulWork = 0.321`. Now computes live `avg_useful_work_score` from `autonomous_telemetry_events` over 168h window. Returns `NO_DATA` when no scored events exist. Exposes `useful_work_score_live` and `useful_work_score_source` in `scoring_method`. | Alpha % was partly computed from a frozen literal — fake-green risk. Score now reflects runtime truth. |
| 2026-05-25 | `services/autonomous-telemetry-session.js` | Renamed two cycle def `task_type` values to canonical names: `prevention_hook.deploy_check` → `prevention_hook.deploy_drift`; `self_repair.executor_dry_run` → `self_repair.dry_run`. | Duplicate task_type pairs confirmed across all 9 overnight batches. Efficiency analysis was counting same event under two names. Unified to canonical names used by `autonomous-telemetry-instrumentation.js`. |
| 2026-05-25 | `services/autonomy-scheduler.js` | Added `@legacy PRODUCT-LEVEL` header. Changed gate from confusing `LIFEOS_DIRECTED_MODE !== 'false'` to explicit `LEGACY_SCHEDULER_ENABLED=true` opt-in. Backward compat preserved via OR condition. | 12 ungoverned AI calls without useful-work-guard. File is product-level (BoldTrail, Digital Twin, Pipeline). BuilderOS governed runtime must not start these automatically. |
| 2026-05-25 | `routes/command-center-routes.js` | Upgraded LEGACY NOTICE with `@legacy STATUS: LEGACY` tag, canonical replacement pointer, and full inventory of 27 routes that remain callable and why. | Operators needed to know which routes have canonical replacements and which must remain callable. Quarantine without deletion. |
| 2026-05-25 | `services/autonomy-orchestrator.js` | Added `@legacy STATUS: LEGACY_INACTIVE` header with evidence: `.start()` is never called anywhere in the codebase. Only two utility methods are called via HTTP routes (`completeProject`, `skipProject`). | Resolved UNKNOWN classification from structural audit. Autonomous loop verified inactive. |
| 2026-05-25 | `docs/architecture/BUILDEROS_TRUE_PRODUCTION_AUTONOMY_ROADMAP.md` | NEW — Complete production autonomy roadmap per Adam STOP directive. 8 sections: current maturity (73.8% partially illusory), 15 numbered gaps (GAP-001 through GAP-015), Autonomy Maturity Model with new PRODUCTION_SAFE level, Zone 1-4 mutation architecture + anti-stub protocol, governance constitution, 30 prioritized executable phases with specs/risk/verify/rollback, Appendices A/B/C (top-10 risks, safest phases, 10 blockers to true autonomy). GAP-FILL: docs/ not in builder SAFE_WRITE_PATHS — builder rejects with outside-safe-scope error. | Adam STOP directive required complete BuilderOS reality-to-autonomy roadmap before any further implementation work. |
| 2026-05-26 | `scripts/useful-work-guard-audit.mjs` | Phase 01 — Useful-Work-Guard Coverage Audit. Builder committed broken version (groq_llama, domain_context_loaded:false) with regex-escaped patterns used via .includes() (zero matches), classifyFile() defined but never called, classification never set on result objects. GAP-FILL repair: rewrote with plain-string patterns, per-file classification, line-number tracking, HIGH_RISK_SCHEDULED detection. AUDIT RESULTS: 643 files scanned, 116 with AI calls, GUARDED=1 (lane-intel-service.js; audit script is false positive due to pattern strings in literals), PB_GOVERNED=0, UNGUARDED=113, HIGH_RISK_SCHEDULED=3 (idea-engine/index.js, autonomy-orchestrator.js, email-triage.js), coverage=~0.9%. Exit 1 confirmed. node --check PASS. Runtime verified. | Close USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE blocker. True coverage is 0.9%, not the 36% previously estimated — 113 unguarded AI call sites across 113 files require guard wrapping. |

