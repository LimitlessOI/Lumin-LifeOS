<!-- SYNOPSIS: BUILDEROS A-TO-Z BLUEPRINT -->

# BUILDEROS A-TO-Z BLUEPRINT

**Status:** `DRAFT`
**Owner:** Adam
**Verifier:** OIL / CAI / PBB
**Last Updated:** 2026-05-25
**Runtime truth at creation:** 76% Alpha — proof CURRENT, readiness true, repair_queue 0, healthy_idle

---

## 1. Purpose

BuilderOS is the **autonomous programming machine**. It exists to safely:

- detect issues
- classify issues
- authorize bounded PB work
- execute repairs/builds
- verify runtime truth
- write receipts
- prevent repeated failures
- continue useful work

…without Adam handling routine operational work.

**BuilderOS is NOT LifeOS.** LifeOS is the product lane built BY BuilderOS.
**BuilderOS is NOT TSOS.** TSOS is the external AI efficiency/routing product.
**BuilderOS is the internal governed machine.**

Docs alone earn zero Alpha credit.

---

## 2. System Boundary

### BuilderOS includes

| Component | Role |
|---|---|
| Builder | Code generation and commit execution |
| OIL | Proof verification, audit, oversight |
| Council AI | Multi-model deliberation and governance |
| BuilderOS-internal TSOS hooks | Token efficiency reporting within BuilderOS only (not customer-facing TSOS) |
| Memory | Self-repair lesson capture and prevention derivation |
| PB execution authority | Classifies what is SYSTEM_AUTHORIZED vs ADAM_REQUIRED |
| Proof freshness | Deploy SHA alignment and runtime proof chain |
| Self-repair executor | Bounded PF-001→PF-002→PF-003 chain execution |
| Prevention hooks | Candidate rules derived from classified repair lessons |
| Telemetry | Governed session execution and useful-work scoring |
| Overnight runner | Autonomous continuation under PB governance |
| Command Center cockpit | Operator visibility — read from runtime truth only |
| Useful-work-guard | Zero-waste AI call enforcement |

### BuilderOS does NOT include as scoring-positive

- LifeOS user features (coaching, family, wellness, consumer UX)
- TSOS customer-facing features (gateway, proxy, decoder packets, savings ledger)
- TC / coaching / pipeline product code
- Overlay polish that does not prove system capability
- Route existence without runtime invocation

---

## 3. Alpha / Beta / Production Criteria

### Alpha

BuilderOS Alpha means: the autonomous build system can safely detect issues, execute bounded PB-authorized work, verify outcomes with runtime proof, write receipts, prevent repeated failures, and continue useful work without Adam performing routine operations.

**Healthy idle is a valid Alpha state** when:
- proof is `CURRENT`
- readiness is `true`
- repair_queue is `0`
- no authorized work is pending

### Beta

- Alpha loop is stable over repeated deploy cycles
- Duplicate authority paths are mostly consolidated
- Prevention covers recurring failures
- Overnight runner proves repeated useful work autonomously
- Prevention hooks measurably reduce repeat failures
- Component drift scoring and rewind workflow operational
- Token efficiency metrics trusted

### Production

- Sustained autonomous continuation without hidden Adam dependency
- Repeatable regression resistance
- Prevention learning outpaces repair recurrence
- Truthful observability across all canonical stores
- BuilderOS survives routine deploy drift, maintains truthful telemetry, avoids fake autonomy, and keeps structural drift bounded under governance

---

## 4. Component Map

Runtime maturity as of **2026-05-25** (from `GET /api/v1/lifeos/command-center/system-alpha-readiness`):

