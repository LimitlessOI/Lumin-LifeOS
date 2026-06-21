<!-- SYNOPSIS: Builder Execution Retirement Plan V1 -->

# Builder Execution Retirement Plan V1

**Date:** 2026-06-13  
**Inputs:**
- `docs/BUILDER_EXECUTION_DUPLICATION_AUDIT.md`
- `docs/COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md`
- `docs/PASS_DONE_AUTHORITY_AUDIT_V1.md`

**Mission:** Plan only — **no runtime code changes in this slice.**

---

## Target end state

| Role | Survives | Retires |
|------|----------|---------|
| **Git commit actuator** | `POST /api/v1/lifeos/builder/build` only | `/builder/execute`, auto-builder commit, shadow queue direct `/build` |
| **Orchestration intake** | `POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute` | Must call `/build` only — no `/execute` fallback |
| **Autonomous scheduling** | `scripts/governed-overnight-backlog-run.mjs` → command-control | `lifeos-builder-continuous-queue.mjs`, daemon queue phase |
| **Factory runtime** | `POST /factory/execute-step` (write/verify, no git) until cutover receipt | Production git authority overlap |
| **Terminal success** | `builderos-completion-authority.js` (planned) | Raw `committed: true`, ledger-only DONE, acceptance-only PASS |

---

## Safest migration order (recommended)

Execute later missions in this order — each step is independently rollbackable.

| Order | Target | Why this order |
|------:|--------|----------------|
| **1** | Shadow queue hard refusal | Already quarantined (`BUILDER_QUEUE_ENABLED=1` opt-in); zero production dependency if flag unset |
| **2** | Daemon queue phase no-op | Daemon already invokes quarantined script; formal skip avoids accidental `/build` when someone enables flag |
| **3** | Auto-builder commit surface block | Defaults `commitChanges=false` but client can override — low traffic, high risk if used |
| **4** | Package script deprecation aliases | Warn-only; no HTTP behavior change |
| **5** | Governed-loop `/execute` fallback disable | Affects C2 jobs where `/build` returns output but `committed:false` — needs retry-via-`/build` first |
| **6** | External `/builder/execute` block | Breaks direct API users and internal fallback; do after step 5 |
| **7** | Non-canonical scripts → command-control | Supervisor, retry-plan, build-chat, objective-until-pass |
| **8** | `/builder/build` + completion authority | From consolidation plan Phase 1 — wrap canonical path, do not retire it |
| **9** | Factory execute-step boundary doc + adapter | No production merge until explicit cutover receipt |

---

## Path 1 — `POST /api/v1/lifeos/builder/execute`

### Current behavior

- **File:** `routes/lifeos-council-builder-routes.js` — `executeOutput()` (~L1381–L1494)
- Accepts `{ output, target_file, commit_message }`; validates/cleans output; optional `node --check` for JS
- Calls `commitToGitHub()`; returns `{ ok: true, committed: true }`
- **No** precommit governance pipeline, **no** DONE gate, **no** outcome verification, **no** completion authority

### Risk

**Critical.** Direct commit bypass for any caller with `x-command-key`. Used by governed-loop fallback (Path 2). Enables wrong-outcome commits with syntax-only bar.

### Action

**Block** external use; **retire** as public operator endpoint.

### Exact future code change (later mission)

```js
// routes/lifeos-council-builder-routes.js — top of executeOutput()
if (process.env.BUILDER_EXECUTE_INTERNAL_ONLY !== '1' || !req.headers['x-builderos-internal-fallback']) {
  return res.status(410).json({
    ok: false,
    error: 'BUILDER_EXECUTE_RETIRED',
    canonical_path: 'POST /api/v1/lifeos/builder/build',
    orchestration_path: 'POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute',
  });
}
```

Alternative: remove route registration entirely after fallback removed.

### Rollback plan

- Env `BUILDER_EXECUTE_ALLOW_LEGACY=1` restores current behavior for 48h bake window
- Document in `docs/ENV_REGISTRY.md`

### Test needed

- `tests/builder-execute-retirement.test.js`: external POST → 410; internal header + env → still works during transition
- Regression: governed loop must not depend on `/execute` after Path 2 retirement

---

## Path 2 — Governed-loop fallback to `/execute`

### Current behavior

- **File:** `services/builderos-governed-loop-executor.js` — `tryExecuteFallback()` (~L191–L228)
- When `/builder/build` returns `ok && output && !committed`, POSTs output to `/builder/execute`
- On success sets `committed: true`, `execute_fallback_used: true`
- Loop then runs `verifyBuilderOutput()` + `verifyGovernedOutcomeBeforePass()` before job `status: 'committed'`
- **Bypasses:** `/build` precommit governance on the commit leg, DONE gate on execute leg

### Risk

