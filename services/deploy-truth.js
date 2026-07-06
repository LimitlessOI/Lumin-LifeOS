/**
 * SYNOPSIS: Deploy-truth proof — never call a build "live" until the running
 * deployment actually serves the commit SHA that was built. Closes the autonomy
 * audit's recurring "false live" gap (claims "fixed live" while prod still
 * serves old code). Reads codegen.deploy_commit_sha from the builder /ready
 * endpoint and compares it to the expected commit. Dependency-injected fetch so
 * it is fully unit-testable without a live server.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const SHA_RE = /^[a-fA-F0-9]{7,40}$/;

export function normalizeSha(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return SHA_RE.test(v) ? v.toLowerCase().slice(0, 40) : null;
}

/**
 * Two SHAs "match" if one is a prefix of the other (handles short vs full sha).
 */
export function shasMatch(a, b) {
  const x = normalizeSha(a);
  const y = normalizeSha(b);
  if (!x || !y) return false;
  const short = x.length <= y.length ? x : y;
  const long = x.length <= y.length ? y : x;
  return long.startsWith(short);
}

/**
 * Extract the deployed commit SHA from a /api/v1/lifeos/builder/ready body.
 * Tolerant of both the top-level and nested (codegen / builder) shapes.
 */
export function extractDeployedSha(readyBody) {
  if (!readyBody || typeof readyBody !== 'object') return null;
  const candidates = [
    readyBody.deploy_commit_sha,
    readyBody.codegen && readyBody.codegen.deploy_commit_sha,
    readyBody.builder && readyBody.builder.deploy_commit_sha,
    readyBody.deploy_sha,
    readyBody.commit_sha,
  ];
  for (const c of candidates) {
    const sha = normalizeSha(c);
    if (sha) return sha;
  }
  return null;
}

/**
 * Prove the running deployment serves `expectedSha`.
 *
 *   proveDeployServesSha({ expectedSha, baseUrl, fetchFn?, readyPath? })
 *     -> { ok, matches, served_sha, expected_sha, reason }
 *
 * ok:false when the ready endpoint is unreachable, exposes no SHA, or serves a
 * different SHA than the one we built — so a caller can NEVER report "live"
 * without the deploy actually having advanced to the built commit.
 */
export async function proveDeployServesSha({
  expectedSha,
  baseUrl,
  fetchFn = globalThis.fetch,
  readyPath = '/api/v1/lifeos/builder/ready',
  timeoutMs = 15_000,
} = {}) {
  const expected = normalizeSha(expectedSha);
  if (!expected) return { ok: false, matches: false, reason: 'invalid_expected_sha', expected_sha: expectedSha || null, served_sha: null };
  if (!baseUrl) return { ok: false, matches: false, reason: 'missing_base_url', expected_sha: expected, served_sha: null };
  if (typeof fetchFn !== 'function') return { ok: false, matches: false, reason: 'no_fetch', expected_sha: expected, served_sha: null };

  const url = `${baseUrl.replace(/\/$/, '')}${readyPath}`;
  let body;
  try {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    let res;
    try {
      res = await fetchFn(url, { headers: { 'Cache-Control': 'no-store' }, signal: controller ? controller.signal : undefined });
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res || !res.ok) {
      return { ok: false, matches: false, reason: `ready_http_${res ? res.status : 'no_response'}`, expected_sha: expected, served_sha: null };
    }
    body = await res.json();
  } catch (e) {
    return { ok: false, matches: false, reason: `ready_fetch_error:${e && e.message ? e.message : 'unknown'}`, expected_sha: expected, served_sha: null };
  }

  const served = extractDeployedSha(body);
  if (!served) return { ok: false, matches: false, reason: 'ready_exposes_no_sha', expected_sha: expected, served_sha: null };

  const matches = shasMatch(expected, served);
  return {
    ok: matches,
    matches,
    served_sha: served,
    expected_sha: expected,
    reason: matches ? 'deploy_serves_expected_sha' : 'deploy_serves_different_sha',
  };
}

/**
 * Poll until the deploy serves the expected SHA or attempts run out. Lets a
 * redeploy finish before we accept/reject "live" (Railway takes ~1-2 min).
 */
export async function waitForDeploySha({ expectedSha, baseUrl, fetchFn, attempts = 10, intervalMs = 15_000, sleepFn } = {}) {
  const sleep = sleepFn || ((ms) => new Promise((r) => setTimeout(r, ms)));
  let last = { ok: false, matches: false, reason: 'not_attempted', expected_sha: normalizeSha(expectedSha), served_sha: null };
  for (let i = 0; i < Math.max(1, attempts); i += 1) {
    last = await proveDeployServesSha({ expectedSha, baseUrl, fetchFn });
    last.attempts_used = i + 1;
    if (last.ok) return last;
    if (i < attempts - 1) await sleep(intervalMs);
  }
  return last;
}
