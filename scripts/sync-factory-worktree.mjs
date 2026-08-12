#!/usr/bin/env node
/**
 * SYNOPSIS: Fast-forward a factory worktree to origin/main so it can receive
 * work. A lane sitting 15 hours behind main is not a second factory — it is a
 * stale checkout. ff-only: local lane commits are named, never discarded.
 *
 * Usage: node scripts/sync-factory-worktree.mjs [--factory factory-2]
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { execFileSync } from 'node:child_process';
import { workspaceRootFor, PRIMARY_FACTORY_ID } from '../config/factory-workspace.js';
import { knownFactoryIds } from '../config/factory-registry.js';

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

export function syncFactoryWorktree(factoryId = 'factory-2') {
  if (!knownFactoryIds().includes(factoryId)) {
    return { ok: false, reason: `unknown_factory:${factoryId}` };
  }
  if (factoryId === PRIMARY_FACTORY_ID) {
    return { ok: true, skipped: true, reason: 'primary_lane_is_the_repo' };
  }
  const root = workspaceRootFor(factoryId);
  git(root, ['fetch', '-q', 'origin', 'main']);
  const before = git(root, ['rev-parse', 'HEAD']);
  const tip = git(root, ['rev-parse', 'origin/main']);
  if (before === tip) {
    return { ok: true, factory_id: factoryId, sha: before, synced: false, detail: 'already_at_origin_main' };
  }
  try {
    git(root, ['merge', '--ff-only', 'origin/main']);
  } catch (err) {
    return {
      ok: false,
      factory_id: factoryId,
      before,
      want: tip,
      reason: 'not_fast_forward',
      detail: String(err.stderr || err.message || err).slice(0, 400),
    };
  }
  const after = git(root, ['rev-parse', 'HEAD']);
  return { ok: true, factory_id: factoryId, before, sha: after, synced: true };
}

function main() {
  const idx = process.argv.indexOf('--factory');
  const factoryId = idx >= 0 ? process.argv[idx + 1] : 'factory-2';
  const result = syncFactoryWorktree(factoryId);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('sync-factory-worktree.mjs')) {
  main();
}
