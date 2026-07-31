/**
 * SYNOPSIS: Tests for the hybrid-schema decision log.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordFactoryDecision, getDecisionLog } from '../services/self-repair-decision-log.js';

function fakePool(rows = []) {
  const calls = [];
  return {
    calls,
    async query(sql, values) {
      calls.push({ sql, values });
      // Simulate returning the provided rows for SELECT, and one row with id for INSERT.
      const isInsert = /INSERT/i.test(sql);
      return { rows: isInsert ? [{ id: 'decision-uuid' }] : rows };
    },
  };
}

test('recordFactoryDecision is backward-compatible with old narrow call', async () => {
  const pool = fakePool();
  const result = await recordFactoryDecision(pool, {
    decision: 'test_decision',
    escalation_claim: 'none',
    tier_actually_run: 'cheap',
    cost_tokens: 100,
    cost_ms: 200,
  });
  assert.equal(result.id, 'decision-uuid');
  const insert = pool.calls.find((c) => /INSERT/i.test(c.sql));
  assert.ok(insert);
  // Old positional fields are present in the first columns.
  assert.equal(insert.values[1], 'test_decision');
  assert.equal(insert.values[4], 100);
  assert.equal(insert.values[5], 200);
});

test('recordFactoryDecision stores explicit lifecycle and JSONB fields', async () => {
  const pool = fakePool();
  const alternatives = [{ name: 'A', rationale: 'cheaper' }];
  const perRole = { chair: 'keep it simple', architect: 'use factory' };
  const result = await recordFactoryDecision(pool, {
    decision: 'Phase 0 stop gate approved',
    blueprint_id: 'MISSION-2-CONVERGENCE',
    blueprint_version: 'v2',
    founder_intent: 'Stop false completion',
    problem_statement: 'Seals certify broken work',
    consensus_status: 'approved',
    consensus_rationale: 'grounding gate must fail closed',
    predicted_outcome: 'fewer false seals',
    success_criteria: 'no missing export seals',
    failure_criteria: 'rejected hash reseals',
    alternatives_considered: alternatives,
    per_role_reasoning: perRole,
    assumptions: { db: 'postgres', schema: 'migrations' },
    evidence: [{ file: 'truth-ladder.js', line: 542 }],
    implementation_trace: ['WP0.1', 'WP0.2'],
    sentry_verification: { passed: true },
    resulting_lessons: null,
    linked_artifacts: ['DECISION-0001.md'],
    cost_and_efficiency_analysis: { tokens: 1000 },
    metadata: { extra: 'value' },
  });
  assert.equal(result.id, 'decision-uuid');
  const insert = pool.calls.find((c) => /INSERT/i.test(c.sql));
  assert.ok(insert);
  // JSONB values were stringified by safeJsonb.
  assert.equal(typeof insert.values[17], 'string');
  assert.ok(insert.values[17].includes('A'));
  assert.equal(typeof insert.values[18], 'string');
  assert.ok(insert.values[18].includes('chair'));
  assert.equal(typeof insert.values[27], 'string');
  assert.ok(insert.values[27].includes('extra'));
});

test('getDecisionLog selects explicit columns including JSONB fields', async () => {
  const expectedRows = [{ id: '1', decision: 'test' }];
  const pool = fakePool(expectedRows);
  const rows = await getDecisionLog(pool, { limit: 10 });
  const select = pool.calls.find((c) => /SELECT/i.test(c.sql));
  assert.ok(select);
  assert.ok(select.sql.includes('metadata'));
  assert.ok(select.sql.includes('per_role_reasoning'));
  assert.deepEqual(rows, expectedRows);
  assert.equal(select.values[0], 10);
});
