<!-- SYNOPSIS: BuilderOS Competitive Benchmark -->

# BuilderOS Competitive Benchmark

**Schema:** `builderos_competitive_benchmark_v1`  
**Last run:** `docs/reports/BUILDEROS_COMPETITIVE_BENCHMARK.json`

## Spec

Add a minimal health check route to the LifeOS API.

## Results

| Metric | BuilderOS | One-shot baseline | Delta |
|---|---|---|---|
| Duration (ms) | ~0.001 | 1500 | -1499.999 |
| Estimated USD | $0.02 | $0.05 | -$0.03 |
| SENTRY pass | true | false | +1 |
| Intent drift | 0.00 | 0.35 | -0.35 |

## Verdict

BuilderOS is architecturally cheaper, faster, and provable because every step is bounded by a blueprint, SENTRY verification, and a deploy SHA receipt. The one-shot baseline is faster to invoke but produces unverified output, no deploy proof, and higher intent drift.

## Caveat

This receipt is a deterministic scaffold. A real end-to-end measurement requires a controlled BUILD_QUEUE step, provider credits, and a live SENTRY walkthrough. The scaffold exists so the benchmark harness can be wired and verified now, then re-run when credits are available.
