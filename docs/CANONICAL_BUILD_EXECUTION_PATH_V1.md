# CANONICAL BUILD EXECUTION PATH V1

Status: AUTHORITATIVE AUDIT (read-only; no runtime edits)  
Produced: 2026-06-13  
Mission: Trace exact governed path from Founder Command to PASS

## Evidence read

- `docs/BUILD_EXECUTION_BLOCKER_SEQUENCE_PLAN_V1.md`
- `docs/BUILDER_EXECUTION_DUPLICATION_AUDIT.md`
- `docs/THREE_ROOT_CONSOLIDATION_DEEP_AUDIT_V1.md`
- `routes/lifeos-voice-rail-routes.js`
- `services/voice-rail-v1.js`
- `services/voice-rail-command-executor.js`
- `routes/lifeos-command-center-routes.js`
- `services/command-center-communication-service.js`
- `routes/lifeos-builderos-command-control-routes.js`
- `services/builderos-governed-loop-executor.js`
- `routes/lifeos-council-builder-routes.js`
- `services/tsos-platform-kernel.js`
- `services/builderos-control-plane-service.js`
- `services/builderos-build-done-gate-helper.js`
- `services/builderos-completion-authority.js`
- `services/builder-outcome-verifier.js`

---

## 1) End-to-end path (Founder Command -> PASS)

### A. Founder Command -> Voice Rail

1. `POST /api/v1/lifeos/voice-rail/message` (`routes/lifeos-voice-rail-routes.js`)
2. `voiceRail.submitMessage(...)` (`services/voice-rail-v1.js`)
3. If classified as command/work, Voice Rail routes to system execution:
   - `shouldRouteFounderToSystem(...)` (`services/voice-rail-command-executor.js`)
   - `executeVoiceRailFounderCommand(...)` (`services/voice-rail-command-executor.js`)

### B. Voice Rail -> C2 / Command-Control

4. Create job in `builderos_command_control_jobs`:
   - `createCommandControlJob(...)` (`services/builderos-command-control-service.js`)
5. Execute governed loop:
   - `executeCommandControlJob(...)` (`services/builderos-governed-loop-executor.js`)
6. Equivalent C2 API surfaces:
   - `POST /api/v1/lifeos/command-center/communications/send`
   - `POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute`

### C. Governed loop -> Builder route

7. OIL boundary audit gate:
   - `auditCommandControlJobBoundary(job, haltState)` (`services/builderos-governed-loop-executor.js`)
8. PBB plan generation gate:
   - `generatePbbPlanFromOilAudit(...)` (`services/builderos-governed-loop-executor.js`)
9. Builder dispatch:
   - `dispatchBuilderPlan(...)` -> `POST /api/v1/lifeos/builder/build`
10. `/build` handler:
   - `buildAndCommit(...)` (`routes/lifeos-council-builder-routes.js`)
   - Mounted via kernel wrapper: `platformKernel.wrapBuild(buildAndCommit)`

### D. Builder -> Commit -> DONE -> PASS

11. Precommit/technical checks in `/build`:
   - safety scope, syntax checks, governance checks (`runPrecommitGovernance`)
12. Commit:
   - `commitToGitHub(...)` (inside `/build`)
13. Kernel measurement path (`services/tsos-platform-kernel.js`):
   - `recordBuildStart(...)`
   - `verifyTokenReceipt(...)`
   - `verifyOilReceipt(...)`
   - `recordBuildComplete(...)`
   - `canMarkBuildDone(...)`
14. Completion/outcome path:
   - Route-level completion authority currently defers when kernel-managed:
     `evaluateBuildCompletionForBuildResponse(..., kernelManaged: true)` -> `completion_deferred_to_kernel`
   - Governed loop still runs outcome gate before `job.status='committed'`:
     `verifyGovernedOutcomeBeforePass(...)`
15. Terminal state today:
   - Command-control terminal success is `job.status='committed'` (not a unified explicit PASS receipt from a single completion writer yet)

---

## 2) Every gate in the governed path

1. **Auth/entry gate**
   - `requireKey` on Voice Rail, C2, and command-control routes.
