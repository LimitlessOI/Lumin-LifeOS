/**
 * SYNOPSIS: js — tests/founder-usability-verdict.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFounderUsabilityVerdict } from '../services/founder-usability-verdict.js';

test('clear affirmative usability verdicts record a PASS', () => {
  for (const t of [
    'I signed up and logged in, works great',
    'auth is working for me now, sign off',
    'it works, good to go',
    'tested it, looks good — approve',
  ]) {
    assert.deepEqual(parseFounderUsabilityVerdict(t), { pass: true }, t);
  }
});

test('clear negative usability verdicts record a FAIL', () => {
  for (const t of [
    'auth still broken, login fails',
    "it doesn't work",
    'got an error on register',
  ]) {
    assert.deepEqual(parseFounderUsabilityVerdict(t), { pass: false }, t);
  }
});

test('questions are never treated as verdicts', () => {
  for (const t of [
    'is the system building anything right now?',
    'does auth work?',
    'how do I sign up',
  ]) {
    assert.equal(parseFounderUsabilityVerdict(t), null, t);
  }
});

test('build/change requests are not verdicts', () => {
  for (const t of [
    'do: add a comment to README',
    'build the next mission',
    'change the nav color to blue',
  ]) {
    assert.equal(parseFounderUsabilityVerdict(t), null, t);
  }
});

test('ambiguous or mixed messages return null', () => {
  for (const t of [
    'it works but also fails sometimes',
    'hello',
    'the weather is nice',
  ]) {
    assert.equal(parseFounderUsabilityVerdict(t), null, t);
  }
});
