# AMENDMENT 19 — Project Governance

**Last Updated:** 2026-04-26 — mount Memory Intelligence routes at /api/v1/memory. Prior: wire savingsLedger into registerRuntimeRoutes.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-04-22 — `ssot-check.js` `checkChangedFiles` skips non-existent paths (deleted files in diff). Prior: Lumin `pending_adam` bridge, `required_routes` method + 401 retry, remote verify. |
| **Verification Command** | `node scripts/verify-project.mjs --project project_governance` |
| **Manifest** | `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.manifest.json` |

---

## Mission
Keep every serious project machine-verifiable, resumable, and coupled to its SSOT so the system can be changed without drift.

## North Star Anchor
Truth over convenience. No AI or human should work from stale assumptions when the project can assert what is actually required.

---

## Scope / Non-Scope

**In scope:**
- Project manifests
- Amendment schema and hygiene
- Project verifier
- Coupling and staleness checks
- Project DB tables (`projects`, `project_segments`, `estimation_log`, `pending_adam`)
- Governance API routes

**Out of scope:**
- Project-specific feature implementation
- General route mounting outside governance surfaces
- Runtime business logic unrelated to project tracking

---

## Owned Files
```
routes/project-governance-routes.js
db/migrations/20260327_project_governance.sql
db/migrations/20260327_governance_spec.sql
docs/projects/manifest.schema.json
docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.manifest.json
docs/projects/AMENDMENT_READINESS_CHECKLIST.md
routes/builder-supervisor-routes.js
scripts/verify-project.mjs
scripts/check-coupling.mjs
scripts/ssot-staleness-check.mjs
scripts/seed-projects.mjs
.github/workflows/ssot-compliance.yml
```

## Protected Files
```
server.js    — composition root only
docs/SSOT_COMPANION.md
docs/projects/INDEX.md
```

---

## Design Spec

### Core model
- `projects` is the scoreboard row for each major project
- `project_segments` is the ordered build plan
- `estimation_log` calibrates estimates vs actual work
- `pending_adam` records anything blocked on the user
- Timing truth is mandatory: every meaningful build segment should have an estimate before work and an actual after completion so estimate accuracy can improve over time.

### Control surfaces
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `GET /api/v1/projects/:id/segments`
- `POST /api/v1/projects/:id/segments/:sid`
- `POST /api/v1/projects/:id/verify`
- `POST /api/v1/projects/:id/readiness/mark-ready`
- `POST /api/v1/projects/:id/readiness/unmark`
- `GET /api/v1/projects/readiness/queue`
- `GET /api/v1/pending-adam`
- `POST /api/v1/pending-adam`
- `POST /api/v1/pending-adam/:id/resolve`
- `GET /api/v1/estimation/accuracy`
- `POST /api/v1/builder/run`
- `POST /api/v1/builder/run-sync`
- `GET /api/v1/builder/status`
- `GET /api/v1/builder/queue`
- `POST /api/v1/builder/pause`
- `POST /api/v1/builder/resume`

### Verification loop
1. Amendment explains intent
2. Manifest encodes machine-checkable truth
3. Verifier runs assertions (DB, files, syntax; optional HTTP route probes when `PUBLIC_BASE_URL` / `RAILWAY_PUBLIC_DOMAIN` / `REMOTE_VERIFY_BASE_URL` is set, or when **`--remote-base-url https://…`** is passed — see `docs/ENV_REGISTRY.md` § Public URL & remote verification)
4. Coupling/staleness scripts enforce discipline in CI
5. Readiness gates determine when a project is mature enough to enter the builder queue
6. Builder supervisor only executes projects that are both `build_ready` and safe enough to automate

### AI Evaluation Governance Loop
All autonomous or semi-autonomous AI work must be recorded as a governed evaluation run:
1. `proposal` — what the model said should be done
2. `execution` — what code or workflow it actually changed
3. `verification` — what checks were run and whether they passed
4. `review` — whether the touched files and architecture fit were correct
5. `repair` — what was changed after failure
6. `score` — separate grades for planning quality, implementation quality, and debug quality

