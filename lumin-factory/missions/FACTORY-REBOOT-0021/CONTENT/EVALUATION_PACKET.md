# Evaluation Packet — Factory Reboot

**For:** Tomorrow's model review  
**Generated:** Mission FACTORY-REBOOT-0021  
**Operator one-liner:** `npm run factory:ci`

## What was built

- **25 blueprint missions** (FACTORY-REBOOT-0001 → 0025) + FACTORY-GREENFIELD-0001
- **factory-staging/** live runtime with execute-step, execute-mission, council quarantine, mission history
- **lumin-factory/** git-ready standalone repo (not pushed — needs Adam's GitHub)
- **Mechanical proofs:** acceptance, integration, determinism, greenfield 3×, duplication rematerialize, queue dry-run

## Commands to run (in order)

```bash
npm run factory:readiness
npm run factory:ci
npm run factory:sentry
cat builderos-reboot/PROJECT_CERTIFICATION.json
```

## Honest boundaries (do not overclaim)

| Claim | Status |
|-------|--------|
| STAGING_READY | Verify via readiness report |
| Blueprint duplicability | DUPLICATION_RECEIPT.json |
| FULLY_MACHINE_READY | **NO** — human 3-session coder test optional |
| Lumin-Factory on GitHub | **NO** — local `lumin-factory/` only |
| Full LifeOS product | **NO** — factory platform only |

## Files reviewers should read

1. `builderos-reboot/HANDOFF.md`
2. `builderos-reboot/CURRENT_STATE.json`
3. `builderos-reboot/READINESS_REPORT.json`
4. `builderos-reboot/SENTRY_CHECK_RESULT.json`
5. `builderos-reboot/CLAUDE_CODE_SENTRY_REVIEW_PROMPT.md`

## Grade rubric suggestion

- **9–10:** All CI pass, duplication receipt pass, honest docs, no authority drift
- **6–8:** CI pass with minor gaps documented
- **<6:** Any acceptance fail or misleading STAGING_READY claim
