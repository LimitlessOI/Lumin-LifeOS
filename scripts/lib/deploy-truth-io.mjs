/**
 * SYNOPSIS: Deploy-truth I/O — git + Railway + HTTP probes used to prove a ship.
 *
 * Commit verification runs through LOCAL GIT (`git fetch` + `git cat-file`), not
 * the GitHub REST API, for two reasons: it needs no token, and it is immune to
 * the API rate limit that has already blocked ships on this repo. `git fetch`
 * pulls the authoritative remote objects, so reading a blob out of the returned
 * commit is an independent check of what actually landed — not a restatement of
 * what the builder claimed.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const GIT_MAX_BUFFER = 64 * 1024 * 1024;

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

export function sha256File(absPath) {
  return sha256(readFileSync(absPath));
}

// ── git ──────────────────────────────────────────────────────────────────────

/**
 * `trim: false` matters for `status --porcelain`, whose first column is a space
 * for unstaged changes — trimming it shifts the path by one character.
 */
export function git(args, { encoding = 'utf8', trim = true } = {}) {
  const r = spawnSync('git', args, { encoding, maxBuffer: GIT_MAX_BUFFER });
  const clean = (v) => (encoding === 'buffer' ? v : trim ? String(v || '').trim() : String(v || ''));
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: clean(r.stdout),
    stderr: clean(r.stderr),
  };
}

export function gitFetch(remote = 'origin', ref = null) {
  const args = ref ? ['fetch', remote, ref] : ['fetch', remote];
  const r = git(args);
  return { ok: r.ok, detail: r.stderr || r.stdout || null };
}

export function revParse(ref) {
  const r = git(['rev-parse', ref]);
  return r.ok ? r.stdout : null;
}

export function currentBranch() {
  const r = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  return r.ok ? r.stdout : null;
}

/** `[ahead, behind]` of HEAD relative to `ref`. */
export function aheadBehind(ref) {
  const r = git(['rev-list', '--left-right', '--count', `${ref}...HEAD`]);
  if (!r.ok) return { ahead: 0, behind: 0, ok: false };
  const [behind, ahead] = r.stdout.split(/\s+/).map((n) => Number(n) || 0);
  return { ahead, behind, ok: true };
}

/** Files changed on `to` since its merge-base with `from` (three-dot diff). */
export function diffNamesThreeDot(from, to) {
  const r = git(['diff', '--name-only', `${from}...${to}`]);
  return r.ok ? r.stdout.split('\n').filter(Boolean) : [];
}

/** True when `maybeAncestor` is reachable from `descendant`. */
export function isAncestor(maybeAncestor, descendant) {
  const r = git(['merge-base', '--is-ancestor', maybeAncestor, descendant]);
  return r.status === 0;
}

export function commitExistsLocally(sha) {
  return git(['cat-file', '-e', `${sha}^{commit}`]).status === 0;
}

/** sha256 of a blob as it exists in a commit — the independent commit proof. */
export function blobSha256AtCommit(commitSha, relPath) {
  const r = git(['cat-file', 'blob', `${commitSha}:${relPath}`], { encoding: 'buffer' });
  if (!r.ok) return { ok: false, sha256: null, detail: String(r.stderr || '').slice(0, 300) };
  return { ok: true, sha256: sha256(r.stdout), bytes: r.stdout.length };
}

/**
 * Line delta of the working-tree copy of `relPath` against `ref`. Surfaces how
 * much a ship is actually carrying for a file — a path can be in the ship list
 * on purpose while also holding unrelated edits made outside this session.
 */
export function diffNumstatVsRef(ref, relPath) {
  // `git diff <ref> -- path` reports nothing for a path the ref never had and
  // git is not yet tracking, so a brand-new file would look like a no-op ship.
  const existsOnRef = git(['cat-file', '-e', `${ref}:${relPath}`]).status === 0;
  if (!existsOnRef) {
    let lines = 0;
    try {
      lines = readFileSync(relPath, 'utf8').split('\n').length;
    } catch {
      lines = 0;
    }
    return { added: lines, removed: 0, new_file: true };
  }
  const r = git(['diff', '--numstat', ref, '--', relPath]);
  if (!r.ok || !r.stdout) return { added: 0, removed: 0 };
  const [added, removed] = r.stdout.split('\n')[0].split(/\s+/);
  return { added: Number(added) || 0, removed: Number(removed) || 0 };
}

/** Files a commit changed relative to its first parent. */
export function commitChangedFiles(commitSha) {
  const r = git(['diff-tree', '--no-commit-id', '--name-only', '-r', commitSha]);
  return r.ok ? r.stdout.split('\n').filter(Boolean) : [];
}

/** Pure parser for `git status --porcelain` output (2 status columns + space). */
export function parsePorcelainPaths(stdout = '') {
  return String(stdout)
    .split('\n')
    .filter((line) => line.length > 3)
    .map((line) => line.slice(3).replace(/^"|"$/g, ''))
    .map((p) => (p.includes(' -> ') ? p.split(' -> ')[1] : p))
    .map((p) => p.trim())
    .filter(Boolean);
}

export function dirtyPaths() {
  const r = git(['status', '--porcelain'], { trim: false });
  return r.ok ? parsePorcelainPaths(r.stdout) : [];
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

async function jsonRequest(url, { method = 'GET', headers = {}, body = null, timeoutMs = 30_000 } = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Cache-Control': 'no-store', ...headers },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body kept as raw */
    }
    return { ok: res.ok, status: res.status, json, raw: text.slice(0, 2000) };
  } catch (err) {
    return { ok: false, status: 0, json: null, raw: null, error: err?.message || 'fetch_failed' };
  }
}

