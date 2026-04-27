# Continuity Log — LifeOS Core Lane

> Log sessions that primarily change Amendment 21, LifeOS routes/services, LifeOS migrations, or LifeOS overlays.

**Most recent first.**

---

## [BUILD] Update 2026-04-26 #17 — LifeOS build lanes now obey Memory Intelligence authority

**Files changed:**
- `services/lifeos-lumin-build.js` — plan/draft now consult Memory Intelligence routing before selecting a model; blocked tasks fail closed instead of silently falling back.
- `routes/lifeos-gate-change-routes.js` — gate-change debate persists structured debate memory and filters unauthorized models before council runs.
- `startup/register-runtime-routes.js`, `routes/memory-intelligence-routes.js` — `/api/v1/memory/*` mounted into runtime so LifeOS lanes can log debates, intent drift, authority, and violations.
- `docs/SSOT_COMPANION.md`, `docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md` — future-back and anti-corner-cutting rules now part of the operating law, not just the brainstorm brief.

**State after this session:**
- Lumin plan/draft and gate-change flows now use the same evidence/routing system instead of static model preference only.
- Debate memory is structured enough to preserve consensus, residue risk, and future-back notes for later retrieval.
- What is still missing: automatic CI/build receipts into Memory Intelligence and broader LifeOS route adoption beyond these load-bearing lanes.

**Next:** Seed Memory Intelligence with real facts from SSOT receipts, then wire verifier outcomes from Lumin/build flows into `fact_evidence` so routing quality improves from actual outcomes.

---

## [BUILD] Update 2026-04-20 #16 — Cycle tracking + Habits overlays

**Shipped:**
- `public/overlay/lifeos-cycle.html` — Today tab (phase ring badge, colour per phase, energy chips, countdowns), Log tab (entry type, datetime, flow level, symptom tags, notes), History tab (past cycles with entry pills, avg length), Settings tab (avg cycle/period length, tracking toggle, perimenopause mode, notify). Resolves numeric `user_id` via `GET /api/v1/lifeos/users/:handle` at boot.
- `public/overlay/lifeos-habits.html` — Today tab (stats bar, identity-framed habit list, check-in buttons, streak badges, reflection prompts for struggling habits), Manage tab (create new habit with title + identity statement + frequency; full habit list).
- `public/overlay/lifeos-app.html` — PAGE_META entries for both new overlays; sidebar nav items under "Self" group (after Growth); More bottom sheet entries.

**Next:** Smoke test — log in, open Cycle, verify phase loads (needs `cycle_entries` row; quick-log period start). Open Habits, create a habit, check it in, confirm streak increments next day. E2E invite link + Sherry registration still pending from prior handoff.

---

## [BUILD] Update 2026-04-21 #15 — Low-power ambient context + voice background suspend

**Shipped:** Opt-in coarse device hints (`battery`, `network_type`, `visibility`, timezone, PWA standalone) stored in `lifeos_ambient_snapshots`; API `/api/v1/lifeos/ambient/snapshot` + `/recent` (no AI on ingest); client `lifeos-ambient-sense.js` with 10–20 min cadence while the shell is visible; Settings toggle persists `lifeos_ambient_sense=1`. Lumin `buildContextSnapshot` includes `ambient_hints`. Always-on voice in `lifeos-voice.js` now **releases the mic** when the tab is hidden and skips screen wake lock on touch-first devices by default (`LuminVoice.configure`).

**Files:** `db/migrations/20260423_lifeos_ambient_snapshots.sql`, `services/lifeos-ambient-context.js`, `routes/lifeos-ambient-routes.js`, `startup/register-runtime-routes.js`, `public/overlay/lifeos-ambient-sense.js`, `public/overlay/lifeos-app.html`, `public/overlay/lifeos-voice.js`, `services/lifeos-lumin.js`, `scripts/lifeos-verify.mjs`, `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`, `docs/projects/AMENDMENT_21_LIFEOS_CORE.manifest.json`, `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md`

**Next:** Apply migration on Neon (boot auto if migrations run at deploy). Smoke: enable ambient in Settings → wait one interval or trigger tab switch → confirm `GET /api/v1/lifeos/ambient/recent?user=` returns rows. **THINK:** continuous environmental *audio* capture is a separate product slice (VAD, consent, cost) — not this ship.

---

## [BUILD] Update 2026-04-20 #14 — Household invite links + admin Settings + auth UX

**Shipped:** Shareable signup URLs from API; admin creates/copies in shell Settings; login accepts `?code=` or `?invite=`; JWT role/tier synced for admin gate; sign-out clears tokens; Lumin contract line for optional context-grounded relational prompts (no fake “always listening” claims).

**Files:** `routes/lifeos-auth-routes.js`, `public/overlay/lifeos-app.html`, `public/overlay/lifeos-bootstrap.js`, `public/overlay/lifeos-login.html`, `services/lifeos-lumin.js`, `prompts/lifeos-lumin.md`, `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`

**Next:** E2E test: admin creates invite → open copied link in private window → register Sherry (or test user) → confirm `lifeos_role` admin panel appears for adam only.

---

## [BUILD] Update 2026-04-19 #13 — Persistent Lumin drawer + global voice

**Problem fixed:** Lumin chat was buried in navigation; no visible chat box; voice only existed inside `lifeos-chat.html`; no always-listening mode.

**Files changed:**
- `public/overlay/lifeos-app.html` — FAB button (◎, always visible), slide-in Lumin drawer (desktop: right panel; mobile: bottom sheet), always-on voice toggle in both toppbars (🎙), live interim transcript preview, "Full history →" link
- `public/overlay/lifeos-voice.js` — NEW: shared voice utility (`LuminVoice.startForInput`, `LuminVoice.toggleAlwaysListen`, auto-inject mic icons on `data-voice="true"` inputs)

