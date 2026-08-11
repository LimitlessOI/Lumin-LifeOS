/**
 * SYNOPSIS: Locks the canonical step-dependency contract. The failure being
 * prevented is silent: a step authored with `deps` and scheduled by the queue
 * (which read `depends_on`) resolved to zero dependencies and built in the wrong
 * order with no error reported.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_DEP_KEY,
  stepDependencies,
  hasContradictoryDependencyKeys,
  withCanonicalDependencies,
  findDependencyKeyContradictions,
} from '../config/step-dependencies.js';

test('canonical key is depends_on — the manufacturing queue lane', () => {
  assert.equal(CANONICAL_DEP_KEY, 'depends_on');
});

test('every historical alias is read, so no subsystem sees an empty graph', () => {
  assert.deepEqual(stepDependencies({ deps: ['A'] }), ['A']);
  assert.deepEqual(stepDependencies({ depends_on: ['B'] }), ['B']);
  assert.deepEqual(stepDependencies({ dependencies: ['C'] }), ['C']);
});

test('an intake step authored with deps is visible to a queue reader', () => {
  const intakeStep = { id: 'X-002', deps: ['X-001'] };
  assert.deepEqual(stepDependencies(intakeStep), ['X-001'], 'this returned [] before the contract existed');
});

test('multiple keys union rather than first-match, because a dropped edge runs work early', () => {
  assert.deepEqual(stepDependencies({ deps: ['A'], depends_on: ['B'], dependencies: ['C'] }), ['B', 'A', 'C']);
});

test('duplicate ids across keys collapse once', () => {
  assert.deepEqual(stepDependencies({ deps: ['A'], depends_on: ['A'] }), ['A']);
});

test('object-shaped dependency entries are accepted', () => {
  assert.deepEqual(stepDependencies({ depends_on: [{ id: 'A' }, { step_id: 'B' }] }), ['A', 'B']);
});

test('missing, null and non-array dependency values are safe', () => {
  assert.deepEqual(stepDependencies({}), []);
  assert.deepEqual(stepDependencies(null), []);
  assert.deepEqual(stepDependencies({ depends_on: null }), []);
  assert.deepEqual(stepDependencies({ depends_on: 'A' }), ['A']);
  assert.deepEqual(stepDependencies({ depends_on: ['', '  '] }), []);
});

test('identical contents across keys is not a contradiction', () => {
  assert.equal(hasContradictoryDependencyKeys({ deps: ['A'], depends_on: ['A'] }), false);
});

test('disagreeing keys are reported, never silently unioned into a plausible answer', () => {
  assert.equal(hasContradictoryDependencyKeys({ deps: ['A'], depends_on: ['B'] }), true);
  const found = findDependencyKeyContradictions([
    { id: 'S1', deps: ['A'], depends_on: ['B'] },
    { id: 'S2', depends_on: ['A'] },
  ]);
  assert.equal(found.length, 1);
  assert.equal(found[0].step_id, 'S1');
});

test('canonicalization preserves aliases so existing readers keep working', () => {
  const out = withCanonicalDependencies({ id: 'S1', deps: ['A'] });
  assert.deepEqual(out.depends_on, ['A']);
  assert.deepEqual(out.deps, ['A'], 'alias must survive: 4000+ historical artifacts still carry it');
});
