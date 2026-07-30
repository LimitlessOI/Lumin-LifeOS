/**
 * SYNOPSIS: Runtime file fingerprint primitives (Q-001) — allowlisted disk sha256.
 * Judgment in scripts/lib (SO-001). Routes only call these.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const RUNTIME_FINGERPRINT_ALLOWLIST = [
  'routes/',
  'services/',
  'middleware/',
  'startup/',
  'config/',
  'scripts/lib/',
];

export const RUNTIME_FINGERPRINT_MAX_PATHS = 32;

export function normRepoPath(p) {
  return String(p || '').replace(/^\.\//, '').replace(/\\/g, '/').replace(/^\/+/, '');
}

export function isAllowlistedRuntimePath(rel) {
  const p = normRepoPath(rel);
  if (!p || p.includes('..') || path.isAbsolute(String(rel || ''))) return false;
  return RUNTIME_FINGERPRINT_ALLOWLIST.some((prefix) => p === prefix.slice(0, -1) || p.startsWith(prefix));
}

export function parseRuntimeFingerprintPaths(raw, { max = RUNTIME_FINGERPRINT_MAX_PATHS } = {}) {
  const list = Array.isArray(raw)
    ? raw
    : String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const p = normRepoPath(item);
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}

export function sha256Buffer(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Fingerprint one path under repoRoot. Pure enough for tests via injectable fs.
 */
export function fingerprintRuntimePath(repoRoot, rel, { fsApi = fs } = {}) {
  const p = normRepoPath(rel);
  if (!isAllowlistedRuntimePath(p)) {
    return { path: p, ok: false, reason: 'not_allowlisted' };
  }
  const abs = path.join(repoRoot, p);
  const rootResolved = path.resolve(repoRoot);
  const absResolved = path.resolve(abs);
  if (!absResolved.startsWith(rootResolved + path.sep) && absResolved !== rootResolved) {
    return { path: p, ok: false, reason: 'path_escape' };
  }
  try {
    const st = fsApi.statSync(absResolved);
    if (!st.isFile()) return { path: p, ok: false, reason: 'not_a_file' };
    const buf = fsApi.readFileSync(absResolved);
    return {
      path: p,
      ok: true,
      sha256: sha256Buffer(buf),
      bytes: buf.length,
      mtime_ms: Number(st.mtimeMs) || null,
    };
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
      return { path: p, ok: false, reason: 'not_found' };
    }
    return { path: p, ok: false, reason: `read_error:${err?.code || err?.message || 'unknown'}` };
  }
}

export function buildRuntimeFingerprintReport({
  repoRoot,
  paths = [],
  deployCommitSha = null,
  fsApi = fs,
} = {}) {
  const requested = parseRuntimeFingerprintPaths(paths);
  const rejected = requested.filter((p) => !isAllowlistedRuntimePath(p));
  const allowed = requested.filter((p) => isAllowlistedRuntimePath(p));
  return {
    ok: rejected.length === 0,
    deploy_commit_sha: deployCommitSha || null,
    files: allowed.map((p) => fingerprintRuntimePath(repoRoot, p, { fsApi })),
    rejected: rejected.map((p) => ({ path: p, reason: 'not_allowlisted' })),
  };
}
