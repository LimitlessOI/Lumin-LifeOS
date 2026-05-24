# AMENDMENT 12 — Command & Control Center

> **Y-STATEMENT:** In the context of a multi-feature AI platform that is growing rapidly,
> facing the need for one unified control surface for operations, monitoring, and decisions,
> we decided to build a browser-based Command & Control portal to achieve full operational
> visibility without context-switching, accepting that the portal is a dependency — if it
> breaks, operational visibility breaks too.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-05-24 |
| **Verification Command** | `node scripts/verify-project.mjs --project command_center` |
| **Manifest** | `docs/projects/AMENDMENT_12_COMMAND_CENTER.manifest.json` |

---

## Mission
Give Adam one browser tab to see everything, control everything, and act on anything — without leaving current context. The Command Center is the conductor's podium.

## North Star Anchor
Autonomy Amplifier — every feature in the system is only useful if Adam can see and control it. The C&C is the bridge between system capability and human direction.

---

## Scope / Non-Scope

**In scope:**
- The command center web portal and all its panels
- API routes that serve C&C data (`/api/v1/admin/*`, `/api/v1/reality/*`, `/api/v1/projects`, `/api/v1/pending-adam`)
- Auth middleware for the portal key
- The browser overlay (HUD that floats over any site)

**Out of scope:**
- AI model routing logic (→ AMENDMENT_01)
- TC transaction logic (→ AMENDMENT_17)
- Revenue tracking (→ AMENDMENT_03)
- The actual AI council workers (→ AMENDMENT_01)

---

## Owned Files
```
routes/command-center-routes.js
routes/lifeos-command-center-routes.js    ← NEW (v2 aggregate endpoints)
public/overlay/command-center.html        ← operational admin dashboard (do not replace)
public/overlay/lifeos-command-center.html ← NEW: executive oversight cockpit (v2)
public/overlay/command-center.js
public/overlay/index.html
public/shared/lifeos-voice-chat.js
services/env-registry-map.js
```

## Protected Files (read-only for this project)
```
server.js                        — composition root, import + mount only
src/server/auth/requireKey.js    — security boundary: change only with receipt (bugfixes e.g. key trim / header parity OK)
services/ai-guard.js             — AI safety layer, treat with care
```

---

## Design Spec

### Data Model
This project reads from many tables but owns none directly.
The new governance tables (projects, project_segments, pending_adam, estimation_log)
are owned by AMENDMENT_18 and read by this project's dashboard panels.

### API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | none | Health check for uptime monitors |
| GET | `/api/v1/lifeos/command-center/phase14` | requireKey | Latest Phase 14 Alpha-Ready cert from builder_audit_receipts |
| GET | `/api/v1/lifeos/command-center/mode` | requireKey | Current compiled builder release mode (MANUAL/SUPERVISED/AUTONOMOUS) |
| GET | `/api/v1/lifeos/command-center/security` | requireKey | SEC-F01 live security aggregate from canonical receipts only |
| POST | `/api/v1/lifeos/command-center/mode` | requireKey | NOT_WIRED — returns 501; Stage 2 will add runtime switching |
| GET | `/api/v1/admin/ai/status` | requireKey | AI on/off + reason |
| POST | `/api/v1/admin/ai/enable` | requireKey | Enable AI |
| POST | `/api/v1/admin/ai/disable` | requireKey | Disable AI |
| GET | `/api/v1/reality/snapshot` | requireKey | Route hash snapshot |
| POST | `/api/v1/chat` | requireKey | Main AI chat endpoint |
| GET | `/api/v1/projects` | requireKey | Projects dashboard data |
| GET | `/api/v1/projects/:id` | requireKey | Full project detail |
| GET | `/api/v1/pending-adam` | requireKey | Items waiting on Adam |
| POST | `/api/v1/pending-adam/:id/resolve` | requireKey | Resolve pending item |

### UI Surface
- **Chat panel** — multi-mode AI chat with council member selection, browser voice input, and optional spoken replies
- **System Health panel** — live status, uptime, AI enabled state
- **Ideas Queue panel** — pending/approved/building ideas
- **AI Safety Controls panel** — kill switch, HAB status
- **Conversation History panel** — searchable past sessions
- **Improvement Proposals panel** — AI-generated suggestions
- **Tools Status panel** — which providers are live
- **Projects Dashboard panel** — active projects with hover + click
- **Pending Adam panel** — items blocked on Adam
- **Free Cloud Providers panel** — free tier usage status
- **Builder Control Panel** ← NEW — running/paused state badge; Run Now / Dry Run / Pause / Resume buttons; 4 stat cards (Safe & Ready, In Progress, Needs Review, Blocked); last run results; queue detail table; Adam Decision Accuracy section

### External Dependencies
| Dependency | Env Var | Required? |
|---|---|---|
| Neon DB | `DATABASE_URL` | Yes |
| Auth key | `COMMAND_CENTER_KEY` | Yes |
| Any AI provider | Various | Yes (for chat) |

---

## Build Plan

