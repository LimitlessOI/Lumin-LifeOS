/**
 * SYNOPSIS: Chair communication routing — build/status/presence must not hit CLARIFY theater.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBuildRequest,
  isBuildStatusQuestion,
  isCounselPresenceIntent,
} from '../services/chair-intent-signals.js';

test('did that build land is status, not a build order', () => {
  const t = 'Did that last build land? Don\'t recite the mission.';
  assert.equal(isBuildStatusQuestion(t), true);
  assert.equal(isBuildRequest(t), false);
});

test('don\'t fix me is presence counsel, not a build order', () => {
  const t = 'I feel like nobody gets how hard this is. Don\'t fix me — just be with me for a second.';
  assert.equal(isCounselPresenceIntent(t), true);
  assert.equal(isBuildRequest(t), false);
});

test('real build orders still classify as build', () => {
  assert.equal(isBuildRequest('Fix the lifeos-app drawer CSS so the input is taller'), true);
  assert.equal(isBuildRequest('do: add LIFEOS_ROLES to lifeos-user-service.js'), true);
});

test('hi / how are you are not builds', () => {
  assert.equal(isBuildRequest('Just say hi.'), false);
  assert.equal(isBuildRequest('Hey — how are you tonight?'), false);
});

test('anger / stuck vent is presence, not a build order', () => {
  const t = "I'm pissed. Everything feels stuck and I'm tired of pretending I'm fine.";
  assert.equal(isCounselPresenceIntent(t), true);
  assert.equal(isBuildRequest(t), false);
});

test('don\'t pitch next steps is presence', () => {
  assert.equal(isCounselPresenceIntent("ha — thanks. that joke actually landed. don't pitch next steps."), true);
});
