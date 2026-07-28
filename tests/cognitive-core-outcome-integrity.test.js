/**
 * SYNOPSIS: recordOutcome must never accept a bare 'receipt_verified' claim —
 * only honor it when a matching row genuinely exists in judgment_receipt_links.
 * It must also never silently overwrite a prior outcome without archiving it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveCoreJudgment } from '../services/cognitive-core-judgment.js';

function makeMockPool({ linkExists, existingOutcome = null } = {}) {
  const calls = [];
  const historyInserts = [];
  let current = existingOutcome;
  return {
    calls,
    historyInserts,
    getCurrent: () => current,
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('SELECT 1 FROM judgment_receipt_links')) {
        return { rows: linkExists ? [{ ok: true }] : [] };
      }
      if (sql.includes('SELECT outcome_id, actual_option, stated_reasons, captured_how, captured_at')) {
        return { rows: current ? [current] : [] };
      }
      if (sql.includes('INSERT INTO judgment_outcome_history')) {
        historyInserts.push(params);
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO judgment_outcomes')) {
        current = {
          outcome_id: current?.outcome_id || 'o1',
          decision_id: params[0],
          actual_option: params[1],
          stated_reasons: JSON.parse(params[2]),
          captured_how: params[3],
          captured_at: new Date().toISOString(),
        };
        return { rows: [current] };
      }
      return { rows: [] };
    },
  };
}

test('recordOutcome rejects an unproven receipt_verified claim, downgrades to explicit', async () => {
  const pool = makeMockPool({ linkExists: false });
  const judgment = createCognitiveCoreJudgment({ pool, logger: { warn: () => {} } });
  const outcome = await judgment.recordOutcome({
    decisionId: 'd1',
    actualOption: 'a',
    capturedHow: 'receipt_verified',
    // no receiptLinkId supplied — the forgery path
  });
  assert.equal(outcome.captured_how, 'explicit');
});

test('recordOutcome honors receipt_verified only when a real matching link exists', async () => {
  const pool = makeMockPool({ linkExists: true });
  const judgment = createCognitiveCoreJudgment({ pool, logger: { warn: () => {} } });
  const outcome = await judgment.recordOutcome({
    decisionId: 'd1',
    actualOption: 'a',
    capturedHow: 'receipt_verified',
    receiptLinkId: 'real-link-id',
  });
  assert.equal(outcome.captured_how, 'receipt_verified');
});

test('recordOutcome still rejects receipt_verified even with a receiptLinkId if no row matches', async () => {
  const pool = makeMockPool({ linkExists: false });
  const judgment = createCognitiveCoreJudgment({ pool, logger: { warn: () => {} } });
  const outcome = await judgment.recordOutcome({
    decisionId: 'd1',
    actualOption: 'a',
    capturedHow: 'receipt_verified',
    receiptLinkId: 'made-up-id-that-does-not-exist',
  });
  assert.equal(outcome.captured_how, 'explicit');
});

test('recordOutcome archives the prior value before overwriting it (audit trail, not silent loss)', async () => {
  const pool = makeMockPool({ linkExists: false });
  const judgment = createCognitiveCoreJudgment({ pool, logger: { warn: () => {} } });

  await judgment.recordOutcome({ decisionId: 'd1', actualOption: 'pass' });
  assert.equal(pool.historyInserts.length, 0, 'first write is not a correction — nothing to archive yet');

  await judgment.recordOutcome({ decisionId: 'd1', actualOption: 'fail' });
  assert.equal(pool.historyInserts.length, 1, 'the second write silently changed the outcome — must be archived');
  const [archived] = pool.historyInserts;
  assert.equal(archived[2], 'pass', 'archived row must preserve the OLD value');
  assert.equal(archived[6], 'fail', 'archived row must record what it was superseded by');
});

test('recordOutcome does NOT archive when the new value is identical to the old one (no real correction happened)', async () => {
  const pool = makeMockPool({ linkExists: false });
  const judgment = createCognitiveCoreJudgment({ pool, logger: { warn: () => {} } });

  await judgment.recordOutcome({ decisionId: 'd1', actualOption: 'pass' });
  await judgment.recordOutcome({ decisionId: 'd1', actualOption: 'pass' });
  assert.equal(pool.historyInserts.length, 0);
});

test('getOutcomeHistory returns archived rows for a decision', async () => {
  const pool = {
    query: async (sql, params) => {
      if (sql.includes('SELECT * FROM judgment_outcome_history')) {
        return { rows: [{ decision_id: params[0], prior_actual_option: 'pass' }] };
      }
      return { rows: [] };
    },
  };
  const judgment = createCognitiveCoreJudgment({ pool, logger: { warn: () => {} } });
  const history = await judgment.getOutcomeHistory('d1');
  assert.equal(history.length, 1);
  assert.equal(history[0].prior_actual_option, 'pass');
});
