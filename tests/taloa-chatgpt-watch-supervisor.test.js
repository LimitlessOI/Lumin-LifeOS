/**
 * SYNOPSIS: Behavioral tests for Taloa ChatGPT Watch Supervisor classification and continuation policy.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContinuationPrompt,
  classifySnapshot,
  shouldSendContinuation,
} from '../scripts/taloa-chatgpt-watch-supervisor.mjs';

const repo = 'LimitlessOI/Lumin-LifeOS';

test('recognizes scoped GitHub Allow once prompt', () => {
  const result = classifySnapshot({
    bodyText: 'GitHub wants permission for LimitlessOI/Lumin-LifeOS',
    buttons: ['Allow once', 'Deny'],
    composerPresent: true,
    isGenerating: false,
  }, { repo });
  assert.equal(result.state, 'APPROVAL_PENDING');
});

test('refuses an Allow once prompt without target repository evidence', () => {
  const result = classifySnapshot({
    bodyText: 'Calendar wants permission to delete an event',
    buttons: ['Allow once', 'Deny'],
    composerPresent: true,
    isGenerating: false,
  }, { repo });
  assert.equal(result.state, 'UNRECOGNIZED_APPROVAL');
});

test('hard blockers outrank continuation', () => {
  const result = classifySnapshot({
    bodyText: 'Goal usage limit. Buy credits to continue.',
    buttons: ['Buy credits'],
    composerPresent: true,
    isGenerating: false,
  }, { repo });
  assert.equal(result.state, 'HARD_BLOCKER');
});

test('active generation does not receive another prompt', () => {
  const result = classifySnapshot({
    bodyText: 'Working...',
    buttons: ['Stop generating'],
    composerPresent: true,
    isGenerating: true,
  }, { repo });
  assert.equal(result.state, 'WORKING');
});

test('completed turn is eligible for continuation', () => {
  const result = classifySnapshot({
    bodyText: 'Done.',
    buttons: [],
    composerPresent: true,
    isGenerating: false,
  }, { repo });
  assert.equal(result.state, 'TURN_COMPLETE');
});

test('continuation prompt is bounded to Costello Overlay revenue mission', () => {
  const prompt = buildContinuationPrompt();
  assert.match(prompt, /COSTELLO/);
  assert.match(prompt, /Taloa Overlay/);
  assert.match(prompt, /revenue-producing Point B/);
  assert.match(prompt, /Never invent the next slice/);
  assert.match(prompt, /docs\/CHATGPT_CONTEXT_CAPSULE\.md/);
});

test('cooldown prevents prompt spam', () => {
  assert.equal(shouldSendContinuation({ now: 100_000, lastContinuationAt: 90_000, cooldownMs: 30_000 }), false);
  assert.equal(shouldSendContinuation({ now: 121_000, lastContinuationAt: 90_000, cooldownMs: 30_000 }), true);
});
