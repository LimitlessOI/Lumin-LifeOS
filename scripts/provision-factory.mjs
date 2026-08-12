#!/usr/bin/env node
/**
 * SYNOPSIS: Provisions a factory as a REAL execution lane by creating its own
 * git worktree, then proves the lane exists rather than asserting it.
 *
 * Registering an identity was the easy half and was done first deliberately.
 * This is the half that makes `factory-2` mean capacity instead of a name: an
 * independent index (so two factories cannot fight over one git lock), an
 * independent working tree (so neither can stage the other's half-written
 * files), and a receipt that records what was actually created.
 *
 * The status a factory reports is derived from the tree being on disk, never
 * from a config field — the same dormant-enforcement lesson this repair spent
 * the night learning: a mechanism must not be able to certify its own capacity.
 *
 * Usage: node scripts/provision-factory.mjs --factory factory-2 [--branch <name>]
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT, workspaceRootFor, isProvisioned, PRIMARY_FACTORY_ID } from '../config/factory-workspace.js';
import { isKnownFactory, knownFactoryIds } from '../config/factory-registry.js';

const RECEIPT_REL = 'products/receipts/FACTORY_PROVISIONING_RECEIPT.json';

function git(args, cwd = REPO_ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

export function provisionFactory(factoryId, { branch = null } = {}) {
  if (!isKnownFactory(factoryId)) {
    throw new Error(`unknown_factory:${factoryId} — register it in config/factory-registry.js first`);
  }
  if (String(factoryId) === PRIMARY_FACTORY_ID) {
    return { factory_id: factoryId, action: 'none', reason: 'the primary lane is the repository itself' };
  }

  const root = workspaceRootFor(factoryId);
  if (isProvisioned(factoryId)) {
    return { factory_id: factoryId, action: 'already_provisioned', workspace_root: root };
  }

  const branchName = branch || `factory/${factoryId}`;
  const head = git(['rev-parse', 'HEAD']);

  // A worktree, not a clone: shared object history means no duplicated download
  // and no divergent remote, while the index and working tree stay independent.
  const branchExists = (() => {
    try {
      git(['rev-parse', '--verify', branchName]);
      return true;
    } catch {
      return false;
    }
  })();

  const args = branchExists
    ? ['worktree', 'add', root, branchName]
    : ['worktree', 'add', '-b', branchName, root, head];
  git(args);

  return {
    factory_id: factoryId,
    action: 'provisioned',
    workspace_root: root,
    branch: branchName,
    base_commit: head,
  };
}

/** Independent confirmation: ask git what worktrees exist, don't trust our own return value. */
export function verifyProvisioning() {
  const listed = git(['worktree', 'list', '--porcelain'])
    .split('\n\n')
    .map((block) => {
      const worktree = /^worktree (.+)$/m.exec(block)?.[1] ?? null;
      const branchRef = /^branch (.+)$/m.exec(block)?.[1] ?? null;
      return worktree ? { path: worktree, branch: branchRef } : null;
    })
    .filter(Boolean);

  return knownFactoryIds().map((id) => {
    const root = workspaceRootFor(id);
    const match = listed.find((w) => path.resolve(w.path) === path.resolve(root));
    return {
      factory_id: id,
      workspace_root: root,
      on_disk: isProvisioned(id),
      git_knows_the_worktree: id === PRIMARY_FACTORY_ID ? true : Boolean(match),
      branch: match?.branch ?? (id === PRIMARY_FACTORY_ID ? 'main' : null),
      status: isProvisioned(id) ? 'provisioned' : 'registered_not_provisioned',
    };
  });
}

function main() {
  const i = process.argv.indexOf('--factory');
  const j = process.argv.indexOf('--branch');
  const verifyOnly = process.argv.includes('--verify');

  let action = null;
  if (!verifyOnly) {
    if (i === -1) {
      console.error('usage: provision-factory.mjs --factory <id> [--branch <name>] | --verify');
      process.exit(2);
    }
    action = provisionFactory(process.argv[i + 1], { branch: j > -1 ? process.argv[j + 1] : null });
  }

  const state = verifyProvisioning();
  const receipt = {
    schema: 'factory_provisioning_receipt_v1',
    generated_at: new Date().toISOString(),
    produced_by: 'scripts/provision-factory.mjs',
    purpose: 'Records which factories have a real, independent execution lane — verified against git, not against a config field.',
    independent_reproduction_command: 'node scripts/provision-factory.mjs --verify',
    action,
    factories: state,
    provisioned_count: state.filter((f) => f.status === 'provisioned').length,
    verdict: state.every((f) => f.on_disk === f.git_knows_the_worktree) ? 'CONSISTENT' : 'INCONSISTENT',
  };
  const abs = path.join(REPO_ROOT, RECEIPT_REL);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.verdict !== 'CONSISTENT') process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('provision-factory.mjs')) {
  main();
}