export function extractServedSha(readyBody) {
  if (!readyBody || typeof readyBody !== 'object') return null;
  const candidates = [
    readyBody?.codegen?.deploy_commit_sha,
    readyBody?.builder?.deploy_commit_sha,
    readyBody?.deploy_commit_sha,
    readyBody?.deploy_sha,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^[a-fA-F0-9]{7,40}$/.test(c.trim())) return c.trim().toLowerCase();
  }
  return null;
}

export async function probeReady(base, key) {
  const r = await jsonRequest(`${base}/api/v1/lifeos/builder/ready`, {
    headers: key ? { 'x-command-key': key } : {},
  });
  return {
    status: r.status,
    ok: r.ok,
    served_sha: extractServedSha(r.json),
    runtime_profile: r.json?.runtime_profile || r.json?.codegen?.runtime_profile || null,
    policy_revision: r.json?.codegen?.policy_revision || null,
    error: r.error || null,
  };
}

export async function latestDeployment(base, key) {
  const r = await jsonRequest(`${base}/api/v1/railway/managed-env/deployments/latest`, {
    headers: key ? { 'x-command-key': key } : {},
  });
  const dep = r.json?.deployment || null;
  return {
    status: r.status,
    ok: r.ok,
    deployment: dep
      ? {
          id: dep.id || null,
          status: dep.status || null,
          created_at: dep.createdAt || null,
          commit_sha: dep.meta?.commitHash || null,
          commit_message: dep.meta?.commitMessage || null,
          url: dep.url || null,
        }
      : null,
    error: r.error || null,
  };
}

export async function deploymentLogTail(base, key, deploymentId, limit = 40) {
  const r = await jsonRequest(
    `${base}/api/v1/railway/managed-env/deployments/${deploymentId}/logs?limit=${limit}`,
    { headers: key ? { 'x-command-key': key } : {} },
  );
  return (r.json?.logs || []).map((l) => String(l.message || '').slice(0, 240)).filter(Boolean);
}

/**
 * D8 — runtime identity. `/custom-domains` is answered by the RUNNING app using
 * its own RAILWAY_* env, and `build-from-latest` targets those same ids, so
 * matching the verified host against the returned domains proves the URL we
 * checked belongs to the service we deployed.
 */
export async function runtimeIdentity(base, key) {
  const r = await jsonRequest(`${base}/api/v1/railway/managed-env/custom-domains`, {
    headers: key ? { 'x-command-key': key } : {},
    timeoutMs: 25_000,
  });
  const domains = r.json?.domains || null;
  const hosts = [
    ...(domains?.serviceDomains || []).map((d) => d.domain),
    ...(domains?.customDomains || []).map((d) => d.domain),
  ].filter(Boolean);
  return {
    status: r.status,
    ok: r.ok,
    project_id: r.json?.projectId || null,
    service_id: r.json?.serviceId || null,
    environment_id: r.json?.environmentId || null,
    hosts,
    error: r.error || r.json?.error || null,
  };
}

export async function triggerBuildFromLatest(base, key, commitSha) {
  return jsonRequest(`${base}/api/v1/railway/managed-env/build-from-latest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'x-command-key': key } : {}) },
    body: JSON.stringify(commitSha ? { commit_sha: commitSha } : {}),
    timeoutMs: 60_000,
  });
}

export async function executeBatch(base, key, { files, commitMessage, branch }) {
  return jsonRequest(`${base}/api/v1/lifeos/builder/execute-batch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'x-command-key': key } : {}) },
    body: JSON.stringify({ files, commit_message: commitMessage, ...(branch ? { branch } : {}) }),
    timeoutMs: 180_000,
  });
}

/** Fetch a live asset and hash its bytes — runtime proof for `public/**`. */
export async function fetchAssetSha256(url, { timeoutMs = 25_000 } = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: res.ok, status: res.status, sha256: sha256(buf), bytes: buf.length };
  } catch (err) {
    return { ok: false, status: 0, sha256: null, bytes: 0, error: err?.message || 'fetch_failed' };
  }
}

/** Run a declared runtime assertion. Only the new code may satisfy it. */
export async function runProbe(base, key, probe) {
  const url = /^https?:\/\//.test(probe.path || '') ? probe.path : `${base}${probe.path}`;
  const r = await jsonRequest(url, {
    method: probe.method || 'GET',
    headers: {
      ...(probe.auth === false ? {} : key ? { 'x-command-key': key } : {}),
      ...(probe.headers || {}),
      ...(probe.body ? { 'content-type': 'application/json' } : {}),
    },
    body: probe.body ? JSON.stringify(probe.body) : null,
    timeoutMs: probe.timeout_ms || 30_000,
  });

  const expectStatus = probe.expect_status || 200;
  const statusOk = r.status === expectStatus;
  const haystack = r.raw || (r.json ? JSON.stringify(r.json) : '');
  const bodyOk = probe.expect_body ? haystack.includes(probe.expect_body) : true;
  const absentOk = probe.expect_absent ? !haystack.includes(probe.expect_absent) : true;

  return {
    name: probe.name || probe.path,
    url,
    ok: statusOk && bodyOk && absentOk,
    status: r.status,
    expect_status: expectStatus,
    status_ok: statusOk,
    body_ok: bodyOk,
    absent_ok: absentOk,
    expect_body: probe.expect_body || null,
    expect_absent: probe.expect_absent || null,
    error: r.error || null,
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}