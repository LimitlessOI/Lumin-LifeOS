/**
 * SYNOPSIS: js — tests/founder-usability-verdict.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFounderUsabilityVerdict,
  isSoftStatusOrContinuationProbe,
} from '../services/founder-usability-verdict.js';

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

test('Wave 0 item 3: soft status/continuation probes never record usability', () => {
  for (const t of [
    'keep going until pass or exact blocker',
    'status looks good on auth',
    'what is next on point b',
    'continue building until pass',
    'queue status please',
    'machine path progress',
  ]) {
    assert.equal(isSoftStatusOrContinuationProbe(t), true, `probe detect: ${t}`);
    assert.equal(parseFounderUsabilityVerdict(t), null, `no verdict: ${t}`);
  }
});

test('ops confirm / bare worked without usability context is not a sign-off', () => {
  for (const t of [
    'confirm the deploy worked',
    'looks good',
    'perfect',
    'great job',
    'it works',
  ]) {
    assert.equal(parseFounderUsabilityVerdict(t), null, t);
  }
});

// Regression: a THIRD-PERSON description of automated/system test results must never
// be parsed as the founder's own sign-off. This is the exact false-positive that
// recorded a fake FOUNDER_PASS on the auth mission from a counsel/audit message
// (it merely mentioned the word "login" and that the flow "passes" its checks).
test('third-person automated test reports are never a founder sign-off', () => {
  for (const t of [
    'the LifeOS founder/chat UI passes the full SENTRY credentialed browser gate on production (real login, chat, session, 0 findings, all layers satisfied)',
    'auth login flow passes the SENTRY gate green with zero findings',
    'the automated test run reports the login page works and is usable',
    'browser check passed — login and signup both work in the walkthrough',
    'Layer B credentialed run: logged in, chat held, works, 0 findings',
  ]) {
    assert.equal(parseFounderUsabilityVerdict(t), null, t);
  }
});

// Regression: genuine FIRST-PERSON founder sign-offs must still record a PASS.
test('first-person founder sign-offs still record a PASS', () => {
  for (const t of [
    'I logged in and it works great for me, ship it',
    'I tried the login myself and it works for me — approve',
    'signed up and logged in, works for me, good to go',
  ]) {
    assert.deepEqual(parseFounderUsabilityVerdict(t), { pass: true }, t);
  }
});

// Regression: any embedded question mark makes it a counsel/status question, not a verdict.
test('messages containing a question mark are never verdicts', () => {
  for (const t of [
    'the login works — which product should we open to clients first?',
    'it works for me, but should I ship it?',
  ]) {
    assert.equal(parseFounderUsabilityVerdict(t), null, t);
  }
});