**High.** Canonical orchestration path secretly commits through non-canonical actuator. OC-014 added this for C2 `committed:false` cases; it violates single-path doctrine and DONE gate semantics.

### Action

**Retire** default fallback; **wrap** with break-glass only, then remove.

### Exact future code change (later mission)

Phase A — default off:

```js
// services/builderos-governed-loop-executor.js
const EXECUTE_FALLBACK_ENABLED =
  process.env.BUILDEROS_EXECUTE_FALLBACK === '1' &&
  process.env.BUILDEROS_EXECUTE_FALLBACK_BREAK_GLASS === '1';

if (builderResult.ok && !builderResult.committed && builderResult.output) {
  if (EXECUTE_FALLBACK_ENABLED) {
    builderResult = await tryExecuteFallback(...);
  } else {
    // Fail-closed: require /build to commit or retry plan
    builderResult = { ...builderResult, error: 'build_output_not_committed', execute_fallback_disabled: true };
  }
}
```

Phase B — replace with `/build` retry using `executeProviderToolProof`-style replan or `POST /builder/build` with `output` injection if API supports it (GAP if not).

Phase C — delete `tryExecuteFallback()` and tests referencing it.

### Rollback plan

- `BUILDEROS_EXECUTE_FALLBACK=1` + `BUILDEROS_EXECUTE_FALLBACK_BREAK_GLASS=1` restores OC-014 behavior
- Monitor `builderos_command_control_jobs` blocker rate for `build_output_not_committed`

### Test needed

- Unit: fallback disabled → job fails with explicit blocker, not silent `/execute`
- Integration: C2 job where `/build` returns output-only → must replan/retry `/build`, not `/execute`
- Existing `tests/builderos-pbb-voice-rail-target.test.js` stays green

---

## Path 3 — Auto-builder endpoints

### Current behavior

| Endpoint | File | Commit behavior |
|----------|------|-----------------|
| `POST /api/v1/system/build` | `routes/auto-builder-routes.js` ~L507 | `selfBuilder.build({ commitChanges, pushToGit, triggerDeployment })` — **client-controlled flags**, default false |
| `POST /api/build/run` | `routes/auto-builder-routes.js` ~L935 | `autoBuilder.runCycleWithArtifacts('manual')` — may commit via `core/auto-builder.js` |
| Mount | `core/two-tier-system-init.js` → `server.js` | Legacy two-tier stack |

Read-only endpoints (`GET /api/v1/auto-builder/status`, prioritize, etc.) remain observability.

### Risk

**High** if `commitChanges: true` sent. Parallel commit authority outside council builder gates. No outcome verification, no DONE gate, no BP sync law.

### Action

**Block** commit-capable modes on production spine; **leave read-only** status/history endpoints.

### Exact future code change (later mission)

```js
// routes/auto-builder-routes.js — POST /api/v1/system/build
const commitChanges = false; // ignore req.body — server authority
const pushToGit = false;
const triggerDeployment = false;
if (req.body?.commitChanges || req.body?.pushToGit || req.body?.triggerDeployment) {
  log.warn({ ip: req.ip }, 'auto-builder commit flags ignored — retired');
}

// POST /api/build/run
return res.status(410).json({
  ok: false,
  error: 'AUTO_BUILDER_RUN_RETIRED',
  canonical_path: 'POST /api/v1/lifeos/builderos/command-control/jobs',
});
```

Optional: unmount from production via `core/two-tier-system-init.js` when `LIFEOS_DIRECTED_MODE=true`.

### Rollback plan

- `AUTO_BUILDER_COMMIT_ALLOWED=1` env break-glass (operator-only, logged)

### Test needed

- POST `/api/v1/system/build` with `commitChanges: true` → response proves no git push
- `npm run test:auto-builder` — scheduler test stays valid (no live commit)
- Smoke: `GET /api/v1/auto-builder/status` still 200

---

## Path 4 — Shadow queue execution

### Current behavior

- **File:** `scripts/lifeos-builder-continuous-queue.mjs`
- Reads `docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json`; POSTs **`/api/v1/lifeos/builder/build`** per task (~L408)
- **Quarantined:** exits 0 unless `BUILDER_QUEUE_ENABLED=1` (~L42–L61)
- npm: `lifeos:builder:queue`, `lifeos:builder:continuous-queue`, `lifeos:builder:queue:reset-cursor`

### Risk

**High** when enabled — autonomous direct `/build` without command-control or outcome gate (until consolidation Phase 1 wraps `/build`). Wrong queue SSOT vs `BP_PRIORITY.json` → blueprint drift.

### Action

**Retire** as execution authority; **leave read-only** for migration/audit (cursor reset, log inspection).

### Exact future code change (later mission)

