<!-- SYNOPSIS: Mission Execution Mode -->

# Mission Execution Mode

## Current mode: verify / copy (not greenfield)

Missions `FACTORY-REBOOT-0001`, `FACTORY-REBOOT-0002`, and `FACTORY-REBOOT-0003` are **payload verification missions**, not greenfield code generation missions.

Each step uses:

- `action_type`: `write_file_exact`
- `exact_inputs.content_source_path`: same path as `target_file`

That means the Builder's job for these missions is to **reproduce byte-exact copies of files that already exist in the repo**, not to invent new content from a spec paragraph.

## What this proves

- Blueprint pins are enforceable (`sha256` on disk matches `exact_output_contract`)
- Acceptance tests can mechanically verify outputs
- Mission packs are structurally complete for SENTRY review

## What this does not prove

- That a low-tier coder can **greenfield** build new logic from prose alone
- That same-tier determinism holds when the coder must **author** new files

For greenfield proof, emit a **proof mission** (`FACTORY-REBOOT-0004` or later) whose steps omit `content_source_path` and require generated content with pinned acceptance tests.

## Acceptance test tooling

From repo root:

```bash
node builderos-reboot/scripts/sync-acceptance-from-blueprint.mjs FACTORY-REBOOT-0001
node builderos-reboot/scripts/run-mission-acceptance.mjs FACTORY-REBOOT-0001
node builderos-reboot/scripts/run-all-mission-acceptance.mjs
```

`S010` acceptance tests are **derived from blueprint** (no self-referential sha256 pin).

## Same-tier determinism

See `DETERMINISM_TEST_RUNBOOK.md`. For verify/copy missions, local acceptance runs are the structural determinism check. Full same-tier coder determinism still requires three fresh sessions on a **greenfield** mission pack.
