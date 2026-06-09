# Auto-Pilot Protocol

This protocol exists so a coding model in Cursor can keep building through multiple sessions without re-deriving the system from chat.

## Goal

Allow a model to:

- pick up the next approved unit of work
- execute only that unit
- verify it
- leave a precise receipt
- stop cleanly when usage runs out

## What auto-pilot does not mean

It does not mean:

- free-form autonomy
- inventing new work
- changing architecture
- widening scope
- skipping verification

It means:

- strict queue-following execution
- deterministic next-step selection
- append-only receipts
- resumable work packets

## Required files

- `builderos-reboot/INDEX.md`
- `builderos-reboot/WORKSPACE_STATUS.md`
- `builderos-reboot/HANDOFF.md`
- `builderos-reboot/MISSION_QUEUE.json`
- `builderos-reboot/CURRENT_STATE.json`
- current mission pack under `builderos-reboot/MISSIONS/`

## Model boot order

Every model session must read:

1. `builderos-reboot/INDEX.md`
2. `builderos-reboot/WORKSPACE_STATUS.md`
3. `builderos-reboot/CURRENT_STATE.json`
4. `builderos-reboot/MISSION_QUEUE.json`
5. `builderos-reboot/HANDOFF.md`
6. active mission pack files

If the model skips this, it is off protocol.

## Model execution loop

1. Read `CURRENT_STATE.json`
2. Find the first mission with status `ready` or `in_progress`
3. Take the first `pending` task only
4. Execute only that task
5. Run the required acceptance checks for that task
6. Update task status
7. Append receipt to `CURRENT_STATE.json`
8. Update `WORKSPACE_STATUS.md`
9. Update `HANDOFF.md`
10. Stop

One task per loop is safer than many.

## Stop conditions

The model must stop and update handoff if:

- usage is getting low
- a blocker occurs
- acceptance fails and cannot be repaired inside the task boundary
- strategic ambiguity is discovered
- required context is missing

## Hard rules

- never pick a different task because it looks easier
- never invent a missing task
- never continue after a blocker that demands non-coding judgment
- never skip receipts
- never skip handoff updates
- never mark complete without acceptance evidence

## Session receipt format

Every session should leave:

- mission id
- task id
- status
- files changed
- acceptance run
- blocker if any
- exact next resume point

## Recommended usage strategy

For limited-usage models:

- keep tasks small
- prefer one task per session
- front-load file reads
- avoid giant speculative edits
- require append-only state updates before ending

That is how you get practical auto-pilot without drift.
