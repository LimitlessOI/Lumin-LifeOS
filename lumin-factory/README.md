# BuilderOS Reboot Workspace

This directory is the canonical reboot workspace for the new `Lumin / BuilderOS` rebuild.

Purpose:

- give every model one place to start
- preserve cold-start continuity when usage is lost
- hold the actual BPB outputs
- record what was mined from the old system
- separate canonical reboot work from the overgrown mixed-era runtime

This workspace is not the old runtime.
It is the governed rebuild area.

## Read order

1. `builderos-reboot/INDEX.md`
2. `builderos-reboot/WORKSPACE_STATUS.md`
3. `builderos-reboot/HANDOFF.md`
4. `builderos-reboot/AUTO_PILOT_PROTOCOL.md`
5. `builderos-reboot/CURRENT_STATE.json`
6. `builderos-reboot/MISSION_QUEUE.json`
7. `builderos-reboot/PARTS_CAR_MANIFEST.json`
8. current mission folder under `builderos-reboot/MISSIONS/`

## Current state

- canonical reboot workspace exists
- parts-car manifest exists
- first BPB mission pack exists
- first mission pack scope is the bootstrap layer, not the full factory build

## Rule

If a model touches this workspace, it must update:

- `WORKSPACE_STATUS.md`
- `HANDOFF.md`

before ending the session.
