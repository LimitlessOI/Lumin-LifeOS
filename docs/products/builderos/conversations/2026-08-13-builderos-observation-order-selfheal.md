<!-- SYNOPSIS: BuilderOS observation — right work, right order, self-heal -->

# BuilderOS observation — right work, right order, self-heal

**Date:** 2026-08-13  
**Surface:** Cursor  
**Founder ask:** Observe BuilderOS; ensure it works on the right things in the right order, does them well, and finds/fixes its own issues.

## Verbatim

> ok i wnat you to abserve the builderos and make sure it is working on the rith things in the right order and doing it well and that it finds its own issues and fixes them

## What was true

| Lane | Expected | Observed |
|------|----------|----------|
| factory-1 | Overlay print via tip ship | ANDROID-BODY shipped; WIRE shipped then false-blocked `missing_exports:makeAndroidBody` though export on HEAD |
| factory-2 | Native / Taloa | Healthy (prior); next print is macOS perception |
| factory-3 | Collectibles BP slices on one queue | Pending twin/mtg/routes/acceptance; tip returned `no_shippable_steps` |

One manufacturing queue: `docs/products/universal-overlay/BUILD_QUEUE.json` (Collectibles as BP slices). No second queue.

## Root cause found (self-heal)

Railway image had `products/` dockerignored. `LANE_ASSIGNMENT.json` never reached tip → `ownerFor` used FALLBACK without factory-3 → Collectibles paths matched factory-1 `services/` → `factory_id=factory-3` selected zero steps.

## Fixes shipped this pass

1. `.dockerignore` allowlists `LANE_ASSIGNMENT.json` + `FACTORY_SLOT_STATE.json`
2. `FALLBACK_LANES` includes factory-3 Collectibles owns (belt if receipt missing again)
3. Claim ANDROID-BODY-WIRE done (export present; false artifact miss)
4. Prior same day: tip probe on factory lanes; Collectibles not held in `selectShippableSteps`

## Order after heal

1. Overlay enroll next: `TALOA-S64-MACOS-PERCEPTION-001` (factory-2)
2. Parallel: factory-3 ships `COLLECTIBLES-V1-TWIN-SERVICE-001` → mtg → routes → acceptance
3. Tip never-stop: enabled; expansion path correctly fenced (`governed_factory_only`); governed ship is the manufacturing path

## Labels

- KNOW: tip deploy sha was `5e4969`; local plan with assignment selected Collectibles for factory-3; tip did not
- KNOW: dockerignore excluded the lane receipt
- THINK: never-stop `total_runs` staying near zero until manual run-once is a separate scheduler cadence issue, not the factory-3 empty-filter bug
