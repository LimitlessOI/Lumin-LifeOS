/**
 * SYNOPSIS: Security-invariant primitives — one checker, callable from the git hook and the machine ship path.
 *
 * Why this is a library and not just the hook script: the invariant list used to
 * live inside scripts/security-invariants-check.mjs, which only ever ran from
 * githooks/pre-commit. The standing orders require agents to ship via
 * execute-batch -> commitToGitHub, and a GitHub API commit cannot run a local
 * hook, so the one gate protecting tenant isolation did not cover the path the
 * regression actually travelled on (routes/tc-routes.js lost requireLifeOSAdmin
 * on all 121 routes, twice on 2026-07-27, deployed both times, caught by hand).
 *
 * Pure and content-addressed on purpose: callers pass proposed bytes, so the
 * ship path can judge a file before it exists on disk. Substring counting is
 * deterministic and cannot be rationalized away by a model that reworded a fix,
 * which is what SELF_REPAIR_DOCTRINE Part 0 gap 3 asks for.
 *
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */

/**
 * Gate Charter (SELF_REPAIR_DOCTRINE Part 1): a mechanism may BLOCK only when the
 * action is irreversible or high-blast-radius. Auth, secrets and money qualify.
 * Everything else must DETECT and ROUTE so the loop is never idled (SO-003).
 * Chair ruling c646160f-128a-4b43-9884-af37cd5a868a, 2026-07-28.
 */
export const POSTURE = {
  BLOCK: 'block',
  ROUTE: 'route',
};

export const INVARIANT_CLASS = {
  AUTH: 'auth',
  SECRET: 'secret',
  MONEY: 'money',
};

/** file (repo-relative) -> minimum count of a security-critical substring. */
export const INVARIANTS = [
  {
    file: 'routes/tc-routes.js',
    substring: 'requireLifeOSAdmin',
    minCount: 100,
    klass: INVARIANT_CLASS.AUTH,
    posture: POSTURE.BLOCK,
    reason:
      'TC Service holds real client transaction data with no other tenant-isolation column -- '
      + 'requireLifeOSAdmin is the only thing preventing any authenticated LifeOS user from reading '
      + "or writing any other client's data. Regressed live twice on 2026-07-27.",
  },
];

export function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  const text = String(haystack ?? '');
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(needle, idx)) !== -1) {
    count += 1;
    idx += needle.length;
  }
  return count;
}

function normalizeProposed(proposed) {
  if (!proposed) return new Map();
  if (proposed instanceof Map) return proposed;
  if (Array.isArray(proposed)) {
    const map = new Map();
    for (const entry of proposed) {
      if (!entry) continue;
      const key = String(entry.path || entry.target_file || entry.file || '').trim();
      if (!key) continue;
      map.set(key, entry.content ?? entry.output ?? '');
    }
    return map;
  }
  return new Map(Object.entries(proposed));
}

function solutionFor(rule, observed) {
  return (
    `Restore ${rule.substring} on every route in ${rule.file} (need >= ${rule.minCount}, `
    + `proposed content has ${observed}). If routes were removed deliberately, lower minCount in `
    + 'scripts/lib/security-invariants.mjs in the same change, with the reason recorded — '
    + 'never bypass the gate to make it pass.'
  );
}

/**
 * Judge proposed file contents against the invariant list.
 *
 * Only files present in `proposed` are judged: a change that does not touch an
 * invariant-protected file cannot violate it, and absent files must not be
 * treated as empty (that would fail every unrelated ship).
 *
 * @param {Array|Map|Object} proposed - entries of {path, content} / path->content
 * @returns {{ok: boolean, blocking: Array, routed: Array, checked: Array, findings: Array}}
 */
export function evaluateInvariants(proposed, { invariants = INVARIANTS } = {}) {
  const files = normalizeProposed(proposed);
  const findings = [];
  const checked = [];

  for (const rule of invariants) {
    if (!files.has(rule.file)) continue;
    const content = files.get(rule.file);
    if (typeof content !== 'string') continue;
    checked.push(rule.file);
    const observed = countOccurrences(content, rule.substring);
    if (observed < rule.minCount) {
      findings.push({
        file: rule.file,
        substring: rule.substring,
        min_count: rule.minCount,
        observed,
        klass: rule.klass,
        posture: rule.posture || POSTURE.BLOCK,
        reason: rule.reason,
        proposed_solution: solutionFor(rule, observed),
      });
    }
  }

  const blocking = findings.filter((f) => f.posture === POSTURE.BLOCK);
  const routed = findings.filter((f) => f.posture !== POSTURE.BLOCK);
  return { ok: blocking.length === 0, blocking, routed, checked, findings };
}

export function formatFindings(findings = []) {
  return findings
    .map(
      (f) => `${f.file}: expected >= ${f.min_count} occurrences of "${f.substring}", found ${f.observed}.`
        + `\n  Why this invariant exists: ${f.reason}`
        + `\n  Fix: ${f.proposed_solution}`,
    )
    .join('\n');
}
