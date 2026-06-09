# Mission shared file ownership

When the same `target_file` appears in multiple mission blueprints, **only the latest canonical step** produces the current bytes. Re-running an older mission step will fail sha256 verification or overwrite with stale CONTENT.

## Canonical owners (factory reboot)

| Target file | Canonical step | Mission |
|-------------|----------------|---------|
| `factory-staging/factory-core/builder/run-step.js` | S2904 | FACTORY-REBOOT-0029 |
| `factory-staging/factory-core/builder/run-mission.js` | S601 | FACTORY-REBOOT-0006 |
| `factory-staging/startup/register-routes.js` | S2905 | FACTORY-REBOOT-0029 |
| `builderos-reboot/scripts/readiness-report.mjs` | S2301 | FACTORY-REBOOT-0023 |
| `builderos-reboot/scripts/emit-project-certification.mjs` | S2801 | FACTORY-REBOOT-0028 |
| `builderos-reboot/scripts/factory-ci.mjs` | S2001 | FACTORY-REBOOT-0020 |

## Duplication test rule

`factory-duplication-test.mjs` deletes shared runtime files and rematerializes **canonical steps only** — not full missions 0005/0006/0015.

## BPB rule going forward

When updating a shared file:

1. Edit `CONTENT/` in the **owning** mission (or create a new mission that supersedes)
2. Run `refresh-blueprint-hashes.mjs` on that mission
3. Do **not** expect older missions to rematerialize the same file without refresh

## Anti-pattern

Running `execute-mission.mjs FACTORY-REBOOT-0005` after 0013 has updated `run-step.js` will copy **stale** 0005 CONTENT unless 0005 CONTENT was synced.
