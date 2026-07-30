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
 */
export async function verifyCommitOnMain(commitSha, {
  branch = 'main',
  owner,
  repo,
  token,
  fetchFn = fetch,
} = {}) {
  const sha = String(commitSha || '').trim();
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
    return { ok: false, reason: 'ship_commit_not_on_main: invalid commit sha', status: null };
  }
  if (!owner || !repo || !token) {
    return { ok: false, reason: 'ship_commit_not_on_main: missing github credentials', status: null };
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(branch)}...${encodeURIComponent(sha)}`;
  const res = await fetchFn(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'lifeos-ship-main-ancestor',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return {
      ok: false,
      reason: `ship_commit_not_on_main: compare HTTP ${res.status}${body ? ` ${body.slice(0, 120)}` : ''}`,
      status: null,
    };
  }
  const json = await res.json().catch(() => ({}));
  return interpretMainCompareStatus(json?.status);
}
