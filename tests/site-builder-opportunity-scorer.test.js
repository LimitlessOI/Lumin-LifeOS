/**
 * SYNOPSIS: js — tests/site-builder-opportunity-scorer.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createOpportunityScorer } from '../services/site-builder-opportunity-scorer.js';

test('createOpportunityScorer returns honest scan failure on fetch error', async () => {
  const scorer = createOpportunityScorer({ timeout: 50 });
  const result = await scorer.scoreUrl('http://127.0.0.1:1/unreachable-host');
  assert.equal(result.analyzed, false);
  assert.equal(result.scanFailed, true);
  assert.equal(result.opportunityScore, null);
  assert.equal(result.grade, null);
});

test('createOpportunityScorer returns honest scan failure on error-page HTML', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    text: async () => '<html><head><title>ERROR: The request could not be satisfied</title></head><body>Request blocked.</body></html>',
  });
  try {
    const scorer = createOpportunityScorer({ timeout: 5000 });
    const result = await scorer.scoreUrl('https://example.com');
    assert.equal(result.analyzed, false);
    assert.equal(result.scanFailed, true);
    assert.equal(result.grade, null);
    assert.equal(result.opportunityScore, null);
  } finally {
    global.fetch = originalFetch;
  }
});