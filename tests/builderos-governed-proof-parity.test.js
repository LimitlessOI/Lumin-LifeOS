/**
 * SYNOPSIS: js — tests/builderos-governed-proof-parity.test.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleProofParityAfterGovernedCommit,
  _resetProofParityScheduleForTests,
} from '../services/builderos-governed-proof-parity.js';

test('scheduleProofParityAfterGovernedCommit debounces and requires pool', () => {
  _resetProofParityScheduleForTests();
  const noPool = scheduleProofParityAfterGovernedCommit(null, { jobId: 'x' });
  assert.equal(noPool.scheduled, false);

  const fakePool = {};
  const first = scheduleProofParityAfterGovernedCommit(fakePool, { jobId: 'job-1' });
  assert.equal(first.scheduled, true);
  assert.match(first.triggered_by, /job-1/);

  const second = scheduleProofParityAfterGovernedCommit(fakePool, { jobId: 'job-2' });
  assert.equal(second.scheduled, true);
  assert.match(second.triggered_by, /job-2/);

  _resetProofParityScheduleForTests();
});
