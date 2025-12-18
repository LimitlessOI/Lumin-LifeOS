# Policies Overview

This repo keeps execution and escalation policies in `/policies`:

- `execution_gate_policy.json`
  - `severity_threshold_block`: severity at or above this blocks execution.
  - `severity_threshold_review`: severity at or above this requires human review.
  - `required_fields`: fields that must be present in a report.

- `escalation_policy.json`
  - Local-first; paid models only when local fails and ROI is justified; must log justification.

- `reversibility_policy.json`
  - Prefer reversible actions; irreversible actions require higher thresholds and a reversal plan.

## Gating logic (scaffold)
- Implemented in `audit/gating/execution_gate.js`.
- Input: report with severity, block_execution, required fields per policy.
- Output: `{ allow, reason, requires_human_review }`.
- Rules:
  - If `block_execution` is true OR severity >= `severity_threshold_block` → `allow=false`, `requires_human_review=true`.
  - Else if severity >= `severity_threshold_review` → `allow=true`, `requires_human_review=true`.
  - Else → `allow=true`, `requires_human_review=false`.

## Usage (example)
```js
import { evaluateExecutionGate } from '../audit/gating/execution_gate.js';

const report = {
  id: 'fsar_1',
  timestamp: new Date().toISOString(),
  proposal: 'Upgrade executor',
  severity: 30,
  risks: ['r1'],
  mitigations: ['m1'],
  block_execution: false,
};

const decision = evaluateExecutionGate(report);
// decision => { allow: true, reason: 'Severity 30 >= review threshold 25', requires_human_review: true }
```

## Tests
- `tests/execution_gate.test.js` covers allow, review, block cases.
