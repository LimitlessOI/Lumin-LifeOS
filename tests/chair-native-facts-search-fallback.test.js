/**
 * SYNOPSIS: Regression — unavailable web search must not echo the question as a fake verified block.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.BRAVE_SEARCH_API_KEY;
delete process.env.PERPLEXITY_API_KEY;

const { gatherChairNativeFacts } = await import('../services/chair-native-facts.js');

test('unavailable live search leaves verified_search null (no question echo)', async () => {
  const facts = await gatherChairNativeFacts(
    'What is the current population of Tokyo?',
    { callAI: async () => { throw new Error('no ai'); } },
    {},
  );
  // Before the fix this became "Live search unavailable for: <question>." and,
  // because it echoed the question, passed the downstream relevance check and
  // was served verbatim as the answer.
  assert.equal(facts.verified_search, null);
  assert.equal(facts.search_unavailable, true);
});
