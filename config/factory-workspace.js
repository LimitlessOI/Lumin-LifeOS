/**
 * SYNOPSIS: Workspace isolation for parallel factories. Two factories writing
 * into one working tree is the concrete failure this repo has already hit —
 * git index lock contention and staging contamination between concurrent
 * sessions, documented more than once in its own receipts.
 *
 * So a factory does not get "permission to be careful", it gets its own root and
 * a guard that makes writing outside it impossible rather than discouraged.
 * factory-1 keeps the repository root exactly as before, so nothing about the
 * existing lane changes; additional factories get their own git worktree, which
 * gives each an independent index while sharing object history.
 *
 * Dependency-free on purpose (node builtins only): the factory-core path leaf
 * imports nothing, and this has to be usable from the same places.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PRIMARY_FACTORY_ID = 'factory-1';

/**
 * Where a factory's worktree lives. Sibling of the repo rather than inside it,
 * so a peer's tree can never be walked, globbed, or committed by the primary
 * lane as if it were ordinary project content.
 */
export function workspaceRootFor(factoryId) {
  const id = String(factoryId || PRIMARY_FACTORY_ID);
  if (id === PRIMARY_FACTORY_ID) return REPO_ROOT;
  const override = process.env[`FACTORY_WORKSPACE_${id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`];
  if (override) return path.resolve(override);
  return path.resolve(REPO_ROOT, '..', `${path.basename(REPO_ROOT)}-${id}`);
}

/** Provisioned means the tree is really there — not that a config field says so. */
export function isProvisioned(factoryId) {
  const root = workspaceRootFor(factoryId);
  if (String(factoryId) === PRIMARY_FACTORY_ID) return true;
  try {
    // A git worktree carries a `.git` FILE pointing at the shared object store,
    // where a normal clone carries a directory. Checking for the marker rather
    // than mere directory existence stops an empty folder reading as capacity.
    return fs.existsSync(path.join(root, '.git'));
  } catch {
    return false;
  }
}

/**
 * Resolve a repo-relative path inside a factory's own workspace. Same escape
 * guard as the primary lane, applied to whichever root is in play.
 */
export function resolveWorkspacePath(factoryId, relativePath) {
  const root = workspaceRootFor(factoryId);
  const resolved = path.resolve(root, String(relativePath).replace(/\\/g, '/'));
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`path_escapes_workspace_root:${factoryId}:${relativePath}`);
  }
  return resolved;
}

/**
 * The isolation guard. A factory may read a peer's work; it may never write it.
 * Returned rather than thrown so a caller can record the refusal as evidence,
 * and thrown by `assertWriteScope` where a hard stop is correct.
 */
export function checkWriteScope(factoryId, absolutePath, { knownFactoryIds = [] } = {}) {
  const own = workspaceRootFor(factoryId);
  const target = path.resolve(absolutePath);

  for (const peer of knownFactoryIds) {
    if (String(peer) === String(factoryId)) continue;
    const peerRoot = workspaceRootFor(peer);
    if (peerRoot === own) continue;
    if (target === peerRoot || target.startsWith(peerRoot + path.sep)) {
      return { allowed: false, reason: 'write_into_peer_workspace', factory_id: factoryId, peer, path: target };
    }
  }

  if (target !== own && !target.startsWith(own + path.sep)) {
    return { allowed: false, reason: 'write_outside_own_workspace', factory_id: factoryId, path: target };
  }
  return { allowed: true, factory_id: factoryId, path: target };
}

export function assertWriteScope(factoryId, absolutePath, opts = {}) {
  const verdict = checkWriteScope(factoryId, absolutePath, opts);
  if (!verdict.allowed) {
    throw new Error(`${verdict.reason}:${factoryId}:${absolutePath}`);
  }
  return verdict;
}
