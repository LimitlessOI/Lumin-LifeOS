<!-- SYNOPSIS: BUILDEROS_TWIN — complete digital twin of the ACTUAL BuilderOS code (reality map, kept in sync with code) -->

# BuilderOS — Complete Blueprint (Digital Twin of Actual Code)

**Status:** `DRAFT DIGITAL TWIN — VERIFICATION PENDING` (ARC/SNT-4: contents were assembled partly via subagent search; promote to `CANONICAL` only after `node scripts/ssot-check.js --all` + a direct read of each cited path confirms no drift)
**Owner:** Adam · **Governs under:** `docs/constitution/FOUNDER_PACKET_V3_BUILDEROS_MASTER_ARCHITECTURE.md`
**Supersedes the maturity/wiring claims in:** `docs/architecture/BUILDEROS_A_TO_Z_BLUEPRINT.md` (2026-05-25, now history)
**Machine-maintained wiring truth (this doc mirrors these):** `builderos-reboot/BUILDEROS_WORKING_DEFINITION.json`, `builderos-reboot/governance/BUILDEROS_HARNESS_TOOLS.json`, `builderos-reboot/governance/BUILDEROS_TOOL_REGISTRY.json`
**Last Updated:** 2026-06-28

> **Sync rule (FP V3 §0.3 — Reality = Twin):** Code is reality; this twin explains and governs it. Any change to a file listed here must update this twin in the same governed action. No knowing divergence. The JSON files above are the machine source of wiring truth; this document is the human-readable mirror.

---

## 1. Canonical build path (verified on disk)

| Path | Role |
|---|---|
| `services/builderos-canonical-executor.js` | Single autonomous programming entry. `executeCanonicalBlueprintStep()` loads `builderos-reboot/MISSIONS/<id>/BLUEPRINT.json`, runs dispatch gate, POSTs `/api/v1/lifeos/builder/build`, runs codegen self-repair. Also `executeCanonicalWorktreeStep()`, `getCanonicalExecutorManifest()`. **No HTTP route** — invoked by scripts. |
| `services/builderos-governed-loop-executor.js` | Command-control job executor. `executeCommandControlJob(pool, jobId)`: Sentry boundary → PBB plan → `dispatchBuilderPlan()` → POST `/build` → output+outcome verify → one retry → TSOS hook + proof parity. Wired from `POST …/command-control/jobs/:id/execute`. |
| `routes/lifeos-council-builder-routes.js` | **Owns `POST /api/v1/lifeos/builder/build`** (`buildAndCommit`, wrapped by `platformKernel.wrapBuild`). Council codegen → validate target → blueprint gate → `commitToGitHub()`. Also `/task`, `/execute`, `/ready`, `/gaps`. |
| `scripts/autonomy/builder-supervisor.js` | Git **worktree** orchestrator — pulls safe `project_segments`, spawns Claude Code CLI per worktree, commits + PRs. Gates: not directed, not paused, `stability_class=safe`. Separate from Railway `/build`. |
| `scripts/lifeos-builder-supervisor.mjs` | Dashboard smoke supervisor (`lifeos:builder:supervise`). |
| `services/build-proof-contract.js` | Pure `evaluateBuildProof()`. **Transport states:** `ALREADY_PRESENT`, `REMOTE_TRANSPORT_PASS`, `COMMIT_NO_SHA`, `ORIGIN_MAIN_NOT_UPDATED`, `LIVE_BEHAVIOR_PASS`, `DEPLOY_NOT_SYNCED`, `LIVE_BEHAVIOR_NOT_VERIFIED`, **`COMMIT_ONLY_NOT_LIVE`**, `DEPLOY_SYNC_PASS`. |

**Founder entry surface (per `BUILDEROS_TOOL_REGISTRY.json`):** `POST /api/v1/lifeos/builderos/command-control/founder-interface/message` — not raw `/build`.

```
Founder msg → command-control → governed-loop-executor ─┐
BP queue → bp-priority-never-stop → foundation pipeline ─┤→ POST /build (council-builder-routes) → commitToGitHub
canonical-executor (mission step) ──────────────────────┘
worktree path: builder-supervisor.js (DB segments, parallel)
```

## 2. Self-repair loop (actual chain)

Detect → Classify → Authorize → Execute → Log → Verify → Receipt → Learn → Prevent:

