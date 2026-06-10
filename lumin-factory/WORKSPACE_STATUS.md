# Workspace Status

Date: `2026-06-10`

## Phase

**Factory reboot complete: missions 0001–0025 + GREENFIELD-0001.** Verdict: **STAGING_READY_EXTENDED** (all CI checks pass).

**2026-06-10 security hotfix:** standalone execute-step runtime now canonicalizes repo-relative
paths before sandbox checks, rejects source paths outside the repo, and verifies byte-exact SHA
before writing. Regression proof added to `scripts/factory-execute-step-integration.mjs`;
rerun `npm run factory:ci` from `lumin-factory/`.

## Adam's status check

```bash
npm run factory:readiness    # quick
npm run factory:ci           # full regression
```

## Phases 16–25 (final arc)

| # | Mission | What it adds |
|---|---------|--------------|
| 16 | 0016 | Greenfield 3× mechanical determinism |
| 17 | 0017 | Blueprint duplication test (delete + rematerialize) |
| 18 | 0018 | Queue dry-run (all blueprints parseable) |
| 19 | 0019 | `lumin-factory/` git-ready repo init |
| 20 | 0020 | `npm run factory:ci` umbrella |
| 21 | 0021 | SENTRY mechanical checks + `EVALUATION_PACKET.md` |
| 22 | 0022 | `MISSION_PACK_INDEX.json` |
| 23 | 0023 | Readiness report v3 (extended checks) |
| 24 | 0024 | `PROJECT_CERTIFICATION.json` |
| 25 | 0025 | `OPERATOR_COMPLETE.md` |

## Key artifacts

- `lumin-factory/` — standalone repo root (git-ready, not pushed)
- `lumin-factory-bundle/` — portable export (387 files)
- `builderos-reboot/PROJECT_CERTIFICATION.json` — honest claim boundaries
- `builderos-reboot/DUPLICATION_RECEIPT.json` — blueprint duplicability proof
- `builderos-reboot/GREENFIELD_DETERMINISM_RECEIPT.json` — greenfield 3× proof
- `builderos-reboot/SENTRY_CHECK_RESULT.json` — mechanical SENTRY pass

## Not done (requires Adam or human coder)

- Push `lumin-factory/` to new GitHub repo
- Optional 3-session coder determinism (`DETERMINISM_CODER_PROMPT.md`)
- Qualitative SENTRY review tomorrow (`CLAUDE_CODE_SENTRY_REVIEW_PROMPT.md`)
- FULLY_MACHINE_READY / whole LifeOS product — **out of scope for this track**
