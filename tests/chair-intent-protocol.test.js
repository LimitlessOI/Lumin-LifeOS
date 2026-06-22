/**
 * SYNOPSIS: js — tests/chair-intent-protocol.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessChairIntentUnderstanding,
  CHAIR_INTENT_PROTOCOL,
  formatChairIntentClarifySummary,
} from '../services/chair-intent-protocol.js';

test('protocol encodes tools-not-destination', () => {
  assert.match(CHAIR_INTENT_PROTOCOL.tools_not_destination, /not the destination/i);
  assert.match(CHAIR_INTENT_PROTOCOL.only_result, /Point A/i);
});

test('vague LifeRE ask is not intent understood', () => {
  const u = assessChairIntentUnderstanding('Build LifeRE Point B usability', {
    includeBuild: true,
    includeGovernance: false,
    expandedTask: 'target_file: public/overlay/lifeos-lifere.html',
  });
  assert.equal(u.intent_understood, false);
  assert.ok(u.questions.length >= 1);
});

test('clarify summary mentions Point B and questions', () => {
  const u = assessChairIntentUnderstanding('Build LifeRE Point B', { includeBuild: true, expandedTask: '' });
  const text = formatChairIntentClarifySummary(u);
  assert.match(text, /UNDERSTANDING YOUR INTENT/);
  assert.match(text, /Questions for you/);
});

console.log('✅ chair-intent-protocol.test.js passed');