1. **Detect** — `services/oil-self-repair-detector.js` → `buildRepairQueue()`, `detectRuntimeProofMismatch()`, `detectProofStoreMismatch()`, `summarizeOilMisses()`. *(Doc-stale `detectSelfRepairIssues()` does not exist.)*
2. **Classify** — `services/pb-execution-authority.js` → `classifyExecutionAuthority()` → `SYSTEM_AUTHORIZED_UNDER_PB` | `ADAM_REQUIRED`.
3. **Authorize** — `services/supervised-autonomy-readiness.js` → `buildSupervisedAutonomyReadiness(pool)` → `can_continue_under_approved_pb`, blockers, `adam_required_actions` (read-only).
4. **Execute** — `services/self-repair-executor.js` → `runSelfRepairExecutor()`, PF-001→PF-002→PF-003, **max 3 attempts** (`self-repair-escalation-policy.js`, `SELF_REPAIR_MAX_ATTEMPTS=3`), `dryRun=true` default.
5. **Log** — `services/self-repair-execution-log.js` → `data/self-repair-execution-log.jsonl`.
6. **Verify** — `services/oil-proof-freshness.js` (called by executor).
7. **Receipt** — `services/oil-security-receipts.js`.
8. **Learn** — `services/self-repair-memory.js` → `writeRepairMemoryFromExecution()` → `self_repair_memory_events` table + `epistemic_facts` + `data/self-repair-memory.jsonl`.
9. **Prevent** — `services/self-repair-prevention-registry.js` → `data/self-repair-prevention-registry.json` (status `CANDIDATE_RULE`).

Supporting: `self-repair-lesson-classifier.js`, `self-repair-attempt-context.js` (`BLOCKED_CARRY_FORWARD_CONTEXT_MISSING` if attempt ≥2 lacks prior lessons). **Boot path:** `startup/boot-domains.js` schedules `runGovernedProofParityRefresh()` (`builderos-governed-proof-parity.js`) ~45s after boot via useful-work-guard. Routes: `routes/self-repair-executor-routes.js`.

## 3. Scheduler / queue / improvement

| Path | Role |
|---|---|
| `services/builderos-bp-priority-scheduler.js` | Useful-work-guard wrapped; when `BUILDEROS_AUTOPILOT=1` spawns `bp-priority-never-stop.mjs --once` on interval. Started in `boot-domains.js`. |
| `services/bp-priority-queue.js` | Loads `BP_PRIORITY.json` (requires `_authority.status=CANONICAL`); `getActiveProductItem()`; legacy-queue violation checks. |
| `scripts/bp-priority-never-stop.mjs` | Never-stop runner: pre-build gate → active BP item → factory foundation pipeline loop. Respects `FOUNDER_STOP.json`. |
| `services/builderos-improvement-loop.js` | `planBuilderOSImprovements()` → SNT blockers + Wisdom levers → ranked proposals w/ `blueprint_delta`. |
| `services/builderos-improvement-contract.js` | `buildImprovementDeltaContract()` → maps codes → closure-mission step IDs (BAC-000A…BAC-008). |
| `services/builderos-artifact-sync.js` | `syncTechnicalAcceptanceArtifacts()`, `syncFounderUsabilityArtifacts()`. |
| `services/bp-priority-sync.js` | `syncMissionFromTechnicalReceipt()` — PASS receipt → update BP item + mission completion + git co-commit. |

**Product queue authority = `BP_PRIORITY.json`.** Overnight `scripts/governed-overnight-autonomy.mjs` exists but is Hist-domain (not the active product runner).

## 4. Memory / telemetry

- **Memory:** `services/self-repair-memory.js` writes `self_repair_memory_events` (primary) + `epistemic_facts` (domain `self_repair`) + JSONL. Read order: JSONL tail → table → epistemic_facts. **Status endpoint now exists:** `GET /api/v1/lifeos/command-center/memory/status` (`routes/memory-status-routes.js`), plus `…/self-repair/memory/latest`.
- **Telemetry:** `autonomous-telemetry-service.js` (`emitAutonomousTelemetry()` → `autonomous_telemetry_events`), `autonomous-telemetry-session.js` (`runGovernedTelemetrySession()`), `autonomous-efficiency-intelligence.js` (`computeEfficiencyIntelligence()`), `autonomous-telemetry-instrumentation.js`. Routes: `routes/autonomous-telemetry-routes.js`.

