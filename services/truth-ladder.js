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

/**
 * Dual honesty grade (founder mandate): actor grades self; peer grades them;
 * compare. Trust is not self-declared — mismatch or missing peer → trust withheld.
 * @param {{ actor_id:string, claim:string, self_grade:string, self_rationale?:string, evidence?:object }} input
 * @param {{ peerReviewFn?: Function }} opts peerReviewFn({claim, self_grade, evidence}) -> { grade, rationale, theater_detected?:boolean }
 */
export async function dualHonestyGrade(input = {}, { peerReviewFn } = {}) {
  const claim = String(input.claim || '').trim();
  const actor_id = String(input.actor_id || 'unknown').trim() || 'unknown';
  const self_raw = normalizeGrade(input.self_grade) || GRADES.GUESS;
  const self_enforced = enforceClaim({
    id: `${actor_id}_self`,
    text: claim,
    grade: self_raw,
    kind: input.kind || 'assumption',
    proof: input.evidence || input.proof || null,
  });

  let peer = null;
  let peer_present = false;
  if (typeof peerReviewFn === 'function') {
    try {
      peer = await peerReviewFn({
        claim,
        self_grade: self_enforced.grade,
        self_rationale: input.self_rationale || null,
        evidence: input.evidence || null,
        actor_id,
      });
      peer_present = true;
    } catch (err) {
      peer = { grade: GRADES.GUESS, rationale: `peer_review_failed:${err.message}`, theater_detected: true };
      peer_present = false;
    }
  } else {
    peer = { grade: GRADES.GUESS, rationale: 'peer_review_missing', theater_detected: true };
    peer_present = false;
  }

  const peer_enforced = enforceClaim({
    id: `${actor_id}_peer`,
    text: claim,
    grade: normalizeGrade(peer?.grade) || GRADES.GUESS,
    kind: input.kind || 'assumption',
    proof: input.evidence || input.proof || null,
  });

  const selfRank = gradeRank(self_enforced.grade);
  const peerRank = gradeRank(peer_enforced.grade);
  // Missing peer is never agreement — that would be self-certify theater.
  const agree = peer_present && self_enforced.grade === peer_enforced.grade;
  const theater = Boolean(peer?.theater_detected)
    || !peer_present
    || /\btheater\b|\bself.?certif/i.test(String(peer?.rationale || ''))
    || (selfRank >= RANK.KNOW && peerRank < RANK.THINK);

  // Effective honesty = min(self, peer). Trust earned only when they agree at THINK+ with no theater.
  const effective = selfRank <= peerRank ? self_enforced.grade : peer_enforced.grade;
  const trust_earned = agree
    && !theater
    && gradeRank(effective) >= RANK.THINK
    && hasProof({ proof: input.evidence || input.proof });

  return {
    ok: true,
    actor_id,
    claim,
    self: { grade: self_enforced.grade, original: self_raw, rationale: input.self_rationale || null, flags: self_enforced.flags },
    peer: { grade: peer_enforced.grade, rationale: peer?.rationale || null, flags: peer_enforced.flags, theater_detected: theater },
    compare: { agree, effective_grade: effective, theater },
    trust_earned,
    truth_earned_by: ['receipts', 'reality_scorecard', 'peer_grade'],
    law: 'self_grade + peer_grade + compare; no self-certify alone',
  };
}

/**
 * Factory may claim "following blueprint" only with twin ids. Else NOT_ON_BLUEPRINT.
 */
export function blueprintFollowClaim({ blueprint_id = null, blueprint_step_id = null, claim_following_blueprint = false } = {}) {
  const hasTwin = Boolean(String(blueprint_id || '').trim() && String(blueprint_step_id || '').trim());
  if (claim_following_blueprint && !hasTwin) {
    return {
      ok: false,
      status: 'NOT_ON_BLUEPRINT',
      error: 'Claimed following_blueprint without blueprint_id + blueprint_step_id — theater forbidden',
      trust_earned: false,
    };
  }
  if (!hasTwin) {
    return {
      ok: false,
      status: 'NOT_ON_BLUEPRINT',
      error: 'Factory step missing blueprint_id + blueprint_step_id',
      trust_earned: false,
    };
  }
  return {
    ok: true,
    status: 'ON_BLUEPRINT',
    blueprint_id: String(blueprint_id).trim(),
    blueprint_step_id: String(blueprint_step_id).trim(),
    trust_earned: null,
  };
}