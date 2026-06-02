# BPB-0001 — Mission Runtime v1 + Shared Adam/Sherry Mission Board

**Type:** Blueprint Builder Document  
**BPB ID:** BPB-0001  
**Mission:** MISSION-0001 — Adam + Sherry Household Reliability and Income Engine  
**State:** Approved (founder-directed, 2026-06-01)  
**Authority Class:** Founder Required  
**Constitutional Authority:** `docs/SSOT_NORTH_STAR.md` §2.0D (Mission State Machine Law), §2.0E (BPB Determinism Law)  
**SSOT Amendment:** `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` ← to be created as part of Phase 1 build  
**Owner:** Adam Hopkins  
**Participants:** Adam, Sherry  
**Created:** 2026-06-01  

---

## Determinism Guarantee

> Per §2.0E: A blueprint is sufficient only when multiple competent builders can independently implement it and arrive at materially equivalent systems. If materially different outputs result, the blueprint fails — not the builders.

This document prescribes: exact table names, column names, types, constraints, route paths, response shapes, state machine transitions, and UI sections. Items marked **[PRESCRIBED]** must be identical across all implementations. Items marked **[BUILDER DISCRETION]** are style or internal naming choices.

---

## What This Is Not

This BPB does not include and builders must not add:

- Adam Simulator / Founder Intent Model scoring
- Sherry login, auth, or separate account (API key only for now)
- AI-driven conflict mediation or communication coaching
- Automatic email drafting, sending, or autonomous task execution
- Phone call automation
- Historian prediction pipeline
- Model benchmarking registry
- Trust escalation scoring
- Full relationship pattern analysis
- Integration with external calendars, email, or finance systems
- Multi-tenant / multi-household isolation
- Advanced capacity scoring algorithms

These are Phase 5+ features. If a builder is tempted to add any of these, they must stop.

---

## Phase Coverage

| Phase | Name | Included in this BPB |
|---|---|---|
| Phase 1 | Mission Runtime Foundation | ✅ Full |
| Phase 2 | Shared Mission Board | ✅ Full (read-only board, no real-time push) |
| Phase 3 | Capacity + Opportunity Cost | ✅ Schema + fields only — no scoring engine |
| Phase 4 | Commitment Capture | ✅ Full |
| Phase 5 | Busywork Automation | ❌ Out of scope |
| Phase 6 | Household Historian | ❌ Out of scope (lesson FK only) |
| Phase 7 | Communication Coach | ❌ Out of scope |
| Phase 8 | Sherry Feedback Loop | ❌ Out of scope |

---

## Files Required **[PRESCRIBED]**

| File | Type | Notes |
|---|---|---|
| `db/migrations/20260604_mission_runtime_v1.sql` | Migration | All tables in one file, IF NOT EXISTS |
| `services/mission-ledger.js` | Service | All DB logic, no Express |
| `routes/mission-routes.js` | Routes | Mounts at `/api/v1/lifeos` |
| `public/overlay/lifeos-household.html` | UI | Standalone HTML, no build step |
| `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` | SSOT | Register domain, receipts |

**Wiring required (existing files, surgical edits only):**
- `startup/register-runtime-routes.js` — add `import + registerMissionRoutes(app, pool)` call
- `routes/public-routes.js` — add `GET /lifeos-household` serving `lifeos-household.html`

---

## Section 1: DB Schema **[PRESCRIBED — exact names and types required]**

### 1.1 `missions`

```sql
CREATE TABLE IF NOT EXISTS missions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             TEXT        UNIQUE NOT NULL,
    title            TEXT        NOT NULL,
    purpose          TEXT,
    state            TEXT        NOT NULL DEFAULT 'Proposed',
    authority_class  TEXT        NOT NULL DEFAULT 'Supervised',
    owner            TEXT        NOT NULL DEFAULT 'adam',
    blueprint_ref    TEXT,
    metadata_json    JSONB       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Constraints: `state` must be one of the 12 valid states (enforced in service, not DB CHECK to allow future extension).  
`authority_class` values: `Autonomous`, `Supervised`, `Founder Required`, `Pre-Authorized`, `Mission-Critical`.  
`owner` values: `adam`, `sherry`, `system`.

### 1.2 `mission_participants`

```sql
CREATE TABLE IF NOT EXISTS mission_participants (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id    UUID        NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    participant   TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'contributor',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(mission_id, participant)
);
```

`participant` values: `adam`, `sherry`, `system`.  
`role` values: `owner`, `contributor`, `approver`, `observer`.

### 1.3 `mission_state_transitions`

```sql
CREATE TABLE IF NOT EXISTS mission_state_transitions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id       UUID        NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    from_state       TEXT        NOT NULL,
    to_state         TEXT        NOT NULL,
    transitioned_by  TEXT        NOT NULL,
    note             TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

