/**
 * SYNOPSIS: Truth-ladder enforcement — grades load-bearing CLAIMS (not code
 * lines) on the founder's scale DONT_KNOW < GUESS < THINK < KNOW < LAW, requires
 * proof for KNOW/LAW (mirrors no-false-green at the claim level), and emits a
 * re-confirmation watchlist for everything below KNOW so assumptions get checked
 * against reality later. Grading judgment is delegated to a second AI via an
 * injected reviewFn (separation of powers); the enforcement + watchlist logic is
 * deterministic and unit-tested.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const GRADES = Object.freeze({
  DONT_KNOW: 'DONT_KNOW',
  GUESS: 'GUESS',
  THINK: 'THINK',
  KNOW: 'KNOW',
  LAW: 'LAW',
});

const RANK = Object.freeze({ DONT_KNOW: 0, GUESS: 1, THINK: 2, KNOW: 3, LAW: 4 });

const SYNONYMS = {
  dont_know: GRADES.DONT_KNOW, dontknow: GRADES.DONT_KNOW, unknown: GRADES.DONT_KNOW, unsure: GRADES.DONT_KNOW,
  guess: GRADES.GUESS, guessed: GRADES.GUESS, speculation: GRADES.GUESS, low_confidence: GRADES.GUESS,
  think: GRADES.THINK, inference: GRADES.THINK, inferred: GRADES.THINK, likely: GRADES.THINK, believe: GRADES.THINK,
  know: GRADES.KNOW, verified: GRADES.KNOW, proven: GRADES.KNOW, confirmed: GRADES.KNOW, fact: GRADES.KNOW,
  law: GRADES.LAW, canonical: GRADES.LAW, ssot: GRADES.LAW, constitutional: GRADES.LAW,
};

export function normalizeGrade(value) {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (RANK[key.toUpperCase()] !== undefined) return key.toUpperCase();
  return SYNONYMS[key] || SYNONYMS[key.replace(/_/g, '')] || null;
}

export function gradeRank(grade) {
  const g = normalizeGrade(grade);
  return g ? RANK[g] : -1;
}

export function requiresProof(grade) {
  return gradeRank(grade) >= RANK.KNOW;
}

/**
 * A claim is "execution-provable" when its truth is settled by running things
 * (build/test/deploy/code) — those must be KNOW+proof or they fail. Everything
 * else (users want X, this converts better, that API behaves so) is "external":
 * it cannot be proven by execution and is capped below KNOW without evidence.
 */
export function claimKind(claim) {
  const k = String(claim?.kind || '').toLowerCase();
  if (['build', 'test', 'deploy', 'code', 'commit', 'runtime'].includes(k)) return 'execution';
  if (['user', 'market', 'design', 'assumption', 'business', 'preference'].includes(k)) return 'external';
  const t = String(claim?.text || '').toLowerCase();
  if (/\b(commit|deploy|test pass|compiles?|endpoint returns|sha|builds?)\b/.test(t)) return 'execution';
  return 'external';
}

export function hasProof(claim) {
  const p = claim && claim.proof;
  if (!p) return false;
  if (typeof p === 'string') return p.trim().length > 0;
  return Boolean(
    p.commit_sha || p.sha ||
    p.deploy_verified === true ||
    (typeof p.test_result === 'string' && p.test_result.toLowerCase() === 'pass') ||
    p.citation || p.evidence_url,
  );
}

/**
 * Enforce a single graded claim. Returns the claim with the EFFECTIVE grade:
 *  - KNOW/LAW without proof  -> downgraded (execution claim -> GUESS, external -> THINK) + flag
 *  - external claim graded KNOW/LAW -> capped at THINK unless it carries external evidence
 * Never silently upgrades; only ever caps/downgrades, and records why.
 */
export function enforceClaim(claim) {
  const original = normalizeGrade(claim?.grade) || GRADES.GUESS;
  const kind = claimKind(claim);
  const flags = [];
  let effective = original;

  if (requiresProof(original) && !hasProof(claim)) {
    effective = kind === 'execution' ? GRADES.GUESS : GRADES.THINK;
    flags.push('claimed_KNOW_or_LAW_without_proof');
  }

  if (kind === 'external' && gradeRank(effective) >= RANK.KNOW && !hasProof(claim)) {
    effective = GRADES.THINK;
    flags.push('external_claim_capped_below_KNOW');
  }

  return {
    ...claim,
    kind,
    grade: effective,
    original_grade: original,
    enforced: effective !== original,
    flags,
  };
}

/**
 * Grade a batch of claims via an injected second-AI reviewFn (separation of
 * powers), then enforce each. reviewFn(claims) -> [{ id, grade, rationale }].
 * If reviewFn is absent/incomplete, missing grades default to GUESS (fail-safe
 * low, never optimistic).
 */
export async function reviewClaims(claims, { reviewFn } = {}) {
  let grades = [];
  if (typeof reviewFn === 'function') {
    try { grades = await reviewFn(claims); } catch { grades = []; }
  }
  const byId = new Map((Array.isArray(grades) ? grades : []).map((g) => [g.id, g]));
  return claims.map((c) => {
    const review = byId.get(c.id);
    const graded = { ...c, grade: normalizeGrade(review?.grade) || c.grade || GRADES.GUESS, rationale: review?.rationale };
    return enforceClaim(graded);
  });
}

/**
 * Everything below KNOW becomes a watch item to re-confirm against reality
 * later. Execution-provable claims below KNOW are especially urgent (they can
 * and should be proven now).
 */
export function toWatchlist(enforcedClaims, { now = () => new Date().toISOString() } = {}) {
  return enforcedClaims
    .filter((c) => gradeRank(c.grade) < RANK.KNOW)
    .map((c) => ({
      id: c.id,
      text: c.text,
      grade: c.grade,
      kind: c.kind || claimKind(c),
      needs: c.needs || (claimKind(c) === 'execution'
        ? 'run build/test/deploy proof to confirm or refute'
        : 'confirm against real-world outcome/evidence'),
      urgent: claimKind(c) === 'execution',
      added_at: now(),
    }));
}

export function summarizeGrades(enforcedClaims) {
  const by = { DONT_KNOW: 0, GUESS: 0, THINK: 0, KNOW: 0, LAW: 0 };
  for (const c of enforcedClaims) by[normalizeGrade(c.grade)] = (by[normalizeGrade(c.grade)] || 0) + 1;
  return { total: enforcedClaims.length, ...by, enforced: enforcedClaims.filter((c) => c.enforced).length };
}