Minimum governance requirements:
- Proposal and execution must be distinguishable in logs/receipts.
- Verification must be explicit and reproducible.
- A failed first attempt that is later repaired still counts as a failed first attempt in scoring.
- Confidence must be stored and compared against actual outcome.
- Runs that collapse planner/executor/verifier into one role must be labeled as reduced-separation runs.

### Required Evaluation Artifacts
Every governed AI run should preserve:
- input task / prompt summary
- proposal payload
- files changed
- checks run
- failures encountered
- repair attempts
- final receipt
- scorecard

This is the evidence base for deciding which models can safely self-program and where they still need supervision.

---

## Build Plan

- [x] **Project governance schema** *(est: 2h | actual: 2h)* `[safe]`
- [x] **Governance API routes** *(est: 2h | actual: 2h)* `[safe]`
- [x] **Manifest schema** *(est: 1h | actual: 1h)* `[safe]`
- [x] **Project verifier script** *(est: 2h | actual: 2h)* `[needs-review]`
- [x] **Coupling checker** *(est: 1h | actual: 1h)* `[needs-review]`
- [x] **Staleness checker** *(est: 1h | actual: 1h)* `[needs-review]`
- [x] **CI workflow for governance checks** *(est: 1h | actual: 1h)* `[safe]`
- [x] **Mount governance routes in runtime composition** *(est: 0.5h | actual: 0.5h)* `[safe]`
- [x] **Add a seeded project bootstrap script** *(est: 2h | actual: 2h)* `[safe]`
- [x] **Run the seed bootstrap against the real DB and verify live governance endpoints** *(est: 1h | actual: 1h)* `[safe]`
- [x] **Add build-readiness checklist and readiness queue routes** *(est: 2h | actual: 2h)* `[needs-review]`
- [x] **Mount builder supervisor routes into runtime composition** *(est: 0.5h | actual: 0.5h)* `[safe]`
- [x] **Wire adam_decision_profile learning loop into pending-adam resolve route** *(est: 1h | actual: 1h)* `[safe]` — resolve captures `actual_choice` → updates `adam_decision_profile.actual_choice + was_correct`; `actual_choice = 'override_stop'` resets segment to pending
- [ ] **→ NEXT: wire estimation accuracy, readiness queue, and governance drill-down into the Command Center overlay** *(est: 4h)* `[needs-review]`

**Progress:** 13/14 steps complete | Est. remaining: ~4h

---

## Anti-Drift Assertions
```bash
node --check routes/project-governance-routes.js
node --check scripts/verify-project.mjs
node --check scripts/check-coupling.mjs
node --check scripts/ssot-staleness-check.mjs
node --check server.js
```

Required runtime truths:
- `GET /api/v1/projects` exists
- `GET /api/v1/pending-adam` exists
- `GET /api/v1/estimation/accuracy` exists
- `GET /api/v1/projects/readiness/queue` exists
- `GET /api/v1/builder/status` exists
- `projects`, `project_segments`, `estimation_log`, and `pending_adam` tables exist after migration
- `project_segments` has `review_tier`, `allowed_files`, `exact_outcome`, `required_checks`, `rollback_note` columns (from `20260327_governance_spec.sql`)
- `projects` has `market_sensitive` column (from `20260327_governance_spec.sql`)
- `build_outcomes` table exists for post-merge outcome scoring

---

## Context Handoff
- Current blocker: governance data, readiness gates, and builder-supervisor routes are live. Adam decision profile learning loop is wired. Command Center still needs a first-class governance panel for estimation accuracy, readiness queue, and deeper drill-downs.
- Last decision: startup guards now check real TC env/vault readiness instead of stale hard-coded env names, and runtime route composition now passes managed-env control into the TC lane so access bootstrap can be done through governed routes.
- Do not move project governance back into `server.js`; keep runtime composition in startup modules.
- Read first:
  - `routes/project-governance-routes.js`
  - `routes/builder-supervisor-routes.js`
  - `services/builder-council-review.js`
  - `scripts/verify-project.mjs`
  - `docs/projects/manifest.schema.json`

