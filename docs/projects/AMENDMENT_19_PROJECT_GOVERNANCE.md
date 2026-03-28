# AMENDMENT 19 — Project Governance

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-03-27 (governance spec upgrade) |
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
3. Verifier runs assertions
4. Coupling/staleness scripts enforce discipline in CI
5. Readiness gates determine when a project is mature enough to enter the builder queue
6. Builder supervisor only executes projects that are both `build_ready` and safe enough to automate

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
| 2026-03-27 | Added governance schema, routes, manifests, verifier, coupling/staleness scripts, and CI workflow | Make SSOT discipline executable instead of aspirational | ✅ | ✅ | pending |
| 2026-03-27 | Seeded projects/segments into the real DB and verified live governance endpoints | Make the governance lane operational instead of API-only | ✅ | ✅ | ✅ |
| 2026-03-27 | Added readiness-gate routes, readiness queue, checklist doc, and builder supervisor route composition | Make pre-build maturity explicit and give governed projects a safe automation entry point | ✅ | pending | pending |
| 2026-03-27 | Adam decision profile learning loop in pending-adam resolve route | Capture actual choices vs predicted; track accuracy over time in adam_prediction_accuracy view | ✅ | pending | pending |
| 2026-03-27 | Governance spec upgrade: segment spec fields (review_tier, allowed_files, exact_outcome, required_checks, rollback_note), market_sensitive on projects, build_outcomes table, manifest schema segments array, build_ready/council_persona/segment_schema_version fields | Make builder execution contracts machine-enforceable: no segment built without exact_outcome + allowed_files; file boundary enforcement; post-build verification gate; 4-tier review routing | ✅ | ✅ | pending |
| 2026-03-27 | Corrected domain boot guards to use actual TC env/vault readiness and passed managed-env control into TC route composition | Keep startup truth aligned with real credential sources and allow governed access bootstrap from the TC lane | ✅ | ✅ | pending |
