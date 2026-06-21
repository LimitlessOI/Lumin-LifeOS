<!-- SYNOPSIS: BUILDEROS TRUE PRODUCTION AUTONOMY ROADMAP -->

# BUILDEROS TRUE PRODUCTION AUTONOMY ROADMAP

**Status:** `AUTHORITATIVE — derived from runtime truth only`
**Owner:** Adam
**Verifier:** OIL
**Last Updated:** 2026-05-26
**Runtime truth at creation:** 73.8% Alpha — proof STALE, repair_queue 1, useful_work 0.45
**GAP-FILL:** docs/ blocked for builder — direct authoring required

---

## SECTION 1 — WHAT BUILDEROS ACTUALLY IS

### 1.1 Honest current maturity (2026-05-26)

**Score: 73.8%**
- Loop integrity: 78.3/100
- Component maturity: 70.8/100
- Useful-work bonus: 0 (score 0.45, below 0.50 threshold)

This number reflects reality, not aspiration. Here is what that reality looks like:

### 1.2 What is runtime-proven (LIVE or better)

| Component | Maturity | Evidence quality |
|---|---|---|
| Builder | WIRED+LIVE+PROVEN | `GET /builder/ready` returns council+github live — weak (availability ≠ governed execution) |
| OIL | WIRED+LIVE+PROVEN+ACTIVE | Proof freshness + phase14 ALPHA_READY — strongest single signal |
| Council AI | WIRED+LIVE+PROVEN | Proof via builder/ready — same weakness as Builder |
| PB Authority | WIRED+LIVE+PROVEN | Supervised-autonomy/readiness returns classification boundary |
| Proof freshness | WIRED+LIVE+PROVEN+ACTIVE | Core loop mechanism — genuinely active |
| Self-repair | WIRED+LIVE+PROVEN | Executor responds, queue observable |
| Prevention | WIRED+LIVE+PROVEN+ACTIVE | Hook wired + last_run shows ACTIVE classification, but `last_run: undefined` in direct probe — suspicious |
| Telemetry | WIRED+LIVE+PROVEN+ACTIVE | Events in DB, efficiency scoring working |
| Memory | WIRED+LIVE | Endpoint returns 200, table queryable — NO DATA yet |
| Command Center | WIRED+LIVE+PROVEN | `/system-alpha-readiness` responds 200 |

### 1.3 What is illusion

**1. Memory is LIVE but empty.** The `self_repair_memory_events` table exists with 0 rows. No lessons have ever been written from a real repair execution to this table. The memory system's write path works in theory; it has never been triggered in production.

**2. Council AI "PROVEN" is thin.** The proof source is `builder/ready` showing `callCouncilMember: true`. This proves the dependency is live, not that governed multi-model deliberation with receipts has occurred. Council earning PROVEN via a route existence check is borderline fake-green.

**3. Prevention `last_run: undefined`.** The prevention hooks endpoint claims ACTIVE maturity but the direct probe returned `last_run: undefined`. The boot hook runs once (45s after boot) but this is not reflected in the hook status. Either the boot hook ran without updating the status correctly, or it didn't run.

**4. ~37 unguarded AI call sites.** There are 58 AI call sites in services/ and only 21 that go through `createUsefulWorkGuard()`. This means approximately 37 AI call paths can fire without a workCheck. This is an Alpha blocker by the system's own constitution.

**5. Telemetry session linkage is broken.** Of the last 20 telemetry events: 14 are missing session_id, 15 are missing cycle_id. You cannot trace which events belong to which session or cycle. Duplicate task_type names coexist (old: `self_repair.executor_dry_run`, new: `self_repair.dry_run`; old: `prevention_hook.deploy_check`, new: `prevention_hook.deploy_drift`). The efficiency scorer is running on contaminated data.

**6. Overnight runner has never fired autonomously.** The runner is WIRED only. The local overnight-state.json shows undefined fields for current_batch, triggered_by, and verdict — no autonomous execution has ever occurred. Every governed session run has required manual C2 invocation.

**7. Proof freshness is STALE right now.** Rapid deploys today (5 commits in ~90 minutes) left the proof receipts behind the deploy SHA. The self-repair system has queued a repair (repair_queue_open: 1) but `ready_for_supervised: false` until the repair runs.

**8. Legacy authority surfaces still callable.** `routes/command-center-routes.js` (896 lines, 27 routes) is still mounted. No canonical replacements have been confirmed for most of these 27 routes. Any caller using the legacy surface gets stale or divergent behavior.

**9. Local and Railway proof stores are not aligned.** `proof_store_id local=afd4d8d0565e1ca1 railway=a1776d2a70055a32` — these are different. Local `npm run builder:preflight` is reading a different proof store than Railway serves. Local verification is not equivalent to Railway verification.

**10. TSOS internal hooks are NOT_WIRED.** This component holds a 0/100 maturity score and drags down component maturity. It has no proof source, no endpoint, no wiring — it exists only as a named gap.

### 1.4 What is still dangerous

- Builder generating stubs while reporting `committed:true` — permanent ongoing risk for any large file edit
- Unguarded AI calls firing in production without workChecks
- Legacy fallback paths (`epistemic_facts`) silently acting as memory truth when the canonical table has no data
- Duplicate telemetry rows creating misleading efficiency scores
- Any future agent claiming these 10 ACTIVE/PROVEN components are "production safe" based on docs alone

---

## SECTION 2 — COMPLETE GAP MAP

### GAP-001: Telemetry session linkage broken
**Severity:** CRITICAL  
**Evidence:** 14/20 events missing session_id, 15/20 missing cycle_id  
**Effect:** Cannot trace session execution chains. Efficiency analytics are unreliable. Deduplication is impossible without IDs.  
**Root cause:** `emitSelfRepairTelemetry()` and `emitPreventionHookTelemetry()` are called WITHOUT sessionId/cycleId being propagated from the outer session loop. The outer loop does not pass these IDs into `runSelfRepairExecutor()` or `runDeployRepairCheck()`.  
**Fix complexity:** HIGH — 3 large JS files (>150 lines each). Builder generates stubs for these files. Requires helper extraction or GAP-FILL direct edits.