```js
// scripts/lifeos-builder-continuous-queue.mjs — replace exitIfLegacyQueueQuarantined()
function refuseShadowQueueExecution() {
  console.error('RETIRED: use governed-overnight-backlog-run.mjs → command-control');
  process.exit(2); // non-zero so daemon does not treat as success
}
// Remove BUILDER_QUEUE_ENABLED=1 escape hatch in production profile
```

`package.json`: mark scripts `"deprecated": true` in comment; add `lifeos:builder:queue` → prints retirement message.

### Rollback plan

- Keep `BUILDER_QUEUE_ENABLED=1` only on local dev with explicit `LOCAL_SHADOW_QUEUE_OK=1`

### Test needed

- `npm run lifeos:builder:queue` → exit 2 + message (after change)
- CI guard: no production Railway env sets `BUILDER_QUEUE_ENABLED`

---

## Path 5 — `lifeos-builder-daemon` queue phase

### Current behavior

- **File:** `scripts/lifeos-builder-daemon.mjs`
- Each cycle: supervise probe → **`runNodeScript('scripts/lifeos-builder-continuous-queue.mjs')`** (~L599) → optional static pass → sleep
- npm: `lifeos:builder:daemon`, `lifeos:builder:daemon:once`, `lifeos:builder:daemon:7h`, PM2 `builder-daemon`

### Risk

**Medium.** Daemon treats queue exit 0 as healthy cycle even when quarantine message printed (current quarantine exits 0). Can give false "cycle_ok" while doing no useful work, or fire `/build` if operator enables `BUILDER_QUEUE_ENABLED=1`.

### Action

**Wrap** queue phase: skip by default; optional redirect to canonical backlog runner.

### Exact future code change (later mission)

```js
// scripts/lifeos-builder-daemon.mjs — before runNodeScript(continuous-queue)
if (process.env.BUILDER_DAEMON_QUEUE_PHASE !== 'command-control') {
  logCycle({ phase: 'queue_skipped', reason: 'shadow_queue_retired' });
} else {
  await runNodeScript('scripts/governed-overnight-backlog-run.mjs', ['--max-tasks', String(overnightMax)]);
}
```

Supervise/probe phases can remain for health telemetry.

### Rollback plan

- `BUILDER_DAEMON_QUEUE_PHASE=legacy` + `BUILDER_QUEUE_ENABLED=1` for local only

### Test needed

- `npm run lifeos:builder:daemon:once` → log contains `queue_skipped` or invokes command-control runner
- PM2 recipe updated in ops docs

---

## Path 6 — Factory `execute-step` overlap

### Current behavior

- **Files:**
  - `factory-staging/factory-core/builder/run-step.js` — `runWriteFileExact()` → `status: 'DONE'`
  - `factory-staging/factory-core/routes/factory-execute-step-routes.js` — `POST /factory/execute-step`
  - `factory-staging/startup/register-routes.js` — factory mount (separate from production spine)
- Writes files to repo workspace; SENTRY/TSOS verification; **no** `commitToGitHub`
- npm: `factory:integration` → `builderos-reboot/scripts/factory-execute-step-integration.mjs`

### Risk

**Low for production git** (no commit today). **Medium for doctrine** — duplicate "builder" semantics (`DONE` vs `committed`), future cutover could accidentally grant git authority.

### Action

**Leave read-only** in factory runtime; **block** production route merge until cutover receipt. No retirement of factory engine — **scope fence** only.

### Exact future code change (later mission)

- Add banner in `factory-staging/factory-core/builder/run-step.js` response: `git_commit_authority: false`
- CI rule: `factory-staging/**` must not import `commitToGitHub` from production spine
- `builderos-reboot/MISSIONS/FACTORY-REBOOT-0031/README.md` already notes non-merge — enforce in `scripts/factory-ci.mjs`

When cutover lands: factory step completion must call `grantBuildCompletion()` before any git adapter — not before.

### Rollback plan

- N/A — factory remains unchanged until explicit cutover mission

### Test needed

- `npm run factory:ci` — PASS
- Grep gate in CI: no `commitToGitHub` under `factory-staging/`

---

## Path 7 — Package scripts invoking non-canonical commit paths

### Inventory

