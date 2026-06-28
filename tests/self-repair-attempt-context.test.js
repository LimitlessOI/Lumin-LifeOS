/**
 * SYNOPSIS: js — tests/self-repair-attempt-context.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttemptCarryForwardContext } from '../services/self-repair-attempt-context.js';

test('first attempt allows empty history', () => {
  const out = buildAttemptCarryForwardContext({
    attemptNumber: 1,
    priorAttempts: [],
    lessonsLoaded: [],
    proposedFix: 'initial_dispatch',
  });
  assert.equal(out.ok, true);
  assert.deepEqual(out.attempt_context.prior_attempts_consulted, []);
});

test('retry blocks when carry-forward context is missing', () => {
  const out = buildAttemptCarryForwardContext({
    attemptNumber: 2,
    priorAttempts: [],
    lessonsLoaded: [],
    proposedFix: null,
  });
  assert.equal(out.ok, false);
  assert.equal(out.blocked_return.code, 'BLOCKED_CARRY_FORWARD_CONTEXT_MISSING');
  assert.ok(out.blocked_return.missing.includes('prior_attempts_consulted'));
  assert.ok(out.blocked_return.missing.includes('lessons_loaded'));
});

test('retry preserves prior attempts, lessons, and participants', () => {
  const out = buildAttemptCarryForwardContext({
    attemptNumber: 3,
    priorAttempts: [{ attempt: 1 }, { attempt: 2 }],
    lessonsLoaded: ['lesson one', 'lesson two'],
    consensusParticipants: ['gemini_flash', 'claude_sonnet'],
    proposedFix: 'retry with target reroute',
  });
  assert.equal(out.ok, true);
  assert.deepEqual(out.attempt_context.prior_attempts_consulted, [1, 2]);
  assert.deepEqual(out.attempt_context.consensus_participants, ['gemini_flash', 'claude_sonnet']);
  assert.equal(out.attempt_context.proposed_fix, 'retry with target reroute');
});
