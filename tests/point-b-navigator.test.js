/**
 * SYNOPSIS: Point B navigator status vs execute authority boundary.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPointBExecuteIntent,
  isPointBStatusIntent,
} from '../services/point-b-navigator.js';

test('status ask is point-b status but not execute intent', () => {
  const msg = 'status on the blueprint step you just started';
  assert.equal(isPointBStatusIntent(msg), true);
  assert.equal(isPointBExecuteIntent(msg), false);
});

test('continue ask is execute intent', () => {
  const msg = 'continue building toward point b until pass';
  assert.equal(isPointBExecuteIntent(msg), true);
});
