# 2026-08-12 — Overlay never stops; factory-3 is a switch

Founder, furious: the overlay is not to stop doing anything. Not other projects — overlay. Both factories. Cursor's job is to keep an eye on it, make sure SENTRY is doing its job, and while doing that wire factory-2 and make factory-3 a switch we can flip almost instantly, and leave idle rather than tear down.

**Why it stopped (KNOW):** `discoverBuildQueueWork` only picks a product when `selectNextStep` finds a buildable step. Overlay's leftover JS hold-to-talk rows (`step-2`/`step-4`) depended on blocked `step-1`. Nothing was buildable. The loop moved to LifeOS. Overlay was already #1 in `PRODUCT_BUILD_PRIORITY.json` — priority was not the bug.

**What closed it:** skipped the dead JS PTT path (native badge voice already replaced it). Queued `TALOA-WIRE-HOST-001` + auto-register so factory-1 ships a real caller for `createOverlayHostService`. factory-2 compiles `OverlayHostPing.swift`. SENTRY Layer A script now exists; host 404 is a finding pointing at that queue step. factory-3 is registered idle: `npm run builderos:factory:enable -- --factory factory-3` / `--idle`. Worktree stays when idled.

**Follow-up same evening:** WIRE-HOST landed on the queue twin, then blocked `AIC_GATE_FAILURE`. Cause: ship-queue requested HTTP `skip_intake_gate` for product twins; execute-step denies that without `FACTORY_ALLOW_SKIP_INTAKE_GATE`. Loop went back to LifeOS. Fix: in-process `trustedIntakeSkip` after blueprint follow. WIRE-HOST pending again. Railway redeploy of `9bfdace7` did trigger; exit 1 was the never-stop parity race, not a missed build.
