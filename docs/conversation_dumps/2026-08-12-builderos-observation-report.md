<!-- SYNOPSIS: Twin/archive capture of 2026-08-12 BuilderOS observation report -->

# 2026-08-12 — BuilderOS observation report

**Product:** universal-overlay
**Surface:** Cursor chat
**Date:** 2026-08-12 ~10:52pm PT

## Founder (verbatim)

> have you been observing builderOS i want a report and i want to know what its building and when it will be done we are required to track how lone ever slice takes so we can estimat howlong ever thing will take for compleation. and we are suposted to be traking token spend as well so we know how much things are going to cost as well

## Decisions / positions

- Overlay remains the only live manufacturing queue.
- Slice duration and token spend are required so completion time and cost can be estimated.
- Queue `% done` is not print Done.

## Observed (2026-08-13 ~05:55Z)

- Production SHA `8d038e2d5e6d` = origin tip.
- BuilderOS running; not manufacturing the next overlay-print slice.
- Capability Registry route mounted live (`module-health`); `/api/v1/capabilities/report` 400 needs `body_id` (no longer 404).
- Loop spinning on invented register scripts (`STEP_STATUS_FORBIDDEN`) + factory-2 leftover `step-5` ApplicationContextMonitor.swift.
- Tonight's only governed ship in last 100 commits: collectibles adapter, then Collectibles queue removed.
- Slice duration and token spend not live-queryable on founder-runtime (control-plane spend-outcomes 404; daily_budget used=0 unlimited).

Canonical write-up: `docs/products/universal-overlay/conversations/2026-08-12-builderos-observation-report.md`.