| Script / npm command | Invokes | Canonical? | Retirement action |
|---------------------|---------|------------|-------------------|
| `lifeos:builder:queue` / `continuous-queue` | `lifeos-builder-continuous-queue.mjs` → `/build` | No | **Retire** (Path 4) |
| `lifeos:builder:daemon*` | daemon → shadow queue | No | **Wrap** (Path 5) |
| `lifeos:builder:overnight` | re-exports continuous queue | No | **Retire** alias |
| `lifeos:builder:supervisor` | `lifeos-builder-supervisor.mjs` → `/build` | No | **Migrate** to command-control |
| `lifeos:builder:build-chat` | `lifeos-builder-build-chat.mjs` → `/build` | No | **Migrate** or mark manual-only |
| `builderos-builder-retry-plan.mjs` | `/builder/build` | Partial | **Keep** but require completion grant in response parsing |
| `run-objective-1-until-pass.mjs` | `/builder/build` loop | No | **Retire** → command-control |
| `council-health-check.mjs` | `/builder/build` probe | Probe only | **Leave** (no commit) |
| `council-builder-preflight` | readiness only | OK | **Leave** |
| `governed-overnight-backlog-run.mjs` | command-control | **Yes** | **Keep** — canonical scheduler |
| `factory:integration` | factory execute-step | Factory scope | **Leave** fenced |
| `builderos-reboot/.../recovery-protocol-lib.mjs` | `/builder/build` | No | **Migrate** to command-control |
| `pm2:restart:daemon` | PM2 builder-daemon | No | **Update** ops to new runner |

### Generic migration pattern for scripts

```js
// Before: POST /api/v1/lifeos/builder/build
// After:
// 1. POST /api/v1/lifeos/builderos/command-control/jobs { instruction, metadata_json: { target_file, required_outcome } }
// 2. POST .../jobs/:id/execute
// 3. Poll until terminal; require outcome_verification.ok && completion_granted (post-consolidation)
```

### Exact future code change (later mission)

- Shared helper: `scripts/lib/builder-canonical-run.mjs` wrapping command-control flow
- Replace direct `/build` in supervisor, retry-plan, objective-until-pass, recovery-protocol

### Rollback plan

- Helper accepts `BUILDER_USE_DIRECT_BUILD=1` env for local debugging only

### Test needed

- One integration test per migrated script
- `npm run builder:preflight` unchanged

---

## Cross-cutting: completion authority alignment

Retirement of execution duplicates must align with `docs/COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md`:

| Phase | Retirement dependency |
|-------|----------------------|
| Consolidation Phase 0–1 | Wrap `/build` with `grantBuildCompletion()` **before** telling operators only `/build` survives |
| Consolidation Phase 1 | Shadow queue retirement safe only after `/build` cannot return naked `committed: true` |
| Path 6 `/execute` block | After fallback disabled — otherwise governed loop breaks |
| Acceptance / BP sync | Independent — but product PASS must not cite retired paths as proof |

---

## Highest-risk path to retire first

**Governed-loop `tryExecuteFallback()` → `/builder/execute`** (Path 2)

Not the first in *safest order*, but the **highest-risk duplicate inside the "canonical" orchestration story**:

- It is invoked from production command-control jobs
- It commits outside `/build` precommit governance and DONE gate
- Operators believe C2 path is safe because outcome verifier runs **after** the wrong commit actuator

**First in safest order:** shadow queue hard refusal (Path 4) — already quarantined, near-zero production blast radius.

**First in canonical-path integrity:** disable execute fallback (Path 2) immediately after adding `/build` retry for `committed:false` cases.

---

## What stays (canonical stack)

```
Founder / scheduler
  → POST /api/v1/lifeos/builderos/command-control/jobs
  → POST .../jobs/:id/execute
       → builderos-governed-loop-executor.js
            → POST /api/v1/lifeos/builder/build  (ONLY git commit actuator)
            → verifyBuilderOutput (technical)
            → verifyGovernedOutcomeBeforePass / grantBuildCompletion (outcome)
            → job status: committed | FAIL_WRONG_OUTCOME
```

Direct `POST /api/v1/lifeos/builder/build` remains for **break-glass / tooling** only until all scripts migrate; must still pass completion authority after consolidation Phase 1.

---

## Rollback master switch (proposed env)

| Env | Effect |
|-----|--------|
| `BUILDEROS_CANONICAL_EXECUTION_STRICT=0` | Restore all legacy paths (break-glass) |
| `BUILDEROS_EXECUTE_FALLBACK=1` | Restore governed-loop `/execute` fallback only |
| `BUILDER_QUEUE_ENABLED=1` | Restore shadow queue (local only recommended) |
| `AUTO_BUILDER_COMMIT_ALLOWED=1` | Restore auto-builder commits |

Production Railway profile: all unset / `0`.

---

## Founder-readable summary

**Problem:** The repo has six different ways to "build and commit," but only one path checks that what you asked for is what actually landed.

**Plan:** Keep **one commit door** (`/builder/build`) and **one orchestrator** (command-control). Turn off the side doors: `/execute`, old auto-builder commits, and the overnight JSON queue. The factory path stays separate until we're ready to merge it properly.

**Order:** Lock the old queue first (safest), then stop the orchestrator from sneaking through `/execute`, then block `/execute` for everyone else, then point remaining scripts at command-control.

---

## Change receipt

| Date | File | What |
|------|------|------|
| 2026-06-13 | `docs/BUILDER_EXECUTION_RETIREMENT_PLAN_V1.md` | V1 retirement/migration plan from duplication + completion audits |
