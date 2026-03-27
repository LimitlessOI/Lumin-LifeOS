# AMENDMENT 19 — Project Governance

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-03-27 |
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
docs/projects/manifest.schema.json
docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.manifest.json
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

### Control surfaces
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `GET /api/v1/projects/:id/segments`
- `POST /api/v1/projects/:id/segments/:sid`
- `POST /api/v1/projects/:id/verify`
- `GET /api/v1/pending-adam`
- `POST /api/v1/pending-adam`
- `POST /api/v1/pending-adam/:id/resolve`
- `GET /api/v1/estimation/accuracy`

### Verification loop
1. Amendment explains intent
2. Manifest encodes machine-checkable truth
3. Verifier runs assertions
4. Coupling/staleness scripts enforce discipline in CI

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
- [ ] **→ NEXT: wire estimation accuracy and governance drill-down into the Command Center overlay** *(est: 3h)* `[needs-review]`

**Progress:** 10/11 steps complete | Est. remaining: ~3h

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
- `projects`, `project_segments`, `estimation_log`, and `pending_adam` tables exist after migration

---

## Context Handoff
- Current blocker: governance data is now seeded and live endpoints verify, but the Command Center still needs a first-class governance panel for estimation accuracy and deeper drill-downs.
- Last decision: mount governance routes once at `/api/v1` so route paths stay canonical and do not double-prefix.
- Do not move project governance back into `server.js`; keep runtime composition in startup modules.
- Read first:
  - `routes/project-governance-routes.js`
  - `scripts/verify-project.mjs`
  - `docs/projects/manifest.schema.json`

---

## Test Criteria
- Governance routes return JSON instead of 404
- Verifier reads manifests and runs assertions without syntax errors
- CI workflow can validate manifests and run coupling/staleness checks
- Route mount does not double-prefix project-governance endpoints

---

## Change Receipts

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-03-27 | Added governance schema, routes, manifests, verifier, coupling/staleness scripts, and CI workflow | Make SSOT discipline executable instead of aspirational | ✅ | ✅ | pending |
| 2026-03-27 | Seeded projects/segments into the real DB and verified live governance endpoints | Make the governance lane operational instead of API-only | ✅ | ✅ | ✅ |
