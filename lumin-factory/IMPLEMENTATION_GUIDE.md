<!-- SYNOPSIS: Factory Implementation Guide -->

# Factory Implementation Guide

**Updated:** 2026-06-09

## One-command status

```bash
npm run factory:ci      # full regression (13 checks)
npm run factory:readiness
```

## Architecture

| Layer | Location | Role |
|-------|----------|------|
| Mission packs | `builderos-reboot/MISSIONS/` | Frozen blueprints + acceptance |
| Executor | `builderos-reboot/scripts/` | Mechanical step runner |
| Staging runtime | `factory-staging/` | Materialized payloads + server |
| Standalone cutover | `lumin-factory/` | Git-ready export |

## Mission map (summary)

| Range | Scope |
|-------|-------|
| 0001–0004 | Bootstrap, segments, materialize staging |
| 0005–0010 | Live dispatch, council quarantine, autopilot, export |
| 0011–0025 | Cutover bundle, determinism, greenfield, CI, certification |
| 0026–0028 | Phase 11 full loop, Phase 12 salvage, cert v2 |
| GREENFIELD-0001 | First `exact_content` proof |
| PROOF-LOOP-0001 | Phase 11 governed loop anchor |

## How to add a governed file

1. Put bytes in `MISSIONS/.../CONTENT/` or pin `content_source_path`
2. Add blueprint step with sha256 contract
3. `node builderos-reboot/scripts/sync-acceptance-from-blueprint.mjs <MISSION>`
4. `node builderos-reboot/scripts/execute-mission.mjs <MISSION>`

**Do not hand-edit `factory-staging/`** for governed work.

## Shared files

See `MISSION_SHARED_FILE_OWNERSHIP.md` before rematerializing missions that touch `run-step.js`, `register-routes.js`, etc.

## Execute-step (live)

`POST /factory/execute-step` runs `runWriteFileExact` then **SENTRY** `verifyStepContract` (acceptance + builder status). Returns 409 if SENTRY contract fails.

## Evidence checklist

- [ ] `npm run factory:ci` → ALL PASS
- [ ] `npm run factory:duplication` → pass
- [ ] `npm run factory:full-loop` → pass
- [ ] `PROJECT_CERTIFICATION.json` → `FULLY_MACHINE_READY: false` until 3-session coder test

## Script reference

| Script | Purpose |
|--------|---------|
| `execute-mission.mjs` | Full mission + acceptance |
| `execute-mission-step.mjs` | One step |
| `factory-ci.mjs` | Umbrella regression |
| `refresh-blueprint-hashes.mjs` | Re-pin sha256 from disk |
| `run-full-loop-proof.mjs` | Phase 11 orchestration proof |
