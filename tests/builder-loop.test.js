/**
 * SYNOPSIS: tests/builder-loop.test.js — unit tests for the never-idle continuous-run control.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loopControl } from '../scripts/autonomy/builder-loop.mjs';

test('processes when pending work exists', () => {
  const d = loopControl({ pendingCount: 3, continuous: true });
  assert.equal(d.action, 'process');
});

test('one-shot mode stops on empty queue', () => {
  const d = loopControl({ pendingCount: 0, continuous: false });
  assert.equal(d.action, 'stop');
  assert.equal(d.reason, 'queue_empty');
});

test('continuous mode idles (polls) on empty queue', () => {
  const d = loopControl({ pendingCount: 0, continuous: true });
  assert.equal(d.action, 'idle');
});

test('budget cap stops even with pending work', () => {
  const d = loopControl({ pendingCount: 5, continuous: true, spentUsd: 10, maxRunUsd: 10 });
  assert.equal(d.action, 'stop');
  assert.equal(d.reason, 'budget_cap');
});

test('budget cap of 0 means unlimited', () => {
  const d = loopControl({ pendingCount: 5, continuous: true, spentUsd: 9999, maxRunUsd: 0 });
  assert.equal(d.action, 'process');
});

test('cycle cap stops processing past the limit', () => {
  const d = loopControl({ pendingCount: 5, continuous: true, cycle: 6, maxCycles: 5 });
  assert.equal(d.action, 'stop');
  assert.equal(d.reason, 'cycle_cap');
});

test('idle cap stops after too many empty polls', () => {
  const d = loopControl({ pendingCount: 0, continuous: true, idleCycles: 3, maxIdleCycles: 3 });
  assert.equal(d.action, 'stop');
  assert.equal(d.reason, 'idle_cap');
});

test('idle cap of 0 polls forever (never-stop)', () => {
  const d = loopControl({ pendingCount: 0, continuous: true, idleCycles: 9999, maxIdleCycles: 0 });
  assert.equal(d.action, 'idle');
});