| Component | ID | Maturity | Proof Source | Fake-Green Risk |
|---|---|---|---|---|
| Builder | `builder` | WIRED + LIVE + PROVEN | `GET /api/v1/lifeos/builder/ready` | Builder ready does not prove active build execution |
| OIL | `oil` | WIRED + LIVE + PROVEN + **ACTIVE** | Proof freshness CURRENT + Phase14 ALPHA_READY | Old receipts can look current if proof freshness is ignored |
| Council AI | `council` | WIRED + LIVE | builder/ready (council dependency live) | Generic model availability ≠ governed Council maturity |
| TSOS internal hooks | `tsos_internal_hooks` | **NOT_WIRED** | No dedicated BuilderOS proof source yet | Token-economics UI can imply TSOS maturity not proven for BuilderOS |
| Memory | `memory` | WIRED | self_repair_memory_events table exists | Memory documentation is ahead of BuilderOS runtime proof |
| PB authority | `pb_authority` | WIRED + LIVE + PROVEN | `GET /supervised-autonomy/readiness` | Healthy idle can hide whether classification works under stress |
| Proof freshness | `proof_freshness` | WIRED + LIVE + PROVEN + **ACTIVE** | Proof CURRENT, deploy SHA aligned | None material when deploy SHA parity is present |
| Self-repair | `self_repair` | WIRED + LIVE + PROVEN | repair-queue endpoint + overnight-state.json | Healthy idle = no live repair pressure right now |
| Prevention | `prevention` | WIRED + LIVE + PROVEN + **ACTIVE** | `GET /prevention/hooks` WIRED | One wired hook can overstate subsystem breadth |
| Telemetry | `telemetry` | WIRED + LIVE + PROVEN + **ACTIVE** | autonomous-telemetry events + efficiency | Some required metrics still explicitly NOT_WIRED |
| Overnight runner | `overnight_runner` | WIRED | data/governed-autonomy-overnight-state.json (batch 10 healthy_idle) | Healthy idle can be misread as inactivity vs governed continuation |
| Command Center | `command_center` | WIRED + LIVE + PROVEN | `GET /system-alpha-readiness` responds 200 | Legacy /command-center still mounted — can confuse canonical status |

**Maturity scale:** NOT_WIRED → WIRED → LIVE → PROVEN → ACTIVE

---

## 5. Proof Source Map

Only these 10 sources count as runtime proof for BuilderOS Alpha:

| # | Source | What It Proves |
|---|---|---|
| 1 | `GET /api/v1/lifeos/builder/ready` | Builder + Council AI live and reachable |
| 2 | `GET /api/v1/lifeos/command-center/proof-freshness` | OIL proof freshness, deploy SHA alignment |
| 3 | `GET /api/v1/lifeos/command-center/supervised-autonomy/readiness` | PB authority, repair queue, readiness boolean |
| 4 | `GET /api/v1/lifeos/command-center/self-repair/repair-queue` | Active open repair items count |
| 5 | `GET /api/v1/lifeos/command-center/self-repair/prevention/hooks` | Prevention hook wired count and candidate rules |
| 6 | `GET /api/v1/lifeos/autonomous-telemetry/efficiency` | avg_useful_work_score, session metrics |
| 7 | `GET /api/v1/lifeos/autonomous-telemetry/events` | Individual telemetry events with useful_work_scores |
| 8 | `data/governed-autonomy-overnight-state.json` | Overnight batch state, verdicts, idle classification |
| 9 | `data/governed-autonomy-overnight-log.jsonl` | Overnight session execution log, cycle outcomes |
| 10 | `data/builder-continuous-queue-log.jsonl` | Builder queue activity |

**Supporting context only (do not raise maturity):** SSOT docs, manifests, local repo inspection, blueprint files, route existence, amendment files.

---

## 6. Authority Map

One canonical path per BuilderOS function:

| Function | Canonical Path | Service |
|---|---|---|
| Proof refresh | POST /api/v1/gemini/proof → POST /phase14/run-proofs → POST /self-repair/audit/run | oil-proof-freshness.js |
| Self-repair authorization | GET /supervised-autonomy/readiness | pb-execution-authority.js + supervised-autonomy-readiness.js |
| Self-repair execution | POST /api/v1/lifeos/command-center/self-repair/execute | self-repair-executor.js |
| Deploy drift detection | POST /api/v1/lifeos/command-center/self-repair/deploy-check | self-repair-deploy-scheduler.js |
| Telemetry session | POST /api/v1/lifeos/autonomous-telemetry/session/run | autonomous-telemetry-session.js |
| Prevention hooks | GET /api/v1/lifeos/command-center/self-repair/prevention/hooks | self-repair-prevention-hook-planner.js |
| Alpha readiness | GET /api/v1/lifeos/command-center/system-alpha-readiness | builderos-system-alpha-readiness.js |
| Memory write | services/self-repair-memory.js → self_repair_memory_events table | self-repair-memory.js |
| Memory read | services/self-repair-memory.js → readLatestRepairMemory() | self-repair-memory.js |
| Builder execution | POST /api/v1/lifeos/builder/build | managed by Railway council |

