/**
 * SYNOPSIS: js — tests/founder-intent-compiler.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bindContinuationUtterance,
  detectWorkIntent,
  isFounderFrustrationContinuation,
} from '../services/founder-intent-compiler.js';
import { executeFounderWorkIntent } from '../services/founder-work-executors.js';
import { resolveChairContext } from '../services/chair-context-classifier.js';

test('detectWorkIntent — five video package', () => {
  const msg = "we're going to make five videos so I want the package on five videos";
  const intent = detectWorkIntent(msg, []);
  assert.equal(intent.executor, 'video_package');
  assert.equal(intent.params.count, 5);
  assert.equal(intent.execute_now, true);
});

test('detectWorkIntent — detailed five video script ask', () => {
  const msg = 'Make me five videos that are in line with the formulas we have been working with. The research hooks intro endings full scripts bullet points';
  const intent = detectWorkIntent(msg, []);
  assert.equal(intent?.executor, 'video_package');
  assert.equal(intent?.params?.count, 5);
});

test('detectWorkIntent — ignores thread history (no video re-fire on CSS ask)', () => {
  const msg = 'in the communication boxes yours is in yellow I would like your yellow to be a lot fainter yellow';
  const hist = [
    { role: 'user', content: 'Make me five videos with hooks scripts and formulas' },
    { role: 'assistant', content: 'Done — 5-video package ready.' },
  ];
  assert.equal(detectWorkIntent(msg, hist), null);
});

test('yellow background routes to build_async not chair', () => {
  const msg = 'The yellow background down there, I want that much more fainter yellow.';
  const ctx = resolveChairContext(msg, {});
  assert.equal(ctx.channel, 'build_async');
});

test('bindContinuationUtterance — frustration binds prior task', () => {
  const history = [
    { role: 'user', content: "we're going to make five videos so I want the package on five videos" },
    { role: 'assistant', content: 'You want me to create a package...' },
    { role: 'user', content: 'do what I fucking ask you to do' },
  ];
  const bound = bindContinuationUtterance('do what I fucking ask you to do', history.slice(0, 2));
  assert.match(bound, /five videos/i);
  assert.match(bound, /execute now/i);
});

test('isFounderFrustrationContinuation', () => {
  assert.equal(isFounderFrustrationContinuation('do not repeat back to me'), true);
  assert.equal(isFounderFrustrationContinuation('hello lumin'), false);
});

test('detectWorkIntent — SMOS process without video keyword', () => {
  const compiled = detectWorkIntent('I need content for relocation — follow our Social Media OS process', []);
  assert.equal(compiled?.intent, 'work');
  assert.equal(compiled?.executor, 'socialmediaos_content');
  assert.equal(compiled?.execute_now, true);
});

test('executeFounderWorkIntent — video package uses SMOS path', async () => {
  const compiled = detectWorkIntent('make a package for five videos about relocation', []);
  const result = await executeFounderWorkIntent(compiled, {
    pool: null,
    userId: 'adam',
    userHandle: 'adam',
    utterance: 'make a package for five videos about relocation',
  });
  assert.equal(result.ok, true);
  assert.equal(result.command_truth, 'COMMAND_RAN');
  assert.equal(result.action_type, 'socialmediaos_content');
  assert.match(result.human_summary, /SMOS|brief|video scripts/i);
});
