<!-- SYNOPSIS: Model Escalation Gate -->

# Model Escalation Gate

**Status:** ACTIVE — mandatory before any stronger/more expensive model dispatch  
**Authority:** Subordinate to `docs/constitution/NORTH_STAR_SSOT.md`, `prompts/00-TSOS-CONTINUOUS-AUTONOMOUS-OPERATIONS.md`, `prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md`  
**Enforced in:** `services/builderos-model-escalation-gate.js`, `services/builderos-routing-policy.js`, `routes/lifeos-council-builder-routes.js`  
**Receipts:** `founder_decision_ledger` rows with `decision_type = 'model_escalation'`  
**Last Updated:** 2026-06-30 — dedicated OpenAI Builder lanes added; `openai_builder_mini` now counts as the cheap-first builder attempt before escalation

---

## Law

Do **not** escalate to a stronger or more expensive model unless **all** are true:

### 1. Task has at least one value category

- **founder_value** — shippable product slice, founder-facing outcome
- **revenue_value** — near-term revenue path (MarketingOS, billing, checkout)
- **reliability_value** — proof/deploy parity, self-repair, regression resistance
- **production_unblock_value** — clears a named production blocker (not activity)

### 2. Cheaper model already attempted once

At least one full attempt with a cheaper tier model (`openai_builder_mini`, `groq_llama`, `gemini_flash`, etc.) must have completed and failed.

### 3. Failure was NOT caused by infrastructure/platform blockers

Escalation is **forbidden** when the failure is any of:

| Blocker class | Examples |
|---------------|----------|
| HTTP 5xx | `HTTP_502`, `HTTP_503`, `HTTP_504` |
| Stale deploy | `RAILWAY_STALE_DEPLOY`, `RECEIPT_STALE_RUNTIME_SHA`, proof STALE |
| Missing env | `MISSING_SECRET_CREDENTIAL`, unset `DATABASE_URL`, missing API keys |
| Missing migration | table/column does not exist, migration not applied |
| Auth failure | `401`, `403`, key mismatch |
| Route not mounted | `404` on expected API, overlay 404 |
| Schema mismatch | wrong table shape, FK violation from drift |
| Git SHA drift | github main ≠ railway deploy |

**Fix the platform first.** Escalating models on infra failures burns tokens without founder value.

### 4. Failure WAS caused by model limits

Allowed escalation triggers:

- reasoning / planning failure
- code quality (stub, truncation, antipattern, syntax after cheaper attempt)
- instruction-following limits
- verifier failure after honest cheaper attempt (STUB, SYNTAX, ANTIPATTERN, scope drift)

### 5. Escalation must write a receipt

Every approved or denied escalation writes to `founder_decision_ledger` (`decision_type: model_escalation`) with:

| Field | Required |
|-------|----------|
| `task_id` | yes |
| `mission_id` | when known |
| `cheaper_model_used` | yes |
| `failure_reason` | yes |
| `value_category` | yes |
| `expected_outcome` | yes |
| `result` | `approved` \| `denied` + reason |
| `stronger_model_requested` | when approved |

---

## API (runtime)

```js
import { evaluateModelEscalationGate, writeModelEscalationReceipt } from './builderos-model-escalation-gate.js';

const verdict = evaluateModelEscalationGate({
  task_id,
  mission_id,
  cheaper_model_used: 'gemini_flash',
  stronger_model_requested: 'claude_sonnet',
  failure_reason: 'STUB output after verifier',
  value_categories: ['founder_value'],
  cheaper_attempt_count: 1,
  http_status: 422,
});

// verdict.allowed === true → may dispatch stronger model
// verdict.allowed === false → verdict.blocked_reason explains why
```

---

## Forbidden

- Escalating on HTTP_502 / stale deploy / missing migration
- Escalating without cheaper attempt
- Escalating proof-doc churn or queue consumption (no value category)
- Escalating without receipt row

---

## Related

- `prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md` — think vs execute tiers
- `services/builderos-routing-policy.js` — task-class model allowlists
- `config/task-model-routing.js` — static routing map
