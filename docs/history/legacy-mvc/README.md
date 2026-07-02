<!-- SYNOPSIS: Archived legacy Express-MVC island (api/controllers/workers/models) -->

# Legacy Express-MVC island — archived 2026-07-02

This directory holds the pre-product **Express-MVC app** that is no longer part of
the live LifeOS runtime. Source files are stored **inert as `*.js.txt`** so they
are not importable, not subject to FILE SYNOPSIS LAW, and not scanned by the
import-resolution guard. **Nothing was deleted** — strip the `.txt` suffix to
restore a module.

## What was moved

| Original dir | Files | Nature |
|---|---|---|
| `api/` | 13 | old REST layer (`learningRoutes.js`, `climate.js`, `quantum.js`, `grpc/`, `routes/`, ...) |
| `controllers/` | 4 | MVC controllers (`callAnalyzerController.js`, ...) |
| `workers/` | 1 | `learningQueue.js` |
| `models/` | 25 | Sequelize models (`outreachLog.js`, ...) |

## Evidence it is dead (2026-07-02 audit)

1. **0-reachable from the live boot graph.** madge import-closure of all three
   entrypoints (`server.js` 741 modules, `server-founder-runtime.js` 323,
   `server-full-runtime.js` 737 — union 741) contains **zero** files from
   `api/ controllers/ workers/ models/`.
2. **Import-broken.** These modules (and the services they wire to —
   `config/db.js`, `ConfigService.js`, `adaptiveModel.js`, `analysisService.js`,
   `transcriptionService.js`, ...) import npm packages that are **no longer
   installed** (`sequelize`, `joi`, `openai`, `winston`, `brain.js`, `natural`),
   so they cannot even load.
3. **No governance references.** No product `docs/products/*/FILE_MANIFEST.json`
   lists any file in these dirs (the `api/` hits in manifests are `/api/v1/...`
   endpoint URLs, not this directory). Remaining references live only in
   `audit/reports/*` (historical evidence) and `docs/REPO_CATALOG.json` (a
   regeneratable catalog) — neither is a CI gate.

## Recovery

`git mv docs/history/legacy-mvc/<dir> ../../<dir>` then rename `*.js.txt` → `*.js`,
reinstall the missing packages, and re-point imports. See
`docs/history/REPO_CLEANUP_INVENTORY_2026-07-02.md` §5 for the full audit.
