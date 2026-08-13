<!-- SYNOPSIS: 2026-08-12 — Founder asked for a BuilderOS observation report: what it is building, when done, slice duration, token spend -->

# 2026-08-12 — BuilderOS observation report

**Surface:** Cursor chat (conductor)
**Product:** universal-overlay
**Date:** 2026-08-12 ~10:52pm PT (observed 2026-08-13 ~05:55Z)

## Founder

> have you been observing builderOS i want a report and i want to know what its building and when it will be done we are required to track how lone ever slice takes so we can estimat howlong ever thing will take for compleation. and we are suposted to be traking token spend as well so we know how much things are going to cost as well

## Verdict (KNOW)

BuilderOS is running. It is not currently manufacturing the next overlay-print slice. It is burning cycles on invented register scripts, queue-status commits, and a leftover native file factory-2 will not author. Completion time and cost cannot be estimated from a real ledger: slice duration and token spend are required, and they are not live-queryable on production tonight.

Production `/ready` `deploy_commit_sha` = origin tip `8d038e2d5e6d` (GAP-FILL that removed the mistaken Collectibles second queue).

## What it is building right now

**KNOW — overlay print (the uploaded Taloa program, §64):**

- Phase 1 foundation `TALOA-P1-001`…`015` — queue `done` (files on origin; §65 Done still requires live caller + SENTRY).
- §15 Capability Registry column / service / route — `done` last night ~7:12pm PT.
- Auto-register glue is actually live even though the queue row is blocked: production `GET /api/v1/builder/module-health` shows `taloa-capability-registry-routes.js` **mounted** at `2026-08-13T05:27:11Z`. `GET /api/v1/capabilities/report` is no longer 404; it returns 400 `body_id query parameter is required`.
- Next real print items after Capability Registry (§64 items 3–10: Android Body adapter, macOS perception, macOS Body, Task Authorization Envelope, templates, prompt-injection gate, SENTRY Layer A/B, then the rest) are **not in the live queue as print slices**.

**KNOW — what the loop is actually doing tonight:**

Origin overlay queue: 104 steps → 83 `done` / 10 `blocked` / 10 `skipped` / 1 `pending`. Print-shaped `TALOA-*` ids: 23 done, 2 skipped (WIRE-HOST, off-print), 1 blocked (`TALOA-S64-CAPREG-REGISTER-001` = `github_commit_failed_after_local_ship`).

The 9 other blocked rows are invented `scripts/register*.mjs` / migration clones of REGISTER. Not in the uploaded print. They fail `STEP_STATUS_FORBIDDEN` or `codegen_empty`. Latest never-stop ticks name `taloa-capreg-001` / `register-taloa-s64-capability` with commit sha `0000000` — looked, did not ship.

One leftover pending row: `step-5` `native/macos-overlay/ApplicationContextMonitor.swift`. factory-2 has seen it since ~05:18Z and reports `1 owned step(s) need authoring` while `build.skipped = native_unchanged` — it compiles, it does not author.

**KNOW — factories:**

- factory-1: no laptop LaunchAgent. Manufacturing is Railway governed ship. Tonight's only `GOVERNED-AUTONOMOUS-SHIP` in the last ~100 origin commits is **collectibles** `COLLECTIBLES-V1-ADAPTER-INTERFACE-001` at 10:21pm PT — then the Collectibles queue was deleted (`8d038e2d5e`).
- factory-2 LaunchAgent PID live, ticking ~60s, Taloa running, native tree unchanged. Idle on overlay native except the unauthored `step-5`.
- factory-3 LaunchAgent PID live, product_id collectibles, `queue_missing` every tick since the second queue was removed. Correct under one-queue law; noisy, not overlay progress.

**KNOW — Railway never-stop spine** (`GET /api/v1/lifeos/never-stop/status`): `enabled: true`, `running: false`, `total_runs: 0`, `last_run_at: null`, `laptop_is_not_builder: true`. Recent events are `sentry_feed_unreadable` every ~2 minutes (`SENTRY_FINDINGS_FEED.universal-overlay.json` missing). Daily budget reports `unlimited`, `used: 0`.

Last ~100 origin commits: 90 `[never-stop] queue status`, 1 governed ship (collectibles), 9 GAP-FILL/system. Overlay status ticks dominate; overlay manufacturing does not.

## When it will be done

**DON'T KNOW a clock time. KNOW why we cannot estimate.**

Queue `% done` is not print Done. 83/104 includes old leftover rows. The uploaded program's remaining work is most of §64 after Capability Registry, plus Gate 0 items that are founder-at-source, plus §65 (live caller + Layer A and Layer B SENTRY). None of that remaining list is queued as the next slice.

THINK: if the loop took the next real §64 slice the way P1 batches did this afternoon, a single successful authoring slice is on the order of 1–15 minutes when it lands, and 80+ minutes when it retries (P1-012…014). That is reconstructed from git timestamps, not a slice ledger. It does not scale to "the overlay is done" because the remaining print is not a counted list of queued files.

Idle is legal. Inventing register scripts and a second Collectibles queue is not.

## Slice duration tracking (required)

**KNOW: not recorded per overlay slice in a queryable ledger.**

- BUILD_QUEUE has `shipped_at` / `completed_at` / `last_attempt_at` sporadically. Most P1 rows have `shipped_at: null` even when `done` with a commit sha. Reconstructing duration from those fields produced 6 positive numbers (11s–869s). That is not a slice timer.
- `scripts/spend-outcomes-report.mjs` and `GET /api/v1/builderos/control-plane/spend-outcomes` plus `POST .../estimate` exist in code (`routes/builderos-control-plane-routes.js`). On production founder-runtime tonight those routes **404**. Full-runtime mount is in `startup/register-runtime-routes.js`; founder-runtime does not expose them.
- Git-timestamp proxy for overlay governed ships today (PT): P1-001…004 12:36; 005…007 12:46; 008+015 12:47; 009–011 12:57–12:59; 012–014 retried 13:19 then 14:38–14:39; CAPREG three files 19:12.

Without start/finish on every slice, completion estimates are GUESS.

## Token / cost tracking (required)

**KNOW: not live-queryable for overlay slices tonight.**

- Never-stop `daily_budget.used` = 0 with `unlimited: true`. That is not spend.
- `GET /api/v1/roi/status` and `/api/v1/lifeos/api-cost-savings/status` 404 on production founder-runtime.
- Control-plane spend-outcomes 404 (same mount gap).
- Savings ledger / `ai_performance` / `conductor_session_savings` exist as tables/services. They are not attached to BUILD_QUEUE step ids on the founder-runtime surface Adam can hit.

Cannot say how much Capability Registry cost, or how much the invented-register loop is costing.

## What "done" still is (print §65)

A component is Done when it has a real live caller, a real SENTRY Layer A + Layer B pass for overlay, and an auditable receipt. File-exists + queue `done` is construction, not Done. Layer B remains `REGISTERED_NOT_IMPLEMENTED`. Overlay SENTRY feed file is missing on the container (loop logs ENOENT every 2 minutes).
