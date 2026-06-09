# Lumin Factory Staging

This directory is the **materialized runtime staging area** for the clean factory rebuild.

It is produced by executing `FACTORY-REBOOT-0004` — not hand-edited during normal coder runs.

## What lives here

- `factory-core/` — Builder, SENTRY, Historian, TSOS, readiness payloads (from mission 0003)
- `factory-core/canon/services/` — parts-car imports (council-service)
- `server.js` — minimal composition root for local smoke checks
- `scripts/factory-self-check.mjs` — syntax + presence verification

## Commands

From repo root:

```bash
npm run factory:materialize          # execute mission 0004 (all steps)
npm run factory:acceptance           # verify all mission packs
cd factory-staging && npm install && npm run check
```

## Authority

- Blueprint queue: `builderos-reboot/MISSIONS/`
- Do not treat this tree as live production until proof-mission receipts exist.