This is the mission ledger. Every state change is a new row. The current state is `missions.state` (denormalized for fast reads). History is `mission_state_transitions`.

### 1.4 `commitments`

```sql
CREATE TABLE IF NOT EXISTS commitments (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id            UUID        REFERENCES missions(id) ON DELETE SET NULL,
    owner                 TEXT        NOT NULL,
    text                  TEXT        NOT NULL,
    due_date              DATE,
    reminder_at           TIMESTAMPTZ,
    risk_if_missed        TEXT,
    status                TEXT        NOT NULL DEFAULT 'open',
    time_estimate_hours   NUMERIC(5,2),
    urgency               SMALLINT    CHECK (urgency BETWEEN 1 AND 5),
    importance            SMALLINT    CHECK (importance BETWEEN 1 AND 5),
    energy_cost           SMALLINT    CHECK (energy_cost BETWEEN 1 AND 5),
    money_impact          SMALLINT    CHECK (money_impact BETWEEN 1 AND 5),
    relationship_impact   SMALLINT    CHECK (relationship_impact BETWEEN 1 AND 5),
    opportunity_cost_note TEXT,
    better_owner          TEXT,
    approval_required     BOOLEAN     NOT NULL DEFAULT FALSE,
    approved_by           TEXT,
    approved_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`owner` values: `adam`, `sherry`, `system`.  
`status` values: `open`, `done`, `missed`, `declined`, `delegated`.  
`better_owner` values: `adam`, `sherry`, `system`, `delegate`, `decline` (nullable).

### 1.5 Backfill — add `mission_id` to existing tables

```sql
ALTER TABLE builderos_command_control_jobs
    ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

ALTER TABLE historian_lessons
    ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;