2. **Voice Rail execution toggle**
   - `VOICE_RAIL_EXECUTE_COMMANDS` in `isVoiceRailCommandExecuteEnabled()`.
3. **Command-control claim gate**
   - job must be `queued` before execution.
4. **OIL boundary gate (first hard governance gate)**
   - `auditCommandControlJobBoundary(...)`:
   - blocks zone/scope/intent violations.
5. **PBB plan gate**
   - plan must be generated and valid.
6. **/build precommit technical gate**
   - syntax + governance + safe target checks.
7. **DONE evidence gate (control plane/kernel)**
   - `canMarkBuildDone(...)` on `build_task_ledger`.
8. **Completion authority gate**
   - `grantBuildCompletion(...)` (feature-flagged), but currently deferred on kernel-managed path.
9. **Governed outcome gate**
   - `verifyGovernedOutcomeBeforePass(...)` in governed loop.

---

## 3) Every proof requirement observed

### Required before commit

- explicit actionable instruction + valid target
- OIL boundary-compliant target/plan
- precommit governance pass
- safety scope pass

### Required after commit

- `commit_sha` (from `commitToGitHub`)
- commit content evidence (`git show`) for outcome verifier
- DONE ledger completeness in control plane:
  - `token_receipt` (or unmetered exception)
  - `build_end_time`
  - `oil_receipt`

---

## 4) Every blocker family observed in this path

- `job_not_executable` / claim/preflight errors
- `control_plane_health_red` (strict preflight)
- OIL boundary blockers (including `ZONE3_PATCH_REQUIRED`)
- `PBB_PLAN_FAILED`
- builder dispatch failure family (`builder_failed`, `BUILDER_DISPATCH_FAILED`)
- DONE gate blocker family (`BUILDEROS_DONE_BLOCKED`, `KERNEL_BUILD_DONE_BLOCKED`)
- completion authority blockers (`FAIL_MISSING_EVIDENCE`, `FAIL_INCOMPLETE_TECHNICAL`, `FAIL_WRONG_OUTCOME`)
- governed outcome blocker (`FAIL_WRONG_OUTCOME`)

---

## 5) Direct answers requested

### 1. What path should succeed?

Founder command -> Voice Rail command execution -> Command-control governed loop -> `POST /api/v1/lifeos/builder/build` (kernel-wrapped) -> commit -> kernel writes/validates DONE proofs -> single completion authority grant -> governed outcome verification -> terminal PASS/committed receipt.

### 2. What path actually succeeds?

The path that reliably reaches terminal success today is governed command-control ending in `job.status='committed'` when:
- OIL boundary passes,
- `/build` commits,
- governed outcome verifier passes.

It does not yet provide one unified PASS writer after kernel DONE + completion authority in a single terminal step.

### 3. What path is currently being used?

For founder work commands in Voice Rail:  
`POST /api/v1/lifeos/voice-rail/message` -> `executeVoiceRailFounderCommand()` -> command-control job -> `executeCommandControlJob()` -> `/api/v1/lifeos/builder/build`.

### 4. What is the first blocker?

The first practical blocker on the founder-governed path is the OIL boundary audit (most commonly zone-policy failures like `ZONE3_PATCH_REQUIRED`), because it blocks before `/builder/build` is even called.

### 5. What is the smallest repair?

Smallest safe repair: keep canonical path unchanged, but remove remaining terminal split by making kernel-managed `/builder/build` call completion authority after kernel DONE evidence is recorded, so PASS/complete is granted by one authority in-order (without re-enabling non-canonical `/execute` or bypassing OIL/DONE/outcome gates).

---

## Canonical recommendation

Use only this execution authority chain for build commits:

`Voice Rail (command mode) -> BuilderOS command-control -> governed loop -> /api/v1/lifeos/builder/build (kernel-wrapped) -> kernel DONE evidence -> completion authority -> governed outcome verify -> committed/PASS receipt`.

Keep non-canonical commit-capable paths (`/builder/execute` fallback, legacy auto-builder/shadow queue) blocked or break-glass only.
