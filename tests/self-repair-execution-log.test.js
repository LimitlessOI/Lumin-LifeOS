/**
 * SYNOPSIS: js — tests/self-repair-execution-log.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { appendSelfRepairExecutionLog } from '../services/self-repair-execution-log.js';

test('self repair execution log preserves step details', () => {
  const line = appendSelfRepairExecutionLog({
    ts: '2026-06-28T00:00:00.000Z',
    repair_id: 'DR-003-RECEIPT-STALE',
    steps: ['PF-001'],
    step_details: [
      {
        code: 'PF-001',
        attempt: 2,
        attempt_stage: 'same_tier_lessons',
        required_context: { prior_lessons: true, research: false, consensus: false },
        ok: true,
      },
    ],
    receipts: ['r1'],
    result: 'PASS',
  });
  const parsed = JSON.parse(line);
  assert.equal(parsed.step_details[0].attempt_stage, 'same_tier_lessons');
  assert.equal(parsed.step_details[0].required_context.prior_lessons, true);
});
