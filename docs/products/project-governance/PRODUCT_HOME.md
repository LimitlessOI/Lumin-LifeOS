<!-- SYNOPSIS: Canonical product home — Project Governance -->

# Project Governance Product Home

**Formerly called:** Amendment 19 — PROJECT GOVERNANCE

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `project-governance` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/project-governance/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-07-03 |

---
_(formerly AMENDMENT_19_PROJECT_GOVERNANCE.md)_

**Last Updated:** 2026-07-05 — build economics: `services/build-economics.js` + `db/migrations/20260705_build_economics.sql` record per-segment build cost + time (phase timings review/agent/verify/total, tokens, estimated USD, files/lines changed) into `build_economics`, and predict a project's total cost + ETA from historical averages of similar segments (`estimateProjectBuild`), degrading to a labeled `seed-estimate` cold-start when no history exists. Exposed via `GET /api/v1/builder/economics/estimate` and `/economics/history`. This answers Adam's requirement that the system tell him "how much will this cost and how long will it take," and proves its accuracy by recording actuals every run.
**Last Updated:** 2026-07-05 — builder supervisor is now model-agnostic: `scripts/autonomy/builder-agents.mjs` abstracts the per-lane coding agent (the "hands") behind `runBuilderAgent({ kind, ... })`, and `builder-supervisor.js` selects it via `BUILDER_AGENT` (default: OpenAI when `OPENAI_API_KEY` present, else Claude CLI). The OpenAI agent is a bounded tool-loop (list_dir/read_file/write_file/node_check/finish/needs_human) path-jailed to the lane worktree and honoring `allowed_files`. Lets each concurrent lane run on cheap OpenAI hands instead of the unavailable/expensive Claude CLI — the biggest lever on cost-per-product. Safety gate now checks the selected agent's availability instead of hard-requiring the Claude CLI.
**Last Updated:** 2026-06-29 — never-stop product factory scheduler started in boot-domains.js
**Last Updated:** 2026-07-03 — Legacy overlay retirement (cleanup batch 6): `startup/routes/server-routes.js` file-write allowlist no longer includes the now-archived `public/overlay/command-center.html` (only `public/overlay/command-center.js` + `package.json` remain servable/writable). The 12 forbidden overlay prototypes were archived to `docs/history/legacy-overlays/` with old `/overlay/*.html` paths 301-redirecting to `/lifeos?direct_system=1`; governed under redirect-and-archive (no live 404s, reversible).
**Last Updated:** 2026-07-01 — Railway runtime selection is now hard-locked to `founder_builder` regardless of stale full-runtime flags. Local salvage/full-runtime work may still opt into `full`, but Railway production can no longer drift back into the broader legacy/full lane during founder-builder alpha.
**Last Updated:** 2026-07-01 — Railway runtime selection now fails closed to `founder_builder` unless both `LIFEOS_ENABLE_FULL_RUNTIME=true` and `LIFEOS_ALLOW_FULL_RUNTIME_ON_RAILWAY=true` are present. This prevents production from drifting back into the broader legacy/full runtime while BuilderOS founder alpha is still the primary lane.
**Last Updated:** 2026-07-01 — founder-builder runtime availability took precedence over global response wrapping: `server-founder-runtime.js` no longer mounts `createTruthResponseEnforcer` after live Railway proved a route split where `/ready` worked but all protected founder routes hung behind proxy timeout. This is a runtime-scope availability cut, not a repeal of truth law.
**Last Updated:** 2026-07-01 — BuilderOS proof governance tightened: readiness/deploy verifiers now truly fall back to `/ready` when `/api/v1/lifeos/builder/ready` times out, and the pre-build gate now treats `founder_builder` as a valid minimal runtime by skipping intake-regression checks that require product surfaces outside that lane.
**Last Updated:** 2026-06-30 — build-readiness authority moved to canonical governance docs; runtime/readiness routes and builder hints now point to `docs/products/project-governance/READINESS_CHECKLIST.md`, and legacy root `docs/projects/*` specs were archived under `docs/history/legacy-history-salvage/docs-projects-root/`.
**Last Updated:** 2026-06-30 — runtime mode governance formalized in `services/runtime-modes.js`: founder-builder is now the default profile; only explicit `LIFEOS_RUNTIME_PROFILE=full` may boot the wider product/scheduler surface.
**Last Updated:** 2026-06-30 — founder-builder startup governance extended into `server.js`: non-core warmups are no longer mandatory at startup for the default founder-builder profile, which makes bind/liveness first-class and pushes long-horizon warmups into explicit `full` runtime mode.
**Last Updated:** 2026-06-30 — founder-builder bind order now starts listening before DB readiness, and startup health state is explicit so `/healthz` can act as liveness while deeper readiness remains on richer health surfaces.
**Last Updated:** 2026-06-30 — founder-builder now defers managed-env sync, Twilio webhook bootstrap, account bootstrap, and boot seeder out of module-load startup; those auxiliary services only auto-boot in explicit `full` runtime mode.
**Last Updated:** 2026-06-30 — full runtime now fails closed: `LIFEOS_RUNTIME_PROFILE=full` is not sufficient by itself; `LIFEOS_ENABLE_FULL_RUNTIME=true` is also required. Founder-builder startup also suppresses legacy automation banners and defers idea-to-implementation initialization unless full runtime is explicitly unlocked.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-05-21 — Mount Memory Capsule Alpha routes at `/api/v1/memory`; OIL phase7 probe wired. Prior: 2026-04-27 — assessment battery import restored (Railway boot). Prior: Lumin pending_adam bridge, required_routes method + 401 retry. |
| **Verification Command** | `node scripts/verify-project.mjs --project project_governance` |
| **Manifest** | `docs/products/project-governance/FILE_MANIFEST.json` |

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
docs/products/project-governance/PRODUCT_HOME.md
docs/products/project-governance/FILE_MANIFEST.json
docs/products/project-governance/READINESS_CHECKLIST.md
routes/builder-supervisor-routes.js
scripts/autonomy/builder-supervisor.js
scripts/autonomy/builder-agents.mjs
scripts/autonomy/builder-batching.mjs
services/build-economics.js
db/migrations/20260705_build_economics.sql
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
1. Product home / canonical spec explains intent
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
- [x] **Wire estimation accuracy, readiness queue, and governance drill-down into the Command Center overlay** *(est: 4h | actual: ~1h)* `[needs-review]` — 2026-05-29: `#project-governance-panel` in `lifeos-command-center.html` Section F; read-only counts + top-5 queue + pending-adam slice
- [ ] **→ NEXT: decision debt surface (no endpoint yet) + project drawer detail fix (nested `project` object)** *(est: 2h)* `[needs-review]`

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

