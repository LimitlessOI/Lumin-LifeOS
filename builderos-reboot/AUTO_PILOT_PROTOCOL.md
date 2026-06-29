<!-- SYNOPSIS: Auto-Pilot Protocol -->

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
- queue chooses next work; blueprint governs the work
- deterministic next-step selection
- append-only receipts
- resumable work packets

## Required files

- `builderos-reboot/INDEX.md`
- `builderos-reboot/WORKSPACE_STATUS.md`
- `builderos-reboot/HANDOFF.md`
- `builderos-reboot/BP_PRIORITY.json`
- `builderos-reboot/CURRENT_STATE.json`
- current mission pack under `builderos-reboot/MISSIONS/`

## Model boot order

Every model session must read:

1. `builderos-reboot/INDEX.md`
2. `builderos-reboot/WORKSPACE_STATUS.md`
3. `builderos-reboot/CURRENT_STATE.json`
4. `builderos-reboot/BP_PRIORITY.json`
5. `builderos-reboot/HANDOFF.md`
6. active mission pack files

If the model skips this, it is off protocol.

## Model execution loop

1. Read `CURRENT_STATE.json`
2. Read the highest-priority eligible item from `BP_PRIORITY.json`
3. Load that item's mission packet and blueprint, then take the first `pending` task only
4. Execute only that task
5. Run the required acceptance checks for that task
6. Update task status
7. Update queue state in `BP_PRIORITY.json`
8. Update the mission's blueprint-aligned state and product authority surfaces so queue state and blueprint truth remain synchronized
9. Append receipt to `CURRENT_STATE.json`
10. Update `WORKSPACE_STATUS.md`
11. Update `HANDOFF.md`
12. Write or append the product-local history trail for the run so later agents can audit causality, regressions, and decisions
13. Stop

One task per loop is safer than many.

## Stop conditions

The model must stop and update handoff if:

- usage is getting low
- a blocker occurs
- acceptance fails and cannot be repaired inside the task boundary
- strategic ambiguity is discovered
- founder direction is discovered to be an engineering mistake or architecture error
- required context is missing

## Hard rules

- never pick a different task because it looks easier
- never invent a missing task
- never treat the queue as a substitute for the blueprint
- never update queue status without updating the linked blueprint/product history surfaces in the same governed action
- never continue after a blocker that demands non-coding judgment
- never silently accept founder wording that creates engineering drift; challenge it before execution
- never skip receipts
- never skip handoff updates
- never mark complete without acceptance evidence
- **never advance a mission phase without Tier 1 telemetry** (`npm run factory:tier1:verify`)

## Tier 1 enforcement loop

For missions with `telemetry_enforcement: true` or status in the debug/BP audit set:

1. Run `npm run factory:tier1:report` — writes `TIER1_CHECK_RESULT.json` per mission
2. If `TIER1_FAIL` → **stay in loop** (BPB / SENTRY mechanical / debug) until `MISSION_TELEMETRY_RECEIPT.json` is complete
3. If Tier 1 passes but SENTRY receipt missing → **SENTRY mechanical loop**
4. If honest `BP_AUDIT_FAIL` with evidence → **route to BPB** (this is progress, not defeat)
5. Only when Tier 1 + trustworthy SENTRY verdict → phase may advance

See `builderos-reboot/SNT_TELEMETRY_DOCTRINE.md` and `ALPHA_MISSION_TELEMETRY_CONTRACT.json`.

## Session receipt format

Every session should leave:

- mission id
- task id
- status
- queue state change
- blueprint/product sync artifact paths
- files changed
- acceptance run
- blocker if any
- exact next resume point
- history trail path for later forensic review

## Recommended usage strategy

For limited-usage models:

- keep tasks small
- prefer one task per session
- front-load file reads
- avoid giant speculative edits
- require append-only state updates before ending

That is how you get practical auto-pilot without drift.
