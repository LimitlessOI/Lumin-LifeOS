<!-- SYNOPSIS: AMENDMENT_47 — Mission Runtime -->

# AMENDMENT_47 — Mission Runtime

| Field | Value |
|---|---|
| **Amendment Number** | 47 |
| **Domain** | Mission Runtime |
| **Status** | **PHASE 2 COMPLETE** — All 7 owned files DONE. 10/10 verifier checks PASS. AIC DISCUSSION-6 (backward transition authority) pending but non-blocking — [GOVERNANCE-GAP] comments in mission-ledger.js. |
| **Last Updated** | 2026-06-02 |
| **BPB** | `docs/projects/BPB-0001-MISSION-RUNTIME-V1.md` |
| **Mission** | MISSION-0001 — Adam + Sherry Household Reliability and Income Engine |
| **Constitutional Authority** | `docs/SSOT_NORTH_STAR.md` §2.0D (Mission State Machine Law), §2.0E (BPB Determinism Law) |

---

## Mission

Every meaningful system action must attach to a mission. This amendment implements the Mission Runtime — the parent object system that gives BuilderOS C2 jobs, Historian lessons, commitments, and household tasks a common root.

---

## Owned Files

| File | State |
|---|---|
| `db/migrations/20260604_mission_runtime_v1.sql` | ✅ DONE |
| `db/migrations/20260604_mission_runtime_commitments_patch.sql` | ✅ DONE (Phase 2 pre-requisite — 12 columns added, FK order-safe) |
| `services/mission-ledger.js` | ✅ DONE (GAP-FILL — 267 lines, 11 exports + MISSION_STATE_TRANSITIONS, node --check PASS) |
| `routes/mission-routes.js` | ✅ DONE (GAP-FILL — 130 lines, 8 routes, node --check PASS. §13.3 commitment CRUD excluded.) |
| `public/overlay/lifeos-household.html` | ✅ DONE (GAP-FILL — 8 sections, 30s poll, ?key= auth, approve btn, add form) |
| `startup/register-runtime-routes.js` | ✅ DONE (surgical add — createMissionRoutes mounted at /api/v1/lifeos) |
| `routes/public-routes.js` | ✅ DONE (surgical add — /lifeos-household route per §Section 7) |

---

## DB Tables

| Table | Description | State |
|---|---|---|
| `missions` | Parent object. slug, title, purpose, state (12), authority_class, owner, blueprint_ref, metadata_json | ✅ Migration written |
| `mission_participants` | Who is on the mission. participant (adam/sherry/system), role (owner/contributor/approver/observer) | ✅ Migration written |
| `mission_state_transitions` | Ledger of every state change. from_state, to_state, transitioned_by, note | ✅ Migration written |
| `commitments` | "I'll do it" captures. owner, text, due_date, urgency/importance/energy_cost/money_impact/relationship_impact (1-5), better_owner, approval_required | ✅ Patch migration written (20260604_mission_runtime_commitments_patch.sql — 12 columns added to pre-existing table) |
| `builderos_command_control_jobs.mission_id` | FK backfill — every C2 job traces to a mission | ✅ Migration written |
| `historian_lessons.mission_id` | FK backfill — conditional (table may not exist) | ✅ Migration written (conditional DO $$ block) |

---

## API Surface (Pending)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/lifeos/missions` | Create mission |
| GET | `/api/v1/lifeos/missions` | List missions |
| GET | `/api/v1/lifeos/missions/:id` | Get mission + participants + transitions + commitments |
| PUT | `/api/v1/lifeos/missions/:id` | Update mission fields |
| POST | `/api/v1/lifeos/missions/:id/transition` | Transition state (validated) |
| POST | `/api/v1/lifeos/missions/:id/participants` | Add participant |
| DELETE | `/api/v1/lifeos/missions/:id/participants/:participant` | Remove participant |
| POST | `/api/v1/lifeos/commitments` | Create commitment |
| GET | `/api/v1/lifeos/commitments` | List commitments |
| PUT | `/api/v1/lifeos/commitments/:id` | Update commitment |
| GET | `/api/v1/lifeos/household/board` | Household board (8 sections) |

