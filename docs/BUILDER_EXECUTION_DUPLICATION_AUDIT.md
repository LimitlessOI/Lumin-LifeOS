# BUILDER EXECUTION DUPLICATION AUDIT

Status: AUTHORITATIVE AUDIT (read-only, no runtime edits)  
Produced: 2026-06-13  
Scope: Builder execution duplicate family (`/build`, factory execute-step, auto-builder, shadow queue)

## Evidence Read

- `docs/SYSTEM_CAPABILITY_TRUTH_AUDIT.md`
- `docs/SYSTEM_CAPABILITY_INVENTORY.md`
- `routes/lifeos-council-builder-routes.js`
- `factory-staging/factory-core/builder/run-step.js`
- `factory-staging/factory-core/routes/factory-execute-step-routes.js`
- `factory-staging/startup/register-routes.js`
- `factory-staging/factory-core/builder/run-mission.js`
- `routes/auto-builder-routes.js`
- `scripts/lifeos-builder-continuous-queue.mjs`
- `scripts/lifeos-builder-daemon.mjs`
- `services/builderos-governed-loop-executor.js`
- `services/builderos-command-control-service.js`
- `routes/lifeos-builderos-command-control-routes.js`
- `services/builder-outcome-verifier.js`
- `services/builderos-build-done-gate-helper.js`
- `startup/register-runtime-routes.js`
- `core/two-tier-system-init.js`
- `server.js`
- `package.json`

## 1) All Builder Execution Paths Found

1. **Council builder direct path (production spine)**  
   - `POST /api/v1/lifeos/builder/build` in `routes/lifeos-council-builder-routes.js`  
   - Mounted from `startup/register-runtime-routes.js`

2. **Council execute path (direct commit endpoint, same module)**  
   - `POST /api/v1/lifeos/builder/execute` in `routes/lifeos-council-builder-routes.js`  
   - Mounted from `startup/register-runtime-routes.js`

3. **Governed command-control path (wrapper/orchestrator)**  
   - `POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute` in `routes/lifeos-builderos-command-control-routes.js`  
   - Executes `services/builderos-governed-loop-executor.js`, which calls `/build` and may fallback to `/execute`

4. **Factory execute-step path (separate factory runtime)**  
   - `POST /factory/execute-step` via `factory-staging/startup/register-routes.js` -> `factory-staging/factory-core/builder/run-step.js`  
   - Also mission wrapper `dispatchExecuteMission()` in `factory-staging/factory-core/builder/run-mission.js`

5. **Auto-builder path (legacy/two-tier)**  
   - `POST /api/v1/system/build` in `routes/auto-builder-routes.js` (selfBuilder pipeline with optional commit/push/deploy flags)  
   - `POST /api/build/run` in `routes/auto-builder-routes.js` (manual `autoBuilder.runCycleWithArtifacts('manual')`)  
   - Mounted via `core/two-tier-system-init.js` (called from `server.js`)

6. **Shadow queue path (legacy autonomous queue)**  
   - `scripts/lifeos-builder-continuous-queue.mjs` calls `POST /api/v1/lifeos/builder/build` directly  
   - Orchestrated by `scripts/lifeos-builder-daemon.mjs`  
   - Exposed as npm scripts: `lifeos:builder:queue`, `lifeos:builder:continuous-queue`, `lifeos:builder:daemon`

## 2) Currently Canonical Path

**Canonical (current production commit actuator):**  
`POST /api/v1/lifeos/builder/build` (`routes/lifeos-council-builder-routes.js`)

Rationale:
- Mounted in production spine (`startup/register-runtime-routes.js`).
- Performs syntax/validation/precommit governance gates.
- Integrates DONE gate enforcement via `evaluateBuildDoneGateForBuildResponse()` using `services/builderos-build-done-gate-helper.js`.
- Returns explicit commit and DONE gate outcome.

## 3) Paths That Can Commit Code

- **Can commit**
  - `POST /api/v1/lifeos/builder/build` (`commitToGitHub(...)`)
  - `POST /api/v1/lifeos/builder/execute` (`commitToGitHub(...)`)
  - Command-control governed loop path (indirectly commits via `/build`; fallback may commit via `/execute`)
  - Auto-builder path `POST /api/v1/system/build` (if `commitChanges/pushToGit/triggerDeployment` enabled)
  - `POST /api/build/run` likely commit-capable through `autoBuilder.runCycleWithArtifacts(...)`
  - Shadow queue script commits by repeatedly calling `/build`

- **Does not produce git commit**
  - Factory `/factory/execute-step` and `dispatchExecuteMission` write files + verify, but no `commitToGitHub` path in `run-step.js`

## 4) Paths That Mark PASS / DONE / COMPLETE

- **Council `/build`**
  - Creates synthetic success envelope (`status: 'SUCCESS'`) then evaluates DONE gate.
  - Returns `done_gate_passed: true` when allowed.

- **DONE gate helper**
  - Accepts success statuses: `DONE`, `PASS`, `COMPLETE`, `SUCCESS`.

