<!-- SYNOPSIS: TSOS Factory Integration -->

# TSOS Factory Integration

**Status:** Live on execute-step hot path (mission FACTORY-REBOOT-0029)

## What TSOS does here

Measures **efficiency only** — never truth, strategy, or readiness.

| Records | Does not |
|---------|----------|
| token_cost, latency_ms, retries, waste | declare verdict / ready / done |
| bytes_written, input_mode, model_tier | skip SENTRY or lower scrutiny |
| append-only JSONL | assign builder work or strategy |

## Guardrails

`factory-core/tsos/tsos-guardrails.js` blocks forbidden authority fields before append.

Violations → HTTP **422** `TSOS_GUARDRAIL_VIOLATION` (fail-closed).

## Hot path

```text
POST /factory/execute-step
  → Builder (write_file_exact)
  → SENTRY (verifyStepContract)
  → TSOS (appendStepMetrics)   ← after SENTRY pass only
```

## Storage

- `factory-staging/data/tsos-step-metrics.jsonl` (append-only, gitignored)

## API

- `GET /factory/tsos/summary` — aggregate metrics (not readiness)

## Verify

```bash
npm run factory:tsos
npm run factory:ci
```

## Relation to platform TSOS

Factory TSOS is the **measurement hook** inside the governed loop. Production token accounting (`token_usage_log`, Amendment 10/44) on Railway is the **platform ledger** — future bridge: export factory JSONL → unified ledger.

## Canonical boundary

`factory-staging/factory-core/tsos/TSOS_HOOK_BOUNDARY.md`