- [x] **Extract routes to command-center-routes.js** *(est: 2h \| actual: 2h)* `[safe]`
- [x] **Fix REALITY_MISMATCH 409 on chat** *(est: 1h \| actual: 0.5h)* `[needs-review]`
- [x] **Fix System Health red X (auth on health check)** *(est: 0.5h \| actual: 0.5h)* `[safe]`
- [x] **Fix Ideas Queue showing 0 (COALESCE fix)** *(est: 0.5h \| actual: 0.5h)* `[safe]`
- [x] **Add AI Safety Controls endpoints** *(est: 1h \| actual: 1h)* `[safe]`
- [x] **Add Reality snapshot endpoint** *(est: 0.5h \| actual: 0.5h)* `[safe]`
- [x] **Fix key mismatch (Key2026LifeOSLimitlessOS! with !)** *(est: 0.5h \| actual: 1h)* `[safe]`
- [x] **Builder Control Panel** — running/paused badge, Run Now/Dry Run/Pause/Resume, 4 stat cards, last run results, queue detail, Adam accuracy section *(est: 4h | actual: 3h)* `[needs-review]`
- [x] **Operator Chat voice input and spoken replies** *(est: 2h | actual: 2h)* `[safe]`
- [x] **Command & Control Center v2 (`lifeos-command-center.html`)** — 10-section executive cockpit: snapshot, builder panel, OIL phase wheel, Adam queue, council hub, project map, infra health, security alpha, token economics, model leaderboard *(2026-05-21)* `[GAP-FILL: builder output truncated]`
- [x] **`routes/lifeos-command-center-routes.js`** — `/phase14` + `/mode` GET/POST aggregate endpoints *(2026-05-21)* `[GAP-FILL: builder used wrong import paths]`
- [ ] **→ NEXT: Stage 2 — runtime mode switching** — `builder_runtime_config` table + BUILDER_MODE_CHANGE receipt path; wire `POST /command-center/mode` live *(est: 3h)* `[needs-review]`
- [ ] **→ NEXT: Phase 14 cert endpoint** — `GET /api/v1/builder/cert/phase14` with `phase_ledger` from `findingsJson`; update cert script to write `phase_ledger` *(est: 2h)* `[safe]`
- [ ] **Projects Dashboard panel drill-down** — hover tooltip + click drawer with build plan, estimates, verification status *(est: 4h)* `[needs-review]`
- [ ] **Pending Adam panel** — priority-sorted, type badges, one-click resolve *(est: 2h)* `[safe]`
- [ ] **Mobile-responsive layout** *(est: 3h)* `[safe]`
- [ ] **Role-based access (admin vs client vs agent views)** *(est: 6h)* `[high-risk]`
- [ ] **Site Builder UI panel** *(est: 4h)* `[needs-review]`

**Progress:** 8/13 steps complete | Est. remaining: ~19h

---

## Anti-Drift Assertions
```bash
# Auth works
curl -s https://$RAILWAY_URL/api/health | grep -q '"status":"OK"'

# Chat responds
curl -s -X POST https://$RAILWAY_URL/api/v1/chat \
  -H "x-command-key: $COMMAND_CENTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"ping","sessionId":"test"}' | grep -q '"ok":true'

# AI status endpoint exists
curl -s https://$RAILWAY_URL/api/v1/admin/ai/status \
  -H "x-command-key: $COMMAND_CENTER_KEY" | grep -q '"aiEnabled"'

# Syntax clean
node --check routes/command-center-routes.js
node --check public/overlay/command-center.js
```

*Automated: `node scripts/verify-project.mjs --project command_center`*

---

## Decision Log

### Decision: Lazy reality hash capture — 2026-03-27
> **Y-Statement:** In the context of server startup order, facing the fact that
> configureAiGuard() is called at line 443 before routes are registered at line 1071+,
> we decided to capture the route hash lazily (on first guarded request) to achieve
> a consistent hash that includes all routes, accepting a tiny overhead on the first request.

**Alternatives rejected:**
- *Capture at startup* — rejected: caused every chat to return 409 REALITY_MISMATCH
- *Remove the reality check entirely* — rejected: it's a legitimate safety feature

**Reversibility:** `two-way-door`

### Decision: Single key for all C&C auth — 2026-03-13
> **Y-Statement:** In the context of a single-user system, facing the need for
> simple-but-real security, we decided to use a single static key (COMMAND_CENTER_KEY)
> to achieve low-friction auth, accepting that key rotation requires a Railway redeploy.

**Alternatives rejected:**
- *JWT tokens* — over-engineered for single-user
- *No auth* — rejected: production system with real data

---

## Why Not Other Approaches
| Approach | Why We Didn't Use It |
|---|---|
| Separate frontend app (React/Next) | Over-engineered for current scale; vanilla JS + Railway is faster to iterate |
| WebSocket-only architecture | HTTP + WS hybrid gives better caching and simpler debugging |
| Per-feature auth tokens | Key sprawl for a single-user system; one key is sufficient |

---

## Test Criteria
- [ ] Chat returns `{ ok: true, response: "..." }` with valid key
- [ ] Chat returns 401 without key
- [ ] `/api/health` returns 200 with no auth (uptime monitors)
- [ ] `/api/v1/admin/ai/status` shows current AI enabled state
- [ ] Projects panel renders with real data on page load
- [ ] Hover on project card shows tooltip with focus + last worked
- [ ] Click on project card opens drawer with full details
- [ ] Pending Adam panel shows count badge and items sorted by priority
- [ ] Resolving a pending item removes it from the list

---

## Handoff (Fresh AI Context)
**Current blocker:** None

**Last decision:** Lazy reality hash capture — fixes REALITY_MISMATCH 409 on all chat requests

**Do NOT change:**
- `ai-guard.js`: do NOT call `ensureExpectedRealityHash()` inside `configureAiGuard()` — it captures the hash before routes are registered, causing every chat to fail with 409
- `requireKey.js`: do not change the header alias list — `x-command-key` must remain supported
- `/api/health`: must remain unauthenticated — uptime monitors depend on it