### GAP-002: Duplicate telemetry rows (two emitters per cycle)
**Severity:** HIGH  
**Evidence:** `self_repair.executor_dry_run` (old name) AND `self_repair.dry_run` (new name) both exist. `prevention_hook.deploy_check` AND `prevention_hook.deploy_drift` both exist.  
**Effect:** Double-counted events in efficiency scoring. `useful_work_score` averaging includes phantom rows.  
**Root cause:** The outer session loop emits a row AND the inner service (`emitSelfRepairTelemetry`, `emitPreventionHookTelemetry`) also emits. Neither is guarded against the other.  
**Fix complexity:** HIGH — same files as GAP-001. Must add `emitsOwnTelemetry: true` flag.

### GAP-003: ~37 unguarded AI call sites
**Severity:** HIGH  
**Evidence:** 58 `callCouncilMember/callCouncilWithFailover` occurrences in services/, 21 go through `createUsefulWorkGuard()`.  
**Effect:** AI calls fire without proving work exists. Token spend without useful output. Contradicts the system's own Alpha constitution.  
**Fix complexity:** MEDIUM — audit first (new script, LOW risk), then fix paths one by one.

### GAP-004: Memory table has never been written to
**Severity:** HIGH  
**Evidence:** `GET /memory/status` returns `total_memory_events: 0`  
**Effect:** Memory is LIVE (table queryable) but has no data. The prevention system falls back to `epistemic_facts` for every lesson read. Memory cannot earn PROVEN until a real repair execution writes a lesson row. The prevention registry is built from legacy data, not from the canonical memory table.  
**Fix complexity:** LOW — memory writes happen automatically when the self-repair executor runs a non-dry-run repair. No code change needed; needs a real repair execution to trigger.

### GAP-005: No autonomous overnight runner
**Severity:** HIGH  
**Evidence:** `overnight-state.json` current_batch/triggered_by/verdict all undefined locally. No Railway logs show autonomous trigger.  
**Effect:** BuilderOS cannot continue overnight without human C2 invocation. This is a hidden Adam dependency that makes the system not truly autonomous.  
**Fix complexity:** LOW-MEDIUM — requires `startup/register-schedulers.js` edit (GAP-FILL: startup/ blocked for builder) with `createUsefulWorkGuard()` wrapper.

### GAP-006: Council AI PROVEN via weak evidence
**Severity:** MEDIUM  
**Evidence:** Council PROVEN proof source is `builder/ready` → `callCouncilMember: true`. This proves the function handle exists, not that governed council deliberation with receipts has occurred.  
**Effect:** Council component maturity is overstated. Any scoring based on this is partially fake-green.  
**Fix complexity:** LOW — new service file + new endpoint to read council-specific receipts from `builder_audit_receipts`.

### GAP-007: TSOS internal hooks not wired
**Severity:** MEDIUM  
**Evidence:** Component `tsos_internal_hooks` → `statuses: ["NOT_WIRED"]`, score 0/100.  
**Effect:** Drags down component maturity score. No BuilderOS-internal token efficiency measurement exists.  
**Fix complexity:** LOW — new endpoint reading token fields from `autonomous_telemetry_events`.

### GAP-008: 896-line legacy route file still active
**Severity:** MEDIUM  
**Evidence:** `routes/command-center-routes.js` — 896 lines, 27 routes, no canonical replacements confirmed.  
**Effect:** Legacy routes shadow or conflict with canonical routes. Cannot delete without replacements LIVE. Drift risk grows with each deploy.  
**Fix complexity:** HIGH — 896-line file. Cannot delete. Need to build canonical replacements (new files = LOW risk), then redirect (edits to large file = HIGH risk).

### GAP-009: Prevention hook `last_run: undefined`
**Severity:** MEDIUM  
**Evidence:** `GET /prevention/hooks` returns `hook_count: 1, last_run: undefined`  
**Effect:** The hook runs at boot but the run result is not persisted/readable. Cannot verify the hook actually ran successfully. ACTIVE maturity claim is unverified.  
**Fix complexity:** LOW — investigate whether `runDeployDriftPreventionHook` returns a result and whether the status function reads it back.

### GAP-010: No component rewind tooling
**Severity:** MEDIUM  
**Evidence:** No `services/builderos-rewind-registry.js`. No `GET /api/v1/lifeos/command-center/rewind-registry`. The rewind policy is documented (A-to-Z Blueprint §14) but has no runtime implementation.  
**Effect:** If a component breaks, the only option is `git revert` + redeploy. There is no targeted component rewind capability.  
**Fix complexity:** LOW-MEDIUM — new service + new endpoint.

### GAP-011: No useful-work-guard coverage report
**Severity:** MEDIUM  
**Evidence:** No `scripts/useful-work-guard-audit.mjs`. The ALPHA_BLUEPRINT says "USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE" is a blocker, but there is no automated way to check it.  
**Effect:** Cannot prove guard coverage. Cannot close the blocker.  
**Fix complexity:** LOW — new script (builder SAFE for scripts/).