```

If `historian_lessons` does not exist, skip the second ALTER. **[BUILDER NOTE: verify table exists before adding FK.]**

### 1.6 Seed MISSION-0001

```sql
INSERT INTO missions (slug, title, purpose, state, authority_class, owner, blueprint_ref)
VALUES (
    'MISSION-0001',
    'Adam + Sherry Household Reliability and Income Engine',
    'Build the first usable LifeOS mission that helps Adam and Sherry manage shared life, commitments, capacity, conflict, money opportunities, and task delegation.',
    'Approved',
    'Founder Required',
    'adam',
    'docs/projects/BPB-0001-MISSION-RUNTIME-V1.md'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO mission_participants (mission_id, participant, role)
SELECT id, 'adam', 'owner' FROM missions WHERE slug = 'MISSION-0001'
ON CONFLICT (mission_id, participant) DO NOTHING;

INSERT INTO mission_participants (mission_id, participant, role)
SELECT id, 'sherry', 'contributor' FROM missions WHERE slug = 'MISSION-0001'
ON CONFLICT (mission_id, participant) DO NOTHING;
```

---

## Section 2: State Machine **[PRESCRIBED — exact transitions required]**

### Valid states (12)

```
Proposed
Clarified
Council Review
Approved
BPB Blueprinting
OIL Review
Build Approved
Building
Verification
Deployed
Outcome Measured
Lessons Captured
```

### Valid transitions **[PRESCRIBED — reject all others with 400]**

```
Proposed          → Clarified
Proposed          → Approved
Proposed          → Council Review
Clarified         → Council Review
Clarified         → Approved
Council Review    → Approved
Council Review    → Clarified
Approved          → BPB Blueprinting
Approved          → Building
BPB Blueprinting  → OIL Review
BPB Blueprinting  → Approved
OIL Review        → Build Approved
OIL Review        → BPB Blueprinting
Build Approved    → Building
Building          → Verification
Building          → Approved
Verification      → Deployed
Verification      → Building
Deployed          → Outcome Measured
Outcome Measured  → Lessons Captured
Outcome Measured  → Approved
Lessons Captured  → Proposed
```

Any transition not in this table → `400 { ok: false, error: "invalid_transition", from: "...", to: "...", valid_next: [...] }`.

The `valid_next` array must list every valid `to_state` from the current `from_state`.

### State machine constant **[PRESCRIBED — exact structure]**

```js
export const MISSION_STATE_TRANSITIONS = Object.freeze({
  'Proposed':          ['Clarified', 'Approved', 'Council Review'],
  'Clarified':         ['Council Review', 'Approved'],
  'Council Review':    ['Approved', 'Clarified'],
  'Approved':          ['BPB Blueprinting', 'Building'],
  'BPB Blueprinting':  ['OIL Review', 'Approved'],
  'OIL Review':        ['Build Approved', 'BPB Blueprinting'],
  'Build Approved':    ['Building'],
  'Building':          ['Verification', 'Approved'],
  'Verification':      ['Deployed', 'Building'],
  'Deployed':          ['Outcome Measured'],
  'Outcome Measured':  ['Lessons Captured', 'Approved'],
  'Lessons Captured':  ['Proposed'],
});
```

---

## Section 3: API Routes **[PRESCRIBED — exact paths and methods required]**

All routes mount under `/api/v1/lifeos` and require `x-command-key` header (existing `requireKey` middleware).

### 3.1 Missions CRUD

| Method | Path | Body / Query | Response |
|---|---|---|---|
| POST | `/api/v1/lifeos/missions` | `{ slug, title, purpose?, authority_class?, owner?, blueprint_ref?, participants?: [{ participant, role }] }` | `{ ok: true, mission: MissionRow }` |
| GET | `/api/v1/lifeos/missions` | query: `state?`, `owner?`, `limit?` (default 50) | `{ ok: true, missions: MissionRow[] }` |
| GET | `/api/v1/lifeos/missions/:id` | — | `{ ok: true, mission: MissionRow, participants: ParticipantRow[], transitions: TransitionRow[], commitments: CommitmentRow[] }` |
| PUT | `/api/v1/lifeos/missions/:id` | `{ title?, purpose?, authority_class?, blueprint_ref?, metadata_json? }` | `{ ok: true, mission: MissionRow }` |

### 3.2 Mission State Transitions

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/lifeos/missions/:id/transition` | `{ to_state, transitioned_by, note? }` | `{ ok: true, mission: MissionRow, transition: TransitionRow }` on success; `{ ok: false, error: "invalid_transition", from, to, valid_next }` on invalid |

On success: update `missions.state` and `missions.updated_at`, insert `mission_state_transitions` row, return updated mission.

### 3.3 Participants

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/lifeos/missions/:id/participants` | `{ participant, role? }` | `{ ok: true, participant: ParticipantRow }` |
| DELETE | `/api/v1/lifeos/missions/:id/participants/:participant` | — | `{ ok: true }` |

### 3.4 Commitments

| Method | Path | Body / Query | Response |
|---|---|---|---|
| POST | `/api/v1/lifeos/commitments` | `{ mission_id?, owner, text, due_date?, reminder_at?, risk_if_missed?, time_estimate_hours?, urgency?, importance?, energy_cost?, money_impact?, relationship_impact?, opportunity_cost_note?, better_owner?, approval_required? }` | `{ ok: true, commitment: CommitmentRow }` |
| GET | `/api/v1/lifeos/commitments` | query: `owner?`, `status?`, `mission_id?`, `limit?` (default 50) | `{ ok: true, commitments: CommitmentRow[] }` |
| PUT | `/api/v1/lifeos/commitments/:id` | any writable field subset | `{ ok: true, commitment: CommitmentRow }` |

### 3.5 Household Board

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/api/v1/lifeos/household/board` | `mission_id?` (defaults to MISSION-0001 slug lookup) | see Section 3.5a |

#### 3.5a Board response shape **[PRESCRIBED]**

```json
{
  "ok": true,
  "generated_at": "ISO-8601",
  "mission": {
    "id": "uuid",
    "slug": "MISSION-0001",
    "title": "...",
    "state": "Approved"
  },
  "today_commitments": [],
  "overdue_commitments": [],
  "adam_tasks": [],
  "sherry_tasks": [],
  "waiting_approval": [],
  "household_priorities": [],
  "income_priorities": [],
  "capacity_warnings": []
}
```

**Section derivation rules:**
- `today_commitments`: `status = 'open' AND due_date = CURRENT_DATE`
- `overdue_commitments`: `status = 'open' AND due_date < CURRENT_DATE`
- `adam_tasks`: `owner = 'adam' AND status = 'open'`
- `sherry_tasks`: `owner = 'sherry' AND status = 'open'`
- `waiting_approval`: `approval_required = TRUE AND status = 'open' AND approved_at IS NULL`
- `household_priorities`: `status = 'open' AND importance >= 4` (both owners, no dedup with above)
- `income_priorities`: `status = 'open' AND money_impact >= 4`
- `capacity_warnings`: empty array for Phase 1. **Do not compute.** Leave as `[]`.

Each commitment in a section includes all CommitmentRow fields.

---

## Section 4: `services/mission-ledger.js` — Required Exports **[PRESCRIBED — function signatures]**

```js
export async function createMission(pool, { slug, title, purpose, authority_class, owner, blueprint_ref, metadata_json, participants })
// Returns: mission row after INSERT. Inserts participants in same transaction.

export async function listMissions(pool, { state, owner, limit })
// Returns: mission rows array, ordered by updated_at DESC.

export async function getMission(pool, id)
// Returns: { mission, participants, transitions, commitments } or null.

export async function updateMission(pool, id, fields)
// Updates only provided fields. Returns updated mission row.

export async function transitionMissionState(pool, id, { to_state, transitioned_by, note })
// Validates transition. On success: updates missions.state + inserts transition row.
// On invalid: throws Error with { code: 'INVALID_TRANSITION', from, to, valid_next }.

export async function addParticipant(pool, mission_id, { participant, role })
// INSERT with ON CONFLICT DO NOTHING. Returns participant row.

export async function removeParticipant(pool, mission_id, participant)
// DELETE. Returns { deleted: true }.

export async function createCommitment(pool, fields)
// INSERT. Returns commitment row.

export async function listCommitments(pool, { owner, status, mission_id, limit })
// Returns commitment rows array, ordered by due_date ASC NULLS LAST, created_at DESC.

export async function updateCommitment(pool, id, fields)
// Updates only provided fields. Returns updated commitment row.

export async function getHouseholdBoard(pool, mission_id_or_slug)
// Looks up mission by id (UUID) or slug (text). Runs 8 queries. Returns board shape per §3.5a.

export const MISSION_STATE_TRANSITIONS
// The frozen object from §2.
```

**[BUILDER DISCRETION]:** Internal helper function names, query construction style, error message text beyond the `code` field.

---

## Section 5: `routes/mission-routes.js` — Required Structure **[PRESCRIBED]**

```js
/**
 * @ssot docs/projects/AMENDMENT_47_MISSION_RUNTIME.md
 * Mission Runtime v1 — missions, commitments, household board.
 */
import { Router } from 'express';
import { requireKey } from '../middleware/auth.js';   // existing middleware
import { /* all exports */ } from '../services/mission-ledger.js';

export function registerMissionRoutes(app, pool) {
  const router = Router();
  router.use(requireKey);
  // ... routes per Section 3
  app.use('/api/v1/lifeos', router);
}
```

**[BUILDER NOTE]:** `requireKey` import path may differ — find the existing middleware. Do not create a new auth middleware.

---

## Section 6: `public/overlay/lifeos-household.html` — Required UI Sections **[PRESCRIBED]**

This is a standalone HTML file. No build step, no framework, no external CDN other than system fonts.

### Required sections (must render, in this order)

1. **Mission badge** — slug, title, current state (pill color per state group)
2. **Today's Commitments** — table/list of `today_commitments`
3. **Overdue** — table/list of `overdue_commitments`, visually distinct (red/orange)
4. **Adam's Tasks** — `adam_tasks` list
5. **Sherry's Tasks** — `sherry_tasks` list
6. **Waiting Approval** — `waiting_approval` list with Approve button (calls `PUT /commitments/:id` with `{ approved_by: 'adam', approved_at: ISO }`)
7. **Income Priorities** — `income_priorities` list
8. **Add Commitment** — inline form: owner (select adam/sherry), text (textarea), due_date (date input), urgency (1-5), importance (1-5), submit calls `POST /api/v1/lifeos/commitments`

### Key from URL: `?key=` or `localStorage.getItem('hh_key')` or prompt once.

### Auto-refresh: poll `GET /api/v1/lifeos/household/board` every 30 seconds. No WebSocket required.

### State pill color map **[PRESCRIBED]**
- `Proposed`, `Clarified`: gray
- `Council Review`, `OIL Review`: yellow
- `Approved`, `Build Approved`: blue
- `BPB Blueprinting`, `Building`: orange
- `Verification`: purple
- `Deployed`, `Outcome Measured`, `Lessons Captured`: green

### [BUILDER DISCRETION]: CSS styling, layout columns, font size, responsive breakpoints, dark/light mode.

---

## Section 7: `routes/public-routes.js` — Surgical Addition **[PRESCRIBED]**

Add after the existing `/lifeos-communication` route block:

```js
app.get("/lifeos-household", (req, res) => {
  const filePath = path.join(__dirname, "public", "overlay", "lifeos-household.html");
  if (fs.existsSync(filePath)) return sendPublicFileNoCache(res, filePath);
  return res.status(404).send("Household mission board not found.");
});
```

---

## Section 8: `startup/register-runtime-routes.js` — Surgical Addition **[PRESCRIBED]**

Add import:
```js
import { registerMissionRoutes } from '../routes/mission-routes.js';
```

Add call in the route registration function alongside other `register*Routes` calls:
```js
registerMissionRoutes(app, pool);
```

---

## Section 9: Verifier Checks **[PRESCRIBED — all must pass before claiming DONE]**

```bash
# 1. Migration file exists
test -f db/migrations/20260604_mission_runtime_v1.sql

# 2. Syntax clean on all new JS files
node --check services/mission-ledger.js
node --check routes/mission-routes.js

# 3. No anti-patterns in service/route
node scripts/builderos-groq-antipattern-scan.mjs services/mission-ledger.js
node scripts/builderos-groq-antipattern-scan.mjs routes/mission-routes.js

# 4. Route is mounted
grep -r "registerMissionRoutes" startup/register-runtime-routes.js

# 5. Public route exists
grep -r "lifeos-household" routes/public-routes.js

# 6. HTML file exists
test -f public/overlay/lifeos-household.html

# 7. @ssot tag in both JS files
grep "@ssot docs/projects/AMENDMENT_47_MISSION_RUNTIME.md" services/mission-ledger.js
grep "@ssot docs/projects/AMENDMENT_47_MISSION_RUNTIME.md" routes/mission-routes.js

# 8. State machine constant exported
grep "MISSION_STATE_TRANSITIONS" services/mission-ledger.js

# 9. Board response has all 8 required sections
grep -E "today_commitments|overdue_commitments|adam_tasks|sherry_tasks|waiting_approval|household_priorities|income_priorities|capacity_warnings" services/mission-ledger.js | wc -l
# Must be >= 8

# 10. Invalid transition rejected (requires running server — skip in CI if offline)
# curl -s -X POST /api/v1/lifeos/missions/:id/transition -d '{"to_state":"Deployed","transitioned_by":"adam"}' | jq .error
# Expected: "invalid_transition"
```

---

## Section 10: Stop Conditions for Builder **[PRESCRIBED]**

Stop and do not proceed if any of the following occur:

1. Target file `services/mission-ledger.js` or `routes/mission-routes.js` is > 300 lines → Zone 3 risk, halt, create patch plan
2. Any existing table in `builderos_command_control_jobs` or `historian_lessons` has a column name conflict with `mission_id` → log conflict, skip that ALTER, note in receipt
3. The `requireKey` or auth middleware import path cannot be resolved → halt, note as PENDING_ADAM blocker
4. `MISSION-0001` seed INSERT fails (non-conflict reason) → halt, note in receipt
5. Any verifier check from Section 9 fails → do not mark committed

---

## Section 11: What MISSION-0001 Will Look Like After Build

Once Phase 1 is deployed, the first real mission exists:

```json
{
  "slug": "MISSION-0001",
  "title": "Adam + Sherry Household Reliability and Income Engine",
  "state": "Approved",
  "authority_class": "Founder Required",
  "owner": "adam",
  "blueprint_ref": "docs/projects/BPB-0001-MISSION-RUNTIME-V1.md",
  "participants": [
    { "participant": "adam", "role": "owner" },
    { "participant": "sherry", "role": "contributor" }
  ]
}
```

Every future C2 job that relates to this mission should be created with `mission_id` set to MISSION-0001's UUID.  
Every Historian lesson from this mission attaches to the same `mission_id`.  
The household board defaults to showing MISSION-0001.

---

## Section 12: Amendment Required

`docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` must be created as part of the Phase 1 build.  
Minimum required sections: Mission, Owned Files, API Surface, DB Tables, Build Plan (checked off as built), Change Receipts.  
All files with `@ssot docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` must point to it.

---

## Change Receipts

| Date | What | Why | Verified |
|---|---|---|---|
| 2026-06-01 | Created BPB-0001. Phases 1–4 fully specified. DB schema, state machine, routes, board, verifier checks, stop conditions all prescribed. | Adam mission directive: "Create BPB-0001 for Mission Runtime v1 + Shared Adam/Sherry Mission Board." §2.0E determinism requirement. | ✅ |
