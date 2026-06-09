# Canonical factory runtime

You are in **`factory-staging/`** — the governed factory execute-step system.

## What this layer is

- Hot path: `POST /factory/execute-step` (BPB intake → Builder → SENTRY → TSOS → Historian)
- `factory-core/` payloads (builder, sentry, historian, tsos, readiness, bpb, canon)
- Staging composition root (`server.js`, `startup/register-routes.js`)

## Authority

- **This is canonical factory runtime** for new factory/platform work.
- Mission packs in `builderos-reboot/MISSIONS/` are the machine source; this tree is what they materialize.
- **Not** the same as production `routes/lifeos-council-builder-routes.js` (legacy production spine).

## Rules

- Prefer mission-driven changes with hash pins over ad-hoc edits.
- Do not treat this as “live LifeOS product” until cutover receipts say so.
- `data/*.jsonl` under staging are evidence — not doctrine.

## Verify

```bash
npm run factory:ci
npm run factory:tools
cd factory-staging && npm run check
```

See also: `README.md`, `prompts/00-SYSTEM-AUTHORITY-LAYERS.md`
