<!-- SYNOPSIS: Founder capture — F3 must never stop Collectibles unless he reassigns. -->

# 2026-08-13 — Collectibles never-stop

**Who:** Adam  
**When:** 2026-08-13  

## Founder position (load-bearing)

F3 stopping without his word is a failure. He does not care why the conductor quit. The family pays the price — the system must not stop again unless he says so (`FACTORY_3_REASSIGNED=1`).

## What was broken

`COLLECTIBLES-V1-CAPTURE-API-001` thrash (codegen stub on existing routes) → tip returned `collectibles_print_still_open_idle_forbidden` with `shipped: 0`. Revive budget could demote Collectibles print to SKIPPED — permanent stop while print still open.

## System fix

- Never demote/skip/escalate-idle Collectibles print while lane assigned
- `forceCollectiblesNeverStopHeal` + convention sealed exact promote
- Sealed `COLLECTIBLES-V1-CAPTURE-API-001.exact`
- Tip re-plans after heal before idle_forbidden
