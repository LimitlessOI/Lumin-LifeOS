# Reboot Index

## Canonical purpose

This directory is the source of truth for the reboot effort.

It exists so a cold model can answer:

- what is this rebuild
- what has already been decided
- what parts from the old system survive
- what mission is active now
- where should I resume

## Files

- `README.md`
  - what this workspace is
- `WORKSPACE_STATUS.md`
  - current truth about progress
- `HANDOFF.md`
  - exact resume instructions
- `IMPLEMENTATION_GUIDE.md`
  - **start here to code**: commands, mission map, next-slice playbook
- `MISSION_EXECUTION_MODE.md`
  - verify/copy vs greenfield rules
- `AUTO_PILOT_PROTOCOL.md`
  - exact execution loop for limited-usage Cursor models
- `DETERMINISM_TEST_RUNBOOK.md`
  - exact same-tier test for coder determinism
- `MISSION_QUEUE.json`
  - canonical mission/task ordering
- `CURRENT_STATE.json`
  - active truth, active task, append-only receipts
- `PARTS_CAR_MANIFEST.json`
  - keep/adapt/reject decisions for old-system assets
- `MISSIONS/`
  - actual BPB output packs
- `scripts/`
  - mission executor + acceptance tooling
- `../factory-staging/`
  - materialized runtime (output of FACTORY-REBOOT-0004)

## Active mission

- `MISSIONS/FACTORY-REBOOT-0004/` — proof materialize (execute with `npm run factory:materialize`)

## Upstream design sources

These are design sources, not direct coder input:

- `docs/architecture/factory-v1-blueprint-pack/CANONICAL_FACTORY_FOUNDATION_V1.md`
- `docs/architecture/factory-v1-blueprint-pack/CODER_ZERO_DECISION_BUILD_SPEC_V1.md`
- `docs/architecture/factory-v1-blueprint-pack/GOLDMINE_PASS_V2.md`
- `docs/architecture/factory-v1-blueprint-pack/SYSTEM_TOOL_INVENTORY_AUDIT_V1.md`
- `docs/architecture/factory-v1-blueprint-pack/OLD_STACK_BUILDER_STRUCTURE_AUDIT_V1.md`

## Non-negotiables

- coder makes no decisions
- same-tier determinism only
- strategic ambiguity must never reach BPB in the normal path
- old system is a parts car, not a live authority base