---

## 7. Telemetry Map

| Role | File | Function |
|---|---|---|
| Session coordinator | `services/autonomous-telemetry-session.js` | `runGovernedTelemetrySession()` — 5 cycle defs |
| Inner emitter (self-repair) | `services/autonomous-telemetry-instrumentation.js` | `emitSelfRepairTelemetry()` |
| Inner emitter (prevention) | `services/autonomous-telemetry-instrumentation.js` | `emitPreventionHookTelemetry()` |
| Base emitter | `services/autonomous-telemetry-service.js` | `emitAutonomousTelemetry()`, `newRunId()`, `newSessionId()` |
| Efficiency scorer | `services/autonomous-efficiency-intelligence.js` | `computeEfficiencyIntelligence()` |
| Canonical store | `autonomous_telemetry_events` table (Neon) | All events with cycle_id, session_id, useful_work_score |

**Known gap (PENDING):** Duplicate outer rows — session loop outer emit AND inner service emit both fire for `deploy_prevention_hook` and `self_repair_dry_run` cycles. Fix requires `emitsOwnTelemetry` flag + `sessionId`/`cycleId` propagation. High GAP-FILL risk (large JS files → builder generates stubs). See Phase A.

**task_type renames pending:** `prevention_hook.deploy_check` → `prevention_hook.deploy_drift`, `self_repair.executor_dry_run` → `self_repair.dry_run`.

---

## 8. Memory Map

| Layer | Store | Status |
|---|---|---|
| Primary | `self_repair_memory_events` table (Neon) | WIRED — table exists, writer active |
| JSONL fallback | `data/self-repair-memory-jsonl` | Ephemeral on Railway FS |
| Epistemic facts fallback | `epistemic_facts` table | Last-resort read fallback |

| Role | File | Function |
|---|---|---|
| Writer | `services/self-repair-memory.js` | `writeRepairMemoryFromExecution()` |
| Reader | `services/self-repair-memory.js` | `readLatestRepairMemory(pool, limit)` |
| Classifier | `services/self-repair-lesson-classifier.js` | `classifyRepairLesson()` |
| Prevention registry | `services/self-repair-prevention-registry.js` | `buildPreventionRegistry()` |

**Memory maturity: WIRED.** Not yet LIVE from approved BuilderOS runtime truth source. Blocker: `MEMORY_NOT_RUNTIME_PROVEN`. Next step: add `GET /api/v1/lifeos/command-center/memory/status` to approved proof source set and verify a runtime-proven memory event post-deploy.

---

## 9. Self-Repair Loop

Full chain in execution order:

1. **Detect:** `services/oil-self-repair-detector.js` → `detectSelfRepairIssues()` — detects stale proof, deploy SHA drift, OIL missed issues
2. **Classify:** `services/pb-execution-authority.js` → `classifyExecutionAuthority()` — SYSTEM_AUTHORIZED_UNDER_PB or ADAM_REQUIRED
3. **Authorize:** `services/supervised-autonomy-readiness.js` → `buildSupervisedAutonomyReadiness()` — readiness, repair queue, adam_required_actions
4. **Execute:** `services/self-repair-executor.js` → `runSelfRepairExecutor()` — runs PF-001 → PF-002 → PF-003 chain, max 2 attempts
5. **Log:** `services/self-repair-execution-log.js` → `appendSelfRepairExecutionLog()` — JSONL execution record
6. **Verify:** `services/oil-proof-freshness.js` → `evaluateProofFreshnessFromPool()` — confirms CURRENT after repair
7. **Receipt:** `services/oil-security-receipts.js` → `writeSecurityReceipt()` — audit trail
8. **Learn:** `services/self-repair-memory.js` → `writeRepairMemoryFromExecution()` — lesson captured
9. **Prevent:** `services/self-repair-prevention-registry.js` → `buildPreventionRegistry()` — candidate rules updated

