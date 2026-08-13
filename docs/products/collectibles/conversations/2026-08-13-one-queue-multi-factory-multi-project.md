<!-- SYNOPSIS: Collectibles manufacturing: one queue, not a second queue -->

# Collectibles manufacturing: one queue, not a second queue

**Date:** 2026-08-13  
**Founder:** Adam

## Verbatim

> we do not start a new queue we make it so one queue can manage multiple facotrys and mroe that one project it pulls from the bp's

## Decision

Collectibles must work on factory-3 **without** minting `docs/products/collectibles/BUILD_QUEUE.json`. Executable V1 steps are BP slices on `docs/products/universal-overlay/BUILD_QUEUE.json` (`COLLECTIBLES-V1-*`, source → `MASTER_BLUEPRINT.md`). Factories split by lane owns.
