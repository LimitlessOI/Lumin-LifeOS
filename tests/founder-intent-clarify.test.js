/**
 * SYNOPSIS: js — tests/founder-intent-clarify.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessFounderBuildClarity,
  isFounderConfirmIntent,
} from '../services/founder-intent-clarify.js';

test('vague LifeRE Point B ask needs clarify', () => {
  const text = 'Build LifeRE Point B usability';
  const clarity = assessFounderBuildClarity(text, `GAP-FILL\n target_file: public/overlay/lifeos-lifere.html`);
  assert.equal(clarity.needs_clarify, true);
  assert.ok(clarity.assumptions.length >= 1);
  assert.ok(clarity.options.length >= 2);
});

test('explicit file + outcome skips clarify', () => {
  const text = 'Fix public/overlay/lifeos-lifere.html so daily command auto-loads on open';
  const clarity = assessFounderBuildClarity(text, text);
  assert.equal(clarity.needs_clarify, false);
});

test('confirm intent detection', () => {
  assert.equal(isFounderConfirmIntent('confirm A'), true);
  assert.equal(isFounderConfirmIntent('Build LifeRE'), false);
});

console.log('✅ founder-intent-clarify.test.js passed');
