/**
 * SYNOPSIS: recordOutcome must never accept a bare 'receipt_verified' claim —
 * only honor it when a matching row genuinely exists in judgment_receipt_links.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveCoreJudgment } from '../services/cognitive-core-judgment.js';

function makeMockPool({ linkExists }) {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('SELECT 1 FROM judgment_receipt_links')) {
        return { rows: linkExists ? [{ ok: true }] : [] };
      }
      if (sql.includes('INSERT INTO judgment_outcomes')) {
        return { rows: [{ decision_id: params[0], actual_option: params[1], captured_how: params[3] }] };
      }
      if (sql.includes('refreshDomainTrustForDecision') || sql.includes('trust_by_domain')) {
        return { rows: [] };
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
