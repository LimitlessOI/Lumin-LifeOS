# AMENDMENT 18 — SSOT Project Governance System

> **Y-STATEMENT:** In the context of a multi-project AI platform with 15+ active amendments,
> facing the risk of AI drift, hallucination, and estimation blind spots that erode trust,
> we decided to build a three-layer SSOT governance system (Amendment MD + Manifest JSON + DB live state)
> to achieve failproof, repeatable AI-assisted development with measurable estimation accuracy,
> accepting that every project change now requires a corresponding amendment update.

| Field | Value |
|---|---|
| **Lifecycle** | `production` |
| **Reversibility** | `one-way-door` — all projects depend on this layer |
| **Stability** | `safe` |
| **Last Updated** | 2026-03-27 |
| **Verification Command** | `node scripts/verify-project.mjs --project project_governance` |
| **Manifest** | `docs/projects/AMENDMENT_18_PROJECT_GOVERNANCE.manifest.json` |

---

## Mission
Make AI drift structurally impossible. Every amendment is machine-readable, every assertion is executable, every estimate is tracked. The system gets smarter about estimation and the AI gets contextually anchored — no hallucination, no "the system works on it".

## North Star Anchor
Autonomy Amplifier + Maximum Leverage — governance multiplies the value of every other project by making AI work trustworthy and repeatable. Adam's role becomes conductor, not firefighter.

---

## Scope / Non-Scope

**In scope:**
- Amendment .md files (human brain — full spec + decisions)
- .manifest.json files (machine brain — assertions + completion checks)
- DB live state (scoreboard — actual progress + estimation history)
- verify-project.mjs — runs all assertions, writes pass/fail to DB
- ssot-staleness-check.mjs — code newer than amendment = violation
- check-coupling.mjs — code change without amendment change = violation
- pre-commit hook — syntax + coupling check
- GitHub Actions CI — ssot-compliance.yml
- Seed script — populates DB from amendment build plans
- C&C Projects Dashboard + Pending Adam panels

