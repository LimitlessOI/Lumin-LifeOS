/**
 * SYNOPSIS: tests/builder-runlock.test.js — unit tests for the single-run supervisor lock.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { acquireLock, releaseLock, isLockStale } from '../scripts/autonomy/builder-runlock.mjs';

const tmpLock = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'runlock-')), '.lock');

test('first acquire succeeds, second is refused while held', () => {
  const lp = tmpLock();
  const now = 1_000_000;
  assert.equal(acquireLock(lp, { pid: 1, now, ttlMs: 1000 }).ok, true);
  const second = acquireLock(lp, { pid: 2, now: now + 1, ttlMs: 1000 });
  assert.equal(second.ok, false);
  assert.equal(second.heldBy.pid, 1);
});

test('release lets another run acquire', () => {
  const lp = tmpLock();
  assert.equal(acquireLock(lp, { pid: 1, now: 1, ttlMs: 1000 }).ok, true);
  releaseLock(lp, { pid: 1 });
  assert.equal(acquireLock(lp, { pid: 2, now: 2, ttlMs: 1000 }).ok, true);
});

test('release only removes a lock owned by the same pid', () => {
  const lp = tmpLock();
  acquireLock(lp, { pid: 1, now: 1, ttlMs: 1000 });
  releaseLock(lp, { pid: 999 }); // not the owner — must not remove
  assert.equal(acquireLock(lp, { pid: 2, now: 2, ttlMs: 1000 }).ok, false);
});

test('a lock older than TTL is reclaimed as stale', () => {
  const lp = tmpLock();
  acquireLock(lp, { pid: 1, now: 0, ttlMs: 1000 });
  const later = acquireLock(lp, { pid: 2, now: 5000, ttlMs: 1000 });
  assert.equal(later.ok, true);
  assert.equal(later.reclaimed, true);
});

test('isLockStale treats missing/corrupt locks as stale', () => {
  assert.equal(isLockStale(null, 100, 50), true);
  assert.equal(isLockStale({}, 100, 50), true);
  assert.equal(isLockStale({ ts: 90 }, 100, 50), false);
  assert.equal(isLockStale({ ts: 10 }, 100, 50), true);
});