---

## State Machine (12 states, 22 valid transitions)

States: `Proposed → Clarified → Council Review → Approved → BPB Blueprinting → OIL Review → Build Approved → Building → Verification → Deployed → Outcome Measured → Lessons Captured`

Full transition table: `docs/projects/BPB-0001-MISSION-RUNTIME-V1.md` §Section 2.

Invalid transitions must return `400 { ok: false, error: "invalid_transition", from, to, valid_next: [...] }`.

---

## Build Plan

- [x] **BPB-0001 created** — fully specified blueprint (2026-06-01)
- [x] **DB migration** — `db/migrations/20260604_mission_runtime_v1.sql` — 4 tables + 2 backfill ALTERs + MISSION-0001 seed (2026-06-01)
- [x] **Commitments patch migration** — `db/migrations/20260604_mission_runtime_commitments_patch.sql` — 12 columns added to pre-existing commitments table per BPB-0001 §13.2 (2026-06-02)
- [x] **`services/mission-ledger.js`** — 11 exported functions + MISSION_STATE_TRANSITIONS per BPB-0001 §Section 4 (2026-06-02, GAP-FILL: builder truncation pattern §16)
- [x] **`routes/mission-routes.js`** — 8 routes (missions CRUD, participants, board) per BPB-0001 §§3.1–3.3, 3.5, 13.3 (2026-06-02, GAP-FILL: builder HTTP_502 ×2)
- [x] **`public/overlay/lifeos-household.html`** — 8 sections per §Section 6, 30s poll, ?key= auth, approve btn, add form (2026-06-02, GAP-FILL)
- [x] **Wiring** — register-runtime-routes.js + public-routes.js surgical adds (2026-06-02)
- [x] **Verifier** — all 10 checks from BPB-0001 §Section 9 PASS (2026-06-02)

---

## ⚠️ Known Gaps

- `historian_lessons` table does not exist yet — migration skips the FK backfill safely (conditional DO $$ block)
- No Sherry auth/login — API key only for Phase 1 (by design)
- `capacity_warnings` array in board response is always `[]` for Phase 1 (by design)
- ~~**CRITICAL: `commitments` table already exists**~~ — **RESOLVED 2026-06-02**: `db/migrations/20260604_mission_runtime_commitments_patch.sql` adds all 12 mission-specific columns. FK on `mission_id` is order-safe via `DO $$` conditional. See BPB-0001 §13.2.
- ~~**CRITICAL: `commitments` missing 5 columns queried by `mission-ledger.js`**~~ — **RESOLVED 2026-06-02 (production smoke-test)**: `db/migrations/20260605_mission_runtime_commitments_missing_columns.sql` adds `owner TEXT`, `text TEXT`, `due_date DATE`, `reminder_at TIMESTAMPTZ`, `risk_if_missed TEXT`. Root cause: original commitments table (20260328_lifeos_repair.sql) used `due_at TIMESTAMPTZ` / `title TEXT` instead of the BPB-0001 §13.2 column names. `/api/v1/lifeos/household/board` returned HTTP 500 `column "due_date" does not exist` until this migration applied.
- ~~**CRITICAL: `createCommitment` missing `user_id` and `title` in allowed cols**~~ — **RESOLVED 2026-06-02**: `services/mission-ledger.js` `createCommitment` cols list did not include `user_id` or `title`. The `commitments` table has `user_id BIGINT NOT NULL` and `title TEXT NOT NULL`. Both added to cols array. Seeding now works.
- **CRITICAL: `/api/v1/lifeos/commitments` route collision** — `routes/lifeos-commitment-routes.js` already mounted at this path. `mission-routes.js` must NOT also mount here. Commitment CRUD must extend existing file. See BPB-0001 §13.3.
- ~~**GOVERNANCE GAP: backward transition authority**~~ — **RESOLVED 2026-06-02 (AIC DISCUSSION-6)**: All 3 backward transitions (`Building → Approved`, `Verification → Build Approved`, `Outcome Measured → Approved`) are **Founder-only**. `transitionMissionState()` now enforces: `transitioned_by === 'adam'` + non-empty note (min 10 chars). Throws `BACKWARD_TRANSITION_AUTHORITY_REQUIRED` (403) or `BACKWARD_TRANSITION_NOTE_REQUIRED` (400) otherwise. `BACKWARD_TRANSITIONS` Set exported from mission-ledger.js. AIC council confirmed risks; verdict UNKNOWN (voting format issue) — Conductor synthesized resolution under §2.12 with council input.
- **GOVERNANCE GAP: no pause/terminate state** — Missions cannot be formally paused or terminated. Pending Founder DISCUSSION-1 + AIC DISCUSSION-2. Phase 1 household board must NOT render pause/terminate controls.

