# Determinism Test Runbook

## Purpose

This runbook tests whether a BPB pack is deterministic enough for the intended coder model tier.

Rule:

- use the same model tier intended for real coder execution
- do not use a stronger model to certify a weaker execution model

## What this test can prove

It can prove:

- whether the machine packet is concrete enough for the chosen coder model tier
- whether two or more fresh sessions produce materially identical outputs

It cannot prove:

- that a BPB source spec is coder-ready if it has not yet been converted into machine packets

## Current recommended test target

Use:

- `builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/`

This is a real BPB mission pack.

It is a bootstrap mission, not the full rebuild.
That is fine.
The purpose is to validate the test method and the current BPB quality level.

## Recommended model tier

For your current intended coder test:

- `Composer 2.5 Fast`

This is acceptable as the coder-tier test model if that is the tier you intend to use for low-discretion coding execution.

## Test setup

Create three clean run directories:

- `builderos-reboot/TEST_RUNS/FACTORY-REBOOT-0001/run-a/`
- `builderos-reboot/TEST_RUNS/FACTORY-REBOOT-0001/run-b/`
- `builderos-reboot/TEST_RUNS/FACTORY-REBOOT-0001/run-c/`

Each run must start from:

- same repo state
- same active branch state
- same mission pack
- fresh chat/session
- same model tier

## Exact instruction to give the model

Use this in each fresh Cursor session:

```text
You are the Coder tier.
Read only these files first:
- builderos-reboot/INDEX.md
- builderos-reboot/WORKSPACE_STATUS.md
- builderos-reboot/AUTO_PILOT_PROTOCOL.md
- builderos-reboot/CURRENT_STATE.json
- builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/README.md
- builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/PRODUCT_DEVELOPMENT_RESULT.json
- builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/FOUNDER_PACKET.json
- builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLUEPRINT.json
- builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/ACCEPTANCE_TESTS.json
- builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/AUTHORITY_CHECK.json
- builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/SALVAGE_MAP.json
- builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLOCKED_RETURN_SCHEMA.json

Execute the mission pack exactly.
Do not widen scope.
Do not improve the architecture.
Do not choose different files.
Do not invent tasks.
Write outputs only into this run directory:
builderos-reboot/TEST_RUNS/FACTORY-REBOOT-0001/run-X/

Mirror the mission outputs there exactly.
If the packet is ambiguous, return BLOCKED_RETURN_TO_BPB with the exact blocker payload.
```

Replace `run-X` with:

- `run-a`
- `run-b`
- `run-c`

## Pass condition

The test passes only if:

1. all runs complete without invented tasks
2. all runs produce the same file set
3. all files are materially identical
4. no run required non-coding judgment

## Fail condition

The test fails if:

- one run blocks and another does not
- file sets differ
- file contents differ materially
- one run invents extra files, edits, or logic
- the model has to interpret missing structure

If it fails:

- BPB failed
- tighten the pack
- rerun

## Compare command

After all runs complete:

```bash
bash builderos-reboot/scripts/compare-run-directories.sh \
  builderos-reboot/TEST_RUNS/FACTORY-REBOOT-0001/run-a \
  builderos-reboot/TEST_RUNS/FACTORY-REBOOT-0001/run-b \
  builderos-reboot/TEST_RUNS/FACTORY-REBOOT-0001/run-c
```

## Honest interpretation of results

### If FACTORY-REBOOT-0001 passes

That means:

- the bootstrap BPB pack is deterministic enough for the tested coder tier

It does not mean:

- the full rebuild is coder-ready

### If FACTORY-REBOOT-0001 fails

That means:

- even the bootstrap pack is not yet tight enough
- BPB needs tightening before larger missions

## Current readiness judgment

Current judgment:

- ready to run a bootstrap determinism test now: `yes`
- ready to claim the full rebuild is coder-ready now: `no`

That is the honest boundary.
