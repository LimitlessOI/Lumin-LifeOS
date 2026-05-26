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
| 2026-05-26 | `routes/canonical-system-routes.js` (NEW, 110 lines) + `startup/register-runtime-routes.js` (+3 lines) | Phase 20 — Canonical System Monitoring Routes (H-2). Builder committed `dd902213` (groq_llama) with 2 bug classes: factory param `rk` not `requireKey`; `pool.query()` result not destructured (QueryResult not array — affects all 3 routes). GAP-FILL: 4-line targeted repair. 3 routes: GET /lifeos/optimizer/stats, GET /lifeos/system/fix-history, GET /lifeos/user/simulation/accuracy. node --check PASS. | Phase 20 completes H-2 strategy for the system/admin routes. Legacy redirect (Phases 26-28) can now proceed. |
| 2026-05-26 | `routes/canonical-backlog-routes.js` (NEW, 85 lines) + `startup/register-runtime-routes.js` (+3 lines) | Phase 19 — Canonical Project Backlog Routes (H-2). Builder committed `880e5f4a` (groq_llama) with 2 bugs: (1) factory param `rk` not `requireKey` — `router.use(undefined)` crashes router; (2) PATCH validation used falsy check instead of `=== undefined`. GAP-FILL: 2-line repair. 6 routes: GET/POST /projects/backlog + /:id/{complete,skip,reactivate} + PATCH /:id. All auth via `router.use(requireKey)`. node --check PASS. | Advance H-2 coverage: 6 project_backlog legacy surfaces now have canonical equivalents. |
| 2026-05-26 | `routes/canonical-execution-routes.js` (NEW, 87 lines) + `startup/register-runtime-routes.js` (mount, +3 lines) | Phase 18 — Canonical Execution + AI Kill-Switch Routes (H-2). Builder committed `fe6be9e1` (groq_llama) with 3 bugs: (1) factory param `rk` not `requireKey` — all routes unauthenticated on mount; (2) SQL unquoted string literals in `IN (pending, running, queued)` and `CASE WHEN running` — PostgreSQL syntax error; (3) no try/catch/next(err). GAP-FILL: complete rewrite. 4 routes: GET /lifeos/tasks/queue, GET /lifeos/admin/ai/performance, POST /lifeos/admin/ai/enable, POST /lifeos/admin/ai/disable. node --check PASS both files. | Advance H-2 canonical replacement coverage: tasks/queue, ai/performance, ai/enable, ai/disable. |
| 2026-05-26 | `routes/canonical-admin-routes.js` (NEW, 88 lines) + `startup/register-runtime-routes.js` (mount, +3 lines) | Phase 17 — Canonical Admin Routes (H-2 strategy). Builder committed `a89c73b6` (groq_llama) with 8 bugs: (1) `import { pool } from '../startup/db.js'` — nonexistent path; (2) `import { requireKey } from '../startup/auth.js'` — nonexistent path; (3) `const router = express.Router()` at module level (outside factory) — mounts duplicate routes on every `app.use()` call; (4) `requireKey` applied only to `/health` (wrong — should be auth-required on status, snapshot, effectiveness; health is public); (5) `req.params.pool` used instead of `pool` from factory closure; (6) `INTERVAL '$1 hours'` with a `$1` param — invalid PostgreSQL (interval must be a literal string, not a parameter placeholder); (7) no null-guard on `rows[0]?.latest` in snapshot query; (8) leftover unused imports from template. GAP-FILL: complete rewrite. Factory exports `createCanonicalAdminRoutes({ requireKey, pool })`. 4 routes: GET /api/v1/lifeos/admin/ai/status (public env read), GET /api/v1/lifeos/system/snapshot (requireKey — max receipt timestamp + deploy SHA), GET /api/v1/lifeos/system/health (public), GET /api/v1/lifeos/admin/ai/effectiveness (requireKey — model effectiveness from autonomous_telemetry_events). `startup/register-runtime-routes.js`: added import + `app.use(createCanonicalAdminRoutes({ pool, requireKey }))`. `node --check` PASS both files. | H-2 strategy: build canonical replacements first, then redirect legacy surfaces. Closes LEGACY_AUTHORITY_SURFACES_STILL_LIVE partial — canonical admin/status routes now live. |
| 2026-05-25 | `services/builderos-system-alpha-readiness.js` | Phase B — added `memoryDb` live DB query block (SELECT COUNT(*) + latest row from `self_repair_memory_events`). Updated memory component: `statuses` WIRED→['WIRED','LIVE'] when table queryable without error; proof_source changed from 'structural only' to `GET /api/v1/lifeos/command-center/memory/status` with live evidence string showing event count + latest timestamp. GAP-FILL: 442-line file — builder generates stubs for surgical edits to files >150 lines (documented BUILDEROS_BUILDER_LIMITATIONS.md). node --check PASS. | Move Memory from WIRED to LIVE in Alpha score using live DB truth. |
| 2026-05-25 | `services/builderos-system-alpha-readiness.js` | Removed hardcoded `usefulWork = 0.321`. Now computes live `avg_useful_work_score` from `autonomous_telemetry_events` over 168h window. Returns `NO_DATA` when no scored events exist. Exposes `useful_work_score_live` and `useful_work_score_source` in `scoring_method`. | Alpha % was partly computed from a frozen literal — fake-green risk. Score now reflects runtime truth. |
| 2026-05-25 | `services/autonomous-telemetry-session.js` | Renamed two cycle def `task_type` values to canonical names: `prevention_hook.deploy_check` → `prevention_hook.deploy_drift`; `self_repair.executor_dry_run` → `self_repair.dry_run`. | Duplicate task_type pairs confirmed across all 9 overnight batches. Efficiency analysis was counting same event under two names. Unified to canonical names used by `autonomous-telemetry-instrumentation.js`. |
| 2026-05-25 | `services/autonomy-scheduler.js` | Added `@legacy PRODUCT-LEVEL` header. Changed gate from confusing `LIFEOS_DIRECTED_MODE !== 'false'` to explicit `LEGACY_SCHEDULER_ENABLED=true` opt-in. Backward compat preserved via OR condition. | 12 ungoverned AI calls without useful-work-guard. File is product-level (BoldTrail, Digital Twin, Pipeline). BuilderOS governed runtime must not start these automatically. |
| 2026-05-25 | `routes/command-center-routes.js` | Upgraded LEGACY NOTICE with `@legacy STATUS: LEGACY` tag, canonical replacement pointer, and full inventory of 27 routes that remain callable and why. | Operators needed to know which routes have canonical replacements and which must remain callable. Quarantine without deletion. |
| 2026-05-25 | `services/autonomy-orchestrator.js` | Added `@legacy STATUS: LEGACY_INACTIVE` header with evidence: `.start()` is never called anywhere in the codebase. Only two utility methods are called via HTTP routes (`completeProject`, `skipProject`). | Resolved UNKNOWN classification from structural audit. Autonomous loop verified inactive. |
| 2026-05-25 | `docs/architecture/BUILDEROS_TRUE_PRODUCTION_AUTONOMY_ROADMAP.md` | NEW — Complete production autonomy roadmap per Adam STOP directive. 8 sections: current maturity (73.8% partially illusory), 15 numbered gaps (GAP-001 through GAP-015), Autonomy Maturity Model with new PRODUCTION_SAFE level, Zone 1-4 mutation architecture + anti-stub protocol, governance constitution, 30 prioritized executable phases with specs/risk/verify/rollback, Appendices A/B/C (top-10 risks, safest phases, 10 blockers to true autonomy). GAP-FILL: docs/ not in builder SAFE_WRITE_PATHS — builder rejects with outside-safe-scope error. | Adam STOP directive required complete BuilderOS reality-to-autonomy roadmap before any further implementation work. |
| 2026-05-26 | `scripts/useful-work-guard-audit.mjs` | Phase 01 — Useful-Work-Guard Coverage Audit. Builder committed broken version (groq_llama, domain_context_loaded:false) with regex-escaped patterns used via .includes() (zero matches), classifyFile() defined but never called, classification never set on result objects. GAP-FILL repair: rewrote with plain-string patterns, per-file classification, line-number tracking, HIGH_RISK_SCHEDULED detection. AUDIT RESULTS: 643 files scanned, 116 with AI calls, GUARDED=1 (lane-intel-service.js; audit script is false positive due to pattern strings in literals), PB_GOVERNED=0, UNGUARDED=113, HIGH_RISK_SCHEDULED=3 (idea-engine/index.js, autonomy-orchestrator.js, email-triage.js), coverage=~0.9%. Exit 1 confirmed. node --check PASS. Runtime verified. | Close USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE blocker. True coverage is 0.9%, not the 36% previously estimated — 113 unguarded AI call sites across 113 files require guard wrapping. |
| 2026-05-26 | `services/telemetry-cycle-guard.js` | Phase 02 — Telemetry Cycle Guard helper. Builder committed b00170dc (groq_llama) with hasTelemetryCycleContext returning true for { sessionId: undefined } and {} — undefined values not caught (checked !== null and !== '' but not typeof string). GAP-FILL repair: replaced with typeof === 'string' && length > 0 guards; moved JSDoc outside function bodies; added module header. EXPORTS: normalizeTelemetryCycleContext, hasTelemetryCycleContext, shouldEmitOuterTelemetry, shouldSkipOuterEmit, buildSuppressedOuterTelemetryResult. 22/22 smoke tests PASS. node --check PASS. Zero runtime side effects (pure functions, no imports). | Phase 02 prerequisite for Phase 03 — supplies the emitsOwnTelemetry guard logic that autonomous-telemetry-session.js will import to stop duplicate telemetry rows for deploy_prevention_hook and self_repair_dry_run cycles. |
| 2026-05-26 | `services/idea-engine/index.js` | Phase 08 — Fail-closed guard + @legacy header + @ssot tag. (1) Added `@ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md` and `@legacy STATUS: LEGACY_INACTIVE` to JSDoc header — confirmed not imported by server.js, startup/, or any route file. (2) Added env guard at top of `startScheduler()`: if `IDEA_ENGINE_SCHEDULER_ENABLED !== 'true'`, log warning and return without starting setInterval. This blocks all callCouncilMember calls since they are only reachable via `run()` which is only called from startScheduler. Zone 3 (546→558 lines). GAP-FILL: builder stubs confirmed for Zone 3. node --check PASS. | Phase 01 audit flagged HIGH_RISK_SCHEDULED. Investigation: file not imported in production, startScheduler() was unguarded and would fire 20+ callCouncilMember calls per 30-minute cycle if ever called. Guard prevents activation without explicit IDEA_ENGINE_SCHEDULER_ENABLED=true. |
| 2026-05-26 | (runtime verification) | Phase 14 — Proof freshness auto-repair trigger VERIFIED. No code change required. Mechanism already wired: `startup/boot-domains.js:bootSelfRepairDeployCheck()` (45s after boot, guarded by `createUsefulWorkGuard`) → `runDeployDriftPreventionHook` → `runSelfRepairExecutor` → receipt write → proof refresh. Verification: manually triggered `POST /self-repair/deploy-check` while proof was STALE (deploy_sha=c6b8e3ca ≠ receipt_sha=f473e70c). Result: `{ok:true, action:"execute", reason:"PASS"}`. Follow-up `GET /system-alpha-readiness` showed `proof_freshness: CURRENT, readiness_true: true, repair_queue_open: 0, phase14_status: ALPHA_READY`. Full STALE→repair→CURRENT cycle confirmed. | Phase 14 directive: prove STALE → repair attempt → CURRENT. Existing mechanism passes end-to-end. |
| 2026-05-26 | `services/builderos-metrics-reporter.js` + `routes/autonomous-telemetry-routes.js` | Phase 16 — Telemetry Metrics Completeness. Builder committed `6c2160ce` (groq_llama) with 13 bugs: (1) unused `import { Pool } from 'pg'` and wrong `import { pool }` from nonexistent startup/db.js; (2) `sinceEpoch` as Unix epoch seconds — PostgreSQL TIMESTAMPTZ needs ISO string; (3) all 12 `pool.query()` calls assigned to metrics without `.rows[0]` unwrap — metrics would be QueryResult objects; (4) `COUNT(boolean_expr)` in PostgreSQL always counts non-null values (counts everything) — should be `COUNT(*) FILTER (WHERE ...)`; (5) `COUNT(DISTINCT session_id WHERE ...)` — invalid SQL syntax; (6) `overnight_throughput` uses `$1` for both divisor and timestamp — param overlap; (7) single try/catch — any query failure returns all-null; (8) wrong column names: `wall_time_ms` → `wall_clock_ms`, `token_estimate` → `total_token_estimate`, `retry_count` → `retries`; (9) `task_type = 'hallucination_detected'` — schema has dedicated `hallucination_detected` boolean column. GAP-FILL: complete rewrite. Exports `computeAllBuilderOSMetrics(pool, { sinceHours })`. Uses 5 targeted queries with per-query null-safe try/catch. All 17 fields always present. 3 new metrics added: `drift_frequency`, `overnight_throughput`, `autonomous_continuation_rate`. `context_growth_rate` = null (no column). `autonomous_continuation_rate` uses subquery counting sessions with >1 event. Added `GET /api/v1/lifeos/autonomous-telemetry/metrics` endpoint to routes/autonomous-telemetry-routes.js (+16 lines). node --check PASS both files. | Close TELEMETRY_GAPS_REMAIN — all 17 required metric fields present in response. |
| 2026-05-26 | `scripts/alpha-loop-stress-test.mjs` | Phase 15 — Alpha Acceptance Loop Stress Test Script. Builder committed `3812fc97` (groq_llama, domain_context_loaded:true) with 5 bugs: (1) markdown fences + JSON metadata embedded at lines 87-96 → SyntaxError; (2) `Authorization: Bearer` header instead of `x-command-key`; (3) `import fetch from 'node-fetch'` external dependency (spec said no deps); (4) `data.repair_queue.open_count` — proof-freshness endpoint has no `repair_queue` field (separate endpoint); (5) timeout logic `i * 5 >= 120` never fires inside for loop. GAP-FILL: complete rewrite. Exports none (CLI script). Reads PUBLIC_BASE_URL + COMMAND_CENTER_KEY from process.env (falls back to .env parse, no external deps). Uses native fetch. Steps: (1) pre-test proof state, (2) trigger deploy-check (action:execute), (3) poll every 5s up to 120s, (4) report final proof + repair_queue. node --check PASS. **STRESS TEST RESULTS: PASS (exit 0) after RACE-002 fix** — First run exposed RACE-001 (Railway auto-deployed 3812fc97 during repair, SHA advanced mid-repair) and RACE-002 (PF-002 false-stale: cert written 530ms before repair receipt in same cycle). Fixed RACE-002: added 60s tolerance to PF-002 — same-cycle ordering now passes as CURRENT. Deployed fix (36c67f22). Re-ran stress test: `ok:true, action:execute, reason:PASS` → proof=CURRENT on first poll, repair_queue open=0. Exit 0. Full loop verified: STALE→detect→authorize→execute→verify→CURRENT without human step. RACE-001 deferred to Phase 21 (local/Railway proof store alignment). | Close GAP-015 — loop verified end-to-end as automated circuit. |
| 2026-05-26 | `scripts/enforce-mutation-ban.mjs` | Phase 12 — Large-file mutation ban enforcement. Builder committed `044335dd` (groq_llama) with TypeScript syntax in .mjs file (interface declarations, type annotations — SyntaxError on node --check), plus corrupted markdown fences embedded in JS (lines 75-83), classifyMutationZone() return value used as number (it returns an object), no exports, self-test used nonexistent fixture files. GAP-FILL: complete rewrite. Imports classifyMutationZone from classify-mutation-zone.mjs. Exports: `checkMutationAllowed(filePath, commitMessage?)` → `{allowed, zone, label, reason, remedy}`. Policy: Zone 1 → always allowed; Zone 2 → allowed with warning; Zone 3 → requires GAP-FILL: or [system-build] in commit message; Zone 4 → always blocked. Also exports `batchCheckFiles(filePaths, commitMessage?)`. CLI: single file or --batch <files> -- <msg>. Self-test: 6/6 PASS. node --check PASS. | Block builder mutations to Zone 3 (large existing JS) and Zone 4 (infra) without explicit annotation. Enforces the policy that all Zone 3 mutations must be GAP-FILLs. |
| 2026-05-26 | `scripts/classify-mutation-zone.mjs` | Phase 11 — Builder zone guard / mutation zone classifier. Builder committed `5b3ff0d1` (groq_llama) with corrupted output (markdown fences + JSON metadata embedded in JS file at lines 139-146), plus 4 logic bugs: `stats.size <= 150` checked bytes not lines; `isCautionFileLines` defined but never called; `isRuntimePath` used `path.dirname()` with trailing slashes (never matched); self-test used nonexistent fixture files. GAP-FILL: complete rewrite. Exports `classifyMutationZone(filePath)` → `{zone, label, lineCount, reason, blockerPaths}` and `getZonePolicy(zone)` → `{allowBuilder, requiresGapFill, description}`. Zone 4 paths: startup/, middleware/, core/, config/, server.js (basename match). Zone checked as path prefix (no trailing slash bug). CLI prints zone + policy. Self-test: 7/7 PASS (all 4 zones + Zone 4 variations). node --check PASS. | Prerequisite for Phase 12 — large-file mutation ban enforcement. Prevents builder from being called on Zone 3/4 files. Confirms Zone 1 before builder attempts. |
| 2026-05-26 | `scripts/verify-builder-output.mjs` | Phase 10 — Builder anti-stub output verifier. Builder committed `0ed565a8` (groq_llama, domain_context_loaded:false) with 4 logic bugs: (1) `stubMarkers.includes(line.trim())` only matched if entire line IS the marker — never fired; (2) `line.trim() === ''` flagged blank lines as stubs (false positives on every JS file); (3) `line.includes('...')` flagged spread operators; (4) self-test read non-existent files. GAP-FILL repair: complete rewrite with correct logic. Exports: `detectBuilderStub(filePath, originalLines?)` and `verifyBuilderCommit(filePath, preCommitLines?)`. 5 stub signals: line_count_collapse (original>100 now<30), too_short (<15 lines), stub_marker (TODO/PLACEHOLDER/not implemented), comment_ellipsis (// ...), empty_export_function_body. Self-test: 5/5 PASS. CLI: exits 0=OK, exits 1 with explanation. node --check PASS. | Prevent builder committed:true stub files from entering production. groq_llama confirmed unable to produce correct detection logic from spec alone — 4 bugs in 57-line output. |

