/**
 * SYNOPSIS: SO-003 regression guard — the Chair must never return a
 * canned/templated answer with zero model call. formatDirectProgramAnswer /
 * formatDirectFactualAnswer must only ground a real model call, never BE
 * the final answer themselves.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { runChairNativeTurn } from '../services/chair-lumin-unified.js';

test('SO-003: a direct-answer-eligible input still calls the real model — the canned template only grounds it, never replaces it', async () => {
  let callAICalled = false;
  let capturedFacts = null;

  const fakeCallAI = async (_member, prompt) => {
    callAICalled = true;
    // The prompt is the JSON-stringified systemFacts + instructions; capture
    // whatever we can inspect it for the grounded fact downstream.
    capturedFacts = prompt;
    return 'A real, freshly-reasoned reply from the model.';
  };

  const result = await runChairNativeTurn(
    'are you connected to the system api right now',
    {
      callAI: fakeCallAI,
      translatePersonality: async ({ callAI, systemFacts }) => {
        // Simulate the real translatePersonality: it must receive the
        // grounded fact and must actually invoke callAI — never skip it.
        assert.ok(systemFacts.grounded_direct_answer, 'grounded_direct_answer must be set on systemFacts');
        return callAI('planner', JSON.stringify(systemFacts));
      },
      pool: null,
    },
    { domain: 'chair' },
  );

  assert.equal(callAICalled, true, 'the real model must be called even when a direct-answer template exists');
  assert.equal(result.ok, true);
  assert.match(result.human_summary_technical || '', /freshly-reasoned/);
});

test('SO-003: formatFactsFallback preserves the grounded fact even if the model call totally fails', async () => {
  const { formatFactsFallback } = await import('../services/chair-personality-translate.js');
  const out = formatFactsFallback({ grounded_direct_answer: 'Yes — same system, same API.' });
  assert.match(out, /same system, same API/);
});