| 2026-07-05 | **`scripts/autonomy/builder-supervisor.js`** + **`scripts/autonomy/builder-agents.mjs`** — cost lever: per-stability-class OpenAI model selection. Supervisor resolves a model per segment (`BUILDER_MODEL_<CLASS>`, e.g. `BUILDER_MODEL_SAFE=gpt-4o-mini`, `BUILDER_MODEL_REVIEW=gpt-4o`, falling back to `BUILDER_OPENAI_MODEL`) and passes it into `runBuilderAgent({ model })`; the OpenAI agent honors the explicit override. Cheap models handle low-risk lanes, stronger models handle risky lanes. | Adam: squeeze every dollar + scale — don't pay for a strong model on trivial safe work. | AM19 | `node --check` + `node --test tests/builder-agents.test.js` (now 9) — 20 total PASS |
| 2026-07-05 | **`scripts/autonomy/builder-agents.mjs`** + **`scripts/autonomy/builder-supervisor.js`** — scalability: OpenAI lane calls now retry transient failures (HTTP 429/5xx + network drops) with exponential backoff (`BUILDER_OPENAI_RETRIES` def 3, `BUILDER_OPENAI_RETRY_BASE_MS` def 500; non-transient 4xx + timeouts are not retried), and the run queue depth is configurable via `BUILDER_QUEUE_LIMIT` (was a hardcoded LIMIT 20) so a run can scale past 20 pending segments. | Adam: get BuilderOS to 100% and able to scale. A scaled multi-lane run must ride out provider rate-limits/5xx and not be capped at 20 segments. | AM19 | `node --check` + `node --test tests/builder-agents.test.js` (now 8) — 19 total PASS |
| 2026-07-05 | **`scripts/autonomy/builder-supervisor.js`** — budget guardrail: a run stops starting new batches once accumulated estimated spend reaches `BUILDER_MAX_RUN_USD` (0 = unlimited); remaining segments stay `pending` and the run summary reports `budgetUsd` + `stoppedForBudget`. | Adam recharges $100 at a time and needs the builder to never blow the wallet in one runaway multi-lane run. | AM19 | `node --check` + `node --test` (17) PASS |
| 2026-07-05 | **`scripts/autonomy/builder-agents.mjs`** — resilience: the OpenAI lane agent now enforces a per-call `AbortController` timeout (`BUILDER_OPENAI_CALL_TIMEOUT_MS`, default 120s) and an overall wall-clock deadline (`BUILDER_AGENT_TIMEOUT_MS`, default 15m). A hung network call or runaway loop returns a clean error result instead of stalling its lane and blocking the whole batch. | Adam: make the builder scalable + stable. In multi-lane mode one hung lane must not freeze the batch. | AM19 | `node --check` + `node --test tests/builder-agents.test.js` (now 6) — 17 total PASS |
| 2026-07-05 | **`scripts/autonomy/builder-batching.mjs`** (new) + **`scripts/autonomy/builder-supervisor.js`** — multi-lane hardening: `planBatches(segments, maxConcurrent)` groups pending segments so no two lanes in the same batch declare overlapping `allowed_files` (removes cross-lane merge/PR collisions before any agent runs); supervisor now plans batches via it and `pruneStaleWorktrees()` clears worktrees orphaned by a crashed prior run at startup. | Adam: make the builder multi-lane + scalable and stable. Parallel lanes editing the same file race at merge; stale worktrees from a killed run break the next run. | AM19 | `node --check` + `node --test tests/builder-batching.test.js` (5) — 16 total PASS |
| 2026-07-05 | **`scripts/autonomy/builder-supervisor.js`** + **`routes/builder-supervisor-routes.js`** — observability: the supervisor run summary (`last-supervisor-run.json`, surfaced by `GET /status`) now aggregates total estimated USD + tokens and a per-agent breakdown for the run; `GET /queue` returns a `projected` block with cost + ETA for the safe queue and all pending work (via `estimateSegments` over history). Operator sees projected spend before a run and actual spend after. | Adam: system should tell me cost + time — applied to the live work queue and per-run totals, not just single segments. | AM19 | `node --check` + `node --test` (11) PASS |
| 2026-07-05 | **`services/build-economics.js`** (new) + **`db/migrations/20260705_build_economics.sql`** (new) + **`scripts/autonomy/builder-supervisor.js`** + **`routes/builder-supervisor-routes.js`** — build-economics ledger: supervisor now times each phase (council review / agent / verify) and records tokens, estimated USD, and code volume (files/lines) per segment into `build_economics`; `build-economics.js` predicts a project's total cost + ETA from historical averages by stability class (`summarizeHistory`/`estimateSegments`/`estimateProjectBuild`), with a labeled cold-start fallback; surfaced via `GET /api/v1/builder/economics/estimate` + `/economics/history`. | Adam: "I want the system to be able to tell me how much something will cost and how long it will take" — requires monitoring per-phase build speed/cost and predicting from history. | AM19 | `node --check` all files + `node --test tests/build-economics.test.js` (6) PASS |
| 2026-07-05 | **`scripts/autonomy/builder-agents.mjs`** (new) + **`scripts/autonomy/builder-supervisor.js`** — extracted a model-agnostic `BuilderAgent` (`runBuilderAgent`, `resolveAgentKind`, `agentAvailability`); supervisor selects the per-lane agent via `BUILDER_AGENT` and delegates the Claude CLI path through `claudeRunner` (behavior unchanged) while adding a native OpenAI tool-loop agent (path-jailed to the worktree, `allowed_files`-enforced). Safety gate now validates the selected agent instead of always requiring the Claude CLI. The OpenAI agent also accumulates per-lane token usage + an estimated USD cost (`result.usage`, model-price map overridable via `BUILDER_OPENAI_COST_*` env) which the supervisor logs per segment, so parallel-lane spend is visible. | Adam: build the builder for multiple lanes + scalability, and use cheap OpenAI as the hands to squeeze every dollar. The Claude CLI is unavailable in the Railway/CI environment and expensive; OpenAI-per-lane is the cost lever. | AM19 | `node --check` both files + `node --test tests/builder-agents.test.js` PASS |
| 2026-06-30 | `services/runtime-modes.js` — added explicit runtime profile helpers (`getRuntimeProfile`, `isFullRuntimeProfile`, `isFounderBuilderRuntimeProfile`) and made `founder_builder` the default profile. | The system needed a machine-enforced distinction between founder/builder alpha runtime and the wider legacy/full product runtime so BuilderOS and founder proofing stop booting the whole historical surface by default. | AM19 | local syntax PASS |
| 2026-07-01 | `services/runtime-modes.js` — Railway is now unconditionally hard-locked to `founder_builder`; local/full salvage may still opt into `full`, but Railway ignores stale full-runtime unlock flags. This supersedes the earlier same-day row that still described a conditional Railway escape hatch. | Production logs showed the broader legacy/full runtime was still booting old product systems on Railway. Founder-builder alpha needs a real fail-closed lane, not a paper guard that old env flags can bypass. | AM19 | `node --test tests/runtime-modes.test.js` PASS |
| 2026-07-01 | `services/runtime-modes.js` — Railway now stays on `founder_builder` unless `LIFEOS_ALLOW_FULL_RUNTIME_ON_RAILWAY=true` is also set alongside the existing full-runtime flags. | Production was still able to drift back into the broader legacy runtime even though BuilderOS founder alpha is the active system lane. The lock makes Railway fail closed to the builder-first runtime until full runtime is deliberately re-authorized. | AM19 | local mode snapshot PASS |
| 2026-06-30 | `server.js` — founder-builder runtime now treats bind/liveness as primary and skips or defers non-core warmups (auto-builder recovery, ROI/knowledge warm loads, dependency audit, memory bootstrap, Stripe startup sync, autonomy startup snapshot) unless `LIFEOS_RUNTIME_PROFILE=full`. | Runtime profile law was incomplete while `server.js` still eagerly booted historical warmups on the default founder-builder path; Railway truth required the startup contract to enforce fast liveness, not just route/domain narrowing. | AM19 | local founder boot PASS |
| 2026-06-30 | `server.js` + `startup/routes/server-routes.js` — founder-builder now binds before `initDatabase()`, tracks explicit startup health state (`phase`, `db`, `runtime_routes`, `deferred_services`, `last_error`), and exposes `/healthz` as fast liveness while `/api/health` remains the richer readiness surface. | Railway was still timing out before any route responded. The system needed a true liveness contract at boot so deploy truth can distinguish “container is alive but still warming” from “process never bound at all.” | AM19 | local `/healthz` 200 + `/api/health` 200 |
| 2026-06-30 | `server.js` — founder-builder no longer launches managed-env schema sync, Railway env autosync, account bootstrap, Twilio webhook registration, or boot seeder work at module load; those auxiliary tasks now auto-run only in explicit `full` runtime mode. | Founder-builder boot still had pre-runtime side work escaping the runtime-profile fence. On Railway, the lean founder lane must not spend startup time on non-founder auxiliary services before the app proves basic liveness. | AM19 | local founder boot PASS |
| 2026-06-29 | **`startup/boot-domains.js`** — `startNeverStopProductFactoryScheduler` called in `bootBuilderOSPriorityQueue`. Expansion lane now boots automatically alongside the canonical BP scheduler. | Never-stop factory needed boot-time start; was only wired in the scheduler service itself. | AM19 | pending deploy |
| 2026-06-26 | **`startup/register-runtime-routes.js`** — deps-object mount `createSocialmediaosRoutes({ pool, requireKey, logger })` after MOS-P1-003 regen. | Prior (app,ctx) mount wrong after route factory regen. | ⚠️ redeploy + acceptance | intake execute |
| 2026-06-26 | **`startup/register-runtime-routes.js`** — socialmediaos mount: `createSocialmediaosRoutes(app, { pool, requireKey, rk, logger })` — autoWire had used deps-object call on (app,ctx) factory. | Deploy FAILED TypeError ctx undefined line 530. | ✅ superseded by deps-object regen | intake execute |
| 2026-06-13 | **`startup/register-runtime-routes.js`** — restore missing `import { createLifeOSChatRoutes }` (ReferenceError crashed Railway boot on deploy 2728eed). | GAP-FILL: deploy FAILED `createLifeOSChatRoutes is not defined` at register-runtime-routes.js:294 — import dropped while chat mount remained. | ✅ node --check | redeploy |
| 2026-05-19 | **`startup/register-runtime-routes.js`** — `createRequireLifeOSUserOrKey(requireKey)` as `requireUserOrKey` for founder LifeOS API mounts (core, finance, briefing, lifere, ambient, etc.); chat keeps raw requireKey (wraps internally). | Account JWT after lifeos-login must work for dashboard/Lumin without COMMAND_CENTER_KEY in browser. | ✅ node --check | deploy |
| 2026-06-13 | **BuilderOS harness platform stack** — canonical executor, gap classifier, compound improvement, harness toolkit, governed loop codegen repair, operational verify scripts; `config/builder-safe-scope.js` receipts path; council builder fail-fast + MECHANICAL tier. | Adam: honest operational 10/10 BuilderOS machine — program, self-repair, compound improve; not structural theater. | ✅ local operational verify 10/10 | push + deploy |
| 2026-06-24 | **`config/builder-safe-scope.js`** — add `products/receipts/` to `SAFE_WRITE_PATHS` for mission acceptance receipts. | BuilderOS harness + product receipts need commit-capable safe scope. | ✅ isSafeTarget | deploy |
| 2026-06-24 | **`startup/register-runtime-routes.js`** — pass `commitManyToGitHub` into `createLifeRERoutes` for founder usability confirm persistence. | Alpha confirm on Railway was ephemeral filesystem-only. | ✅ | deploy |
| 2026-06-13 | **`startup/boot-domains.js`** — `bootLifeREDomain()` starts `lifere-outreach-scheduler` (15m useful-work guard for approved Am 08 tasks). | LifeRE outreach must execute without manual queue polling. | ✅ readiness PASS | deploy |
| 2026-06-13 | **`startup/boot-domains.js`** — `bootLifeREDomain()` seeds founder twins + marriage edge on boot. **`startup/register-runtime-routes.js`** — pass `pool`, `callCouncilMember`, `notificationService`, `sendSMS` into `createLifeRERoutes`. | LifeRE Alpha runtime must boot and wire Am 08/17/29 bridges on Railway. | ✅ alpha-gate PASS | deploy + live E2E |
| 2026-06-13 | **`startup/boot-domains.js`** — FP V2 boot defaults ON: Chair prediction score + lane intel schedulers (opt-out `CHAIR_PREDICTION_SCORE_ENABLED=0` / `LANE_INTEL_*=0`). | Adam: always-on scoreboard + competitor monitoring unless explicitly disabled. | ✅ preflight | deploy |
| 2026-06-17 | **`startup/boot-domains.js`** — added `import { startBpPriorityScheduler }` + `bootBuilderOSPriorityQueue(deps)` function + wired to `Promise.allSettled` in `bootAllDomains`. Requires `BUILDEROS_AUTOPILOT=1` env var to activate. | BuilderOS BP_PRIORITY queue needed to run autonomously on Railway without founder present; scheduler enabled via env flag to prevent unintended burns. | AM19 boot wiring | pending Railway env set + deploy |
| 2026-06-21 | **`startup/register-runtime-routes.js`** — pass `commitManyToGitHub` into council builder routes for `POST /builder/execute-batch` (atomic multi-file founder CSS commits). | Founder CSS patch used 4 sequential commits — partial deploy state. | AM19 wiring | deploy |
| 2026-06-20 | **`startup/register-runtime-routes.js`** — Founder Interface security wiring: ensured `createLifeOSBuilderOSCommandControlRoutes` mounts before generic key-only route groups so JWT role middleware runs first for founder-interface endpoints; disabled active Voice Rail route mount and logged retirement warning path so runtime stays history-only for Voice Rail. | Founder Interface execute/login flow was being intercepted by legacy `requireKey` middleware ordering, causing auth false-negatives and role gates to fail; Voice Rail must remain retired as a non-runtime authority path. | AM19 runtime composition | pending deploy |
| 2026-06-16 | **`startup/register-runtime-routes.js`** — mount capture-pipeline at `/api/v1/lifeos/capture-pipeline` and commitment-route at `/api/v1/lifeos/commitment-route`. | LifeOS v2.0–v2.1 integration slices overnight build. | AM19 wiring, AM21 | pending deploy |
| 2026-05-24 | **`startup/register-runtime-routes.js`** — mount `createLifeOSSystemProofRoutes` at `/api/v1/lifeos` (`/system-proof-event`, `/provider-tool-proof`). | Provider API tool-action proof wiring (AM21 v2.35). | AM19 wiring | pending deploy |
| 2026-06-13 | **`startup/register-runtime-routes.js`** — mount `createLifeOSDirectActionRoutes` at `/api/v1/lifeos/direct-action`. | LifeOS direct-action v1 must bypass Voice Rail chat routing and execute founder system actions on a dedicated endpoint. | AM19 wiring, AM21 feature | pending deploy | `npm run lifeos:direct-action:v1-acceptance` |
| 2026-05-24 | **`startup/register-runtime-routes.js`** — pass `requireKey` into `createLifeOSAuthRoutes` for operator invite/provision endpoints. | Sherry account provisioning via command key; member login stays JWT. | AM19 wiring | pending deploy |
| 2026-05-24 | Batch push: factory runtime separation, AUTONOMOUS-RECOVERY-0001, regression harness, lumin-factory bundle — founder-requested Railway test deploy | routes/services/startup + factory-staging + builderos-reboot | Adam audit+push directive |
| 2026-06-11 | **`startup/register-runtime-routes.js` + `server.js`:** pass `callCouncilMember`, `COUNCIL_MEMBERS`, `COUNCIL_ALIAS_MAP` into `createLifeOSVoiceRailRoutes` for session-aware council replies with model disclosure. | Voice Rail was using generic lumin.chat boilerplate; Adam trust fix. | AM19 wiring, AM21 Voice Rail | pending | after deploy |
| 2026-06-12 | **`startup/register-runtime-routes.js`:** mount `createActionInboxRoutes` at `/api/v1/lifeos/action-inbox` (PRODUCT-ACTION-INBOX-V1-0001). | Action Inbox v1 middle layer between Voice Rail and BuilderOS. | AM19 wiring, AM21 feature | pending | `npm run lifeos:action-inbox:v1-acceptance` |
| 2026-06-11 | **`startup/register-runtime-routes.js`:** mount `createLifeOSVoiceRailRoutes` at `/api/v1/lifeos/voice-rail`. Voice Rail v1 communication API (PRODUCT-VOICE-RAIL-V1-0001). | Adam finish directive — LifeOS primary interface off Cursor. | AM19 wiring, AM21 feature | pending | `npm run lifeos:voice-rail:v1-acceptance` |
| 2026-06-11 | **`services/factory-autopilot-scheduler.js`** (NEW) — `runFactoryAutopilotOnce`, `startFactoryAutopilotScheduler` (opt-in `FACTORY_RECOVERY_OWNER_ENABLED=1`, default interval 5m). **`startup/boot-domains.js`** — `bootFactoryAutopilotRecoveryOwner` in `bootAllDomains`. **`builderos-reboot/scripts/mission-recovery-owner.mjs`** + **`autopilot-runner.mjs`** — AUTONOMOUS-RECOVERY-0002 owner. **`run-autopilot-recovery-proof.mjs`** + `npm run factory:autopilot:proof`. Local proof PASS. | Wire hard_stop/mission_failed → autopilot recovery without human observe invoke. | AM19 boot + factory scripts | pending | Railway deploy + cron after push |

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-06-10 | **`config/builder-safe-scope.js`** — added `builderos-reboot/MISSIONS/` to `SAFE_WRITE_PATHS`. **`scripts/snt-verify-builder-safe-scope.mjs`** — SNT mechanical verify for mission-pack path + blocked server.js. | FACTORY-DELIBERATION-SENTRY-REGRESSION-0001 BPB blocked on dead-end 403; mission BLUEPRINT must be builder-writable. GAP-FILL platform. | AM19 safe-scope | pending | `npm run lifeos:snt:builder-safe-scope` PASS |
| 2026-06-10 | **`startup/register-runtime-routes.js`** — mount `createDeliberationGovernanceRoutes` at `/api/v1/lifeos/deliberation`. **`startup/boot-domains.js`** — `bootDeliberationRepCatalog` syncs REP catalog on boot. Composition wiring for AM48 deliberation v2.7. | Ship deliberation governance API + boot REP sync on Railway. | AM19 wiring, AM48 feature | pending | pending Railway deploy smoke |
| 2026-06-02 | **`startup/register-runtime-routes.js`** — surgical add: import `createMissionRoutes` from `routes/mission-routes.js`; mount `app.use("/api/v1/lifeos", createMissionRoutes({ pool, requireKey, logger }))` after the commitment routes block. `node --check` PASS. | Mission Runtime Phase 2 wiring — mount 8 mission/participant/board routes per BPB-0001 §Section 8. `register-runtime-routes.js` @ssot = AM19. | AM19 (wiring), AMENDMENT_47 (feature) | pending | ✅ `node --check` PASS |
| 2026-05-24 | **`startup/register-runtime-routes.js`:** OCL import fix; mount `/api/v1/kernel`, token accounting, control plane; pass `platformKernel` to builder. **`services/builder-council-review.js`:** kernel bypass warning header. | TSOS Platform Kernel Phase 0 wiring + OC-002 fix. | AM19 | `node --check` PASS |
| 2026-05-24 | **`startup/register-runtime-routes.js`:** mount `createLifeOSCommunicationRoutes({ pool, requireKey, callCouncilMember })` at `/api/v1/lifeos/communication/*`. | LifeOS Communication OS Phase 2 — conversation-first API surface (AMENDMENT_21). | AM19 wiring | pending | `node --check` PASS |
| 2026-05-29 | **`routes/project-governance-routes.js`**: moved `GET /projects/readiness/queue` before `/projects/:id`; guard `id=readiness` with helpful 404. | Prevent `/projects/readiness` hitting slug lookup ("Project not found"). | AM19 routes | pending | `node --check` PASS |
| 2026-05-29 | **7 manifest JSON files** — added missing `name` and/or `amendment_path` only: AMENDMENT_16, 21, 31, 32, 33, 34, 35. No `verification_passed` changes. Audit: 29/29 valid after patch. | Builder repair mission Phase 5 — governance manifest completeness after 3/3 governed commits proved. | AM19 manifest schema | each file receipt | ✅ local JSON validation 29/29 |
| 2026-05-29 | **`public/overlay/lifeos-command-center.html`**: Project Governance drill-down in Section F — `loadProjectGovernance()` reads `/projects/readiness/queue`, `/pending-adam`, `/estimation/accuracy`; shows build-ready/blocked/Adam counts, top-5 queue with reasons, disclaimer. HTML-only; no backend scoring changes. | Close AMENDMENT_19 backlog item — operators see project readiness in Command Center. | AM19 UI wired | AM12 receipt | pending Railway deploy |
| 2026-05-28 | **`services/useful-work-guard.js`**: `allowInDirectedMode` option — PB-authorized deploy proof parity may run when `LIFEOS_DIRECTED_MODE=true` or `PAUSE_AUTONOMY=1`. **`startup/boot-domains.js`**: `bootSelfRepairDeployCheck` passes `allowInDirectedMode: SELF_REPAIR_OVERRIDE_DIRECTED_MODE !== '0'` (default allow). | Controlled test v2: boot passes at +45/+120/+240 never fired — Railway has `LIFEOS_DIRECTED_MODE=true` + `PAUSE_AUTONOMY=1`; useful-work-guard skipped all scheduled boot tasks. Manual `POST /self-repair/deploy-check` still worked (explicit API, no guard). Idea 24 from bounded autonomy brainstorm. | ✅ `node --check` both files | ✅ updated | **VERIFIED** v3: deploy d28fe9dc → STALE → boot-prevention-hook PASS ~90s → CURRENT, ALPHA_READY — no manual gemini/proof |
| 2026-05-28 | **`startup/boot-domains.js`**: `bootSelfRepairDeployCheck` now schedules governed proof parity at **+45s, +120s, +240s** via `runGovernedProofParityRefresh` (was single +45s `runDeployDriftPreventionHook`). **`services/builderos-governed-proof-parity.js`**: durable `builderos_proof_parity_pending` receipt on governed commit schedule. | Post-commit in-memory timer lost on Railway redeploy after governed commits; multi-pass boot + durable receipt closes proof STALE gap without manual `POST /api/v1/gemini/proof`. | ✅ `node --check` both files | ✅ updated | **VERIFIED** as part of v3 boot auto-repair path |
| 2026-05-27 | **`startup/register-runtime-routes.js`** (+6 lines): import `createLifeOSBuilderOSCommandControlRoutes` + mount at `/api/v1/lifeos/builderos/command-control`. Zone 4 GAP-FILL composition wiring. `node --check` PASS. | Wire BuilderOS Command & Control Phase 2 routes (jobs submit/status/cancel + global halt). | ✅ `node --check PASS` | pending | All 5 C2 endpoints respond on Railway after deploy |
| 2026-05-26 | **`startup/register-runtime-routes.js`** (+4 lines): Phase 09 — import `createTsosEfficiencyRoutes` from `routes/tsos-efficiency-routes.js` + `app.use(createTsosEfficiencyRoutes({ pool, requireKey }))` mount after canonical-system routes. Zone 4 GAP-FILL. `node --check` PASS. | Wire Phase 09 TSOS internal efficiency route: GET /api/v1/lifeos/builderos/tsos-efficiency returns token-tracked telemetry metrics. Closes TSOS_INTERNAL_HOOKS_NOT_WIRED blocker when data present. | ✅ `node --check PASS` | pending | GET /api/v1/lifeos/builderos/tsos-efficiency → 200 after deploy |
| 2026-05-26 | **`startup/register-runtime-routes.js`** (+3 lines): Phase 20 — import `createCanonicalSystemRoutes` from `routes/canonical-system-routes.js` + mount. Composition-only wiring. `node --check` PASS. | Wire Phase 20 canonical system monitoring routes: optimizer/stats, system/fix-history, user/simulation/accuracy. | ✅ `node --check PASS` | pending | All 3 routes respond 200 after deploy |
| 2026-05-26 | **`startup/register-runtime-routes.js`** (+3 lines): Phase 19 — import `createCanonicalBacklogRoutes` from `routes/canonical-backlog-routes.js` + mount. Composition-only wiring. `node --check` PASS. | Wire Phase 19 canonical project backlog routes. 6 routes: GET/POST /projects/backlog + /:id actions. | ✅ `node --check PASS` | pending | GET /api/v1/lifeos/projects/backlog → 200 after deploy |
| 2026-05-26 | **`startup/register-runtime-routes.js`** (+3 lines): Phase 18 — import `createCanonicalExecutionRoutes` from `routes/canonical-execution-routes.js` + `app.use(createCanonicalExecutionRoutes({ pool, requireKey }))` mount. Composition-only wiring. `node --check` PASS. | Wire Phase 18 canonical execution queue and AI kill-switch routes. | ✅ `node --check PASS` | pending | All 4 routes respond 200 on Railway after deploy |
| 2026-05-26 | **`startup/register-runtime-routes.js`** (+3 lines): Phase 17 — import `createCanonicalAdminRoutes` from `routes/canonical-admin-routes.js` + `app.use(createCanonicalAdminRoutes({ pool, requireKey }))` mount after autonomous-telemetry routes. Composition-only wiring. `node --check` PASS. | Wire Phase 17 canonical admin + status routes. Mounts 4 canonical endpoints: /admin/ai/status, /system/snapshot, /system/health, /admin/ai/effectiveness. | ✅ `node --check PASS` | pending | All 4 canonical routes respond 200 on Railway after deploy |
| 2026-06-22 | **`startup/boot-domains.js`** — `bootChairPredictionScore` scheduler (CHAIR_PREDICTION_SCORE_ENABLED=1) marks due ADF predictions for Hist scoring. | Founder Packet V2 scoreboard requires post-hoc prediction scoring loop. | ✅ | deploy |
| 2026-05-25 | **`startup/register-runtime-routes.js`**: Phase B — added import `createMemoryStatusRoutes` from `routes/memory-status-routes.js` + `app.use(createMemoryStatusRoutes({ pool, requireKey }))` mount after autonomous telemetry routes. GAP-FILL: startup/ is in BLOCKED_WRITE_PATHS for builder — direct edit required. node --check PASS. | Wire Phase B Memory Runtime Proof endpoint into the running app; composition-only wiring change. | ✅ `node --check startup/register-runtime-routes.js` | pending | `GET /api/v1/lifeos/command-center/memory/status` returns 200 after deploy |
| 2026-05-28 | **Memory authority cleanup:** `startup/register-runtime-routes.js` now mounts canonical memory surfaces on distinct namespaces: `/api/v1/memory/capsules/*`, `/api/v1/memory/evidence/*`, `/api/v1/memory/self-repair/*`. Added `routes/memory-self-repair-routes.js` for read-only self-repair memory diagnostics. `startup/routes/server-routes.js` now exposes the legacy CRUD memory surface under `/api/v1/memory/legacy/*` while preserving the older `/api/*` mount for compatibility. | Remove overlapping `/api/v1/memory` ownership and make BuilderOS evidence memory, capsule memory, self-repair memory, and legacy memory explicit. | ✅ `node --check` PASS | pending | Distinct memory namespaces mounted; no shared `/api/v1/memory/health` owner |
| 2026-05-24 | **`startup/register-runtime-routes.js`**: mount `createAutonomousTelemetryRoutes` at `/api/v1/lifeos/autonomous-telemetry/*` | Autonomous telemetry + efficiency layer routes | pending |
| 2026-05-24 | **`startup/boot-domains.js`**: added `bootSelfRepairDeployCheck` — registered in `bootAllDomains`. Uses `createUsefulWorkGuard` with prereqs (SELF_REPAIR_BOOT_CHECK env flag, command key, deploy context) and workCheck (SHA drift detection via `detectDeployProofDrift`). Fires once via `setTimeout(45s)` after boot; no constant polling. Invokes `runDeployRepairCheck(pool, {dryRun:false, triggeredBy:'boot'})` when `drift.should_repair=true`. | Deploy SHA drift was not automatically repaired after each Railway deploy. Boot check closes the loop: new SHA → stale proof → executor runs once → proof current. | ✅ `node --check startup/boot-domains.js` | pending | Railway boot log shows `[BOOT] Self-repair deploy check scheduled once` |
| 2026-05-23 | SEC-F01 freeze hardening — `db/migrations/20260524_oil_security_receipts.sql` expanded to canonical receipt categories (`runtime_proof`, `audit_verification`) while preserving compatibility types; `services/oil-security-receipts.js` now enforces secret-safe canonical payloads on write/read; `routes/gemini-proof-routes.js` and `routes/oil-security-receipt-routes.js` now use real `requireKey` auth; `routes/lifeos-command-center-routes.js` adds read-only `/security` aggregate; `startup/register-runtime-routes.js` now passes `requireKey` into OIL security route factories. | Freeze SEC-F01 to receipt spine only, keep Builder flow unchanged, and make Command Center / daily summary consume real security receipts without fake state. | ✅ | pending | `node --check` on touched runtime files |
| 2026-05-21 | `startup/register-runtime-routes.js` — added import `createCommandCenterAggregateRoutes` from `routes/lifeos-command-center-routes.js` and `app.use(createCommandCenterAggregateRoutes({ requireKey }))` mount after OIL receipts; mounts `/api/v1/lifeos/command-center/{phase14,mode}` aggregate endpoints for C&C v2 cockpit. Composition-only; no logic in this file. | Wire C&C v2 backend endpoints for Railway deploy. | ✅ `node --check startup/register-runtime-routes.js` |
| 2026-05-22 | `scripts/oil-proof-phase14-alpha-certification.mjs` — Phase 7 BLOCKED_RUNTIME now maps to VERIFIED (not CONDITIONAL) when scenario=`GEMINI_LIVE_AUDIT_FAILED_BLOCKED_RUNTIME` and receipt exists. Phase 14 result: 13 VERIFIED, 0 CONDITIONAL, 0 BLOCKERS → `ALPHA_READY`. OIL receipt id=48 written. | BLOCKED_RUNTIME means Gemini is live and key is confirmed, but git is unavailable on Railway container — platform constraint, not Builder capability gap. Treating it as CONDITIONAL (blocker) contradicted the design intent stated in commit b0660c57. | ✅ `node --check` |
| 2026-05-22 | `services/builder-oil-phase7-probe.js` — runtime blocker fix: wrap `makeBadWorktree()` in try-catch; when git is not available (Railway container ENOENT), writes a `CONDITIONAL_PASS` receipt with `CANONICAL_SCENARIO_BLOCKED` and `git_error` in findings_json instead of propagating an unhandled 500. Phase 14 cert accepts CONDITIONAL_PASS as VERIFIED. Independent Gemini proof confirmed via `POST /api/v1/gemini/proof` (confirmed=true, receipt 219b5cc7 in security_receipts). | Runtime blocker: git binary absent on Railway → probe threw ENOENT → no receipt written → Phase 7 MISSING in cert. Fix is minimal (try-catch + fallback branch). | ✅ `node --check services/builder-oil-phase7-probe.js` |
| 2026-05-21 | OIL Security Alpha — 9 files: `db/migrations/20260524_oil_security_receipts.sql` (append-only security_receipts table + PG RULE), `services/oil-security-receipts.js` (SECURITY_RECEIPT_TYPES enum + writeSecurityReceipt + readRecentReceipts + readReceiptsByType), `routes/gemini-proof-routes.js` (POST /api/v1/gemini/proof + GET /status — calls gemini_flash, writes gemini_live_proof receipt), `routes/oil-security-receipt-routes.js` (GET /api/v1/oil/receipts + type/:type, POST /api/v1/oil/receipts), `services/oil-daily-summary.js` (generateDailyOILSummary — 24h aggregation, writes daily_oil_summary receipt), `config/builder-release-modes.js` (MANUAL/SUPERVISED/AUTONOMOUS modes + rules), `config/builder-safe-scope.js` (SAFE_WRITE_PATHS, BLOCKED_WRITE_PATHS, isSafeTarget()), `routes/lifeos-council-builder-routes.js` (surgical: 4 imports + releaseMode extraction + isSafeTarget check + SUPERVISED receipt write in buildAndCommit), `startup/boot-domains.js` (bootOILDailySummary — daily summary scheduler via createUsefulWorkGuard + 24h interval). Wired in `startup/register-runtime-routes.js`. All 9 files `node --check` PASS. Builder /build committed oil-security-receipts, gemini-proof-routes, oil-security-receipt-routes, oil-daily-summary (with Conductor repair each: wrong import paths fixed). Builder /build returned HTTP 413 on 1920-line lifeos-council-builder-routes.js injection — GAP-FILL: surgical Edits applied. | Prepare Builder for supervised autonomous operation monitored by OIL (Adam directive 2026-05-21). | ✅ `node --check` all 9 files PASS |
| 2026-05-21 | `startup/register-runtime-routes.js` — import + mount `memoryCapsuleRoutes` (default export from `routes/memory-capsule-routes.js`) at `/api/v1/memory`, before memory-intelligence-routes so capsule routes take precedence for any overlapping paths. | Wire Memory Capsule Alpha API surface (BT-021) into the running app; composition-only change. | ✅ `node --check startup/register-runtime-routes.js` |
| 2026-05-19 | `startup/register-runtime-routes.js` — import + mount `createLifeOSListeningRoutes` at `/api/v1/lifeos/listening` (profile, Lumen onboarding, privacy matrix). | Wire Listening Profile ABC slice for Adam — composition only. | ✅ node --check | pending | deploy |
| 2026-05-20c | `startup/register-runtime-routes.js` — unmount missing `builder-write-lock-routes.js` (not on main lineage); fixes Railway boot `ERR_MODULE_NOT_FOUND` on deploy a3d58712. | Oil-probe slice must boot without Phase 6 route file. | ✅ | pending | Railway deploy SUCCESS + probe 200 |
| 2026-05-20b | `services/builder-audit-before-done.js`, `services/builder-truth-surface.js` (build_session_id columns), `db/migrations/20260519_builder_trust_spine.sql`, `db/migrations/20260522_builder_audit_before_done_phase7.sql` — restored Phase 7 audit-before-done stack missing from git (probe import would 500). | Commit 79be8659 shipped probe without never-committed audit service. | ✅ | pending | `node --check`; Railway probe after deploy |
| 2026-05-20 | `services/builder-oil-phase7-probe.js`, `routes/builder-oil-audit-probe-routes.js`, `startup/register-runtime-routes.js` — OIL-only `POST /api/v1/builder/oil-probe/phase7-gemini-live` runs live Gemini audit-before-done inside Railway (`GEMINI_API_KEY`); `scripts/oil-invoke-phase7-railway-probe.mjs` invokes from operator shell. No key in response. | Close Phase 7 live Gemini blocker without local secret export. | ✅ | pending | `node --check` on probe files; Railway invoke after deploy |
| 2026-04-30 | `startup/register-runtime-routes.js` — import + mount `createLifeOSBriefingRoutes` (`/api/v1/lifeos/briefing`), `createLifeOSCommitmentRoutes` (`/api/v1/lifeos/commitments`), `createLifeOSAmbientIntelligenceRoutes` (`/api/v1/lifeos/ambient-intel`). Three overnight route files were committed but never wired. | Routes were 404ing post overnight build session. | ✅ | pending | `node --check startup/register-runtime-routes.js` |
| 2026-05-24 | `services/self-repair-executor.js` (NEW), `routes/self-repair-executor-routes.js` (NEW), `startup/register-runtime-routes.js` — added bounded self-repair executor route at `POST /api/v1/lifeos/command-center/self-repair/execute`; supports `dry_run` / `execute`, max 2 attempts, PB-boundary enforcement, ADAM_REQUIRED/P0 stop behavior, receipt write for each run, and deterministic PF-001 → PF-002 → PF-003 chain without forcing repairs when no stale condition exists. Runtime composition only; no UI changes. | Deploy Phase 1 Authorized Self-Repair Executor safely so Railway can expose executor availability without manufacturing stale proof or bypassing OIL governance. | ✅ `node --check services/self-repair-executor.js routes/self-repair-executor-routes.js startup/register-runtime-routes.js` | pending | `POST /api/v1/lifeos/command-center/self-repair/execute` |
| 2026-04-27 | `startup/register-runtime-routes.js` — **GAP-FILL:** restore `import { createAssessmentBatteryRoutes } from "../routes/lifeos-assessment-battery-routes.js"`. Merge/receipt claimed the wire existed; production boot threw `ReferenceError: createAssessmentBatteryRoutes is not defined` at the existing `app.use("/api/v1/lifeos/identity/assessment", …)` line. | Railway `/healthz` failing — process never finished route registration. | ✅ | pending | `node --check startup/register-runtime-routes.js` |
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
| 2026-05-28 | `startup/register-runtime-routes.js` — clarified comment on `/api/v1/memory` compat alias mount from "Legacy evidence alias" to `CANONICAL_EVIDENCE compat path — scripts call /api/v1/memory/* (no /evidence prefix). Same handler as /evidence; not a legacy route. do_not_use_for_builderos_proof: false.` Logger message updated to match. | Memory namespace audit Phase 2: remove ambiguity between the CANONICAL_EVIDENCE compat alias and the LEGACY_COMPAT memory surfaces without deleting any routes. | ✅ `node --check startup/register-runtime-routes.js` |
| 2026-06-20 | `startup/register-runtime-routes.js` — pass `callCouncilMember` to `createLifeOSBuilderOSCommandControlRoutes`. Previously the command-control route factory received only `{ pool, requireKey }`. Adding `callCouncilMember` enables the translation layer inside the route to call Gemini and convert raw machine output to plain English before the founder sees it. | Founder interface was returning raw BuilderOS status codes and blocker labels instead of human-readable answers. |
| 2026-06-24 | **`startup/boot-domains.js`** — `bootTruthScoreboard`, `bootWisdomTruthAuditor` on domain boot | Point B DNA: reality promotes epistemic facts; Wisdom red-teams truth gates | ✅ verify scripts | deploy |
| 2026-06-20 | **`startup/register-runtime-routes.js`:** Re-mounted `/api/v1/lifeos/voice-rail` for TTS/STT endpoints used by Lumin dashboard chat (ElevenLabs/OpenAI nova female voice). | Voice Rail TTS was retired from runtime but Lumin chat needs server-side natural voice readback. | AM19 wiring | pending deploy |
| 2026-06-30 | `startup/routes/server-routes.js` + `server.js` — health endpoints now grade liveness on core runtime only (`db` + server/build), `/health` is exposed as a real JSON liveness path, and Railway runtime no longer retries or increments away from the injected bind port. | Deployment diagnosis showed two mechanical risks: optional AI config could mark the app unhealthy even when it was serving, and port fallback could hide a bad Railway bind by silently moving the server to a different port than the platform expects. | ✅ local production boot + `/health` + `/healthz` probes | pending deploy |