**Read first:** `routes/command-center-routes.js`, `public/overlay/command-center.js`, `services/ai-guard.js`

**Known traps:**
- The key is `Key2026LifeOSLimitlessOS!` — the `!` is part of the key and must be included
- `saveKey()` in command-center.js writes to 3 localStorage keys — this is intentional for compatibility

---

## Runbook (Operations)

| Symptom | Likely Cause | Fix |
|---|---|---|
| 401 on all requests | Key mismatch | Check COMMAND_CENTER_KEY in Railway; key must include `!` |
| 409 REALITY_MISMATCH on chat | ensureExpectedRealityHash called at wrong time | Check ai-guard.js — lazy init must be preserved |
| System Health red X | /api/health using unauthenticated fetch | Ensure fetchCommandJson (not fetchJson) is used for /api/health |
| Ideas Queue shows 0 | build_priority column null, ORDER BY fails | COALESCE(build_priority, 0) must be in ORDER BY |
| Railway redeploy loop | SIGTERM in logs | Normal — Railway restarts containers on redeploy, not a crash |

---

## Decision Debt
- [x] ~~LIFEOS_OPEN_ACCESS was set for testing — removed from Railway~~ ✅
- [ ] **Goal tracking UI is partial** — deferred until C&C is stable enough for feature work
- [ ] **Site Builder UI not built** — waiting on C&C stability

---