**Boot path:** `startup/boot-domains.js` → `runDeployDriftPreventionHook()` once, 45 seconds after boot.
**Session path:** `POST /api/v1/lifeos/autonomous-telemetry/session/run` → cycle def `deploy_prevention_hook`.

---

## 10. Overnight Loop

| Element | Value |
|---|---|
| Orchestrator | `scripts/governed-overnight-autonomy.mjs` |
| Trigger | C2 manually invokes `POST /api/v1/lifeos/autonomous-telemetry/session/run` in bounded loop |
| State file | `data/governed-autonomy-overnight-state.json` |
| Log | `data/governed-autonomy-overnight-log.jsonl` |
| Skip logic | `skip_session_recommended` flag prevents wasteful cycles when no work pending |
| Current state | **WIRED** — not yet autonomously triggered |
| Batch 10 result | `healthy_idle_no_authorized_work` = SUCCESS (not failure) |
| Maturity needed for ACTIVE | Autonomous trigger via scheduler without manual C2 invocation |

---

## 11. Useful-Work-Guard Policy

Every scheduled/orchestrated/autonomous AI call **MUST** go through `createUsefulWorkGuard()` from `services/useful-work-guard.js`.

Guard requires:
- `prerequisites` — env vars and credentials that must exist
- `workCheck` — DB query proving real work exists before any AI spend
- `purpose` — what actionable output the call produces

**If prerequisites fail or work check returns 0 → skip entirely. No AI call. No tokens burned.**

Policy violations are Alpha blockers. Current state: `USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE` — no full automated audit of all autonomous AI call paths exists yet.

Legacy exception: `services/autonomy-scheduler.js` (12 ungoverned AI calls — BoldTrail, Digital Twin, Pipeline) is gated behind `LEGACY_SCHEDULER_ENABLED=true` opt-in. This gate was confirmed absent from Railway on 2026-05-25. Governed runtime does not start these calls.

---

## 12. Legacy Quarantine Policy

**Rule: classify before delete. Quarantine without deletion.**

No route or service may be deleted before it is classified and its canonical replacement is LIVE.

Current legacy surfaces:

| File | Classification | Status |
|---|---|---|
| `routes/command-center-routes.js` | LEGACY | 27 routes documented — still callable, no canonical replacements yet. See file header for full inventory. |
| `services/autonomy-orchestrator.js` | LEGACY_INACTIVE | `.start()` never called in codebase. Only `completeProject()`/`skipProject()` called via 2 HTTP routes. |
| `services/autonomy-scheduler.js` | LEGACY PRODUCT-LEVEL | 12 ungoverned AI calls. Gated behind `LEGACY_SCHEDULER_ENABLED=true`. Railway gate confirmed absent. |

Classification vocabulary: `LEGACY`, `LEGACY_INACTIVE`, `LEGACY_PRODUCT_LEVEL`, `ARCHIVE_CANDIDATE`, `FORBIDDEN_CANDIDATE`, `UNKNOWN_DO_NOT_TOUCH`.

---

## 13. Fake-Green Risk Policy

Fake-green risks are tracked explicitly and deduct from Alpha score. Known active risks:

- Docs claiming more maturity than runtime proves
- Stale proof surfaces (proof receipt SHA ≠ deployed SHA)
- Local-only proof paths (not matching Railway DB)
- Duplicate telemetry systems (two rows per cycle — current gap)
- Hidden Adam dependency (overnight runner requires C2 manual trigger)
- Partial self-repair presented as full repair
- Legacy fallbacks silently acting as truth
- Route existence mistaken for runtime health
- Builder `committed:true` with stub output (confirmed 2026-05-25 — see `BUILDEROS_BUILDER_LIMITATIONS.md`)

**Prior fake-green fixed (2026-05-25):** `builderos-system-alpha-readiness.js` removed hardcoded `usefulWork = 0.321`. Now computes live from `autonomous_telemetry_events` over 168h window. Returns `NO_DATA` when no scored events exist.

---

## 14. Component Drift / Rewind Policy

BuilderOS must support targeted component rewind, not only whole-system rollback. For each major subsystem track:

