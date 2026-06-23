/**
 * SYNOPSIS: js — tests/chair-lumin-personal-mode.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldAttachStrategicBrief,
  shouldUsePersonalLuminCard,
  isPersonalLuminDomain,
} from '../services/chair-lumin-personal-mode.js';
import { wrapChairHumanSummary } from '../services/founder-communication-format.js';

const OIL = 'oil change coupon on the way out';

test('personal life skips strategic brief', () => {
  const ctx = { domain: 'personal_life', personal_search: true };
  assert.equal(shouldAttachStrategicBrief(OIL, ctx), false);
  assert.equal(isPersonalLuminDomain(ctx), true);
});

test('product strategy attaches brief', () => {
  assert.equal(
    shouldAttachStrategicBrief('what is our LifeRE Point B gap', { domain: 'system_ops' }),
    true,
  );
});

test('personal lumin card is plain prose only', () => {
  const wrapped = wrapChairHumanSummary({
    action: 'lumin',
    chair_domain: 'personal_life',
    chair_context: { domain: 'personal_life' },
    pass_fail: 'NO_COMMAND_RAN',
  }, 'Yes — stop on the way out. Here are coupon links.');
  assert.equal(wrapped, 'Yes — stop on the way out. Here are coupon links.');
  assert.doesNotMatch(wrapped, /NO_COMMAND_RAN/);
  assert.doesNotMatch(wrapped, /Lumin offers/);
});

test('shouldUsePersonalLuminCard', () => {
  assert.equal(shouldUsePersonalLuminCard({
    action: 'lumin',
    chair_context: { domain: 'conversation' },
  }), true);
});

console.log('✅ chair-lumin-personal-mode.test.js passed');