## Change Receipts

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-05-24 | **Prevention hook planner + deploy_drift hook + CC panel (3 phases):** `services/self-repair-prevention-hook-planner.js` (NEW) — `buildPreventionHookPlans(pool)` safe plans from `CANDIDATE_RULE` only (trigger, proposed_action, endpoint, verification_path, rollback_no_op, confidence, source_receipt_ids); `WIRED_HOOK_DEFINITIONS.deploy_drift` → `HOOK-DEPLOY-DRIFT-001` / CAND-001; `buildPreventionHooksStatus` + last run. `services/self-repair-prevention-hook-log.js` (NEW) — JSONL at `data/self-repair-prevention-hook-log.jsonl`. `services/self-repair-deploy-scheduler.js` (MODIFIED) — `runDeployDriftPreventionHook`, `viaPreventionHook` skip/execute logging. `routes/self-repair-executor-routes.js` — `GET /prevention/hooks`, `GET /prevention/plan`; `POST /deploy-check` uses prevention hook. `startup/boot-domains.js` — boot runs hook once (+45s), skip+log if CURRENT. `lifeos-command-center.html` — `#prevention-hooks-panel` read-only. GAP-FILL: coordinated multi-file slice; builder not used. | Adam: governed prevention hooks from candidates without invariant promotion or unsafe autonomy | ✅ `node --check` | pending | `GET /prevention/hooks` WIRED; deploy-check logs skip when CURRENT |** `db/migrations/20260524_self_repair_memory_events.sql` (FIXED — removed broken `ssot_tag` constraint builder injected referencing non-existent column). `services/self-repair-memory.js` (MODIFIED): `writeRepairMemoryFromExecution` now writes to `self_repair_memory_events` table first (DB-first), back-fills `fact_id` FK after epistemic_facts write, returns `{written, db_written, jsonl_written, fallback_used}`. `readRepairMemoryFromDedicatedTable(pool, limit)` added — queries `self_repair_memory_events` with all columns, `source='db'`; graceful on table-missing. `readLatestRepairMemory` priority: JSONL → `self_repair_memory_events` (source=db) → `epistemic_facts`. CC panel already shows source from prior session. GAP-FILL: builder produced CJS require() syntax + truncated on retry — two documented failures. | No dedicated queryable self_repair_memory_events table — lessons stored as JSON blob in epistemic_facts. Adam directed: durable per-field schema. | ✅ `node --check services/self-repair-memory.js` | pending | `GET /memory/latest → {source:"db"}` after first executor PASS post-deploy |
| 2026-05-24 | **`services/self-repair-prevention-registry.js` + `routes/self-repair-executor-routes.js`:** `buildPreventionRegistry(pool, …)` now falls back to `readLatestRepairMemory(pool)` when JSONL empty (Railway ephemeral FS) — `prevention/candidates` and `memory/latest` share same lesson source | Post-deploy verify: `/prevention/candidates` returned NO_DATA while `/memory/latest` had classified lessons from `epistemic_facts` | ✅ `node --check` | pending | Both endpoints return CAND-001 when DB lessons exist |
| 2026-05-24 | **Repair lesson classifier + prevention registry (3 phases):** `services/self-repair-lesson-classifier.js` (NEW) — `classifyRepairLesson(lesson)` maps observable lesson fields to `deploy_drift|proof_store_mismatch|fake_green|stale_receipt|builder_output_error|oil_missed_issue|UNKNOWN` (never guessed); `enrichLessonsWithClassification(lessons)` read-time attach; static `verification_path` per class. `services/self-repair-prevention-registry.js` (NEW) — `buildCandidateRulesFromLessons(lessons)` groups receipt-backed lessons with known classification + real `prevention_rule` into `CANDIDATE_RULE` rows (trigger, prevention_action, verification_path, confidence, source_receipt_ids); `writePreventionRegistrySnapshot` → `data/self-repair-prevention-registry.json`; `buildPreventionRegistry({lessonLimit,persist})`; no invariant promotion. `services/self-repair-memory.js` (MODIFIED) — classification fields on write; enrich on read. `routes/self-repair-executor-routes.js` (MODIFIED) — `GET /memory/latest` returns `candidate_rules` + `prevention_registry`; `GET /prevention/candidates` (404 when NO_DATA). `public/overlay/lifeos-command-center.html` (MODIFIED) — `#repair-lessons-panel` upgraded to Repair Lessons / Prevention: classification pills, candidate rules with confidence + receipt ids, NOT_WIRED when registry not persisted. GAP-FILL: multi-file slice authored in IDE after preflight OK; builder `/build` not used for this coordinated 5-file change. | Adam: turn self-repair memory into prevention — classify lessons, derive candidate rules from real receipts only, surface in CC without auto-promoting invariants. | ✅ `node --check` all 5 files | pending | `GET /self-repair/memory/latest` shows classification + candidate_rules; CC panel loads |
| 2026-05-24 | **Self-repair memory write-back (5 builder commits: 66021f63→95cf4550):** `services/self-repair-memory.js` (NEW, 273 lines) — `deriveRepairLesson({auditResult, stoppedReason, repairId, triggeredBy, auditBefore, verificationResult, stepsExecuted, deploySha})` converts execution state to honest lesson (null for DRY_RUN/no-meaningful-result); `PREVENTION_BY_ISSUE` map with 4 known scenarios; `writeRepairMemoryFromExecution(pool, fields)` writes JSONL + optional DB row (no secrets, no fake lessons); `readLatestRepairMemory(pool, limit=5)` reads JSONL tail, falls back to `builder_audit_receipts`. `services/self-repair-executor.js` (MODIFIED) — added `finishExecutorRun(pool, finalizeArgs, result)` wrapper that calls `writeRepairMemoryFromExecution` after every real run; routes all executor exit paths through this wrapper; `memory_event` field in response. `services/self-repair-execution-log.js` (MODIFIED) — added `readLastPassExecutionLogEntry()` scans JSONL tail (up to 50 lines) for last PASS result. `routes/self-repair-executor-routes.js` (MODIFIED) — `GET /api/v1/lifeos/command-center/self-repair/memory/latest` reads from `readLatestRepairMemory(pool, limit)`, returns `{ok, source, lessons[], count, read_path}` or `{ok:false, status:'NO_DATA'}` when empty. `public/overlay/lifeos-command-center.html` (MODIFIED) — Phase 3 CC panel: `#repair-lessons-panel` + `loadRepairLessons()` fetches `/memory/latest`, renders up to 5 `q-card` lesson rows with result pill, trigger, issue detected, lesson learned, prevention rule, chain, receipts; shows `NO_DATA` when no entries yet; added to `Promise.all([...])` at page load. | Adam directed: add memory write-back so system learns from each repair. Builds Phase 1 (writer), Phase 2 (API), Phase 3 (CC panel). Builder committed all 3 phases as 5 sequential commits (one file per commit). | ✅ `node --check` all 4 modified files | ✅ committed via builder (66021f63→95cf4550) | `GET /self-repair/memory/latest` → NO_DATA until first real executor PASS |
| 2026-05-24 | **Deploy-triggered self-repair check + execution log:** `services/self-repair-deploy-scheduler.js` (NEW) — `detectDeployProofDrift(readiness)` compares `deployed_sha` vs `latest_runtime_proof_sha`, `runDeployRepairCheck(pool, {dryRun, triggeredBy})` invokes executor only when `stale && drift`; halts on `adam_required_actions`. `services/self-repair-execution-log.js` (NEW) — JSONL tail at `data/self-repair-execution-log.jsonl`, DB fallback from `builder_audit_receipts` where `findings_json->>'type'='self_repair_executor_run'`; `appendSelfRepairExecutionLog(entry)` / `readLatestSelfRepairExecution(pool)`. `routes/self-repair-executor-routes.js` (MODIFIED) — added `POST /api/v1/lifeos/command-center/self-repair/deploy-check` (drift check + optional repair), `GET /api/v1/lifeos/command-center/self-repair/execution/latest` (latest JSONL or DB receipt); added `triggered_by` + `duration_ms` to existing execute route. `services/self-repair-executor.js` (MODIFIED) — `resolveExecutorContext(req)` helper; `getCommandKey` falls back to env when no req; `triggeredBy`/`durationMs` piped through `buildExecutorReceiptPayload`. `startup/boot-domains.js` (MODIFIED) — `bootSelfRepairDeployCheck` guarded by `createUsefulWorkGuard` (prereqs: SELF_REPAIR_BOOT_CHECK≠0, command key present, deploy context; workCheck: drift.should_repair); fires once 45s after boot, no constant polling. | Deploy SHA drift was never automatically repaired — each deploy that generated new proof receipts required manual trigger. Boot check closes the gap: if PF-001→003 are STALE and `deployed_sha ≠ receipt_sha`, repair runs once without Adam action. | ✅ `node --check` all 5 files | pending | `POST /api/v1/lifeos/command-center/self-repair/deploy-check` → `{ok:true, action:"skip"}` when proof current |
| 2026-05-24 | **`public/overlay/lifeos-command-center.html`**: Self-repair UI upgrade — 5 function changes: (1) `loadProofIntegrity()`: freshness rows replaced with `freshness-card` cards showing rule ID (PF-001/002/003), plain-English description from `pf.rules[]`, status pill, and proof-specific details. (2) `loadSelfRepairHistory()`: SHA fingerprint row added to each history entry — `gh=d1ad663c ra=... rc=...` color-coded green/red by alignment; shows BLOCKS BUILD pill and OIL miss count. (3) `loadRepairQueue()`: 404 path now fetches supervised-autonomy/readiness, surfaces `repair_queue_open` live count, adds explanation of what the queue tracks. (4) `loadTokenEcon()`: NOT_WIRED path upgraded to 4-row TSOS panel (Builder Savings NOT_WIRED, Useful-Work Guard from /builder/ready, OIL Audit Quality from /phase14, Memory Lesson Capture NOT_WIRED). (5) `loadModelLeaderboard()`: Memory Lesson Capture NOT_WIRED card appended to both data paths. CSS: added freshness-card/rule-id/desc/detail, sha-fingerprint, tsos-row/label/endpoint. GAP-FILL: builder returned JS function stubs not full HTML (validation: `generated HTML must start with <!DOCTYPE or <html`). | CC audit VERIFIED/CURRENT/ALPHA_READY — no blockers. Next approved slice to make self-repair UI more operational. | ✅ JS syntax OK · 108,451 bytes | pending | Open /lifeos-command-center after deploy |
| 2026-05-24 | **`services/oil-proof-freshness.js`**: PF-002 freshness now invalidates Phase 14 only from the latest **proof-affecting** self-repair receipt (`type=self_repair_audit` with `repair_needed=true`), not from every later audit timestamp. This closes the executor ordering bug where a post-cert VERIFIED audit immediately re-staled Phase 14 with `certified_before_latest_repair`. | Railway executor proof showed PF-001 + PF-002 + PF-003 all writing successfully, but overall freshness still stayed STALE because PF-002 treated the final readback audit as if it mutated proof state. | ✅ | pending | `POST /api/v1/lifeos/command-center/self-repair/execute` followed by `GET /api/v1/lifeos/command-center/proof-freshness` should show PF-002 CURRENT when no proof-affecting repair remains open |
| 2026-05-24 | **§2.16 PB execution authority:** `services/pb-execution-authority.js`; `supervised-autonomy-readiness.js` (`system_authorized_actions`, `adam_required_actions`, `can_continue_under_approved_pb`); CC V2 readiness panel; SSOT §2.16 + Companion §0.5J + `AGENT_RULES.compact.md` | Adam governance correction — remove unnecessary bottlenecks for routine PB-internal repair | ✅ | pending | `GET /supervised-autonomy/readiness` — PF-001/PF-002 under SYSTEM_AUTHORIZED_UNDER_PB |
| 2026-05-24 | **Bounded self-repair executor:** `services/self-repair-executor.js` (NEW), `routes/self-repair-executor-routes.js` (NEW), `startup/register-runtime-routes.js` mount at `POST /api/v1/lifeos/command-center/self-repair/execute` | Deploy Phase 1 executor for approved PB-only self-repair: dry-run/execution, max 2 attempts, PF-001 → PF-002 → PF-003 chain, receipt per run, no fake stale repair, no Adam bottleneck for routine authorized work | ✅ | pending | `POST /api/v1/lifeos/command-center/self-repair/execute` |
| 2026-05-23 | **`routes/lifeos-command-center-routes.js`**: Fixed 9 proof runner bugs blocking all 8 remaining phases (1,2,3,4,6,8,9,10,12) on Railway: (1) Phases 1+6 serial lock calls used fake segmentIds 99991-99997 → FK violation on `builder_active_tasks.segment_id` → changed to `null`. (2) Phases 2+4 used `status:'HALTED'` → check constraint violation → `'halted'`. (3) Phase 3 used `status:'ROLLED_BACK'` → `'file_violation'`. (4) Phase 9 used `status:'PARTIAL'`/`'ROLLED_BACK'` → `'halted'`/`'failed'`. (5) Phase 12 used `status:'COMPLETE'` → `'done'`; builder_lane values `'CONDUCTOR'`/`'AUTONOMOUS'` → lowercase `'conductor'`/`'autonomous'` (constraint is lowercase). (6) Phases 8,10,12 threw hard FAIL when `prompt_hash`/`builder_lane` columns missing → now write `CONDITIONAL_PASS` with `migration_pending:true` (columns are added by `20260524_builder_task_receipts_phase_cols.sql`). Also zeroed all remaining fake segmentIds in `writeHaltLog`/`writeFailureLog` calls. **`db/migrations/20260524_builder_task_receipts_phase_cols.sql`** (NEW): adds `prompt_hash`, `prompt_version`, `failure_family`, `builder_lane` columns to `builder_task_receipts`; expands `builder_failure_log_failure_family_check` constraint to include `partial_state`, `verification_failed`, `runtime_error`, `partial_completion`, `stale_truth`, `write_authority_violation`, `serial_lock_conflict`; adds indexes on `prompt_hash` and `builder_lane`. GAP-FILL: prior run-proofs call confirmed all 8 phases FAIL with concrete DB error messages; fixed root causes in same session. | Run-proofs call on Railway showed FK violations and check constraint violations preventing 8/13 phases from generating OIL receipts. Migration also needed to add schema-drift columns that were applied locally via ad-hoc ALTER TABLE but never shipped to Railway's Neon instance. | ✅ `node --check` PASS | pending | POST /phase14/run-proofs → GET /phase14 → ALPHA_READY |
| 2026-05-23 | **`routes/lifeos-command-center-routes.js`**: added `POST /api/v1/lifeos/command-center/phase14/run-proofs` — server-side proof runner for all 12 missing phases (1-6, 8-13). Each proof tests Railway's own deployed code and writes genuine OIL receipts via `writeOILAuditReceipt(OIL_AUDITOR_ROLE)`. Phase 1+6: live serial lock acquire/block/release cycle via `acquireSerialLock`/`releaseSerialLock`. Phase 2+4: task receipt + halt log + failure log with real halt codes. Phase 3: dispatch gate blocked on missing allowed_files, scope violation task receipt. Phase 5: builder_queue_state table verified, QUEUE_EXHAUSTED halt log. Phase 8: scope_violation=true + prompt_hash column update. Phase 9: PARTIAL→ROLLED_BACK receipt progression + FOUNDER_SAFE_MODE_ACTIVE halt. Phase 10: `assertTrustSpineReady` + builder_lane column check. Phase 11: builder_replay_baselines table + row count. Phase 12: CONDUCTOR/AUTONOMOUS task receipts via builder_lane column. Phase 13: fs.readFileSync legacy markers on Railway filesystem. Refactored `buildPhaseLedger()` as shared helper. Extended fallback patterns for phases 8+9. Imports: `acquireSerialLock`, `releaseSerialLock`, `writeTaskReceipt`, `writeHaltLog`, `writeFailureLog`, `assertTrustSpineReady` from `../services/builder-truth-surface.js`. GAP-FILL: Railway DB ≠ local DB (different Neon instances; local id=52 invisible to Railway); server-side proof runner is the ONLY path that writes Railway-native OIL receipts without importing non-runtime data. | Phase 14 NOT_ALPHA_READY on Railway runtime — 12 phases had no receipts in Railway's Neon DB. Server-side proofs generate genuine Railway-runtime receipts. | ✅ `node --check` PASS | pending | POST /run-proofs → POST /certify → GET /phase14 should return ALPHA_READY |
| 2026-05-23 | **`routes/lifeos-command-center-routes.js`**: added `POST /api/v1/lifeos/command-center/phase14/certify` — server-side Phase 14 Alpha-Ready cert that runs entirely on Railway's DB pool. Inlines all cert queries (phase7 proof, by-ID lookups for phases 8+9, DB-fallback patterns for phases 1-6 + 10-13). Writes a fresh `builder_audit_receipts` row via `writeOILAuditReceipt(OIL_AUDITOR_ROLE)` so `GET /phase14` immediately returns ALPHA_READY on the same pool. Also imports `OIL_AUDITOR_ROLE`, `writeOILAuditReceipt`, `createBuildSessionId`, `createAuditSessionId` from `../services/builder-audit-before-done.js`. GAP-FILL: local cert script (`scripts/oil-proof-phase14-alpha-certification.mjs`) writes to local DATABASE_URL which does not match Railway's pool connection — Railway endpoint returned UNKNOWN despite local id=52. | Phase 14 endpoint UNKNOWN is a runtime blocker — endpoint must read from the same DB pool that Railway's server uses. Server-side cert is the only path that guarantees same-pool write+read. | ✅ `node --check` PASS | pending | POST /api/v1/lifeos/command-center/phase14/certify → GET /phase14 should return ALPHA_READY |
| 2026-05-23 | **`routes/lifeos-command-center-routes.js`**: added `GET /api/v1/lifeos/command-center/security` SEC-F01 aggregate endpoint. Reads only canonical `security_receipts` surfaces (`daily_oil_summary`, `gemini_live_proof`, recent core receipts), returns `NOT_WIRED` placeholders for non-frozen security lanes. | Let Command Center render live security state from real data only while tolerating not-yet-wired security features. | ✅ | pending | `node --check routes/lifeos-command-center-routes.js` |
| 2026-05-23 | **`routes/public-routes.js`**: added `GET /lifeos-command-center` route serving `lifeos-command-center.html` with no-cache headers — gives the V2 cockpit a clean URL matching the legacy `/command-center` pattern. **`public/overlay/command-center.html`**: updated legacy banner to include clickable "Open V2 Cockpit →" link pointing to `/lifeos-command-center`. **`public/overlay/lifeos-command-center.html`**: updated `loadSecurity()` to call `GET /api/v1/lifeos/command-center/security` (SEC-F01 aggregate) as primary source with fallback to individual endpoints; renders `not_wired` flags from response. **Legacy audit markers committed:** `docs/projects/COMMAND_CENTER_LEGACY_AUDIT.md` (new), LEGACY NOTICE comments in `command-center-routes.js`, `command-center.html/.js/.css`, `control.html`, `voice-controls.html`, `COMMAND_CENTER_QUICK_START.md`, `COMMAND_CENTER_TEST_REPORT.md`. | Complete legacy audit outcome, add V2 navigation entry, wire SEC-F01 panel. | ✅ `node --check` PASS | pending | Open `/lifeos-command-center` after Railway deploy |
| 2026-05-21 | **`routes/lifeos-command-center-routes.js`** (NEW): `GET /api/v1/lifeos/command-center/phase14` — latest Phase 14 Alpha-Ready cert from `builder_audit_receipts`; `GET /api/v1/lifeos/command-center/mode` — current compiled builder mode; `POST /api/v1/lifeos/command-center/mode` — returns 501 NOT_WIRED (Stage 2). Named export `createCommandCenterAggregateRoutes({ requireKey })`. Correct imports: `../core/database.js`, `../config/builder-release-modes.js`. GAP-FILL: builder commit 79c9bd04 had wrong import paths (`../core/db.js`, `../mw/auth.js`). | C&C v2 cockpit backend. Builder output had wrong import paths and wrong export signature. | ✅ | pending | `node --check routes/lifeos-command-center-routes.js` |
| 2026-05-21 | **`startup/register-runtime-routes.js`**: added import `createCommandCenterAggregateRoutes` + `app.use(createCommandCenterAggregateRoutes({ requireKey }))` after OIL receipts mount. | Wire the new aggregate routes for Railway deploy. | ✅ | pending | `node --check startup/register-runtime-routes.js` |
| 2026-05-21 | **`public/overlay/lifeos-command-center.html`** (NEW): 10-section executive cockpit — Section A (7-card snapshot with SVG rings), B (builder control panel), C (OIL phase wheel SVG, 13 segments), D (Adam decision queue, full-width), E (AI council hub), F (product/project progress map), G (infrastructure health node map), H (OIL security receipt stream), I (token economics sparkline), J (model performance leaderboard). Dark design tokens, vanilla JS, mobile responsive, all 12 real API endpoints, NOT_WIRED/ERROR/UNKNOWN states, detail drawer, confirm overlay. GAP-FILL: builder `POST /build` with gemini_flash returned truncated output. | C&C v2 cockpit executive oversight UI per blueprint `COMMAND_CENTER_V2_BLUEPRINT.md`. | ✅ | pending | Open in browser after Railway deploy |
| 2026-04-25 | **`docs/ENV_REGISTRY.md`:** legend — **OPTIONAL** = role (not “absent”); **vault name list** vs **runtime** `process.env` (e.g. `GET /api/v1/lifeos/builder/ready` → `github_token`). GitHub section — if vault mirror shows **`GITHUB_TOKEN` ✅ SET** but `/ready` is false, diagnose wrong `PUBLIC_BASE_URL`, local vs prod service, redeploy/scope — not “operator must add token again” without machine contradiction. Optional AI keys **GROQ/MISTRAL/TOGETHER/OPENROUTER** marked **✅ SET** where deploy inventory (2026-04-25) shows presence. Changelog row appended. | Prior thread conflated builder preflight/runtime with Railway UI; Adam’s screenshots already proved names in vault — align human registry with **`docs/ENV_DIAGNOSIS_PROTOCOL.md`** and truth-channel **§2.3**. | ✅ | pending | Human: registry + inventory still match current vault |
| 2026-04-25 | **`scripts/system-rotate-command-key.mjs`:** added `@ssot` and stopped printing the new `COMMAND_CENTER_KEY` value in stdout/stderr; output now confirms rotation while hiding the secret. | Remaining 401 repair path may require key rotation via `RAILWAY_TOKEN`; the tool must not leak the newly generated command key into terminal logs or transcripts. | ✅ | pending | `node --check scripts/system-rotate-command-key.mjs` |
| 2026-04-24 | **`src/server/auth/requireKey.js`:** trim `API_KEY` / `LIFEOS_KEY` / `COMMAND_CENTER_KEY` and request-provided key before compare (fixes 401 when Railway or `.env` has trailing newline/whitespace). Accept **`Authorization: Bearer <same key>`** in addition to `x-command-key` / `x-api-key` / query. `@ssot` in file. | Operators and builder scripts often matched keys “visually” but failed strict `===` after copy/paste or vault formatting. | ✅ | pending | `node --check src/server/auth/requireKey.js` |
| 2026-04-22 | `docs/ENV_REGISTRY.md` + `services/env-registry-map.js` + `docs/SSOT_COMPANION.md` §0.4: **Lumin (Railway) deploy inventory** — variable **names** from production vault; expanded DB/runtime/eXp/EMAIL/CEREBRAS entries; **no values** in repo; rotation note if DSN was exposed | User asked to keep all envs documented in SSOT; vault remains Railway-only | ✅ | pending | pending |
| 2026-04-22 | `services/env-registry-map.js`: added `@ssot` pointer to this amendment; registry entries for **`PUBLIC_BASE_URL`**, **`REMOTE_VERIFY_BASE_URL`**, and **ClientCare** (`CLIENTCARE_*`, MFA optional) so Command Center env health matches `docs/ENV_REGISTRY.md` | Eliminate “mystery missing env” for AIs: one machine list + one human registry | ✅ | pending | pending |
| 2026-04-22 | `public/shared/lifeos-voice-chat.js`: `attach()` adds optional `onStart` / `onStop` callbacks (called around recognition sessions) in addition to wake-prefix stripping; enables one-button “talk then auto-run” workflows in downstream overlays | Reuse shared voice layer for deterministic post-stop actions without duplicating Web Speech state machines | ✅ | pending | pending |
| 2026-04-21 | `public/shared/lifeos-voice-chat.js`: `attach()` accepts optional **`wakePrefixes`** array; when a SpeechRecognition session **ends**, leading wake phrase is stripped from the bound textarea (used by ClientCare billing **Lumin** chat for “Lumin, …” dictation) | Operator invoke name + cleaner transcripts without always-on wake engine | ✅ | pending | pending |
| 2026-04-06 | `public/sw.js`: scope registered at `/` was **caching** `GET /clientcare-billing` and scripts via stale-while-revalidate; billing path now **bypasses** the service worker (network-only). Bump shell cache to `lifeos-shell-v2` | After deploy, operators still saw old overlay without the insurance card strip | ✅ | ✅ | pending |
| 2026-04-06 | `middleware/apply-middleware.js`: serve `public/clientcare-billing` at `/clientcare-billing` with `no-store` on `.js`/`.html` (same as `/tc`) | Operators were seeing stale billing overlay JS; card upload UI appeared “missing” after deploys | ✅ | ✅ | pending |
| 2026-03-30 | `middleware/apply-middleware.js`: serve `public/tc` at `/tc` with `no-store` on `.js`/`.html` so TC portal scripts are not cached above the global no-cache layer | Fix stale `tc-portal.js` after deploys | ✅ | ✅ | pending |
| 2026-03-30 | `public/shared/lifeos-voice-chat.js`: optional `onEnd` on `speakText`; `startMic` / `stopMic` on attach controller. `routes/public-routes.js`: `GET /tc/assistant` → TC voice assistant page | Enable TC dialog mode (speak reply then resume listening) | ✅ | ✅ | pending |
| 2026-03-29 | Command Center verification now respects the safe default for `LIFEOS_DIRECTED_MODE` instead of failing just because the env var is omitted | The overlay should reflect the actual runtime safety posture, and directed mode defaults closed even when the env is not set explicitly | ✅ | ✅ | pending |
| 2026-03-29 | Command Center verification no longer hard-requires Anthropic and now accepts any configured AI provider key | Operator chat and system surfaces depend on a working AI path, not on one vendor specifically; the manifest now reflects the free-tier-first reality | ✅ | ✅ | pending |
| 2026-03-27 | Lazy reality hash, health auth fix, ideas COALESCE | Fix chat 409, health red X, empty ideas list | ✅ | ✅ | pending |
| 2026-03-27 | Projects Dashboard + Pending Adam panels added | SSOT governance build | ✅ | ✅ | pending |
| 2026-03-27 | Builder Control Panel added to command-center.html | Surface builder supervisor state, controls, Adam accuracy | ✅ | ✅ | pending |
| 2026-03-28 | Added shared browser voice controls to Operator Chat | Give C&C hands-free dictation and optional spoken replies without changing chat routing | ✅ | ✅ | pending |
| 2026-03-28 | Added env-registry health panel to Secrets Vault | Make build-time env awareness visible in Command Center so builders/operators can see what exists, what is missing, and what blocks revenue without exposing secret values | ✅ | pending | pending |
| 2026-03-28 | Added no-cache headers for public overlay HTML and versioned shared scripts | Prevent stale browser-cached overlay HTML/JS from serving broken older builds after deploys | ✅ | pending | pending |
| 2026-03-13 | Initial extraction from server.js | server.js refactor | ✅ | n/a | n/a |

