<!-- SYNOPSIS: Collectibles manufacturing: one queue, not a second queue -->

# Collectibles manufacturing: one queue, not a second queue

**Date:** 2026-08-13  
**Founder:** Adam

## Verbatim

> we do not start a new queue we make it so one queue can manage multiple facotrys and mroe that one project it pulls from the bp's

## Decision

Collectibles must work on factory-3 **without** minting `docs/products/collectibles/BUILD_QUEUE.json`. Executable V1 steps are BP slices on `docs/products/universal-overlay/BUILD_QUEUE.json` (`COLLECTIBLES-V1-*`, source → `MASTER_BLUEPRINT.md`). Factories split by lane owns.

## Follow-up (same day)

Founder restated the law while factory-3 was still looping `queue_missing` against the deleted Collectibles queue file (stale LaunchAgent process). Reloaded agent → `product_id: universal-overlay`. Twin step was near revive_exhausted on self-referential `STEP_STATUS_FORBIDDEN`; gate healed; twin+mtg reset to pending on the one queue.
