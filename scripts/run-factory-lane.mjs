#!/usr/bin/env node
/**
 * SYNOPSIS: Dispatch one tick of work for a named factory lane. Production
 * Railway is factory-1 (GOVERNED_AUTONOMOUS_SHIP). factory-2 is a local
 * worktree — this runner is how it actually receives jobs instead of sitting
 * HEALTHY and idle.
 *
 * Usage: FACTORY_ID=factory-2 node scripts/run-factory-lane.mjs
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ownerFor, thisFactoryId } from '../config/lane-assignment.js';
import { workspaceRootFor } from '../config/factory-workspace.js';
import { syncFactoryWorktree } from './sync-factory-worktree.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadQueue(productId, repoRoot) {
  const p = path.join(repoRoot, 'docs/products', productId, 'BUILD_QUEUE.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function pendingOwnedSteps(queue, factoryId) {
  return (queue.steps || []).filter((s) => {
    const status = String(s.status || '').toLowerCase();
    if (status !== 'pending' && status !== 'building') return false;
    return ownerFor(s.target_file || s.file) === factoryId;
  });
}

export function runFactoryLane({ factoryId = thisFactoryId(), productId = 'universal-overlay' } = {}) {
  const sync = factoryId === 'factory-1' ? { ok: true, skipped: true } : syncFactoryWorktree(factoryId);
  const repoRoot = workspaceRootFor(factoryId);
  const queue = loadQueue(productId, repoRoot);
  const owned = pendingOwnedSteps(queue, factoryId);
  return {
    ok: sync.ok !== false,
    factory_id: factoryId,
    workspace: repoRoot,
    sync,
    product_id: productId,
    pending_owned: owned.map((s) => ({
      id: s.id,
      target_file: s.target_file,
      status: s.status,
      exists: fs.existsSync(path.join(repoRoot, s.target_file || '')),
    })),
    detail: owned.length
      ? `${owned.length} pending step(s) owned by ${factoryId}`
      : `no pending ${productId} steps owned by ${factoryId}`,
  };
}

function main() {
  const result = runFactoryLane({ factoryId: thisFactoryId() });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('run-factory-lane.mjs')) {
  main();
}