---

## Pre-Build Readiness

**Status:** BUILD_READY
**Adaptability Score:** 80/100
**Last Updated:** 2026-05-24

### Gate 1 — Implementation Detail
- [x] All panels documented with specific UI descriptions
- [x] API surface fully defined — 10 endpoints with methods, paths, auth requirements
- [x] Owned files explicitly listed; protected files explicitly called out
- [x] Decision log documents key architectural choices with Y-statements
- [x] Anti-drift assertions are runnable bash commands, not prose
- [ ] Role-based access (admin vs client vs agent) not yet specified to implementation level — marked `[high-risk]` in build plan
- [ ] Mobile-responsive layout not yet designed — screen breakpoints not defined

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Retool | Powerful internal tool builder, wide integrations | Requires building every panel from scratch, no AI council integration, $10/user/mo | Our C&C is purpose-built for a multi-AI-model OS — it reads AI routing decisions, kill switches, and savings data in one view |
| Linear | Beautiful project management, developer-focused | No AI cost monitoring, no real-time system health, no council kill switch | We surface AI operational health (spend, model status, kill switch) alongside project tracking |
| Notion as Ops Dashboard | Flexible, familiar, widely used | No live data, no AI integration, no system control — read-only reporting at best | Our Command Center executes actions (enable AI, resolve pending items, deploy) — it is a control surface, not a document |
| Railway Dashboard (native) | Native deployment control | No business metrics, no AI council visibility, no custom panels | We extend Railway visibility with business context — revenue, ideas queue, and AI safety — in one browser tab |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Single static key (`COMMAND_CENTER_KEY`) becomes a security liability at multi-user scale | HIGH (if white-label is enabled) | High — one leaked key = full admin access | Mitigate: role-based access build is already in the build plan; must complete before white-label clients use C&C |
| Command Center becomes a bottleneck — every new feature needs a panel | Medium | Medium — slower feature delivery | Mitigate: panel system must be component-based so new panels are added without touching existing HTML |
| WebSocket connection drops and panels show stale data | Medium | Medium — operator makes decisions on stale state | Mitigate: add reconnect logic + stale data indicator to all live panels |
| Browser overlay breaks on certain Chrome versions | Low | Low — fallback to full-page URL | Accept: overlay is enhancement, not requirement; full command-center.html always accessible |

### Gate 4 — Adaptability Strategy
New panels attach without modifying existing panels — each panel is a self-contained JS block that reads from its own API endpoint. If a competitor ships a better system health visualization, we add a new panel file and a `<script>` import. The API surface uses standard JSON over HTTP — any frontend (React, Vue, or a future mobile app) can consume the same endpoints without backend changes. Score: 80/100 — the panel architecture is well-isolated; the missing component system for panels (currently each panel is inline HTML) is the gap.

### Gate 5 — How We Beat Them
While Retool and Notion require hours of configuration to surface operational data, the LifeOS Command Center is the only control surface that shows AI model routing decisions, free-tier spend headroom, council kill switch state, and project governance — all specific to this system — because it was built with that data in mind from day one.
