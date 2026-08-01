<!-- SYNOPSIS: Phase 7 Railway Probe Merge Confirmation -->

# Phase 7 Railway Probe Merge Confirmation

This document serves as the formal PR note for merging the `phase7-railway-probe`
branch into `main` for the memory-system product.

## Scope

The `phase7-railway-probe` branch contains the memory-system Phase 7 work:

- `scripts/memory-pressure-test.mjs` — live-mode pressure test against real Neon state.
- `scripts/deploy_railway.js` — helper to deploy the probe branch to Railway.
- `scripts/verify_railway_deploy.js` — verification of the live-mode result.

## Readiness

- All schema prerequisites verified against production (four required tables present).
- Deployment and verification scripts are present and export the expected symbols.
- Final PR merge is recommended once Railway credentials (`RAILWAY_TOKEN`) are available.

## Notes

- This is a **final PR merge** recommendation, not an autonomous merge; human
  review is expected for composition-root/constitutional safety.
- The orchestration script `scripts/orchestrate_phase7_railway_probe_verification.mjs`
  can be run after merge to re-verify the 20/20 result live.
