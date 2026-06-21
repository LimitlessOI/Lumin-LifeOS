<!-- SYNOPSIS: Working tree snapshot (2026-06-12T20-06-17Z) -->

# Working tree snapshot (2026-06-12T20-06-17Z)

**Hist review queue** — uncommitted local changes parked by operator request.

- **Base commit:** `f2555dfeee6a775063aea39db65f6facfd3868f9`
- **Files:** 99
- **Contents:** `files/` mirrors repo-relative paths

## Why this exists

Overnight autopilot / mission runners and IDE sessions were mutating tracked files without committing.
Canonical product queue remains `builderos-reboot/BP_PRIORITY.json` on `main`.
Hist-owned autopilot artifacts: see `builderos-reboot/HIST_DOMAIN_REGISTRY.json` (in snapshot if present).

## Hist actions

1. Read `MANIFEST.json` for full file list + status
2. Salvage anything worth promoting → mission + `BP_PRIORITY.json`
3. Discard noise — do **not** restore bulk amendment title churn without council review

## Restore a single file (if needed)

```bash
cp builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/2026-06-12T20-06-17Z/files/<path> <path>
```
