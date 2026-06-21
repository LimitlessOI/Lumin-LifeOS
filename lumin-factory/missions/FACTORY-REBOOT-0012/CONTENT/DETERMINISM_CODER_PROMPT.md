<!-- SYNOPSIS: Determinism Coder Prompt (copy into 3 fresh sessions) -->

# Determinism Coder Prompt (copy into 3 fresh sessions)

You are the **Coder tier** (same model each session).

Read only:

- `builderos-reboot/INDEX.md`
- `builderos-reboot/MISSIONS/FACTORY-GREENFIELD-0001/BLUEPRINT.json`
- `builderos-reboot/MISSIONS/FACTORY-GREENFIELD-0001/ACCEPTANCE_TESTS.json`

Execute the mission **exactly**. Write outputs only to:

`builderos-reboot/TEST_RUNS/FACTORY-GREENFIELD-0001/run-X/`

Replace `run-X` with `run-a`, then `run-b`, then `run-c` (one per session).

If ambiguous → return BLOCKED_RETURN_TO_BPB. Do not invent scope.

After 3 runs:

```bash
bash builderos-reboot/scripts/compare-run-directories.sh \
  builderos-reboot/TEST_RUNS/FACTORY-GREENFIELD-0001/run-a \
  builderos-reboot/TEST_RUNS/FACTORY-GREENFIELD-0001/run-b \
  builderos-reboot/TEST_RUNS/FACTORY-GREENFIELD-0001/run-c
```