| Field | Description |
|---|---|
| `component_id` | Unique identifier |
| `blueprint_version` | Which blueprint this component was built from |
| `code_commit_sha` | SHA when component was last changed |
| `deployed_sha` | SHA currently running on Railway |
| `runtime_status` | Current maturity (NOT_WIRED → ACTIVE) |
| `useful_work_score` | Latest rolling score |
| `drift_score` | Deviation from last known good state |
| `last_known_good_commit` | Last SHA where component was proven |
| `rollback_scope` | What a rewind would affect |
| `dependent_components` | What breaks if this component is rewound |

**Targetable components:** blueprint generator, OIL auditor, memory writer, telemetry scorer, self-repair executor, prevention hook only.

---

## 15. A-to-Z Build Phases (76% → Production)

| Phase | Name | Current State | Target | Builder Risk | Approach |
|---|---|---|---|---|---|
| **A** | Telemetry Deduplication | Duplicate rows on 2 cycle types | emitsOwnTelemetry flag stops outer emit | **HIGH** — 3 large JS files (>200 lines), builder generates stubs | Split into helper module or wrapper; never surgical edit of large file |
| **B** | Memory Runtime Proof | WIRED only | LIVE + PROVEN | **LOW** — new endpoint file | Builder SAFE for new file |
| **C** | Overnight Runner ACTIVE | WIRED (manual C2 only) | ACTIVE (autonomous scheduler) | **LOW** — small scheduler registration | Builder SAFE; requires useful-work-guard |
| **D** | Council AI Proven | WIRED + LIVE | PROVEN | **LOW** — new proof endpoint or receipt | Builder SAFE for new file |
| **E** | TSOS Internal Hooks Wired | NOT_WIRED | WIRED | **LOW** — define scope + new endpoint | Builder SAFE for new file |
| **F** | Useful-Work-Guard Coverage Audit | Partial (no full audit) | Full audit doc | **LOW** — new script or doc | Builder SAFE for new file |
| **G** | Telemetry Metric Completeness | Several NOT_WIRED metrics | All 15 required wired | **MEDIUM** — additions to existing service file | Wrapper service or new instrumentation file |
| **H** | Legacy Authority Surface Cleanup | 27 legacy routes callable | Canonical replacements LIVE | **MEDIUM** — large route file edits | Phase into new route files, retire by redirect |
| **I** | Alpha Loop Stress Verification | Never run under induced drift | Documented stress test | **LOW** — operational test + receipt doc | Builder SAFE for receipt/doc |
| **J** | Beta Readiness Gate | Loop proven but not sustained | 7-day autonomous useful work window | **MEDIUM** — scoring + overnight scheduler | Combine C + metrics |

**Phase ordering:** A is the most complex and highest risk. B, C, D, E, F can be done independently in any order after A. G and H require careful large-file strategy. I validates the loop after A-F. J is the Beta gate.

---

## 16. Alpha Score Summary (2026-05-25)

| Dimension | Score |
|---|---|
| Loop integrity (40% weight) | 90 / 100 |
| Component maturity (60% weight) | 66.7 / 100 |
| Useful-work bonus (+5% if avg > 0.50) | 0 — NO_DATA (no scored events in 168h) |
| **Total** | **76%** |

**Active blockers:**

| Blocker | Impact |
|---|---|
| `TSOS_INTERNAL_HOOKS_NOT_WIRED` | NOT_WIRED component holding component maturity score down |
| `MEMORY_NOT_RUNTIME_PROVEN` | Memory WIRED only — not proving through runtime sources |
| `USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE` | Partial audit only — full coverage unknown |
| `TELEMETRY_GAPS_REMAIN` | Several of 15 required metrics still NOT_WIRED |
| `LEGACY_AUTHORITY_SURFACES_STILL_LIVE` | Legacy routes reachable and can confuse canonical status |

**Path to 80%:** Prove memory (WIRED→LIVE) + wire overnight scheduler (WIRED→ACTIVE) + complete useful-work-guard audit. No product feature needed.
**Path to Beta:** All 5 blockers resolved + overnight runner shows sustained autonomous useful work over 7 days.

---

## 17. Change Receipts

| Date | What | Why |
|---|---|---|
| 2026-05-25 | File created | BuilderOS A-to-Z Blueprint established from runtime truth. 76% Alpha state verified. All 12 components mapped. 10 build phases A-J defined. GAP-FILL: builder safe-scope blocks docs/ directory. |
