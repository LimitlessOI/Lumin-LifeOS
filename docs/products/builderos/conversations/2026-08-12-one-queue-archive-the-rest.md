<!-- SYNOPSIS: Founder conversation — one live BUILD_QUEUE; others archived so relying code breaks -->

# 2026-08-12 — Other queues archived (there can only be one)

**Product:** BuilderOS / Universal Overlay / LifeOS
**Date:** 2026-08-12
**Founder:** Adam

## Verbatim (load-bearing)

> If there are any other cues That we don't want to have, 'cause there can only be one. I want them not only Shut down, I want them put in the archive folder, moved. If there's something relying on it, I want it to break. Please Noticeably

## Decision

- One live queue: `docs/products/universal-overlay/BUILD_QUEUE.json`
- Every other `docs/products/*/BUILD_QUEUE.json` and the two project queues **moved** to `docs/history/product-build-queues/`
- No stubs, no re-exports, no silent skip
- `loadBuildQueue` / `persistQueue` / `planBuildQueue` throw `SECOND_QUEUE_FORBIDDEN`
- Discover will not recreate a second queue

## Status

Enforced in `services/build-queue-core.js` + never-stop discover/plan + planner.
