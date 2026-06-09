# Machine layer / mission-pack authority

You are in **`builderos-reboot/`** — the governed rebuild workspace, not the old LifeOS runtime.

## What this layer is

- Step-atomic mission packs (`MISSIONS/FACTORY-REBOOT-*`)
- `BLUEPRINT.json` + sha256 pins + `ACCEPTANCE_TESTS.json`
- Generated receipts (`FULL_LOOP_PROOF_RECEIPT.json`, `PROJECT_CERTIFICATION.json`, etc.)
- Mission queue order (`MISSION_QUEUE.json`) — **index only**, not a runtime work queue

## Authority

- **This is machine-layer authority** for the factory reboot program.
- Runtime code materializes into **`factory-staging/`** when steps execute.
- **This is not** live Railway LifeOS product code.

## Before you edit

1. Read `HANDOFF.md` and `WORKSPACE_STATUS.md`
2. Read `prompts/00-SYSTEM-AUTHORITY-LAYERS.md`
3. Respect `MISSION_SHARED_FILE_OWNERSHIP.md` for shared files

## Before you end a session

Update `HANDOFF.md` and `WORKSPACE_STATUS.md` when material state changes.

## Verify

```bash
npm run factory:ci
```

See also: `README.md`, `INDEX.md`
