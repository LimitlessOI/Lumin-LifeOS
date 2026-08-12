/**
 * SYNOPSIS: Prove a ship commit landed on origin/main (false-done guard).
 * Judgment in scripts/lib (SO-001). Shipping loop only calls these.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Interpret GitHub compare status for base=main ... head=commitSha.
 * behind|identical ⇒ commit is in main's history. ahead|diverged ⇒ not.
 */
export function interpretMainCompareStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'identical' || s === 'behind') {
    return { ok: true, reason: null, status: s };
  }
  if (s === 'ahead' || s === 'diverged') {
    return {
      ok: false,
      reason: `ship_commit_not_on_main: compare status ${s}`,
      status: s,
    };
  }
  return {
    ok: false,
    reason: `ship_commit_not_on_main: unexpected compare status ${s || 'empty'}`,
    status: s || null,
  };
}

/**
 * Verify commitSha is an ancestor of (or equal to) the deploy branch tip via GitHub Compare API.
 *
 * `ahead` is retried rather than trusted on first read. The loop commits to main
 * and compares immediately, and the Compare API can still be serving the
 * pre-push ref, which reports the brand-new commit as ahead of the branch it is
 * already on. Confirmed live 2026-08-12: commit 9b227dc9d6 was on origin/main
 * and had added both target files, yet its own ship step was marked blocked and
 * routed to rework. A commit that genuinely is not on main stays ahead across
 * every retry, so the false-done guard keeps its teeth.
 */
export async function verifyCommitOnMain(commitSha, {
  branch = 'main',
  owner,
  repo,
  token,
  fetchFn = fetch,
  retries = 4,
  retryDelayMs = 3000,
  sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const sha = String(commitSha || '').trim();
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
    return { ok: false, reason: 'ship_commit_not_on_main: invalid commit sha', status: null };
  }
  if (!owner || !repo || !token) {
    return { ok: false, reason: 'ship_commit_not_on_main: missing github credentials', status: null };
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(branch)}...${encodeURIComponent(sha)}`;

  let last = { ok: false, reason: 'ship_commit_not_on_main: no attempt made', status: null };
  const attempts = Math.max(1, Number(retries) || 1);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await sleepFn(retryDelayMs * attempt);
    const res = await fetchFn(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'lifeos-ship-main-ancestor',
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      last = {
        ok: false,
        reason: `ship_commit_not_on_main: compare HTTP ${res.status}${body ? ` ${body.slice(0, 120)}` : ''}`,
        status: null,
      };
      continue;
    }
    const json = await res.json().catch(() => ({}));
    last = interpretMainCompareStatus(json?.status);
    if (last.ok) return last;
  }
  return { ...last, attempts };
}
