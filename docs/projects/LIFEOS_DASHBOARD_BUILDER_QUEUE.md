# LifeOS Dashboard — 24/7 supervised builder queue

Updated: 2026-05-05 — **Alpha reorder** for operator prototype path: **`LIFEOS_ALPHA_NEEDS_AND_QUEUE.md`**; JSON leads with **`lifeos-alpha-consensus-pack`** → **`lifeos-alpha-operator-one-pager`**, specs, then legacy foundation/rail **tail**. Cursor reset **without firing `/build`:** **`npm run lifeos:builder:queue:reset-cursor`** (same as **`--reset-cursor-only`**). Prefer this, then **`BUILDER_QUEUE_MAX=1`** (or small N) **`npm run lifeos:builder:queue`** — **do not combine bare `--reset-cursor`** with full drain unless intentional (see **`docs/projects/BUILDER_QUEUE_SLICE_POLICY.md`**).

Prior: **2026-04-30 — Wave 4** doc-only backlog in JSON (notifs, offline queue, shortcuts, shell URL params, telemetry, Victory Vault placement, MIT/calendar/search/household/perf budgets, AI rail QA checklist).

Human-readable backlog for **`npm run lifeos:builder:daemon`** / **`npm run lifeos:builder:queue`**. Runs **continuously**, not night-only — the old “overnight” word was tooling debt.

Each row must reference `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and preserve shell behavior unless a task explicitly changes it.

**Dual-model consensus:** Load-bearing disagreement on backlog or alpha scope → **`npm run lifeos:gate-change-run -- --preset maturity`** on the **deployed** app (**`PUBLIC_BASE_URL`** + **`COMMAND_CENTER_KEY`**), plus supervisor SSOT edits — IDE-only consensus is insufficient.

## Adam → SSOT → build queue (feedback loop)

**Plain language.** When something in the product feels wrong or sparks a better idea:

1. **Say it somewhere durable** — e.g. a short note in **`AMENDMENT_21_LIFEOS_CORE.md` → `## Change Receipts`**, **`## Agent Handoff Notes`**, and/or **`docs/CONTINUITY_LOG.md`** (whatever matches how big the decision is).
2. **Turn buildable work into a queue row** — add or adjust an object in **`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json`** `tasks[]` (copy shape from sibling tasks). The continuous runner (**`npm run lifeos:builder:queue`** / daemon) consumes that list.
3. **Talk to the real council when it’s load-bearing** — **`npm run lifeos:gate-change-run`** against your **Railway** app; IDE chat is not a substitute (see **`LIFEOS_ALPHA_NEEDS_AND_QUEUE.md`**).

**Time expectations (~not promises):** “~10 minutes” in docs usually means **roughly ten minutes of successful automated builder slices** along the corridor the meter watches—not “every feature perfected.” **Half to ~1 minute per slice** has been typical recently (**`npm run lifeos:builder:throughput-meter`**). Budget extra for **your** testing, merges, redeploys, and fixes—often on the order of **tens of minutes** per meaningful feedback cycle.

## Priority (highest first)

**Array order:** the runner advances **`tasks[0]` → `tasks[1]` → …**. Put **must-ship-first** definitions at the **top** of **`tasks[]`**. *(A numeric **`priority`** sort field can be added later without breaking cursor semantics — see **`BUILDER_AUTONOMY_TRUST_AND_REVIEW_MODEL.md`** gaps.)*

**~7 h wall-clock slab:** `npm run lifeos:builder:daemon:7h` (bounded session). Actual **`POST /build`** count still depends on task count, **`BUILDER_QUEUE_MAX`**, failures, and whether the lane cursor is past the tail.

**Review before merging to main:** commits go to **`main`** unless you set **`BUILDER_QUEUE_COMMIT_BRANCH`** or per-task **`"branch"`** in JSON (**`lifeos-builder-continuous-queue`** forwards it to **`/build`**). Promotion / Railway deploy remains a **separate** human or governed step — see **`docs/BUILDER_AUTONOMY_TRUST_AND_REVIEW_MODEL.md`**.

## Execution order