---

## Test Criteria
- Governance routes return JSON instead of 404
- Verifier reads manifests and runs assertions without syntax errors
- CI workflow can validate manifests and run coupling/staleness checks
- Route mount does not double-prefix project-governance endpoints
- Builder supervisor routes mount under `/api/v1/builder/*`
- Readiness queue distinguishes build-ready projects from not-ready projects

---

## Change Receipts

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-04-26 | `startup/boot-domains.js`: add `autoSeedEpistemicFacts(pool, logger)` — checks epistemic_facts count on boot, seeds if empty via execSync, logs count if already seeded, never crashes boot | Memory Intelligence tables are empty until seeded; manual seed step should not be required | ✅ node --check | pending | pending |
| 2026-04-26 | `startup/register-runtime-routes.js`: import + mount `createMemoryIntelligenceRoutes` at `/api/v1/memory` | Wire AMENDMENT_39 Memory Intelligence API surface into the running app | ✅ node --check | pending | pending |
| 2026-04-25 | `startup/register-runtime-routes.js`: pass `savingsLedger: deps.savingsLedger` into `createApiCostSavingsRoutes`; `server.js`: add `savingsLedger` to `registerRuntimeRoutes` call | `GET /api/v1/tsos/savings/report` was returning 503 "savingsLedger not initialised" — the service was created but never threaded into the route context | ✅ node --check | pending | pending |
| 2026-04-22 | **`scripts/ssot-check.js` — `checkChangedFiles`:** after path filters, **`if (!existsSync(ROOT+file)) continue`** so deleted `routes/…` / `services/…` in `git diff` do not produce bogus “missing @ssot” warnings (read failed → null tag). | Honest `ssot:validate` / system-maturity when orphan routes are removed. | ✅ | pending | `node --check scripts/ssot-check.js` |
| 2026-04-21 | **Lumin → `pending_adam` bridge (composition):** `startup/register-runtime-routes.js` passes `callCouncilMember` into `createLifeOSChatRoutes`; `routes/lifeos-chat-routes.js` adds `POST /api/v1/lifeos/chat/build/pending-adam` (+ plan/draft/job poll routes) implemented in `services/lifeos-lumin-build.js` — inserts `pending_adam` with JSON `context` including `source: "lumin_programming"`, optional `job_id` / `thread_id` / `user_id`. | Adam asked to close Lumin gaps for governed self-programming; `pending_adam` is the existing governance rail for human/builder pickup. | ✅ | pending | `node --check` on touched route/service files |
| 2026-04-21 | **`required_routes` HTTP method fix:** flattening manifest `required_routes` into `route` assertions now copies each row’s **`method`** (default `GET`). **401 auth retry:** after the first `x-command-key` attempt, if status is 401 and `LIFEOS_KEY` is a different string than `COMMAND_CENTER_KEY`/`API_KEY`/first key, probe again with `LIFEOS_KEY`. **Receipt correction:** the 2026-04-22 row below claimed “each assertion's HTTP method” for all manifest routes, but `required_routes` rows were still probed as GET until this change. | Prevent false-negative POST probes and reduce local/Railway key drift false 401s. | ✅ | pending | `node --check scripts/verify-project.mjs`; dry-run clientcare manifest shows `POST …` in failures when applicable |
| 2026-04-22 | `scripts/verify-project.mjs` adds **`--remote-base-url <url>`** (and env **`REMOTE_VERIFY_BASE_URL`**) as the highest-precedence HTTP probe base; adds **`--strict-manifest-env`** so manifest `required_env` (including `CLIENTCARE_*`) must exist in local `process.env`; default remains skip for missing `CLIENTCARE_*` with explicit “cannot read Railway UI” text. SSOT: `docs/ENV_REGISTRY.md`, `services/env-registry-map.js`, `docs/SSOT_COMPANION.md` §0.4, `package.json` script `verify:clientcare-billing:remote`. | Operators and AIs need one non-ambiguous place for “what env exists” vs “what local shell can see”; remote probes must not require guessing Railway state. | ✅ | pending | pending |
| 2026-04-22 | `scripts/verify-project.mjs` now resolves route base URL from `PUBLIC_BASE_URL` **or** `RAILWAY_PUBLIC_DOMAIN`, emits explicit env-source wording for env assertions, materializes parameterized paths (`:claimId` -> `1`) before probing, and uses HTTP method + JSON body for **explicit manifest `assertions[]` route rows** and (after 2026-04-21) for **`required_routes[]`** as well. | Remove false route/env failures and make verifier output accurately explain what environment source is being checked. | ✅ | pending | pending |
| 2026-04-27 | `startup/register-runtime-routes.js` — resolved merge conflict: kept assessment battery mount (`createAssessmentBatteryRoutes` at `/api/v1/lifeos/identity/assessment`), removed duplicate `createLifeOSVictoryVaultRoutes` import that caused `SyntaxError: Identifier already declared` on boot. | Merge diverged remote + local stash; duplicate import was injected by autoWireRoute during prior session that had already wired it at the import level. | ✅ | pending | `node --check startup/register-runtime-routes.js` |
| 2026-04-27 | `startup/register-runtime-routes.js` — import `createAssessmentBatteryRoutes` from `routes/lifeos-assessment-battery-routes.js`; mount at `/api/v1/lifeos/identity/assessment` (POST /result, GET /result/:type, GET /results, GET /profile, GET /complete). | Wire B6 assessment battery module; infrastructure composition only. | ✅ | pending | `node --check startup/register-runtime-routes.js` |
| 2026-04-27 | `startup/register-runtime-routes.js` — import `createConflictInterruptRoutes` from `routes/lifeos-conflict-interrupt-routes.js`; mount at `/api/v1/lifeos/conflict/interrupt` (POST /, GET /active, POST /:id/resolve, POST /:id/escalate, GET /history, GET /pattern). | Wire B5 conflict interrupt module into running app; infrastructure composition only. | ✅ | pending | `node --check startup/register-runtime-routes.js` |
| 2026-04-27 | `startup/register-runtime-routes.js` — import `createDecisionReviewRoutes` from `routes/lifeos-decision-review-routes.js`; mount at `/api/v1/lifeos/decisions/review` (GET /pending, POST /:id/complete, POST /:id/skip, GET /history). | Wire B2 decision review queue module into running app; infrastructure composition only. | ✅ | pending | `node --check startup/register-runtime-routes.js` |
| 2026-04-27 | `startup/register-runtime-routes.js` — import `mountSleepRoutes` from `routes/lifeos-sleep-routes.js`; mount at `/api/v1/lifeos/sleep` (sleep logs + history + debt). | Wire sleep tracking routes from builder-built module; infrastructure composition only. | ✅ | pending | `node --check startup/register-runtime-routes.js` |
| 2026-04-21 | `startup/register-runtime-routes.js` imports `createLifeOSAmbientRoutes` and mounts `/api/v1/lifeos/ambient` (LifeOS ambient snapshot API). | Runtime composition for Amendment 21 ambient-hints slice; no `server.js` edits. | ✅ | pending | pending |
| 2026-04-19 | `startup/register-runtime-routes.js` imports `createLifeOSHabitsRoutes` and mounts `/api/v1/lifeos/habits`. | Ship P1 habit tracker lane without violating `server.js` composition-root boundary. | ✅ | pending | pending |
| 2026-04-19 | `startup/register-runtime-routes.js` — mount `/api/v1/lifeos/gate-change` via `createLifeOSGateChangeRoutes` (North Star §2.6 ¶8 proposal persistence + user-triggered council review). | Runtime composition only; no `server.js` edits. | ✅ | pending | pending |
| 2026-04-19 | `startup/boot-domains.js` — `bootLaneIntel` loads `createLaneIntelScheduledTicks` when `LANE_INTEL_ENABLE_SCHEDULED=1`; runs horizon + redteam useful-work guards on `LANE_INTEL_TICK_MS` (default 24h). | Amendment 36 operational lanes without adding cron to `server.js`. | ✅ | pending | pending |
| 2026-04-19 | `startup/register-runtime-routes.js` imports `getCachedResponse` + `cacheResponse` from `services/response-cache.js` and passes them into `createLifeOSCouncilBuilderRoutes` so builder `POST /task` can dedupe identical prompts and conductor audit rows can distinguish cache hits. | Amendment 36 / builder handoff: second-layer cache at builder boundary + auditability without touching `server.js` composition rules beyond existing deps threading. | ✅ | pending | pending |
| 2026-04-06 | `startup/register-runtime-routes.js` now loads LifeOS/Kids/Teacher route modules lazily and skips them with a warning if the module or one of its dependencies is absent; `server.js` now awaits runtime route registration | Prevent production startup from crashing on `ERR_MODULE_NOT_FOUND` when optional experimental modules exist locally but are not part of the deployed repo; keep ClientCare billing deployable even when optional modules drift | ✅ | pending | pending |
| 2026-04-01 | `startup/register-runtime-routes.js` — mount full LifeOS API surface under `/api/v1/lifeos/*` + `/finance` | Unblock LifeOS overlays and integrations: routes were implemented but not registered on the Express app | ✅ | pending | pending |
| 2026-04-01 | `startup/boot-domains.js` — `bootLifeOSScheduled` calls `lifeos-scheduled-jobs` (opt-in `LIFEOS_ENABLE_SCHEDULED_JOBS`) | Commitment prods + outreach queue without AI; respects operator kill-switch until env set | ✅ | pending | pending |
| 2026-04-01 | Added the governed AI evaluation loop (proposal → execution → verification → review → repair → score) and required evidence artifacts for autonomous runs | Make self-programming measurable and auditable instead of anecdotal, and force all models into the same evaluation format | ✅ | pending | pending |
| 2026-03-27 | Added governance schema, routes, manifests, verifier, coupling/staleness scripts, and CI workflow | Make SSOT discipline executable instead of aspirational | ✅ | ✅ | pending |
| 2026-03-27 | Seeded projects/segments into the real DB and verified live governance endpoints | Make the governance lane operational instead of API-only | ✅ | ✅ | ✅ |
| 2026-03-27 | Added readiness-gate routes, readiness queue, checklist doc, and builder supervisor route composition | Make pre-build maturity explicit and give governed projects a safe automation entry point | ✅ | pending | pending |
| 2026-03-27 | Adam decision profile learning loop in pending-adam resolve route | Capture actual choices vs predicted; track accuracy over time in adam_prediction_accuracy view | ✅ | pending | pending |
| 2026-03-27 | Governance spec upgrade: segment spec fields (review_tier, allowed_files, exact_outcome, required_checks, rollback_note), market_sensitive on projects, build_outcomes table, manifest schema segments array, build_ready/council_persona/segment_schema_version fields | Make builder execution contracts machine-enforceable: no segment built without exact_outcome + allowed_files; file boundary enforcement; post-build verification gate; 4-tier review routing | ✅ | ✅ | pending |
| 2026-03-27 | Corrected domain boot guards to use actual TC env/vault readiness and passed managed-env control into TC route composition | Keep startup truth aligned with real credential sources and allow governed access bootstrap from the TC lane | ✅ | ✅ | pending |
| 2026-03-28 | Declared env-registry health as a build-time governance surface and surfaced it in Command Center | Builders must know which envs exist and which are missing before assuming runtime capability, without revealing secret values | ✅ | pending | pending |
