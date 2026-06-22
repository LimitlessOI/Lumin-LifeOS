/**
 * SYNOPSIS: Canonical repo root for production spine (not factory-staging).
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function resolveRepoPath(relativePath = '') {
  return path.join(REPO_ROOT, String(relativePath).replace(/\\/g, '/'));
}