Canonical **`tasks[]` order:** **`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json`** (supersedes numbered list below when they disagree).

1. `dashboard-shell-audit`
   Goal: audit current `lifeos-dashboard.html` and `lifeos-app.html` against the builder brief, report exact gaps, no rewrite.

2. `dashboard-theme-foundation`
   Goal: normalize light/dark theme tokens and shared dashboard card variables so both modes are intentional and consistent.

3. `dashboard-mobile-shell`
   Goal: build mobile-first category shell with bottom tabs preserved, vertical scroll per category, and swipe-ready category container.

4. `dashboard-desktop-shell`
   Goal: preserve left sidebar and implement cleaner desktop workspace grid that maps to the mobile category model.

5. `dashboard-ai-rail`
   Goal: add persistent dockable AI rail contract to the dashboard shell without breaking existing chat entry points.

6. `dashboard-customization-state`
   Goal: add local/state contract for widget visibility, order, density, and pinned widgets.

7. `dashboard-widget-density`
   Goal: support compact, balanced, and expanded card density without overwhelming mobile.

8. `dashboard-today-category`
   Goal: refine Today dashboard around MITs, schedule, alerts, quick add, and Lumin prompt.

9. `dashboard-health-family-purpose-stubs`
   Goal: add category stubs and real layout placeholders so future domains plug in cleanly.

10. `dashboard-polish-pass`
   Goal: motion, spacing, accessibility, loading states, empty states, and theme parity.

## Machine-readable tasks

Canonical **`tasks[]`** live in **`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json`**.

Split **dashboard-ai-rail** (item **5**) is implemented there as **`dashboard-ai-rail-css`** → **`dashboard-ai-rail-js`** → **`dashboard-ai-rail-wire`** (wire may set **`max_output_tokens`** for **`POST /builder/build`**). Deploy parity via **`GET /api/v1/lifeos/builder/ready`** → **`codegen.policy_revision`** (must match **`routes/lifeos-council-builder-routes.js`** `BUILDER_CODEGEN_POLICY_REVISION` on **`main`**).

**Wave 2 (doc specs, items 7–9):** **`dashboard-widget-density-spec`**, **`dashboard-today-category-spec`**, **`dashboard-category-stubs-spec`** — keeps the supervised daemon advancing after earlier rows complete.

**Wave 4 (extended throughput / ~multi-hour slabs):** notifications shell, offline queue, keyboard shortcuts, shell URL/query parameters, telemetry/error envelopes, Victory Vault placements, MIT widget contract, calendar assumptions, search/discovery, household context picker, performance budget notes, AI rail QA checklist draft — **all doc-only**, same **`lifeos-platform`** **`POST /build`** lane.

After a successful `npm run lifeos:builder:supervise` on the same **`PUBLIC_BASE_URL`**:

```bash
npm run lifeos:builder:queue -- --dry-run
BUILDER_QUEUE_MAX=2 npm run lifeos:builder:queue
# legacy equivalents still work:
# OVERNIGHT_MAX=2 npm run lifeos:builder:overnight
```

Resume after failure with **`--start <0-based index>`** or **`--task <id>`**.

Logs: **`data/builder-continuous-queue-log.jsonl`** (gitignored). Throughput receipt: **`data/builder-continuous-queue-last-run.json`** (includes **`per_task_slice`** · **`build_wall_ms`** per task). **Slice-time meter (+ MVP ETA corridor):** **`npm run lifeos:builder:throughput-meter`** — **`docs/BUILDER_TRUTH_AND_THROUGHPUT.md`**, scope **`docs/projects/LIFEOS_MVP_THROUGHPUT_SCOPE.json`**.

Lane cursor: **`data/builder-continuous-queue-cursor.<lane-slug>.json`** (prior **`builder-overnight-cursor.*`** files are read once for migration).

**Platform note (2026-04-29):** After each GitHub commit, the server mirrors written content locally so **`files[]`** injection sees updates without waiting for a new Railway image.

## Stop conditions

Stop and report instead of guessing if:

- required APIs do not exist
- file ownership is unclear
- a task would replace working shell architecture without explicit approval
- the result cannot satisfy both light and dark mode
