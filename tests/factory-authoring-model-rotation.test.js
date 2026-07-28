/**
 * SYNOPSIS: Exports checkPostmarkDomainVerified — tests/factory-authoring-model-rotation.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rotateTiers, runAuthoring } from '../factory-staging/factory-core/builder/authoring.js';

test('rotateTiers: no rotation returns the same order', () => {
  assert.deepEqual(rotateTiers(['a', 'b', 'c'], 0), ['a', 'b', 'c']);
  assert.deepEqual(rotateTiers(['a', 'b', 'c'], undefined), ['a', 'b', 'c']);
});

test('rotateTiers: rotates forward by N, wrapping', () => {
  assert.deepEqual(rotateTiers(['a', 'b', 'c'], 1), ['b', 'c', 'a']);
  assert.deepEqual(rotateTiers(['a', 'b', 'c'], 2), ['c', 'a', 'b']);
  assert.deepEqual(rotateTiers(['a', 'b', 'c'], 3), ['a', 'b', 'c']);
  assert.deepEqual(rotateTiers(['a', 'b', 'c'], 4), ['b', 'c', 'a']);
});

test('rotateTiers: fails closed on empty/invalid input', () => {
  assert.deepEqual(rotateTiers([], 2), []);
  assert.deepEqual(rotateTiers(null, 2), []);
  assert.deepEqual(rotateTiers(['a', 'b'], -5), ['a', 'b']);
});

test('runAuthoring: passes a rotated tier list to codegenRunner.generate when step.model_rotation is set', async () => {
  // Regression for sb-deliverability-gate (site-builder): 3 consecutive
  // identical missing_exports failures traced to codegen always starting
  // from tiers[0] regardless of step.model_rotation / the loop's own
  // escalation signal.
  let capturedTiers = null;
  const fakeRunner = {
    generate: async ({ tiers }) => {
      capturedTiers = tiers;
      return { content: 'export function checkPostmarkDomainVerified() {}', model_tier: tiers[0] };
    },
  };
  const step = {
    target_file: 'services/does-not-exist-on-disk-for-this-test.js',
    task: 'test task',
    spec: 'test spec',
    action_type: 'author_then_write',
    behavior_assertions: [{ type: 'exports_smoke', path: 'x', exports: ['x'] }],
    model_rotation: 1,
    authoring: { tiers: ['tierA', 'tierB', 'tierC'] },
  };
  const result = await runAuthoring(step, fakeRunner);
  assert.equal(result.ok, true);
  assert.deepEqual(capturedTiers, ['tierB', 'tierC', 'tierA']);
});

test('runAuthoring: model_rotation 0 (or unset) preserves the original tier order', async () => {
  let capturedTiers = null;
  const fakeRunner = {
    generate: async ({ tiers }) => {
      capturedTiers = tiers;
      return { content: 'export function x() {}', model_tier: tiers[0] };
    },
  };
  const step = {
    target_file: 'services/does-not-exist-on-disk-for-this-test-2.js',
    task: 'test task',
    spec: 'test spec',
    action_type: 'author_then_write',
    behavior_assertions: [{ type: 'exports_smoke', path: 'x', exports: ['x'] }],
    authoring: { tiers: ['tierA', 'tierB', 'tierC'] },
  };
  await runAuthoring(step, fakeRunner);
  assert.deepEqual(capturedTiers, ['tierA', 'tierB', 'tierC']);
});
