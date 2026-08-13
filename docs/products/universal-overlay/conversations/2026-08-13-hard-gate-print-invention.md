<!-- SYNOPSIS: Founder conversation capture — overlay manufacturing stopped; hard-gate print invention. -->

# Overlay manufacturing stopped — hard-gate so the factory cannot skip the print

**Date:** 2026-08-13  
**Surface:** Cursor  
**Product:** universal-overlay / BuilderOS

## Founder quotes (load-bearing)

> "i cant understand why this has stopped and is not building i cant undstand how i keep asking for things to be done and then its not done at all fucking fix all those issues asap and report back and hard cate it so its imposible to not do what if fucking ask it to do"

Prior standing orders in this thread (still in force): overlay is top priority because he needs to make money; one queue only; that queue may only take slices of the uploaded overlay blueprint; idle is legal; choosing is not.

## What was actually wrong (KNOW)

The loop was running. It was not manufacturing the next overlay-print slice.

1. `isBlueprintSlice` treated any step whose `source` cited the Taloa blueprint as on-print. Invented `scripts/register-*.mjs` clones passed.
2. `skipNonBlueprintSlices` was in-memory only. Persist wrote the invented steps back to disk every cycle.
3. Discover never enrolled the next sealed §64 item. When REGISTER blocked, `selectNextStep` returned null and the model planner invented more register scripts.
4. Collectibles were allowed to ship while overlay print was still open, so factory-3 shipped Collectibles and overlay stalled.

## Decisions

- Sealed sequence in `config/overlay-print-sequence.js`. The factory may not invent the next slice.
- `PRINT_INVENTION_FORBIDDEN` throws if an open queue step is not a sealed print id or a Collectibles V-slice with MASTER_BLUEPRINT source.
- Overlay planner never calls a model. Discover enrolls the next sealed slice and does not schedule `plan_build_queue`.
- Collectibles stay on the one queue and wait until overlay print closes.
- `TALOA-S64-CAPREG-REGISTER-001` is done (capreg already mounted). Next slice is `TALOA-S64-ANDROID-BODY-001`.
- Per-slice `duration_ms` + `tokens_used`. Founder-runtime mounts `/api/v1/builderos/control-plane/spend-outcomes`.

## Not claimed

Android Body is not built until the factory ships it on the deployed SHA. Spend-outcomes is not live until that SHA is serving.
