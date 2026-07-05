/**
 * SYNOPSIS: scripts/autonomy/builder-runlock.mjs — single-run lock for the builder supervisor.
 *
 * Prevents two supervisor invocations from running at once (which would prune
 * each other's worktrees and race on branch names). Uses an exclusive-create
 * lockfile (`open(..,'wx')`) so acquisition is atomic; a lock older than its TTL
 * is treated as stale (a crashed prior run that never released) and reclaimed.
 *
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
import fs from 'node:fs';

export function isLockStale(lock, now, ttlMs) {
  if (!lock || typeof lock.ts !== 'number') return true;
  return now - lock.ts > ttlMs;
}

export function acquireLock(lockPath, { pid, now, ttlMs, fsImpl = fs }) {
  try {
    const fd = fsImpl.openSync(lockPath, 'wx');
    fsImpl.writeSync(fd, JSON.stringify({ pid, ts: now }));
    fsImpl.closeSync(fd);
    return { ok: true };
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    let existing = null;
    try { existing = JSON.parse(fsImpl.readFileSync(lockPath, 'utf8')); } catch { /* corrupt */ }
    if (isLockStale(existing, now, ttlMs)) {
      try { fsImpl.unlinkSync(lockPath); } catch { /* raced */ }
      const fd = fsImpl.openSync(lockPath, 'wx');
      fsImpl.writeSync(fd, JSON.stringify({ pid, ts: now }));
      fsImpl.closeSync(fd);
      return { ok: true, reclaimed: true };
    }
    return { ok: false, heldBy: existing };
  }
}

// Heartbeat: rewrite our lock's timestamp so a long-running continuous loop is
// not mistaken for a crashed run and reclaimed by a second invocation.
export function refreshLock(lockPath, { pid, now, fsImpl = fs } = {}) {
  try {
    if (!fsImpl.existsSync(lockPath)) return false;
    const cur = JSON.parse(fsImpl.readFileSync(lockPath, 'utf8'));
    if (pid && cur.pid !== pid) return false;
    fsImpl.writeFileSync(lockPath, JSON.stringify({ pid: cur.pid, ts: now }));
    return true;
  } catch {
    return false;
  }
}

export function releaseLock(lockPath, { pid, fsImpl = fs } = {}) {
  try {
    if (!fsImpl.existsSync(lockPath)) return;
    const cur = JSON.parse(fsImpl.readFileSync(lockPath, 'utf8'));
    if (!pid || cur.pid === pid) fsImpl.unlinkSync(lockPath);
  } catch { /* best-effort */ }
}
