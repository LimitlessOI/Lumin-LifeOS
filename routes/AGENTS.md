<!-- SYNOPSIS: Legacy production spine (routes) -->

# Legacy production spine (routes)

You are in **`routes/`** — the **legacy production spine** for live LifeOS on Railway.

## What this layer is

- Express route modules mounted by `startup/register-runtime-routes.js`
- Includes production builder (`lifeos-council-builder-routes.js`), command center, deploy/env helpers, product domains

## Authority

- **Callable and often live** — do not break active callers casually.
- **Not canonical factory runtime** — factory work belongs in `factory-staging/` + `builderos-reboot/` unless Adam explicitly asked for production spine work or a documented GAP-FILL applies.

## Before extending here

1. Read `prompts/00-SYSTEM-AUTHORITY-LAYERS.md`
2. Read `CLAUDE.md` builder-first / §2.11 — prefer `POST /api/v1/lifeos/builder/build` for product deliverables
3. Check `docs/architecture/BUILDEROS_CLASSIFICATION_LOCK.md` for locked canonical vs legacy paths within this tree

## Legacy vs locked-within-spine

Some files are **legacy within the spine** (e.g. `command-center-routes.js`); others are **current production surfaces** (e.g. `lifeos-command-center-routes.js`). Both remain **production spine**, not factory authority.

**Full legacy map (Hist-owned):** `docs/architecture/HIST_LEGACY_SYSTEM_REGISTRY.md` — experiment buckets, retired providers, deploy surfaces. Default: **do not extend** legacy paths.

## ADAPT path to factory

When mining old routes for the factory, use Goldmine / salvage missions — do not silently duplicate authority in both places.
