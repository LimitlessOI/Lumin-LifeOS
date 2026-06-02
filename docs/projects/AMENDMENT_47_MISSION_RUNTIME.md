# AMENDMENT_47 — Mission Runtime

| Field | Value |
|---|---|
| **Amendment Number** | 47 |
| **Domain** | Mission Runtime |
| **Status** | Phase 1 — Migration DONE, Service + Routes pending |
| **Last Updated** | 2026-06-01 |
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
| `services/mission-ledger.js` | ⬜ PENDING |
| `routes/mission-routes.js` | ⬜ PENDING |
| `public/overlay/lifeos-household.html` | ⬜ PENDING |
| `startup/register-runtime-routes.js` | ⬜ PENDING (surgical add) |
| `routes/public-routes.js` | ⬜ PENDING (surgical add) |

---

## DB Tables

| Table | Description | State |
|---|---|---|
| `missions` | Parent object. slug, title, purpose, state (12), authority_class, owner, blueprint_ref, metadata_json | ✅ Migration written |
| `mission_participants` | Who is on the mission. participant (adam/sherry/system), role (owner/contributor/approver/observer) | ✅ Migration written |
| `mission_state_transitions` | Ledger of every state change. from_state, to_state, transitioned_by, note | ✅ Migration written |
| `commitments` | "I'll do it" captures. owner, text, due_date, urgency/importance/energy_cost/money_impact/relationship_impact (1-5), better_owner, approval_required | ✅ Migration written |
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
- [ ] **`services/mission-ledger.js`** — 12 exported functions per BPB-0001 §Section 4, MISSION_STATE_TRANSITIONS constant
- [ ] **`routes/mission-routes.js`** — 11 routes per BPB-0001 §Section 3, requireKey middleware
- [ ] **`public/overlay/lifeos-household.html`** — 8 sections per BPB-0001 §Section 6, 30s poll
- [ ] **Wiring** — register-runtime-routes.js + public-routes.js surgical adds
- [ ] **Verifier** — all 10 checks from BPB-0001 §Section 9 must PASS

---

## ⚠️ Known Gaps

- `historian_lessons` table does not exist yet — migration skips the FK backfill safely
- No Sherry auth/login — API key only for Phase 1 (by design)
- `capacity_warnings` array in board response is always `[]` for Phase 1 (by design)

---

## Change Receipts

| Date | What Changed | Why | Files | Verified |
|---|---|---|---|---|
| 2026-06-01 | Created AMENDMENT_47 + DB migration `20260604_mission_runtime_v1.sql`. 4 tables, 2 backfill ALTERs, MISSION-0001 seed. Builder (gemini_flash) committed truncated file (6 lines / 341 bytes) — GAP-FILL: complete rewrite, 103 lines, 18/18 prescription checks PASS. | BPB-0001 Phase 1, migration-first per founder directive. Trust the build order, not the builder's claim of done. | `db/migrations/20260604_mission_runtime_v1.sql`, `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` | ✅ prescription check PASS |
