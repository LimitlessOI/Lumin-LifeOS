<!-- SYNOPSIS: Twin-archive dump — founder asked to fix all observed manufacturing thrash classes. -->

# 2026-08-13 — Manufacturing self-repair

**Who:** Adam (founder)  
**When:** 2026-08-13  
**Topic:** Close overnight failure classes without Cursor GAP-FILL

## Founder position (verbatim intent)

Fix all the issues observed. Prior critique: overnight closed product slices via conductor, but did **not** make the system self-repair without Cursor.

## Failure classes addressed

1. Missing parent dir / tip import-check ENOENT thrash → mkdir + retry  
2. Stuck `already_running` → tip reclaim after 90s + lane retry  
3. Sealed exact silently downgraded to `author_then_write` → preserve `content_source_path` + promote on thrash  
4. Watchdog findings advisory-only → `executeManufacturingWatchdogPlaybooks` + tip persist promote/stamp  

## Machine path

`services/manufacturing-self-repair.js` + tip governed ship revive + factory lane retry. Ship via `system:commit-files` + Railway redeploy.
