# Builder autonomy — brainstorm vault

**Purpose:** Store the multi-agent / continuous-builder idea set in one place. **Not constitutional law** — rank and pull work into amendments when shipped.

**How ideas get here:** Multi-model **brainstorm sessions** follow **`docs/BRAINSTORM_SESSIONS_PROTOCOL.md`** (25 → rank → meta-25 → rank → **BUILD_NOW / NEXT / MARKET_ICEBOX / DISCARD**). This vault holds **NEXT** and **MARKET** rows that are not yet specced into a single builder task.

**Last updated:** 2026-05-08

---

## Entry point (“read the brainstorming file”)

**FIRST READ:** **`docs/projects/OPERATOR_BRAINSTORM_SESSION_ENTRY.md`** — standing Adam instructions without rehash each chat; **`N01–N25` audit-before-regenerate** rule; ChatGPT-parity branching + wide→narrow pattern pointers.

**Live grade card (periodic refresh):** `docs/projects/LIFEOS_BROWSER_AND_PLATFORM_GRADE_2026-05-08.md`

**Fresh burst (pending triage phases):** `docs/projects/BRAINSTORM_SESSIONS/lifeos/2026-05-08_operator-uplift/` — **`10_IDEAS_PHASE1_OPERATOR25.md`** (pull survivors here after **`50_TRIAGE.md`**).

---

## Doing now (this sprint — technical judgment)

These are the highest leverage **given** idle slices, token pressure, deploy drift, and the existing daemon + `/builder/gaps` stack:

| # | Idea | Why now |
|---|------|--------|
| **20** | **Admission control from `/builder/gaps`** — optional env: skip **`POST /build`** when recent audit rows show enough **syntax-class** failures (same bucketing spirit as supervisor). | Stops burning council tokens when the **platform** is the bottleneck; aligns with Zero Waste and North Star truth (green when red is forbidden). **Shipped as opt-in:** `BUILDER_DAEMON_SKIP_QUEUE_ON_GAPS_SYNTAX` (see `BUILDER_OPERATOR_ENV.md`). |
| **1** | **Risk-band per task** — extend `LIFEOS_DASHBOARD_BUILDER_QUEUE.json` with optional `risk: low|med|high` (doc + schema only first). | Unlocks tighter automation later without another naming migration; zero runtime change until verifiers read the field. **Next slice:** optional column in JSON + verifier table in amendment. |
| **8** | **Operator digest** — one command or cron that turns `builder-daemon-log.jsonl` + `builder-continuous-queue-last-run.json` into a short human summary. | You asked to stay vision-side; shrinking log archaeology is operational kindness. **Next slice:** thin `scripts/builder-operator-digest.mjs`. |

Everything else below is **sequenced backlog / market** unless you reorder.

---

## Next (after digest + risk field)

| # | Idea | Notes |
|---|------|------|
| **6** | Useful-work guard on daemon — DB proof before `/build` | Generalizes #20; use `createUsefulWorkGuard()` pattern |
| **12** | Debounced cursor wrap — min wall time between wraps | Stops recycle thrash when `CURSOR_WRAP=1` |
| **14** | Golden overlay probes — fixed Playwright after N commits | Ties to LifeOS overlays / mockup SSOT |
| **18** | Canary lane — queue targets branch or staging URL | Needs env + builder contract |
| **24** | Queue file **schema_revision** pinning | Avoids silent JSON drift |

---

## Market / later / icebox (still valuable — pick when prioritizing revenue or scale)

| # | Idea |
|---|------|
| **2** | Two-phase queue (spec-only vs implement gates) |
| **3** | Stale-task decay (hash / SSOT bump invalidates row) |
| **4** | Parallel lanes (already partly via `BUILDER_TASK_LANE`) |
| **5** | Budget envelope per rolling hour |
| **7** | Council proposes `tasks[]` when queue empty (human approves) |
| **9** | Rollback-first tasks (anchor commit per row) |
| **10** | Synthetic golden probes (expand #14) |
| **11** | Second model critique-only pass |
| **13** | Incident mode — env flips full supervise + single-task |
| **15** | Composable micro-tasks (smaller targets) |
| **16** | Semantic diff summaries in DB |
| **17** | Victory-linked backlog extension |
| **19** | Quiet-hours pacing (flake reduction, not “nights”) |
| **21** | Machine-readable DONE checklist in SSOT |
| **22** | Replay harness for historical gap payloads in CI |
| **23** | Ownership graph task ↔ `@ssot` amendment |

---

## Full original list (reference)

1. Risk-band automation · 2. Two-phase queue · 3. Stale-task decay · 4. Parallel lanes · 5. Budget envelope · 6. Useful-work guard · 7. Council-on-empty-queue · 8. Operator digest · 9. Rollback-first · 10. Golden probes · 11. Model diversity critique · 12. Debounced recycle · 13. Incident mode · 14. Truth ladder in JSON · 15. Micro-tasks · 16. Semantic diff store · 17. Victory-linked queue · 18. Canary lane · 19. Quiet hours · 20. Gaps admission · 21. Formal DONE checklist · 22. Replay harness · 23. Ownership graph · 24. Queue schema_revision · 25. Sovereign pause API/switch.

---

## SSOT linkage

- Continuous queue JSON: **`LIFEOS_DASHBOARD_BUILDER_QUEUE.json`**
- Amendment: **`AMENDMENT_21_LIFEOS_CORE.md`** (daemon, builder, autonomy)
- Ops env: **`docs/BUILDER_OPERATOR_ENV.md`**
