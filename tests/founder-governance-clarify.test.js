/**
 * SYNOPSIS: js — tests/founder-governance-clarify.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessGovernanceClarity,
  isGovernanceOrSsotIntent,
} from '../services/founder-governance-clarify.js';

test('detects SSOT change intent', () => {
  assert.equal(isGovernanceOrSsotIntent('We need to change the North Star rule on founder approval'), true);
});

test('explain-only SSOT is not governance execute intent', () => {
  assert.equal(isGovernanceOrSsotIntent('What is the North Star?'), false);
});

test('governance clarify offers layered paths', () => {
  const gov = assessGovernanceClarity('Update amendment 21 protocol for Lumin Chair honesty');
  assert.equal(gov.needs_clarify, true);
  assert.ok(gov.options.length >= 5);
  assert.ok(gov.options.some((o) => o.id === 'C' && /gate-change/i.test(o.right_way[0])));
  assert.ok(gov.options.some((o) => o.id === 'D' && /SSOT_NORTH_STAR/i.test(o.right_way[0])));
});

console.log('✅ founder-governance-clarify.test.js passed');
