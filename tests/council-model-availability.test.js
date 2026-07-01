/**
 * SYNOPSIS: js — tests/council-model-availability.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getCouncilMemberAvailability } from '../services/council-model-availability.js';

test('gemini availability accepts GOOGLE_API_KEY alias', () => {
  const out = getCouncilMemberAvailability('gemini_flash', { GOOGLE_API_KEY: 'test-google-key' });
  assert.equal(out.available, true);
  assert.equal(out.reason, 'gemini_key_present');
});

test('gemini availability accepts GOOGLE_AI_KEY alias', () => {
  const out = getCouncilMemberAvailability('gemini_flash', { GOOGLE_AI_KEY: 'test-google-ai-key' });
  assert.equal(out.available, true);
  assert.equal(out.reason, 'gemini_key_present');
});
