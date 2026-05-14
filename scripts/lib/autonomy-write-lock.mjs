// scripts/lib/autonomy-write-lock.mjs

import { join } from 'path';
import { readFile, writeFile, unlink } from 'fs/promises';
import { console } from 'console';

const LOCK_PATH = join(process.cwd(), 'data/autonomy.lock');

async function readLock() {
  try {
    const lock = await readFile(LOCK_PATH, 'utf8');
    return JSON.parse(lock);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function isLocked() {
  const lock = await readLock();
  return lock && lock.locked;
}

async function getLock() {
  const lock = await readLock();
  return lock;
}

async function acquireLock({ locked_by, reason, confirmation_event_needed }) {
  const lock = await readLock();
  if (lock && lock.locked) {
    throw new Error('Lock already acquired');
  }
  const now = new Date().toISOString();
  const newLock = {
    locked: true,
    locked_by,
    locked_at: now,
    reason,
    confirmation_event_needed,
    staging_branch: 'autonomy/staging',
  };
  await writeFile(LOCK_PATH, JSON.stringify(newLock, null, 2));
  return newLock;
}

async function releaseLock() {
  await unlink(LOCK_PATH);
}

export { readLock, isLocked, getLock, acquireLock, releaseLock };