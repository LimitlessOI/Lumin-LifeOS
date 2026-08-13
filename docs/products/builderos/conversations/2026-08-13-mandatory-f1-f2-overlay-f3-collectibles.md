<!-- SYNOPSIS: Mandatory factory-1+2 overlay + factory-3 Collectibles -->

# Mandatory factory-1+2 overlay + factory-3 Collectibles

**Date:** 2026-08-13  
**Founder:** Mandatory — factories 1 and 2 finish overlay together; factory 3 on Collectibles; keep working 7 hours; fix SENTRY failure and the fixer that failed to identify it; close issues and move on.

## Verbatim

> 1 and 2 factorys have to be working together to finish out all of the overlay this is not a request this is fucking manditory and and you need to make sure that its working at all times for the next 7 hours and make sure 3 is working on collectables. you need to fix why sentlry is failing and you need to fix the fixer as to why it failed to identify an issue. then make sure it closed the issues it failed to fix and moves on.

## Root causes (KNOW)

1. Twin SENTRY: frozen `must_include: OWNED_` vs SCHEMA `owned_*`; reporting blamed `createCollectibleTwin` (needles[0]).
2. STEP_STATUS_FORBIDDEN overwrote SENTRY `last_error` → thrash.
3. Watchdog never inspected lane ship SENTRY → findings empty while tokens burned.
4. factory-2 only compiled; never tip-shipped native authorship.
5. `nextSealedOverlaySlice` returned null while any print open → factory-1 idle during native.

## Fixes

Assertion → `owned_`; SENTRY reports real missing; retryable blocked shippable; no FORBIDDEN overwrite; `lane_sentry_failed` watchdog; factory-2 `requestLaneShip`; parallel enroll; `build.sh` all `*.swift`.