**Out of scope:**
- The content of individual feature amendments (that's each project)
- Runtime routing logic (→ AMENDMENT_01)
- UI rendering of project data (→ AMENDMENT_12)

---

## Owned Files
```
routes/project-governance-routes.js
scripts/verify-project.mjs
scripts/ssot-staleness-check.mjs
scripts/check-coupling.mjs
scripts/seed-projects.mjs
db/migrations/20260327_project_governance.sql
docs/projects/manifest.schema.json
docs/projects/AMENDMENT_TEMPLATE.md
docs/projects/*.manifest.json   (all manifests)
policy/ssot-coupling.rego
.github/workflows/ssot-compliance.yml
.github/CODEOWNERS
.git/hooks/pre-commit
```

## Protected Files (read-only for this project)
```
server.js
startup/register-runtime-routes.js  — mount governance router here, not server.js
CLAUDE.md                            — trigger table lives here
```

---

## Design Spec

### Three-Layer Architecture
```
Layer 1: Amendment .md     — human-readable spec, decisions, build plan
Layer 2: .manifest.json    — machine-readable assertions, required files/routes/tables
Layer 3: DB live state     — actual progress, estimation history, verification results
```

### DB Tables
| Table | Purpose |
|---|---|
| `projects` | One row per active project — lifecycle, status, focus, accuracy |
| `project_segments` | Build plan steps with estimate + actual hours |
| `estimation_log` | Per-segment accuracy history for self-calibration |
| `pending_adam` | Items blocked on Adam — type, priority, project link |

### API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/projects` | requireKey | All projects with hover summary |
| GET | `/api/v1/projects/:id` | requireKey | Full detail + segments + pending |
| GET | `/api/v1/projects/:id/segments` | requireKey | Build plan checklist |
| POST | `/api/v1/projects/:id/segments/:sid` | requireKey | Update segment, triggers estimation log |
| POST | `/api/v1/projects/:id/verify` | requireKey | Run verify-project.mjs |
| GET | `/api/v1/pending-adam` | requireKey | Open items blocked on Adam |
| POST | `/api/v1/pending-adam` | requireKey | Create pending item |
| POST | `/api/v1/pending-adam/:id/resolve` | requireKey | Mark resolved |
| GET | `/api/v1/estimation/accuracy` | requireKey | Overall + by-project + trend |

### Estimation Accuracy Formula
```
accuracy_pct = max(0, min(100, (1 - abs(actual - estimated) / estimated) * 100))
over_under   = 'exact' if abs(delta) < 0.05 else 'over' if actual > est else 'under'
```
Running average stored in `projects.estimation_accuracy` — updated on every segment completion.

---

## Build Plan

- [x] **DB schema (projects, segments, estimation_log, pending_adam)** *(est: 3h | actual: 3h)* `[safe]`
- [x] **verify-project.mjs — runs all manifest assertions** *(est: 4h | actual: 4h)* `[needs-review]`
- [x] **ssot-staleness-check.mjs** *(est: 2h | actual: 2h)* `[safe]`
- [x] **check-coupling.mjs** *(est: 2h | actual: 2h)* `[safe]`
- [x] **pre-commit hook** *(est: 1h | actual: 1h)* `[safe]`
- [x] **GitHub Actions ssot-compliance.yml** *(est: 2h | actual: 2h)* `[safe]`
- [x] **project-governance-routes.js API** *(est: 6h | actual: 7h)* `[needs-review]`
- [x] **AMENDMENT_TEMPLATE.md — gold standard** *(est: 1h | actual: 1h)* `[safe]`
- [x] **manifest.schema.json — JSON Schema draft-07** *(est: 1h | actual: 1h)* `[safe]`
- [x] **AMENDMENT_01, 12, 17 upgraded to full template** *(est: 3h | actual: 4h)* `[safe]`
- [x] **C&C Projects Dashboard + Pending Adam panels** *(est: 6h | actual: 5h)* `[needs-review]`
- [x] **Seed projects + segments into DB** *(est: 1h | actual: 1h)* `[safe]`
- [x] **AMENDMENT_18 created for governance system itself** *(est: 1h | actual: 1h)* `[safe]`
- [ ] **→ NEXT: Upgrade remaining amendments to full template** *(est: 4h)* `[safe]`
- [ ] **Wire estimation accuracy to C&C accuracy panel** *(est: 2h)* `[safe]`

**Progress:** 13/15 steps complete | Est. remaining: ~6h

---

## Anti-Drift Assertions
```bash
# Governance routes syntax-clean
node --check routes/project-governance-routes.js

# Verifier runs without error
node scripts/verify-project.mjs --project project_governance --quiet || echo "FAIL"

# DB has projects seeded
psql $DATABASE_URL -c "SELECT COUNT(*) FROM projects" | grep -q "[1-9]"

# Pending Adam route works
curl -s $RAILWAY_URL/api/v1/pending-adam -H "x-command-key: $COMMAND_CENTER_KEY" | grep -q '"ok":true'

# Router mounted once at /api/v1 (not 3× at sub-paths)
grep "api/v1/projects\|api/v1/pending-adam\|api/v1/estimation" startup/register-runtime-routes.js | grep -c "createProjectGovernance"
# Should be 1 (not 3)
```

*Automated: `node scripts/verify-project.mjs --project project_governance`*

---

## Decision Log

### Decision: Three-layer SSOT (MD + Manifest + DB) — 2026-03-27
> **Y-Statement:** In the context of AI sessions that lose context and hallucinate project state,
> facing the need for anti-drift that works even with a fresh AI context,
> we decided to require three synchronized layers — human amendment + machine manifest + live DB —
> to achieve structural impossibility of AI drift, accepting that every change requires 3 updates.

**Alternatives rejected:**
- *Single amendment file only* — not machine-readable; AI can still hallucinate progress
- *DB only* — no human-readable spec; losing the decision log context
- *OPA/conftest* — too heavy a dependency; reimplemented as check-coupling.mjs

**Reversibility:** `one-way-door` — all projects depend on this

### Decision: Router mounted once at /api/v1 — 2026-03-27
> **Y-Statement:** In the context of needing /projects, /pending-adam, /estimation all served
> from one Express Router, facing route conflicts when mounting the same router 3×,
> we decided to use full sub-paths in the router (router.get('/projects'), etc.) and mount
> once at /api/v1 to achieve correct routing without conflicts.

**Reversibility:** `two-way-door`

### Decision: Seed script deletes + reinserts segments — 2026-03-27
> Simpler than ON CONFLICT with no unique constraint on segments.
> project_segments has no unique (project_id, title) constraint — delete+reinsert is idempotent.

---

## Why Not Other Approaches
| Approach | Why We Didn't Use It |
|---|---|
| OPA/conftest binary | External binary dependency on Railway; reimplemented in pure Node.js |
| LangChain memory for project state | Adds AI overhead and token cost; DB is the right store for structured state |
| Single amendment file per project | Not enough — needs machine assertions (manifest) and live scoreboard (DB) |
| Spreadsheet for estimation tracking | Disconnected from code; can't auto-update when segments complete |

---

## Test Criteria
- [ ] `GET /api/v1/projects` returns 4+ projects with pct_complete, next_task, pending_count
- [ ] `GET /api/v1/projects/ai_council` returns segments list with 12 done / 3 pending
- [ ] `POST /api/v1/projects/ai_council/segments/:id` with status=done triggers estimation_log entry
- [ ] `GET /api/v1/estimation/accuracy` shows overall_accuracy_pct and byProject array
- [ ] `GET /api/v1/pending-adam` returns open items sorted by priority
- [ ] `POST /api/v1/pending-adam/:id/resolve` marks item resolved and removes from open list
- [ ] C&C Projects Dashboard renders all 4 project cards with progress bars
- [ ] Clicking a project card opens the drawer with build plan segments

---

## Handoff (Fresh AI Context)
**Current blocker:** None — governance system is live and seeded

**Last decision:** Router restructured — single mount at /api/v1 with full sub-paths

**Do NOT change:**
- `router.get('/projects')` pattern — must keep full path prefix or routing breaks
- `seed-projects.mjs` delete-before-insert strategy — no unique constraint on (project_id, title)
- Three-layer requirement — amendment + manifest + DB must stay in sync

**Read first:** `routes/project-governance-routes.js`, `scripts/verify-project.mjs`, `db/migrations/20260327_project_governance.sql`

**Known traps:**
- The governance router is mounted at `/api/v1` (not `/api/v1/projects`) — see register-runtime-routes.js line 95
- estimation_log ON CONFLICT won't work without a unique constraint — use INSERT ... WHERE NOT EXISTS or delete-first
- pending_adam.is_resolved column name — not `resolved` — check query conditions

---

## Runbook (Operations)

| Symptom | Likely Cause | Fix |
|---|---|---|
| `/api/v1/projects` returns 404 | Router mounted incorrectly | Check register-runtime-routes.js — must be `app.use('/api/v1', createProjectGovernanceRoutes(...))` |
| Projects grid shows 0 projects | DB not seeded | Run `node scripts/seed-projects.mjs` |
| Estimation accuracy = null | No done segments with actual_hours | Complete a segment via `POST /api/v1/projects/:id/segments/:sid` with status=done + actual_hours |
| Pending Adam badge not showing | pending_adam table empty | Add items via `POST /api/v1/pending-adam` or resolve existing ones |

---

## Decision Debt
- [ ] **Remaining amendments (02-11, 13-16) not yet upgraded to full template** — deferred; do highest-traffic ones first
- [ ] **No unique constraint on project_segments (project_id, title)** — seed script compensates with delete-first; should add constraint in next migration
- [ ] **verify-project.mjs requires DB to write pass/fail results** — needs DATABASE_URL at test time

---

## Change Receipts

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-03-27 | Full governance system built: schema, verifier, CI, API, C&C panels, seed | SSOT anti-drift infrastructure | ✅ | ✅ | pending |