**Behavior:**
- Tap ◎ anywhere → Lumin drawer opens with last conversation loaded
- Tap 🎙 in topbar → always-on mode: everything you say sends to Lumin automatically (800ms pause triggers send)
- Speak → live transcript shows as you talk; drawer auto-opens
- "Full history →" navigates to `lifeos-chat.html` for full thread browser
- `data-voice="true"` on any input/textarea across overlays auto-gets a mic icon

**Next:** Add `data-voice="true"` to key inputs in `lifeos-today.html`, `lifeos-quick-entry.html`, `lifeos-mirror.html` so voice-to-text works everywhere.

---

## [BUILD] Update 2026-04-19 #12 — Cycle Tracking backend complete

Full cycle tracking lane shipped. Zero AI cost — pure math + SQL.

**Files created:**
- `db/migrations/20260420_lifeos_cycle_tracking.sql` — `cycle_settings`, `cycle_entries`, `cycle_phases` tables; `ALTER TABLE energy_patterns ADD COLUMN cycle_phase`
- `services/lifeos-cycle.js` — `createCycleService()` with `getSettings`, `updateSettings`, `logEntry`, `getCurrentPhase`, `getContextSnapshot`, `getCycleHistory`; `computePhase()` scales phase boundaries by `avg_cycle_length/28` ratio
- `routes/lifeos-cycle-routes.js` — POST /entry, GET /phase, GET /context, GET /history, GET /settings, PUT /settings at `/api/v1/lifeos/cycle`
- `prompts/lifeos-cycle.md` — cold-start domain context for next agent

**Files modified:**
- `startup/register-runtime-routes.js` — import + mount `createLifeOSCycleRoutes`
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — change receipt + handoff notes updated

**Next agent:** Build `public/overlay/lifeos-cycle.html` — phase badge, log entry form, energy ring, history view. All backend endpoints are live.

---

## [BUILD] Update 2026-04-19 #11 — Legacy core API shipped

Legacy P1 backend is now live: trusted contacts, check-in cadence, time-capsule messages (`deliver_at`), digital will, and completeness scoring under `/api/v1/lifeos/legacy`. Main log **Update #23**.

---

## [BUILD] Update 2026-04-19 #10 — Habits API lane shipped

New habits migration/service/routes are mounted at `/api/v1/lifeos/habits`, with streak/miss summary and reflection question logic. Main log **Update #22**.

---

## [BUILD] Update 2026-04-19 #9 — Conflict interrupt settings controls

`public/overlay/lifeos-chat.html` now exposes in-chat ON/OFF + sensitivity controls wired to `/api/v1/lifeos/conflict/interrupt/settings`; debounce checks respect disabled mode. Main log **Update #21**.

---

## [BUILD] Update 2026-04-19 #8 — Conflict interruption shipped

Migration `20260419_conflict_interrupt.sql`, service/routing methods, and chat debounce toast are live. See main log **Update #20** for exact file list and follow-up.

---

## [BUILD] Update 2026-04-19 #7 — Gate-change consensus v2

`run-council` now executes multi-model consensus + opposite-argument round on disagreement and stores `council_rounds_json` / `consensus_reached` / `consensus_summary`. Main log **Update #19**.

---

## [BUILD] Update 2026-04-19 #6 — Builder autonomy defaults

`routes/lifeos-council-builder-routes.js` now defaults `POST /task` to `autonomy_mode: "max"` with `internet_research: true`, instructing council runs to proceed with best-guess assumptions and avoid routine clarification loops. `prompts/lifeos-council-builder.md` updated. Main log **Update #18**.

---

## [BUILD] Update 2026-04-19 #5 — Gate-change API shipped

`routes/lifeos-gate-change-routes.js`, `services/lifeos-gate-change-proposals.js`, migration `20260422_gate_change_proposals.sql`, `startup/register-runtime-routes.js`, `prompts/lifeos-gate-change-proposal.md`. Main log **Update #17**.

---

## [PLAN] Update 2026-04-19 #4 — §2.6 ¶8 council efficiency path (Amendment 21)

Epistemic § + receipts + Last Updated: gate-change hypotheses go to **AI Council** per Amendment 01 + Companion §5.5. Main log **Update #16**.

---

## [PLAN] Update 2026-04-19 #3 — §2.6 mandatory / no corners (Lumin + Amendment 21)

`services/lifeos-lumin.js` — `LUMIN_EPISTEMIC_CONTRACT` states rules are not optional for speed; JSDoc “Article II” typo fix. Amendment 21 epistemic § + receipts + handoff **Known gaps** note (§2.6 enforcement still agents+CI). Full cross-doc list: main `docs/CONTINUITY_LOG.md` **Update #15**.

---

## [BUILD] Update 2026-04-19 #2 — Amendment 36 handoff stack

Zero-drift protocol, per-lane logs, `docs/AI_COLD_START.md`, builder `GET /next-task`, and governance scripts shipped. See main `docs/CONTINUITY_LOG.md` **Update #6** for the full file list and `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` for rules.

---

## [BUILD] Update 2026-04-19 #1 — SSOT hygiene + INDEX (reference)

### Summary
Full file list and revenue-alignment edits for Amendment 21 / INDEX / `callAI` boot fix are recorded in main `docs/CONTINUITY_LOG.md` under **Update 2026-04-19 #3**. Use that entry for receipts until LifeOS-only sessions are logged here exclusively.

### Next agent (LifeOS lane): start here
1. `prompts/lifeos-conflict.md` → **Next Approved Task** (Conflict Interrupt System).
2. `prompts/lifeos-lumin.md` → engagement feedback on reactions.
3. Read `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` → `## Agent Handoff Notes` + last 3 rows of `## Change Receipts`.

---