## 5. Governance data files

| Path | Shape |
|---|---|
| `builderos-reboot/BP_PRIORITY.json` | `_authority.status=CANONICAL`, ranked `items[]` (mission_id, blueprint_path, verdict, technical_pass_at, git_sha, founder_usability_pass), `scrapped_items[]`. |
| `builderos-reboot/BUILDEROS_WORKING_DEFINITION.json` | 4 pillars (envisioned_workflow, real_programming, self_repair, compound_improvement), canonical_path, execution tiers, verify commands, `min_score_each_pillar:10`. |
| `builderos-reboot/governance/BUILDEROS_EXECUTION_TIER.json` | MECHANICAL / LOAD_BEARING / PLATFORM gates. |
| `builderos-reboot/governance/BUILDEROS_TOOL_REGISTRY.json` | `wired_spine`, `orphan_tools[]`, wiring taxonomy. |
| `builderos-reboot/governance/BUILDEROS_HARNESS_TOOLS.json` | Tools per pillar (path + npm script + wired/required); audited by `builderos:harness:audit`. |

## 6. Command surface (42 `builderos:*` npm scripts)

Verify/proof spine (the ones that matter for V1): `working-definition:verify[:operational]`, `autonomy-closure:v1-acceptance`, `autonomy-closure:build-deploy-truth`, `autonomy-closure:founder-ui-proof`, `autonomy-closure:same-tier-determinism`, `operational-proof`, `harness:audit[:operational]`, `pre-build-gate`, `dispatch:gate`, `gap:families`, `compound:summary[:production]`, `deploy:verify`, `point-b:gate`, `alpha:confirm`. Intake/ARC: `intake:*`, `arc:*`. Runners: `mission-step`, `mission-run`, `bp-priority:never-stop|once`, `foundation:pipeline`. (Full list in `package.json` lines 46–205.)

## 7. Current maturity & verified blockers (2026-06-28)

| Area | State | Proof |
|---|---|---|
| Working definition (structural) | **PASS** | `builderos:working-definition:verify` (13/13) |
| Closure v1 acceptance (internal) | **PASS** | `autonomy-closure:v1-acceptance` (7/7) |
| Build/deploy truth | mixed | reaches commit; **founder-UI build ends `COMMIT_ONLY_NOT_LIVE`** |
| Founder-UI proof | **FAIL** | `BUILDEROS_FOUNDER_UI_PROOF.json` — `drawer_direct_build` fails (build not proven LIVE) |
| Same-tier determinism | **FAIL** | `MISSING_TIER_LOCK` — `BUILDEROS_INTENDED_CODER_TIER` / `BUILDEROS_DETERMINISM_TEST_TIER` unset/unequal |
| Memory | `WIRED` not `LIVE` | table + status endpoint exist; not yet a proven runtime proof source |
| Point B (`PRODUCT-LIFERE-OS-V1-0001`) | `TECHNICAL_PASS`, **`founder_usability_pass:false`** | `BP_PRIORITY.json` |

**Net: we are at L0 — the loop is not closed.** The four blockers above are exactly the V1 BP scope.

## 8. Drift corrections recorded vs A-to-Z (2026-05-25)

`detectSelfRepairIssues()` → use `buildRepairQueue()`; max attempts 2 → **3**; `data/self-repair-memory-jsonl` → `data/self-repair-memory.jsonl`; overnight-state/continuous-queue-log proof sources **not present** in `data/`; memory status endpoint **now exists**; TSOS hooks **now wired** (`services/builderos-tsos-hook-service.js`); boot hook is `runGovernedProofParityRefresh()` not `runDeployDriftPreventionHook()`. New since doc: canonical-executor, governed-loop-executor, build-proof-contract + closure suite, bp-priority scheduler/runner, improvement loop/contract, artifact-sync, escalation-policy, attempt-context, WORKING_DEFINITION/EXECUTION_TIER/HARNESS_TOOLS JSON.

## 9. Change Receipts

| Date | What | Why |
|---|---|---|
| 2026-06-28 | Twin created | First reality-matched digital twin of actual BuilderOS code (audit-verified). Records canonical path, self-repair chain, scheduler, memory/telemetry, governance JSON, command surface, current maturity/blockers, and drift corrections vs the stale A-to-Z. Establishes the sync rule. |
