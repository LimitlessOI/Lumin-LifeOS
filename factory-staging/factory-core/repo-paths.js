/**
 * SYNOPSIS: Factory-core path roots leaf — REPO_ROOT/FACTORY_ROOT, dependency-free.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Extracted from builder/run-step.js so path constants live in a leaf module.
 * run-step and every gate/sentry module importing REPO_ROOT previously formed
 * import cycles (run-step -> gate -> run-step); a dependency-free leaf breaks them.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CORE_DIR = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(CORE_DIR, '../..');
export const FACTORY_ROOT = path.resolve(CORE_DIR, '..');

export function resolveRepoPath(relativePath) {
  const resolved = path.resolve(REPO_ROOT, String(relativePath).replace(/\\/g, '/'));
  if (resolved !== REPO_ROOT && !resolved.startsWith(REPO_ROOT + path.sep)) {
    throw new Error(`path_escapes_repo_root:${relativePath}`);
  }
  return resolved;
}