### GAP-012: 15 required metrics — most not in efficiency endpoint
**Severity:** MEDIUM  
**Evidence:** `GET /autonomous-telemetry/efficiency` returns `total_sessions: undefined, avg_useful_work: undefined, total_events: undefined` (from this audit's raw probe). The 15 metrics listed in BUILDEROS_ALPHA_BLUEPRINT §9 are not all present.  
**Effect:** Scoring is incomplete. Drift frequency, hallucination frequency, overnight throughput, autonomous continuation rate — all missing.  
**Fix complexity:** LOW-MEDIUM — new service file preferred over extending existing.

### GAP-013: Local proof store ≠ Railway proof store
**Severity:** MEDIUM  
**Evidence:** `proof_store_id local=afd4d8d0565e1ca1 railway=a1776d2a70055a32`  
**Effect:** Local preflight passes, but Railway is reading a different proof store. Local verification does not confirm Railway state. Any local self-repair audit gives false confidence.  
**Fix complexity:** UNCLEAR — requires investigation into what `proof_store_id` represents and why they differ.

### GAP-014: No BUILDEROS_CLASSIFICATION_LOCK.md
**Severity:** LOW  
**Evidence:** OIL Audit Checklist §6 references this file as a blocker-check for deletion decisions. It does not exist.  
**Effect:** No formal frozen classification state. Agents can silently reclassify components without evidence. Legacy quarantine policy is aspirational, not enforced.  
**Fix complexity:** LOW — new doc (GAP-FILL: docs/ blocked for builder).

### GAP-015: No runtime verification of Alpha Loop under induced drift
**Severity:** LOW  
**Evidence:** No `scripts/alpha-loop-stress-test.mjs`. The Alpha Acceptance Loop (8-step chain) has never been verified as a complete automated circuit.  
**Effect:** Cannot claim Alpha certification. The loop may have gaps or human-dependency hidden inside it.  
**Fix complexity:** LOW — new script (builder SAFE).

---

## SECTION 3 — AUTONOMY MATURITY MODEL

### 3.1 Scale definitions (runtime-only — docs earn zero credit)

**NOT_WIRED (0)**
- Requirements: none
- Runtime proof: none
- Forbidden shortcuts: calling it WIRED because a file exists
- Fake-green risk: extreme

**WIRED (0.25)**
- Requirements: code exists, is imported, is reachable in the running server
- Runtime proof: `GET /api/v1/lifeos/builder/ready` or equivalent showing the dependency is live
- Forbidden shortcuts: "wired" means imported and reachable — not just present in the repo
- Fake-green risk: file exists in routes/ but is never mounted → still NOT_WIRED

**LIVE (0.50)**
- Requirements: canonical endpoint responds HTTP 200 with meaningful data
- Runtime proof: direct curl of the endpoint returns 200 with non-empty, non-stub data
- Forbidden shortcuts: endpoint returning 200 with `{"ok":false,"status":"NOT_WIRED"}` is NOT LIVE — that is WIRED
- Fake-green risk: route file exists → is mounted → returns 200 with hardcoded empty shape → classified LIVE

**PROVEN (0.75)**
- Requirements: real execution evidence in `builder_audit_receipts`, `security_receipts`, `autonomous_telemetry_events`, or `self_repair_memory_events` — with timestamps, non-null outcomes, traceable back to real runtime execution
- Runtime proof: DB query showing >0 rows with valid content AND at least one row from within the last 7 days
- Forbidden shortcuts: docs saying it was proven; SSOT receipt rows; test runs on local DB; dry-runs logged as real executions
- Fake-green risk: "council is PROVEN because `callCouncilMember: true` at builder/ready" — function handle is not execution evidence

**ACTIVE (1.0)**
- Requirements: component executes in scheduled or triggered cycles without manual human invocation; observable in logs or state files on the running server
- Runtime proof: Railway server logs OR state file showing scheduled execution within last 24h, with `triggered_by` not equal to `"C2"` or `"manual"`
- Forbidden shortcuts: manually triggered once → classified ACTIVE; batch 10 from overnight test → classified ACTIVE forever
- Fake-green risk: overnight runner ran in C2-triggered test sessions but has never fired from a scheduler

**PRODUCTION_SAFE (new — not yet any component)**
- Requirements: ACTIVE + passes Alpha Acceptance Loop under induced drift (automated) + no hidden Adam dependency + all 15 required metrics populated + useful_work_score > 0.50 (7-day average) + zero unguarded AI calls in code path + rewind capability verified + no legacy fallback paths active in code path + session_id + cycle_id present in all telemetry rows from this component
- Runtime proof: `GET /system-alpha-readiness` returns `verdict: "PRODUCTION_SAFE"` for this component, backed by above checks
- Forbidden shortcuts: claiming PRODUCTION_SAFE before the automated stress test passes
- Fake-green risk: very high — this level will tempt premature graduation

### 3.2 State transitions — required evidence per upgrade

| From | To | Minimum evidence required |
|---|---|---|
| NOT_WIRED | WIRED | Code exists, imported, endpoint mounted, returns any 200 |
| WIRED | LIVE | Canonical endpoint returns 200 with live non-stub data |
| LIVE | PROVEN | ≥1 row in canonical receipt/event table from real non-dry execution within 7 days |
| PROVEN | ACTIVE | Scheduled/autonomous execution observable in Railway logs or state file, `triggered_by != "manual"` |
| ACTIVE | PRODUCTION_SAFE | All 9 criteria in PRODUCTION_SAFE above, all automated |

### 3.3 Multi-status rules

- A component may hold multiple statuses simultaneously only when each is independently verified
- Holding PROVEN does not imply ACTIVE (a component can be proven once and then go idle)
- Holding ACTIVE does not imply PROVEN (a scheduled call can fire without writing a receipt)
- Every status claimed in `system-alpha-readiness` must have a named proof source that can be verified with a curl command today

---

## SECTION 4 — SAFE SELF-EVOLUTION ARCHITECTURE

### 4.1 Mutation zones

**Zone 1 — SAFE (builder CAN write, low oversight needed)**
```
routes/*.js       (new files only)
services/*.js     (new files only)
config/*.js       (new files only)
db/migrations/*.sql (new files only)
scripts/*.mjs     (new files only)
prompts/*.md      (new and existing — builder reliable here)
public/overlay/*  (new files only)
```

**Zone 2 — CAUTION (builder may attempt, MUST verify line count)**
```
routes/*.js       (existing files 50–150 lines — moderate risk)
services/*.js     (existing files 50–150 lines — moderate risk)
config/*.js       (existing files — generally safe)
db/migrations/    (existing files — generally safe, append-only)
```

**Zone 3 — DANGER (builder generates stubs — NEVER attempt surgical edit via builder)**
```
routes/*.js       (existing files >150 lines — confirmed stub risk)
services/*.js     (existing files >150 lines — confirmed stub risk)
routes/command-center-routes.js    (896 lines — builder WILL stub)
services/builderos-system-alpha-readiness.js (442 lines — confirmed)
services/self-repair-executor.js   (534 lines — confirmed)
services/self-repair-deploy-scheduler.js (196 lines — confirmed)
services/autonomous-telemetry-session.js (281 lines — confirmed)
```

**Zone 4 — BLOCKED (builder safe-scope policy — direct edit only)**
```
startup/*.js      (BLOCKED — composition-only, GAP-FILL required)
middleware/*.js   (BLOCKED)
core/*.js         (BLOCKED)
server.js         (BLOCKED)
docs/             (not in SAFE_WRITE_PATHS — builder rejects with "outside safe-scope")
.env, .github/    (BLOCKED)
SSOT documents    (BLOCKED by policy)
```

### 4.2 Helper-module mutation strategy

When a large file needs logic added (Zone 3), the required approach is:

1. **Extract:** Write the new logic as a new file (`services/feature-name-helper.js`) — Zone 1/2. Builder SAFE.
2. **Import:** Add 1–2 import lines to the large file. This is a GAP-FILL direct edit, ≤5 lines.
3. **Call:** Replace the original inline call with the extracted function. GAP-FILL, ≤5 lines.
4. **Verify:** `node --check` on all modified files. Confirm line count of large file did NOT shrink.
5. **Never:** Ask the builder to rewrite or patch a Zone 3 file for surgical changes.

### 4.3 Patch-size limits

- Zone 1/2 (new files via builder): no line limit — builder handles full new files well
- Zone 3 (direct edit of large existing file): ≤20 lines changed per edit session
- Zone 4 (startup/etc direct edit): ≤15 lines per session — smallest possible composition-only change
- If a change requires >20 lines in a large file: split into multiple phases, each independently verifiable

### 4.4 Anti-stub protection protocol

After EVERY builder commit:
```bash
# 1. Verify line count (stubs are < 100 lines for files that should be > 150)
git show HEAD:<target_file> | wc -l

# 2. Verify syntax
node --check <target_file>

# 3. Verify proof freshness still CURRENT
curl -s "$PUBLIC_BASE_URL/api/v1/lifeos/command-center/proof-freshness" \
  -H "x-command-key: $COMMAND_CENTER_KEY" | grep -q '"overall":"CURRENT"'

# 4. If line count < 100 for a file that was > 150: STOP. Revert immediately.
git revert HEAD --no-commit
git commit -m "revert: builder stub for <file>"
git push origin main
```

### 4.5 Deployment SHA truth enforcement

The deployment SHA drift check must run at every boot. Current state:
- `startup/boot-domains.js` → `bootSelfRepairDeployCheck` (GAP-FILL: startup/ blocked)
- `services/self-repair-deploy-scheduler.js` → `runDeployDriftPreventionHook()`
- Runs once 45 seconds after boot

The enforcement chain is: deploy → new SHA → boot check detects drift → PB authority classifies → executor repairs → proof CURRENT. This chain is verified at component level but NOT verified as an automated end-to-end loop. GAP-015 addresses this.

### 4.6 Rollback/rewind system (current capability vs required)

**Current capability:**
- `git revert HEAD` — whole-repo rollback (manual)
- Migration runner marks failed migrations as applied — no automatic rollback
- No targeted component rewind tooling

**Required for PRODUCTION_SAFE:**
- `GET /api/v1/lifeos/command-center/rewind-registry` — shows last known good commit per component
- `POST /api/v1/lifeos/command-center/rewind/<component_id>` — triggers targeted revert + redeploy
- Each component must track `last_known_good_commit` in its proof receipt
- Rewind must be executable without Adam running git commands

**GAP-010** covers this gap.

---

## SECTION 5 — COMPLETE PHASE SYSTEM (PRIORITIZED)

See Section 8 for the next 30 phases with full specs. Phase ordering follows this hierarchy:
1. Safety first (fix what is dangerous)
2. Truthfulness (fix what is misleading)
3. Autonomy (reduce hidden Adam dependencies)
4. Governance (strengthen enforcement)
5. Feature parity (what is missing that production requires)

---

## SECTION 6 — GOVERNANCE CONSTITUTION

### 6.1 When Builder may edit directly

Builder MUST be attempted first for any file in Zone 1 (new files in allowed paths). Builder may be used for Zone 2 files after confirming the current file is ≤150 lines. Builder verification required after every commit: line count check + node --check.

**Required evidence for "builder did it" claim:**
1. `POST /api/v1/lifeos/builder/build` returned `committed: true`
2. `git show HEAD:<file> | wc -l` shows expected line count (not a stub)
3. `node --check <file>` passes
4. SSOT receipt row added with commit SHA

### 6.2 When Builder must stop

Builder MUST NOT be used (without confirmed mitigation plan) when:
- Target file is in Zone 3 (>150 lines, existing)
- Target file is in Zone 4 (startup/, middleware/, core/, docs/, server.js)
- Builder returned `committed:true` but line count suggests stub (< 100 lines for a previously large file)
- The same file has already been stubbed by the builder in a prior attempt

### 6.3 When Conductor intervention (GAP-FILL) is required

GAP-FILL (direct Edit/Write by Conductor) is required when:
- Zone 3 file surgical edit ≤20 lines and helper extraction is not feasible
- Zone 4 file composition-only wiring change
- Builder returned stub (revert + GAP-FILL)
- docs/ authoring required
- Migration needs emergency direct write

**Every GAP-FILL must document:**
```
GAP-FILL: <what was tried with builder> — <exact HTTP status or error>
— <why no other builder path existed>
```
Vague claims (`GAP-FILL: builder doesn't work`) are §2.6 violations.

### 6.4 When helper extraction is mandatory

When a Zone 3 file requires >5 lines of new logic, the helper extraction strategy is mandatory:
1. Determine if the new logic is self-contained
2. If yes: create `services/new-feature-helper.js` via builder (Zone 1, SAFE)
3. Add ≤2-line import + call to Zone 3 file via direct edit (GAP-FILL)
4. Never ask the builder to rewrite the Zone 3 file to include the new logic inline

### 6.5 When PB authority required

Execution requiring PB authorization:
- Any self-repair action (classified by `classifyExecutionAuthority()`)
- Any file mutation the system will execute autonomously (not C2-triggered)
- Any action that modifies deployed code on Railway without Conductor review
- Any action that writes to `builder_audit_receipts` or `security_receipts` as "PROVEN"

### 6.6 When human (Adam) approval is mandatory

Human approval is required only when:
- A new env var or credential must be created that does not already exist in the Railway vault
- A paid third-party integration is being activated for the first time
- A non-reversible database operation is proposed (DROP TABLE, DELETE with no WHERE)
- A constitutional governance change is being made
- A phase is classified as `ADAM_REQUIRED` by the PB authority endpoint

**Not required for:** routine repair cycles, proof freshness restoration, new file creation via builder, adding new routes to allowed paths.

### 6.7 When runtime proof is mandatory

Runtime proof is mandatory before claiming any status upgrade:
- WIRED → LIVE: must have curl proof of 200 response
- LIVE → PROVEN: must have DB query showing ≥1 non-dry-run receipt row within 7 days
- PROVEN → ACTIVE: must have Railway log line or state file showing scheduled execution
- Any Alpha score change must cite the specific proof source that caused it

### 6.8 When receipts are mandatory

A receipt in `builder_audit_receipts` or `security_receipts` is mandatory:
- After any self-repair execution (PASS or FAIL)
- After any governed builder commit (system-authored)
- After any OIL audit phase completion
- After any phase in the roadmap claims completion

SSOT amendment receipt rows are separately required for every code change (enforcement via pre-commit hook).

### 6.9 When deployment proof is mandatory

Deployment proof verification is mandatory:
- After any Railway redeploy: check `proof-freshness` endpoint for `overall: CURRENT`
- After any builder commit that was deployed: verify `railway_deploy_sha` matches the builder commit SHA
- Before claiming any component is ACTIVE: verify Railway logs, not local logs

---

## SECTION 7 — TRUE PRODUCTION AUTONOMY

### 7.1 What FALSE autonomy looks like (current state has some of this)

- Overnight runner fires only when C2 invokes it manually → HIDDEN ADAM DEPENDENCY
- Council AI "PROVEN" because `callCouncilMember: true` in a health check → FAKE EVIDENCE
- Memory system "LIVE" but 0 rows written → CAPABILITY WITHOUT USE
- Prevention "ACTIVE" but `last_run: undefined` → CLAIM WITHOUT EVIDENCE
- 37 unguarded AI calls → GOVERNANCE WITHOUT ENFORCEMENT
- Duplicate telemetry rows → MEASUREMENT WITHOUT ACCURACY
- Legacy routes still mounted and callable → AUTHORITY WITHOUT CLARITY

### 7.2 What TRUE production autonomy requires

All of the following must be true simultaneously:

**Truthful measurement**
- Zero telemetry rows missing session_id or cycle_id
- Zero duplicate task_type names in telemetry
- All 15 required metrics populated with live data (nulls where genuinely no data — not absent)
- useful_work_score_live > 0.50 over a real 7-day window
- useful_work_bonus applied only when threshold is met with real events

**Bounded safe self-modification**
- No Zone 3 file edited by builder without line-count verification + anti-stub check
- Every Zone 4 edit documented as GAP-FILL with exact evidence
- Helper extraction used for all >5-line additions to Zone 3 files
- Alpha Acceptance Loop verified automated (stress test script passing)

**Zero hidden Adam dependencies**
- Overnight runner fires from scheduler autonomously (Railway logs confirm)
- Self-repair boot check runs and completes without manual trigger
- PB authority classifies all queued repairs as SYSTEM_AUTHORIZED_UNDER_PB (no ADAM_REQUIRED items in normal operation)
- Proof freshness restoration happens automatically after every deploy

**Truthful governance**
- All 12 BuilderOS components at PROVEN or better (no NOT_WIRED components)
- Zero unguarded AI call paths (useful-work-guard audit script passes)
- All legacy surfaces quarantined or retired (canonical replacements LIVE)
- Prevention hooks fire and update `last_run` with verifiable evidence

**Rollback readiness**
- Rewind registry exists with `last_known_good_commit` per component
- Targeted component rewind executable via system API without git commands

### 7.3 Exact acceptance criteria for "production autonomous"

```
GET /api/v1/lifeos/command-center/system-alpha-readiness returns:
  percent_complete >= 85
  system_alpha_status: PRODUCTION_AUTONOMOUS
  blockers: []
  scoring_method.useful_work_bonus_pct: 5  (not 0)
  scoring_method.useful_work_score_live: >= 0.50
  
All components:
  statuses includes PROVEN or ACTIVE
  tsos_internal_hooks: WIRED or better
  overnight_runner: ACTIVE
  memory: PROVEN (not just LIVE)
  
GET /api/v1/lifeos/autonomous-telemetry/events?limit=20 returns:
  every event has session_id (non-empty)
  every event has cycle_id (non-empty)
  no duplicate task_type names (no old+new coexistence)
  
GET /api/v1/lifeos/command-center/memory/status returns:
  total_memory_events > 0
  proof_status: LIVE
  
scripts/alpha-loop-stress-test.mjs exits 0 (full loop without human step)
scripts/useful-work-guard-audit.mjs exits 0 (zero unguarded AI calls)
```

---

## SECTION 8 — NEXT 30 EXECUTABLE PHASES

### Priority ordering
1. Phases that fix dangerous measurement problems (telemetry accuracy, fake-green)
2. Phases that eliminate hidden Adam dependencies
3. Phases that wire missing governance enforcement
4. Phases that fill runtime proof gaps

Each phase: max 1–2 files, independently verifiable, rollback-safe.

---

### PHASE 01 — Useful-Work-Guard Coverage Audit Script ✅ SAFEST START
**Purpose:** Close `USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE` blocker  
**Files:** `scripts/useful-work-guard-audit.mjs` (NEW — builder SAFE)  
**Risk:** LOW  
**Builder:** YES — new script in scripts/  
**What it does:** Greps services/ and startup/ for `callCouncilMember` + `callCouncilWithFailover` + `setInterval`. Greps for `createUsefulWorkGuard`. Reports unguarded paths with file:line. Exits 1 if any unguarded path found.  
**Verify:** `node scripts/useful-work-guard-audit.mjs` runs without error; outputs coverage report  
**Rollback:** `git revert HEAD` — no risk  
**Fake-green risk:** Script could report 0 unguarded paths by only checking a subset of patterns — spec must include all AI provider call patterns  
**Alpha impact:** Closes blocker. Does not change score until unguarded paths are individually fixed.  

---

### PHASE 02 — Telemetry Session Linkage Helper (emitsOwnTelemetry flag)
**Purpose:** Fix the root cause of GAP-001/GAP-002 — missing session_id/cycle_id, duplicate rows  
**Strategy:** Extract the emitsOwnTelemetry guard logic into a new helper  
**Files:** `services/telemetry-cycle-guard.js` (NEW — builder SAFE)  
**Risk:** LOW for new file  
**Builder:** YES — new service file  
**What it does:** Exports `buildCycleEmitGuard(cycleDefs)` which wraps the cycle loop; if `def.emitsOwnTelemetry === true`, skips outer emit and passes `{sessionId, cycleId}` into `def.run()`. Also exports `shouldSkipOuterEmit(def)`.  
**Verify:** File exists, node --check passes, exports are correct  
**Rollback:** `git revert HEAD` — no risk, new file only  
**Fake-green risk:** Creating the helper file without actually wiring it into the session loop changes nothing. Wiring is Phase 03.  
**Alpha impact:** Zero until wired (Phase 03).  

---

### PHASE 03 — Wire emitsOwnTelemetry into Session Loop (GAP-FILL)
**Purpose:** Actually apply the Phase 02 helper to stop duplicate rows  
**Files:** `services/autonomous-telemetry-session.js` (281 lines — Zone 3, direct edit ≤15 lines)  
**Risk:** MEDIUM — Zone 3 file, but change is ≤10 lines total  
**Builder:** NO — Zone 3 file  
**GAP-FILL:** Direct Edit tool. Evidence: Zone 3 file (281 lines), builder stub risk confirmed 2026-05-25.  
**What it does:**  
1. Import `shouldSkipOuterEmit` from `./telemetry-cycle-guard.js` (2 lines)  
2. Add `emitsOwnTelemetry: true` to `deploy_prevention_hook` and `self_repair_dry_run` cycle defs (2 lines)  
3. Change cycle loop outer emit call to check `if (!shouldSkipOuterEmit(def)) { await emitCycleTelemetry(...) }` (3 lines)  
4. Change `def.run()` to `def.run({ sessionId, cycleId })` (1 line)  
5. Rename task_types for both cycle defs (2 lines)  
Total: ~10 lines  
**Verify:** `node --check services/autonomous-telemetry-session.js` passes. After deploy: POST `/session/run`, check GET `/events` — no duplicate rows for same cycle, all events have session_id.  
**Rollback:** `git revert HEAD`  
**Fake-green risk:** Wiring the guard without actually propagating sessionId/cycleId into inner emitters still leaves rows without IDs. Must verify events have IDs.  
**Alpha impact:** Clears GAP-001 and GAP-002 partially. Full fix requires Phases 04/05.  

---

### PHASE 04 — Propagate sessionId/cycleId into Self-Repair Executor (GAP-FILL)
**Purpose:** Self-repair telemetry rows get correct session/cycle IDs  
**Files:** `services/self-repair-executor.js` (534 lines — Zone 3, ≤15 lines changed)  
**Risk:** HIGH — Zone 3 file. Must read FULL FILE before edit.  
**Builder:** NO — Zone 3 file  
**GAP-FILL:** Zone 3 file, builder confirmed to generate stubs (f85264b evidence).  
**What it does:** Add `{ sessionId, cycleId } = {}` to `runSelfRepairExecutor` signature. Pass both into the `emitSelfRepairTelemetry()` call inside `finishExecutorRun()`. Changes: ≤8 lines.  
**Verify:** `node --check services/self-repair-executor.js` passes. After deploy: telemetry rows from self_repair cycle have non-empty session_id and cycle_id.  
**Rollback:** `git revert HEAD`  
**Fake-green risk:** Adding the params to the signature without threading them to the emit call has no effect. Must verify the emitter actually receives them.  
**Alpha impact:** Closes session_id gap for self-repair cycles.  

---

### PHASE 05 — Propagate sessionId/cycleId into Deploy Scheduler (GAP-FILL)
**Purpose:** Prevention hook telemetry rows get correct session/cycle IDs  
**Files:** `services/self-repair-deploy-scheduler.js` (196 lines — Zone 3, ≤15 lines changed)  
**Risk:** HIGH — Zone 3 file. Confirmed stub risk.  
**Builder:** NO  
**GAP-FILL:** Zone 3 file, builder confirmed to generate stubs (7da86e5 evidence).  
**What it does:** Add `{ sessionId, cycleId } = {}` to `runDeployRepairCheck()`. Pass both into all 3 `emitPreventionHookTelemetry()` calls.  
**Verify:** `node --check services/self-repair-deploy-scheduler.js` passes. After deploy: prevention_hook telemetry rows have session_id and cycle_id.  
**Rollback:** `git revert HEAD`  
**Fake-green risk:** Same as Phase 04.  
**Alpha impact:** Closes session_id gap for prevention hook cycles.  

---

### PHASE 06 — Overnight Runner Scheduler Registration (GAP-FILL)
**Purpose:** Overnight runner becomes ACTIVE without C2 manual trigger  
**Files:** `startup/register-schedulers.js` (Zone 4 — GAP-FILL, ≤15 lines)  
**Risk:** LOW-MEDIUM — Zone 4 file but change is small  
**Builder:** NO — startup/ in BLOCKED_WRITE_PATHS  
**GAP-FILL:** startup/ is BLOCKED per config/builder-safe-scope.js  
**What it does:** Import `runGovernedTelemetrySession` from `services/autonomous-telemetry-session.js`. Add one `createUsefulWorkGuard` block that fires nightly via `setInterval(24h)`. Guard prereqs: `COMMAND_CENTER_KEY` present, `DATABASE_URL` present. Guard workCheck: readiness endpoint returns `ready_for_supervised: true`. Purpose: "Run one governed telemetry session for BuilderOS overnight continuation".  
**Verify:** After Railway deploy: Railway logs show `[OVERNIGHT-SCHEDULER]` log line. After 24h: `overnight-state.json` shows `triggered_by: "overnight-scheduler"`. `system-alpha-readiness` shows `overnight_runner` with `ACTIVE`.  
**Rollback:** `git revert HEAD` + redeploy  
**Fake-green risk:** setInterval fires but guard's workCheck fails silently — runner never actually executes. Must verify Railway logs, not just that scheduler registered.  
**Alpha impact:** Overnight runner WIRED → ACTIVE. Component maturity contribution from 0.25 → 1.0. +~4% overall score.  

---

### PHASE 07 — Useful-Work-Guard Coverage — Fix Top 5 Unguarded Paths
**Purpose:** Reduce unguarded AI call sites from ~37 toward 0  
**Files:** Determined by Phase 01 output (up to 5 services files — small edits per file)  
**Risk:** MEDIUM — editing existing service files  
**Builder:** Only if target files are under 150 lines  
**What it does:** For each of the top 5 unguarded scheduled AI calls identified by Phase 01: wrap in `createUsefulWorkGuard()` with appropriate prereqs and workCheck.  
**Verify:** `node scripts/useful-work-guard-audit.mjs` shows 5 fewer unguarded paths.  
**Rollback:** `git revert HEAD` per phase  
**Fake-green risk:** Adding guard with `workCheck: async () => true` does nothing — workCheck must query the DB.  
**Alpha impact:** Moves toward closing `USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE` blocker.  

---

### PHASE 08 — Council AI Proof Endpoint (new service + new route file)
**Purpose:** Upgrade Council AI from thin PROVEN → independently verified PROVEN  
**Files:** `services/council-proof-reporter.js` (NEW — builder SAFE) + `routes/council-proof-routes.js` (NEW — builder SAFE)  
**Risk:** LOW — both new files  
**Builder:** YES for both  
**What it does:** Service reads `builder_audit_receipts` where `findings_json->>'role' = 'OIL_AUDITOR'` AND was triggered from governed session. Route exposes `GET /api/v1/lifeos/command-center/council/proof`. Response includes: receipt count, latest receipt timestamp, evidence of governed deliberation.  
**Verify:** `GET /council/proof` returns 200 with evidence from real receipts in DB.  
**Rollback:** Delete new files. No risk.  
**Fake-green risk:** Reading receipts that were written by test runs not real council deliberation — must filter for real execution receipts only.  
**Alpha impact:** Council AI proof improves from thin evidence to genuine receipt chain.  

---

### PHASE 09 — TSOS Internal Hooks Endpoint (new route file)
**Purpose:** Close `TSOS_INTERNAL_HOOKS_NOT_WIRED` blocker  
**Files:** `routes/tsos-efficiency-routes.js` (NEW — builder SAFE)  
**Risk:** LOW — new file  
**Builder:** YES  
**What it does:** `GET /api/v1/lifeos/builderos/tsos-efficiency` — reads token estimate totals from `autonomous_telemetry_events` grouped by session. Returns `useful_work_per_1k_tokens` metric. This is BuilderOS-internal token accounting, not customer-facing TSOS.  
**Verify:** `GET /builderos/tsos-efficiency` returns 200. `system-alpha-readiness` shows `tsos_internal_hooks` with at least `WIRED+LIVE`.  
**Rollback:** Delete new file. No risk.  
**Fake-green risk:** Endpoint returns data even when `autonomous_telemetry_events` has no token_estimate fields populated — must return honest NO_DATA.  
**Alpha impact:** `tsos_internal_hooks` moves from NOT_WIRED (0) to LIVE (0.5) = significant score improvement.  

---

### PHASE 10 — Prevention Hook Last-Run Fix
**Purpose:** Make prevention hook `last_run` visible — close GAP-009  
**Files:** `services/self-repair-prevention-hook-planner.js` (check line count before proceeding) OR new helper file  
**Risk:** MEDIUM if file >150 lines, LOW if helper  
**Builder:** Depends on file size — check first  
**What it does:** Ensure the boot hook result is persisted to a readable location. `buildPreventionHooksStatus()` must return the actual last run result with timestamp.  
**Verify:** `GET /prevention/hooks` returns `last_run.result` with a real timestamp  
**Rollback:** `git revert HEAD`  
**Alpha impact:** Prevention claim of ACTIVE becomes genuinely verifiable.  

---

### PHASE 11 — Useful-Work-Guard Audit Completion (Phases 07 repeat until ≤5 unguarded)
**Purpose:** Drive unguarded AI calls to ≤5  
**Files:** Determined by Phase 01 output  
**Risk:** MEDIUM  
**Verify:** `node scripts/useful-work-guard-audit.mjs` exits 0  
**Alpha impact:** Closes `USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE` blocker fully.  

---

### PHASE 12 — Memory Write Trigger (executor real run)
**Purpose:** Move memory from LIVE (0 rows) to PROVEN (real execution row written)  
**Files:** None — this is an operational trigger, not a code change  
**Risk:** LOW  
**Builder:** N/A  
**What it does:** Trigger a real (non-dry-run) self-repair execution on Railway. If proof is STALE: `POST /api/v1/lifeos/command-center/self-repair/execute` with `dryRun: false`. This writes a row to `self_repair_memory_events` via `writeRepairMemoryFromExecution()`.  
**Prerequisite:** repair_queue_open must be > 0 AND repair is SYSTEM_AUTHORIZED (not ADAM_REQUIRED)  
**Verify:** `GET /memory/status` returns `total_memory_events > 0`, `proof_status: LIVE`  
**Rollback:** N/A — memory events are append-only (no destructive change)  
**Alpha impact:** Memory LIVE → PROVEN. Adds ~4% to component maturity score.  

---

### PHASE 13 — Rewind Registry Service + Endpoint (new file)
**Purpose:** Close GAP-010 — no component rewind tooling  
**Files:** `services/builderos-rewind-registry.js` (NEW — builder SAFE) + mount via register-runtime-routes.js (GAP-FILL)  
**Risk:** LOW for new service. Medium for wiring.  
**Builder:** YES for service file  
**What it does:** Service reads last verified commit SHA per component from `builder_audit_receipts`. Endpoint `GET /api/v1/lifeos/command-center/rewind-registry` returns per-component: `last_known_good_commit`, `deployed_sha`, `drift_detected`.  
**Verify:** Endpoint returns 200 with component entries  
**Rollback:** Delete new file. Remove mount (GAP-FILL revert).  
**Alpha impact:** Enables rewind capability. Required for PRODUCTION_SAFE.  

---

### PHASE 14 — BUILDEROS_CLASSIFICATION_LOCK.md (new doc)
**Purpose:** Close GAP-014 — no formal frozen classification state  
**Files:** `docs/architecture/BUILDEROS_CLASSIFICATION_LOCK.md` (NEW — GAP-FILL: docs/ blocked for builder)  
**Risk:** LOW — doc only  
**Builder:** NO (docs/ blocked)  
**What it does:** Freezes current classification of all BuilderOS components and legacy surfaces. Documents: KEEP_CANONICAL, KEEP_LEGACY, ARCHIVE_CANDIDATE. Any reclassification requires explicit receipt.  
**Verify:** File exists with all 12+ components classified  
**Alpha impact:** Enables OIL Checklist §6 to pass for future phases.  

---

### PHASE 15 — Alpha Acceptance Loop Stress Test Script
**Purpose:** Close GAP-015 — loop never verified as automated circuit  
**Files:** `scripts/alpha-loop-stress-test.mjs` (NEW — builder SAFE)  
**Risk:** LOW — new script  
**Builder:** YES  
**What it does:** Induces proof staleness condition. Observes: self-repair-detector fires, PB authority classifies, executor runs, proof returns CURRENT, receipt written, repair queue clears. All without human step.  
**Verify:** Script exits 0. Proof is CURRENT after run.  
**Alpha impact:** Required for PRODUCTION_SAFE certification.  

---

### PHASE 16 — Telemetry Metrics Completeness (new service file)
**Purpose:** Close `TELEMETRY_GAPS_REMAIN` — all 15 required metrics populated  
**Files:** `services/builderos-metrics-reporter.js` (NEW — builder SAFE)  
**Risk:** LOW — new file  
**Builder:** YES  
**What it does:** Reads `autonomous_telemetry_events` and computes all 15 required metrics. Exposes via existing efficiency endpoint or new `GET /api/v1/lifeos/autonomous-telemetry/metrics`.  
**Verify:** All 15 metric fields present in response (null for NO_DATA, not absent)  
**Alpha impact:** Closes `TELEMETRY_GAPS_REMAIN` blocker.  

---

### PHASES 17-20 — Legacy Route Canonical Replacements (H-2 strategy)
**Purpose:** Build canonical replacements for the 27 legacy routes in `command-center-routes.js`  
**Files:** New route files only — LOW builder risk  
**Risk:** LOW (new files), HIGH (any edit to the 896-line legacy file)  
**Ordering:** Do new files first (Phases 17-20). Never touch the 896-line file until replacements are LIVE and verified.  
**Alpha impact:** Moves toward closing `LEGACY_AUTHORITY_SURFACES_STILL_LIVE` blocker.  

---

### PHASE 21 — Local/Railway Proof Store Alignment Investigation
**Purpose:** Close GAP-013 — `proof_store_id` differs between local and Railway  
**Files:** Investigation only — no code change until root cause confirmed  
**Risk:** LOW (investigation), unknown (fix)  
**What it does:** Read `services/oil-proof-freshness.js` to understand what `proof_store_id` represents. Check if it is a hash of the pool connection string (which would differ because local DATABASE_URL ≠ Railway DATABASE_URL). If so: document this as expected (not a bug) and update preflight to note local vs Railway proof scope.  
**Alpha impact:** May not change score, but removes misleading audit warning.  

---

### PHASES 22-25 — Useful-Work-Guard fixes (continued from Phase 11)
Systematic fix of remaining unguarded AI paths, working from Phase 01 audit output. One service per phase, ≤5 lines per file.  

---

### PHASES 26-28 — Legacy Route Redirects (H-1 strategy — AFTER 17-20 VERIFIED)
**Purpose:** Redirect the 27 legacy routes to canonical equivalents  
**Risk:** HIGH — editing 896-line legacy file. Must be done ONLY after H-2 replacements are confirmed LIVE.  
**Approach:** Helper redirect function in a new file (LOW risk). Single import + delegation in legacy file.  

---

### PHASE 29 — Beta Gate: 7-Day Useful Work Window
**Purpose:** Confirm sustained autonomous useful work for 7 consecutive days  
**Files:** No new code — observation phase after Phase 06 (overnight runner ACTIVE)  
**Verify:** `GET /autonomous-telemetry/efficiency?sinceHours=168` returns `avg_useful_work_score >= 0.50`  
**Alpha impact:** Triggers useful_work_bonus (+5%), moves toward PRODUCTION_SAFE.  

---

### PHASE 30 — PRODUCTION_AUTONOMOUS Declaration
**Purpose:** All acceptance criteria met. Declare production autonomous.  
**Files:** `docs/architecture/BUILDEROS_PRODUCTION_AUTONOMOUS_RECEIPT.md` (new doc, GAP-FILL)  
**Prerequisite:** All phases 01-29 complete. Stress test passing. Audit script passing. Memory PROVEN. Overnight ACTIVE. All 15 metrics populated. Zero unguarded AI calls. No legacy surfaces active.  

---

## Appendix A — Top 10 Highest-Risk Gaps

1. **GAP-001/002** — Broken telemetry linkage + duplicate rows (3 Zone 3 files, confirmed stub risk)
2. **GAP-003** — ~37 unguarded AI calls (governance without enforcement)
3. **GAP-008** — 896-line legacy route file (cannot safely edit; 27 routes with no replacements)
4. **GAP-013** — Local/Railway proof store divergence (local verification is not Railway verification)
5. **GAP-009** — Prevention hook `last_run: undefined` (ACTIVE claim without evidence)
6. **GAP-006** — Council AI "PROVEN" via thin evidence (route handle ≠ council execution)
7. **GAP-005** — No autonomous overnight runner (hidden Adam dependency)
8. **GAP-004** — Memory table empty (prevention system uses legacy fallback for every lesson)
9. **GAP-010** — No rewind tooling (only whole-repo git revert exists)
10. **Builder stub risk** — Ongoing for all Zone 3 files; `committed:true` is not a truth signal

---

## Appendix B — Top 10 Safest Next Phases (order matches Section 8)

1. Phase 01 — Useful-work-guard audit script (new file, zero risk)
2. Phase 02 — Telemetry cycle guard helper (new file, zero risk)
3. Phase 08 — Council proof endpoint (new files, zero risk)
4. Phase 09 — TSOS efficiency endpoint (new file, zero risk)
5. Phase 13 — Rewind registry service (new file, zero risk)
6. Phase 14 — Classification lock doc (GAP-FILL doc, zero risk)
7. Phase 15 — Alpha loop stress test script (new script, zero risk)
8. Phase 16 — Metrics reporter service (new file, zero risk)
9. Phase 12 — Memory write trigger (operational, zero code risk)
10. Phase 06 — Overnight scheduler registration (GAP-FILL, ≤15 lines, low risk)

---

## Appendix C — What prevents TRUE production autonomy today

In order of severity:

1. **Telemetry is unreliable.** 14/20 rows missing session_id, duplicates in the data. You cannot measure what you cannot trace.

2. **37 unguarded AI calls.** The system's own governance rule (useful-work-guard on all AI calls) is violated ~37 times. A system that violates its own constitution cannot be trusted.

3. **No autonomous overnight runner.** Every BuilderOS session requires human C2 invocation. True autonomy requires the system to continue without human initiation.

4. **Memory has never been written to.** The self-repair learning loop (repair → lesson → prevention rule) has never completed a real cycle that wrote a memory row. The prevention system runs on legacy data.

5. **Legacy authority surface is live.** 896-line legacy route file with 27 routes still callable. No canonical replacements. Any build agent reading the API surface sees an inconsistent picture.

6. **Council AI proof is thin.** PROVEN via function-handle existence, not governed execution evidence. The council may have never deliberated on a real BuilderOS decision with receipts.

7. **No automated Alpha Loop verification.** The 8-step acceptance loop has never been verified as an automated circuit without human step. Stress test script does not exist.

8. **No component rewind tooling.** If any component breaks, only whole-repo git revert is available. Targeted component rewind requires human git operations.

9. **15 required metrics not all populated.** `drift_frequency`, `hallucination_frequency`, `overnight_throughput`, `autonomous_continuation_rate` — these do not exist in the efficiency endpoint.

10. **Local proof ≠ Railway proof.** `proof_store_id` differs. Local preflight verification does not guarantee Railway state.

---

## Change Receipts

| Date | What | Why |
|---|---|---|
| 2026-05-26 | File created | Complete production autonomy roadmap derived from runtime audit. Current state: 73.8% Alpha, 15 gaps identified, 30 phases defined. GAP-FILL: docs/ blocked for builder — direct authoring. |