- **Factory execute-step**
  - Marks `status: 'DONE'` when write + verification pass.

- **Governed loop**
  - Uses command-control job statuses (`queued/running/retrying/committed/failed/...`), not `PASS/DONE`.

- **Auto-builder**
  - Returns `buildResult.success` messaging, not BuilderOS DONE gate semantics.

## 5) Paths That Bypass Outcome Verification

- **Bypasses `verifyGovernedOutcomeBeforePass`**
  - Direct council `/build` calls
  - Direct council `/execute` calls
  - Shadow queue (because it calls direct `/build`)
  - Auto-builder endpoints (`/api/v1/system/build`, `/api/build/run`)
  - Factory execute-step (uses SENTRY/TSOS contracts, not governed outcome verifier)

- **Uses outcome verification**
  - Governed command-control path (`services/builderos-governed-loop-executor.js`) calls `verifyGovernedOutcomeBeforePass(...)` before marking committed

## 6) Paths That Bypass DONE Gate Enforcement

- **DONE gate enforced**
  - Council `/build` path (explicit `evaluateBuildDoneGateForBuildResponse(...)`)
  - Shadow queue (inherits `/build` enforcement)

- **Bypasses DONE gate**
  - Direct council `/execute` (commit path without DONE gate check)
  - Governed loop **when `/execute` fallback is used** (`tryExecuteFallback(...)`)
  - Auto-builder endpoints
  - Factory execute-step path

## 7) Legacy Paths to Block

1. `scripts/lifeos-builder-continuous-queue.mjs` (shadow queue; currently quarantined but still executable via env/script)
2. `scripts/lifeos-builder-daemon.mjs` queue phase invoking shadow queue runner
3. `POST /api/v1/lifeos/builder/execute` as a general operator endpoint
4. Auto-builder commit-capable endpoints:
   - `POST /api/v1/system/build`
   - `POST /api/build/run`

## 8) Single Path That Should Survive

**Survive as single canonical commit path:**  
`POST /api/v1/lifeos/builder/build` (council builder route), with command-control only as orchestration intake that must terminate through `/build` (never `/execute` fallback).

## 9) Smallest Safe Repair Plan (Prevent Non-Canonical Commits)

1. **Close direct commit bypass**
   - Remove or hard-block external use of `/api/v1/lifeos/builder/execute`.
   - Keep internal-only fallback disabled by default.

2. **Force governed loop to canonical path only**
   - In `services/builderos-governed-loop-executor.js`, disable `tryExecuteFallback()` or gate it behind explicit break-glass env and always fail-closed otherwise.

3. **Neutralize legacy auto-builder commit surface**
   - In `routes/auto-builder-routes.js`, force `commitChanges=false`, `pushToGit=false`, `triggerDeployment=false` server-side, or reject commit-capable payloads.
   - Block `/api/build/run` from commit execution mode.

4. **Retire shadow queue as execution authority**
   - Keep `BUILDER_QUEUE_ENABLED=0` default and add hard production refusal.
   - Route queue scheduling to canonical BP priority + mission blueprint flow only.

5. **Keep factory execute-step scoped to factory runtime**
   - No direct production commit authority; treat it as separate write/verify engine until cutover receipt.

## 10) Exact Files That Would Need Changes Later

- `routes/lifeos-council-builder-routes.js`
- `services/builderos-governed-loop-executor.js`
- `routes/auto-builder-routes.js`
- `scripts/lifeos-builder-continuous-queue.mjs`
- `scripts/lifeos-builder-daemon.mjs`
- `core/two-tier-system-init.js` (if unmounting auto-builder routes in production mode)
- `package.json` (script deprecation/alias hardening for shadow queue commands)

---

## Direct Answers (Requested 1-10)

1. All paths: council `/build`, council `/execute`, governed command-control wrapper, factory execute-step/mission, auto-builder endpoints, shadow queue + daemon runner.
2. Current canonical: council `/build` in `routes/lifeos-council-builder-routes.js`.
3. Commit-capable: council `/build`, council `/execute`, governed loop (indirect), auto-builder endpoints, shadow queue; factory execute-step is not git-commit path.
4. PASS/DONE markers: council `/build` (`SUCCESS` + done_gate), DONE helper (`DONE/PASS/COMPLETE/SUCCESS`), factory step (`DONE`).
5. Outcome verifier bypass: all direct/non-governed paths (`/build`, `/execute`, auto-builder, shadow queue, factory).
6. DONE gate bypass: `/execute`, governed-loop execute fallback, auto-builder, factory execute-step.
7. Legacy block list: shadow queue runner + daemon queue phase + auto-builder commit endpoints + direct `/execute`.
8. Surviving single path: council `/build`, command-control only as intake/orchestration.
9. Smallest safe plan: disable `/execute` bypass, remove execute fallback, neutralize auto-builder commit flags, retire shadow queue authority.
10. Files needing edits later: listed in section 10 above.