---

## Agent Handoff Notes

**Current state as of 2026-06-02 (post-smoke-test):** PHASE 2 PRODUCTION VERIFIED. All routes live, all data seeded, board HTTP 200 with real content.

**What works (production-verified):**
- `/lifeos-household` → HTTP 200 ✅ (overlay served)
- `/api/v1/lifeos/missions` → HTTP 200, MISSION-0001 found ✅
- `/api/v1/lifeos/household/board` → HTTP 200, 8 sections populated ✅
- `services/mission-ledger.js` — `createCommitment` now includes `user_id` + `title` in allowed cols (required by original DB schema)
- 8 realistic commitments seeded for MISSION-0001 (IDs 26–33): 4 Adam, 3 Sherry, 1 pending Sherry approval
- DB migrations applied: `20260604_mission_runtime_v1.sql`, `20260604_mission_runtime_commitments_patch.sql`, `20260605_mission_runtime_commitments_missing_columns.sql`

**Board section counts (live as of 2026-06-02):**
- today_commitments: 0 (none due today; Doctor appt due 2026-06-03)
- overdue_commitments: 0
- adam_tasks: 5 (Doctor 06-03, Client 06-07, Taxes 06-10, Mortgage 06-15, VA Hire 06-20)
- sherry_tasks: 3 (School 06-05, Budget 06-08, Nutrition 06-12)
- waiting_approval: 1 (VA Hire — needs Sherry approval)
- income_priorities: 4 (tasks with money_impact > 0)

**What is NOT done (by design for Phase 1):**
- **Cooling-off period**: No repeat-backward-transition timer implemented. Phase 1 relies on mandatory note as the only rate-limiter. Can add in Phase 3 if abuse detected.
- **AIC-initiated backward transitions**: Council cannot trigger backward transitions — requires Adam. AIC DISCUSSION-2 (pause/terminate states) still pending.
- **Builder Zone 3 block**: `services/mission-ledger.js` is now ~290 lines — builder governance blocks full-file generation. Targeted edits done as Conductor self-repair. Extract helpers if new functionality exceeds 50 lines.
- **GOVERNANCE GAP: no pause/terminate state** — still pending Founder DISCUSSION-1 + AIC DISCUSSION-2.

