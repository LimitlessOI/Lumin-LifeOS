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

## Relation to platform TSOS (token money)

**Productive spend > caps.** Caps stop runaway bills; they do not stop garbage loops.

| Layer | Role |
|-------|------|
| **Income filter** | AI only on milestones that move a chosen revenue lane to customer-visible outcome |
| **Useful-work guard** | Scheduled AI skips when no real work exists |
| **Directed mode** | Autonomous loops off until income-linked contracts exist |
| **Production ledger** | `token_usage_log` + `/api/v1/tokens/unified/today` — see *what* burned, kill non-revenue capabilities |
| **Factory TSOS** | Local step metrics; not the income priority |

Full operator write-up: `builderos-reboot/CURRENT_BP_GAPS_V1.md` § Token use.

## Canonical boundary

`factory-staging/factory-core/tsos/TSOS_HOOK_BOUNDARY.md`
