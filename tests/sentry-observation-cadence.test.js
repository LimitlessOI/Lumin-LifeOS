/**
 * SYNOPSIS: js — tests/sentry-observation-cadence.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SENTRY_CADENCE, observationAiBudget, cadenceForTier } from '../config/sentry-observation-cadence.js';

test('cadence: heartbeat is faster than deep look, deep look faster than full audit', () => {
  assert.ok(SENTRY_CADENCE.heartbeat.intervalMs < SENTRY_CADENCE.deep_look.intervalMs);
  assert.ok(SENTRY_CADENCE.deep_look.intervalMs < SENTRY_CADENCE.full_audit.intervalMs);
  assert.equal(SENTRY_CADENCE.heartbeat.auditKind, 'system');
  assert.equal(SENTRY_CADENCE.full_audit.auditKind, 'full');
  assert.equal(SENTRY_CADENCE.deep_look.reviewOpen, true);
});

test('observationAiBudget: a green heartbeat spends zero model tokens', () => {
  const budget = observationAiBudget({
    model: SENTRY_CADENCE.heartbeat.model,
    novelCount: 0,
    openCount: 0,
    reviewOpen: SENTRY_CADENCE.heartbeat.reviewOpen,
  });
  assert.equal(budget.callAi, false);
  assert.equal(budget.reason, 'no_work');
});

test('observationAiBudget: a new heartbeat finding uses the cheap tier, not the strong one', () => {
  const budget = observationAiBudget({
    model: 'cheap',
    novelCount: 1,
    openCount: 0,
    reviewOpen: false,
  });
  assert.equal(budget.callAi, true);
  assert.equal(budget.tier, 'cheap');
});

test('observationAiBudget: deep look with open issues uses the strong tier', () => {
  const budget = observationAiBudget({
    model: SENTRY_CADENCE.deep_look.model,
    novelCount: 0,
    openCount: 2,
    reviewOpen: true,
  });
  assert.equal(budget.callAi, true);
  assert.equal(budget.tier, 'strong');
});

test('observationAiBudget: deep look on a green system still spends nothing', () => {
  const budget = observationAiBudget({
    model: 'strong',
    novelCount: 0,
    openCount: 0,
    reviewOpen: true,
  });
  assert.equal(budget.callAi, false);
  assert.equal(budget.reason, 'no_work');
});

test('cadenceForTier: unknown tier is null, not a guessed interval', () => {
  assert.equal(cadenceForTier('yearly'), null);
  assert.equal(cadenceForTier('heartbeat').id, 'heartbeat');
});