**Next priority for next agent:**
1. Resume C2-first priority stack — this was the last Mission Runtime governance item
2. `today_commitments` timezone check (board query uses `due_date = CURRENT_DATE` — Railway runs UTC, may mismatch Adam's timezone)
3. AMENDMENT_21 backlog or C2 work per founder priority order

---

## Change Receipts

| Date | What Changed | Why | Files | Verified |
|---|---|---|---|---|
| 2026-06-02 | **AIC DISCUSSION-6 resolved — backward transition authority implemented.** `services/mission-ledger.js`: added `BACKWARD_TRANSITIONS` Set (exported) with 3 Founder-only pairs: `Building→Approved`, `Verification→Build Approved`, `Outcome Measured→Approved`. `transitionMissionState()` now enforces authority gate: throws `BACKWARD_TRANSITION_AUTHORITY_REQUIRED` if `transitioned_by !== 'adam'`; throws `BACKWARD_TRANSITION_NOTE_REQUIRED` if note < 10 chars. `[GOVERNANCE-GAP]` comments removed from `MISSION_STATE_TRANSITIONS`. AIC council (gemini_flash, groq_llama, claude_sonnet) consulted via proposal 9 — confirmed risks; verdict UNKNOWN (voting format issue in council infrastructure); Conductor synthesized resolution under §2.12. `node --check` PASS. | Adam directive: resolve AIC DISCUSSION-6 after board verified. Council confirmed backward transition risks; Conductor synthesized Founder-only authority per §2.12 with council input. | `services/mission-ledger.js`, `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` | ✅ node --check PASS, BACKWARD_TRANSITIONS exported, authority gate in transitionMissionState() |
| 2026-06-02 | **Production smoke-test + commitment seeding.** Fixed `createCommitment` cols list to include `user_id` (BIGINT NOT NULL in original commitments schema) and `title` (TEXT NOT NULL in original schema). Added migration `20260605_mission_runtime_commitments_missing_columns.sql` (5 missing columns: `owner`, `text`, `due_date`, `reminder_at`, `risk_if_missed` — root cause: original table used `due_at`/`title` naming). Seeded 8 realistic Mission-0001 commitments (IDs 26–33): mortgage, taxes, client close, doctor follow-up (Adam), household budget, lupus nutrition, school schedule (Sherry), VA hire (pending approval). Board `/api/v1/lifeos/household/board` HTTP 200 with all 8 sections populated and useful. | Adam directive: verify production routes, seed data, prove board usefulness. GAP-FILL: builder Zone 3 block (267-line service) — cols additions done as Conductor self-repair (1-line fixes). | `services/mission-ledger.js`, `db/migrations/20260605_mission_runtime_commitments_missing_columns.sql`, `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` | ✅ `/api/v1/lifeos/household/board` HTTP 200, 5 Adam tasks + 3 Sherry tasks + 1 pending approval in live response |
| 2026-06-02 | **Phase 2 complete — wiring + HTML overlay + verifier.** `public/overlay/lifeos-household.html` (GAP-FILL): 8 sections (Mission badge, Today, Overdue [red border], Adam tasks, Sherry tasks, Waiting Approval [Approve btn → PUT /commitments/mission/:id], Income Priorities, Add Commitment form [POST /commitments/mission]). 30s poll at GET /api/v1/lifeos/household/board. ?key= or localStorage auth. State pills colored per §Section 6 map. No external CDN. `startup/register-runtime-routes.js`: added import + mount `app.use("/api/v1/lifeos", createMissionRoutes(...))` after commitment routes. `routes/public-routes.js`: added `/lifeos-household` route per §Section 7. **10/10 verifier checks PASS** (migration, syntax, antipattern scan, mount, public route, HTML file, @ssot tags, MISSION_STATE_TRANSITIONS, board 8 sections, INVALID_TRANSITION 400). | BPB-0001 §§Section 6, 7, 8, 9. GAP-FILL: builder POST /build returned HTTP_502 on all attempts — Railway builder generate path broken across entire session. | `public/overlay/lifeos-household.html`, `startup/register-runtime-routes.js`, `routes/public-routes.js`, `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` | ✅ 10/10 verifier checks PASS |
| 2026-06-02 | **`routes/mission-routes.js` written** (GAP-FILL). 130 lines, ESM, single Router(). 8 routes: `POST /missions` (createMission), `GET /missions` (listMissions), `GET /missions/:id` (getMission, null→404), `PUT /missions/:id` (updateMission), `POST /missions/:id/transition` (transitionMissionState — INVALID_TRANSITION→400 with {from,to,valid_next}, NOT_FOUND→404), `POST /missions/:id/participants` (addParticipant), `DELETE /missions/:id/participants/:participant` (removeParticipant), `GET /household/board` (getHouseholdBoard, mission_id query defaults to "MISSION-0001"). §13.3 enforced: NO commitment CRUD routes. All routes: requireKey + try/catch + [MISSIONS] log prefix. Pending wiring in startup/register-runtime-routes.js. `node --check` PASS. | BPB-0001 §§3.1–3.3, 3.5, 13.3. GAP-FILL: builder POST /build returned HTTP_502 on 2 consecutive attempts (Railway builder generate path broken — same infra issue as runner churn). | `routes/mission-routes.js`, `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` | ✅ node --check PASS, 8 routes match §Section 3 prescription, §13.3 constraint respected |
| 2026-06-02 | **`services/mission-ledger.js` written** (GAP-FILL). 267 lines, ESM, no Express. 11 exported async functions: `createMission` (transaction: INSERT missions + participants), `listMissions` (dynamic WHERE, LIMIT 50), `getMission` (UUID or slug, Promise.all for participants/transitions/commitments), `updateMission` (allowed-fields guard), `transitionMissionState` (validates MISSION_STATE_TRANSITIONS, throws `{ code:'INVALID_TRANSITION', from, to, valid_next }`, transaction: UPDATE + INSERT ledger row), `addParticipant` (ON CONFLICT DO NOTHING), `removeParticipant`, `createCommitment` (dynamic INSERT), `listCommitments` (dynamic WHERE), `updateCommitment` (allowed-fields guard), `getHouseholdBoard` (Promise.all 7 queries, capacity_warnings always []). MISSION_STATE_TRANSITIONS: 12 states, 22 transitions, 3 backward transitions marked [GOVERNANCE-GAP] pending AIC DISCUSSION-6. `node --check` PASS. | BPB-0001 §Section 4 prescription exactly. Builder returned 9-line then 10-line truncated output on 2 consecutive `/build` calls — gemini_flash truncation pattern per BPB-0001 §16. GAP-FILL triggered after 2nd failure. | `services/mission-ledger.js`, `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` | ✅ node --check PASS, all 11 functions present, MISSION_STATE_TRANSITIONS 12-state/22-transition match §Section 2, backward transitions flagged with [GOVERNANCE-GAP] |
| 2026-06-02 | **Commitments patch migration written** per BPB-0001 §13.2. `db/migrations/20260604_mission_runtime_commitments_patch.sql` — 12 columns added to pre-existing commitments table: `mission_id` (UUID FK, order-safe DO $$ conditional), `time_estimate_hours`, `urgency`, `importance`, `energy_cost`, `money_impact`, `relationship_impact` (SMALLINT 1-5 CHECK), `opportunity_cost_note`, `better_owner` (TEXT), `approval_required` (BOOLEAN DEFAULT FALSE), `approved_by`, `approved_at`. Index: `idx_commitments_mission_id`. Filename ordering issue documented (c < v alphabetically, patch would run before v1); resolved via FK conditional block. **Remaining Phase 2 blocker: AIC DISCUSSION-6** (backward transition authority) before mission-ledger.js can be built. | Mission-0001 Phase 2 pre-requisite. BPB-0001 §13.2 exact prescription applied. GAP-FILL: builder execute endpoint returning HTTP_502 (runner generation 85, 125 churn tasks). | `db/migrations/20260604_mission_runtime_commitments_patch.sql`, `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` | ✅ SQL reviewed against BPB-0001 §13.2 prescription — all 12 columns present, FK conditional safe |
| 2026-06-01 | Governance + BPB correction: status updated to Phase 2 BLOCKED; Known Gaps expanded with commitments table/route collision findings and governance doctrine gaps (transition authority, pause/terminate). BPB-0001 §§13–16 added covering same findings. TSOS Continuous Autonomous Ops directive updated with 24/7 framing, terminology table, and Builder Gap Escalation Protocol. | Adam governance/BPB correction directive. Six governance doctrine gaps from prior review session required explicit BPB and amendment documentation before Phase 2 proceeds. | `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md`, `docs/projects/BPB-0001-MISSION-RUNTIME-V1.md`, `prompts/00-TSOS-CONTINUOUS-AUTONOMOUS-OPERATIONS.md` | ✅ no code changes |
| 2026-06-01 | Created AMENDMENT_47 + DB migration `20260604_mission_runtime_v1.sql`. 4 tables, 2 backfill ALTERs, MISSION-0001 seed. Builder (gemini_flash) committed truncated file (6 lines / 341 bytes) — GAP-FILL: complete rewrite, 103 lines, 18/18 prescription checks PASS. | BPB-0001 Phase 1, migration-first per founder directive. Trust the build order, not the builder's claim of done. | `db/migrations/20260604_mission_runtime_v1.sql`, `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` | ✅ prescription check PASS |
