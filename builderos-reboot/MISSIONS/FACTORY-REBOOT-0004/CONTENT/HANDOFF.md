<!-- SYNOPSIS: Handoff -->

# Handoff

## For Adam (one command)

```bash
npm run factory:readiness
```

Full regression (for tomorrow's review):

```bash
npm run factory:ci
```

## What's done (factory reboot track)

| Range | What |
|-------|------|
| 0001–0010 | Bootstrap, materialize staging, execute-step/mission, council quarantine, autopilot |
| 0011–0015 | Cutover bundle, determinism, greenfield, HTTP client, mission history |
| 0016–0020 | Greenfield 3×, duplication test, queue dry-run, `lumin-factory/` init, factory CI |
| 0021–0025 | SENTRY mechanical checks, mission index, readiness v3, certification, operator guide |

**26 mission packs** (25 reboot + 1 greenfield). **387 files** in cutover bundle.

## Honest status

| Claim | Valid? |
|-------|--------|
| STAGING_READY_EXTENDED | Yes if `npm run factory:ci` passes |
| Blueprint duplicability | Yes — see `DUPLICATION_RECEIPT.json` |
| `lumin-factory/` ready | Yes locally — **not on GitHub yet** |
| FULLY_MACHINE_READY | **No** |
| Whole LifeOS product | **No** — factory platform only |

## Your next steps

1. **Push to GitHub:** see `builderos-reboot/OPERATOR_COMPLETE.md`
2. **Optional:** 3-session coder test (`DETERMINISM_CODER_PROMPT.md`)
3. **Tomorrow's review:** open `builderos-reboot/EVALUATION_PACKET.md`

## Reviewer commands

```bash
npm run factory:sentry
cat builderos-reboot/PROJECT_CERTIFICATION.json
```
