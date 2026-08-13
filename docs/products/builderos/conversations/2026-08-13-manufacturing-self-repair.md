<!-- SYNOPSIS: Product capture — BuilderOS manufacturing self-repair after overnight thrash. -->

# 2026-08-13 — Manufacturing self-repair

**Product:** builderos  
**Founder ask:** Fix all observed issues so factories self-repair without Cursor.

## Decisions

- Tip owns queue persist for promote/stamp; lanes retry ship and apply playbooks in-memory.  
- Sealed twins with only `content_source_path` are valid `write_file_exact` (never silent author downgrade).  
- `already_running` is a reclaimable lock, not a redeploy event.

## Shipped surfaces

- `services/manufacturing-self-repair.js`  
- `services/governed-autonomous-shipping-loop.js` (`reclaimStaleShipLock`, apply repair)  
- `routes/factory-mount-routes.js` (mkdir/ENOENT)  
- `factory-staging/factory-core/bpb/build-queue-step-adapter.js`  
- `scripts/run-factory-lane.mjs` + `scripts/lib/system-watchdog.mjs`  
- `tests/manufacturing-self-repair.test.js`
