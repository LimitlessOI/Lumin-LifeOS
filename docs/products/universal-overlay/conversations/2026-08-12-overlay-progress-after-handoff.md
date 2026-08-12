<!-- SYNOPSIS: 2026-08-12 — Overlay progress after SENTRY handoff ship -->

# 2026-08-12 — Overlay progress (observed)

**Surface:** Cursor chat (conductor)
**Product:** universal-overlay
**Date:** 2026-08-12

## Founder

Asked to observe how the SENTRY→Conductor handoff ship did, and for a report on overlay system progress.

## What is actually true (KNOW)

- TALOA-P1-001 through TALOA-P1-015 are `done` on origin `BUILD_QUEUE.json`.
- `TALOA-BADGE-CHAIR-001` and `TALOA-BADGE-VOICE-001` are `done` (native `ContainerView.swift`).
- factory-2 LaunchAgent `com.lumin.factory-2-lane` is running. Last native compile 2026-08-12T21:51Z; since then `native_unchanged` and `pending_owned: []`.
- Production `/builder/ready` served `0cf9fc4d7548`. Handoff commit `b775c40d` is an ancestor of that SHA.
- Overlay Layer A/B in `SENTRY_PRODUCT_REGISTRY.json` remain `REGISTERED_NOT_IMPLEMENTED`.
- Phase 1 `services/taloa/*` have no live `routes/` callers. Construction ≠ usable.
- Four leftover non-Phase-1 queue rows: two `STEP_STATUS_FORBIDDEN` (`moduleRouter.js`, `holdToTalkService.js`), two pending JS hold-to-talk files the native badge path replaced.

## Honest grade

Founder-visible overlay (Taloa badge, click-to-chat, native hold-to-talk) exists as a local Mac app. The Phase 1 “Digital Imprint” services are files on main, not a product you can use. SENTRY cannot walk it as a client until Layer A/B exist.
