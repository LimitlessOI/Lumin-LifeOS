<!-- SYNOPSIS: Archived product BUILD_QUEUE files — dead, not live, not SSOT -->

# THESE ARE NOT LIVE QUEUES

**Moved here on 2026-08-12 by founder order: there can only be one queue.**

The only live `BUILD_QUEUE.json` is:

`docs/products/universal-overlay/BUILD_QUEUE.json`

Every other product and project queue that used to live under `docs/products/<id>/BUILD_QUEUE.json` or `docs/projects/**/BUILD_QUEUE.json` was **moved** here. Not copied. Not stubbed. Not re-exported. The old path is gone.

If something still calls `loadBuildQueue('lifeos')` or writes a second queue, it is supposed to throw `SECOND_QUEUE_FORBIDDEN`. That is the point.

Do not put these files back. Do not plan a new queue for a non-overlay product. Salvage ideas from these files the way this archive already works — as a parts car — then put real work on the overlay print.
