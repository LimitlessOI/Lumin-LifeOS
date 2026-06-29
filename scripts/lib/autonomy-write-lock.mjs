/**
 * SYNOPSIS: AUTONOMY_WRITE_LOCK (C21) — manages data/autonomy.lock.
 * AUTONOMY_WRITE_LOCK (C21) — manages data/autonomy.lock.
 * When locked, the builder daemon routes commits to autonomy/staging instead of main.
 * Lock absent = isLocked() returns false = normal operation. No side effects on import.
 *
 * Auto-expiry: if expires_at is set and has passed, the lock is treated as released.
 * Default TTL is 120 minutes (acquireLock ttl_minutes param or AUTONOMY_LOCK_TTL_MINUTES env).
 * This prevents a forgotten lock from silently routing work to staging forever.
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import { join } from 'path';
import { readFile, writeFile, unlink } from 'fs/promises';

const LOCK_PATH = join(process.cwd(), 'data/autonomy.lock');
const DEFAULT_TTL_MINUTES = Number(process.env.AUTONOMY_LOCK_TTL_MINUTES || '120');

async function readLock() {
  try {
    const data = JSON.parse(await readFile(LOCK_PATH, 'utf8'));
    if (data.expires_at && new Date() > new Date(data.expires_at)) {
      await unlink(LOCK_PATH).catch(() => {});
      return null;
    }
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function isLocked() {
  const lock = await readLock();
  return lock !== null && lock.locked === true;
}

async function getLock() {
  return readLock();
}

async function acquireLock({ locked_by, reason, confirmation_event_needed, ttl_minutes }) {
  const lock = await readLock();
  if (lock && lock.locked) {
    throw new Error(`Lock already acquired by ${lock.locked_by} at ${lock.locked_at} (reason: ${lock.reason})`);
  }
  const now = new Date();
  const ttl = ttl_minutes ?? DEFAULT_TTL_MINUTES;
  const expires_at = new Date(now.getTime() + ttl * 60 * 1000).toISOString();
  const newLock = {
    locked: true,
    locked_by,
    locked_at: now.toISOString(),
    expires_at,
    ttl_minutes: ttl,
    reason,
    confirmation_event_needed,
    staging_branch: 'autonomy/staging',
  };
  await writeFile(LOCK_PATH, JSON.stringify(newLock, null, 2));
  return newLock;
}

async function releaseLock() {
  await unlink(LOCK_PATH).catch((e) => {
    if (e.code !== 'ENOENT') throw e;
  });
}

export { readLock, isLocked, getLock, acquireLock, releaseLock };
