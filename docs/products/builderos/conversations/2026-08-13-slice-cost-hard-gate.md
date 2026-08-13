<!-- SYNOPSIS: Slice cost hard gate — track every build -->

# Slice cost hard gate — track every build

**Date:** 2026-08-13  
**Founder ask:** Report how the system is building; hard-gate that every slice tracks build duration and token spend so the system can be scored and improved.

## Verbatim (load-bearing)

> can you give me a report on how the system is building then i want you to hard gate that the system has to fucking keep trakck of how long it takes to buils slices on every single thing that gets build and to also track how many tokens it takes to build it so we can fucking score our fucking systme how the fuck can we get better if we are not tracking

## Report (at ask time)

- Tip `848e470a59de`. One queue. ANDROID body+wire done. Next overlay print: macOS perception (factory-2). Collectibles twin/mtg/routes/acceptance open on factory-3; twin attempts fail SENTRY (`createCollectibleTwin` missing) / STEP_STATUS_FORBIDDEN thrash.
- **Measurement failure:** 0 of 112 BUILD_QUEUE steps had `duration_ms` / `tokens_used`. Control-plane spend-outcomes only listed 3 unrelated mission builds.

## Decision

Hard gate `SLICE_COST_UNTRACKED`: DONE is illegal without both fields. Exact/pre-existing may use 0 tokens. author_then_write with missing usage fails closed. Scoreboard: `GET /api/v1/builderos/control-plane/slice-costs`.

## Labels

- KNOW: queue had zero cost stamps before the gate
- KNOW: factory ship already computes usage in codegenRunner; it was not persisted onto queue steps
- THINK: twin thrash is a separate quality fix after the gate lands
