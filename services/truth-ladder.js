/**
 * SYNOPSIS: Truth-ladder enforcement — grades load-bearing CLAIMS (not code
 * lines) on the founder's scale DONT_KNOW < GUESS < THINK < KNOW < LAW, requires
 * proof for KNOW/LAW (mirrors no-false-green at the claim level), and emits a
 * re-confirmation watchlist for everything below KNOW so assumptions get checked
 * against reality later. Grading judgment is delegated to a second AI via an
 * injected reviewFn (separation of powers); the enforcement + watchlist logic is
 * deterministic and unit-tested. Also enforces exact-change law: twin step
 * resolve + rebuildable exactness + seal/reverse pinpoint.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const _TRUTH_DIR = path.dirname(fileURLToPath(import.meta.url));
const _REPO_ROOT = path.resolve(_TRUTH_DIR, '..');
const SYNTHETIC_BLUEPRINT_RE = /^(governed-autonomous-|GOVERNED-AUTONOMOUS-)/i;

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
 * Resolve a real on-disk twin (mission BLUEPRINT.json or registered product queue twin).
 * Synthetic governed-autonomous-* ids are theater — never ON_BLUEPRINT.
 */
export function resolveTwinBlueprint(blueprint_id, { repoRoot = _REPO_ROOT } = {}) {
  const id = String(blueprint_id || '').trim();
  if (!id) return { ok: false, reason: 'missing_blueprint_id' };
  if (SYNTHETIC_BLUEPRINT_RE.test(id)) {
    return { ok: false, reason: 'synthetic_blueprint_id_forbidden', blueprint_id: id };
  }

  const missionsRoot = path.join(repoRoot, 'builderos-reboot', 'MISSIONS');
  try {
    if (fs.existsSync(missionsRoot)) {
      for (const name of fs.readdirSync(missionsRoot)) {
        const p = path.join(missionsRoot, name, 'BLUEPRINT.json');
        if (!fs.existsSync(p)) continue;
        let bp;
        try { bp = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
        if (bp?.blueprint_id === id || bp?.mission_id === id) {
          const stepIds = new Set((Array.isArray(bp.steps) ? bp.steps : []).map((s) => s.step_id || s.id).filter(Boolean));
          return {
            ok: true,
            source: 'mission_blueprint',
            mission_id: bp.mission_id || name,
            blueprint_id: bp.blueprint_id || id,
            path: p,
            step_ids: stepIds,
            blueprint: bp,
          };
        }
      }
    }
  } catch { /* fall through */ }

  // Registered product twin: docs/products/<id>/BLUEPRINT.json
  const productsRoot = path.join(repoRoot, 'docs', 'products');
  try {
    if (fs.existsSync(productsRoot)) {
      for (const name of fs.readdirSync(productsRoot)) {
        const twinPath = path.join(productsRoot, name, 'BLUEPRINT.json');
        if (fs.existsSync(twinPath)) {
          let bp;
          try { bp = JSON.parse(fs.readFileSync(twinPath, 'utf8')); } catch { /* next */ }
          if (bp && (bp.blueprint_id === id || bp.mission_id === id)) {
            const stepIds = new Set((Array.isArray(bp.steps) ? bp.steps : []).map((s) => s.step_id || s.id).filter(Boolean));
            return {
              ok: true,
              source: 'product_blueprint',
              mission_id: bp.mission_id || name,
              blueprint_id: bp.blueprint_id || id,
              path: twinPath,
              step_ids: stepIds,
              blueprint: bp,
            };
          }
        }
        // Registered BUILD_QUEUE twin (must carry formal blueprint_id — not inventable)
        const qPath = path.join(productsRoot, name, 'BUILD_QUEUE.json');
        if (!fs.existsSync(qPath)) continue;
        let q;
        try { q = JSON.parse(fs.readFileSync(qPath, 'utf8')); } catch { continue; }
        if (!q?.blueprint_id || SYNTHETIC_BLUEPRINT_RE.test(String(q.blueprint_id))) continue;
        if (q.blueprint_id !== id) continue;
        const stepIds = new Set((Array.isArray(q.steps) ? q.steps : []).map((s) => s.blueprint_step_id || s.step_id || s.id).filter(Boolean));
        return {
          ok: true,
          source: 'product_build_queue_twin',
          mission_id: q.mission_id || `PRODUCT-${name}`,
          blueprint_id: q.blueprint_id,
          path: qPath,
          step_ids: stepIds,
          blueprint: q,
        };
      }
    }
  } catch { /* fall through */ }

  return { ok: false, reason: 'blueprint_id_not_found_on_disk', blueprint_id: id };
}

/**
 * Factory may claim "following blueprint" only when ids resolve to a real on-disk twin
 * AND the step exists on that twin. Synthetic governed-autonomous-* → NOT_ON_BLUEPRINT.
 */
export function blueprintFollowClaim({
  blueprint_id = null,
  blueprint_step_id = null,
  claim_following_blueprint = false,
  repoRoot = _REPO_ROOT,
} = {}) {
  const bid = String(blueprint_id || '').trim();
  const bsid = String(blueprint_step_id || '').trim();
  const hasTwin = Boolean(bid && bsid);
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
  if (SYNTHETIC_BLUEPRINT_RE.test(bid)) {
    return {
      ok: false,
      status: 'NOT_ON_BLUEPRINT',
      error: `synthetic_blueprint_id_forbidden:${bid}`,
      trust_earned: false,
    };
  }
  const resolved = resolveTwinBlueprint(bid, { repoRoot });
  if (!resolved.ok) {
    return {
      ok: false,
      status: 'NOT_ON_BLUEPRINT',
      error: resolved.reason || 'blueprint_id_not_found_on_disk',
      trust_earned: false,
    };
  }
  if (!resolved.step_ids.has(bsid)) {
    return {
      ok: false,
      status: 'NOT_ON_BLUEPRINT',
      error: `blueprint_step_id_not_on_twin:${bsid}`,
      trust_earned: false,
      twin_source: resolved.source,
      twin_path: resolved.path,
    };
  }
  return {
    ok: true,
    status: 'ON_BLUEPRINT',
    blueprint_id: resolved.blueprint_id,
    blueprint_step_id: bsid,
    mission_id: resolved.mission_id,
    twin_source: resolved.source,
    twin_path: resolved.path,
    trust_earned: null,
  };
}

function stepIdentity(step) {
  return String(step?.blueprint_step_id || step?.step_id || step?.id || '').trim();
}

function hasExactRebuildBytes(step) {
  if (typeof step?.exact_content === 'string' && step.exact_content.length > 0) return true;
  if (typeof step?.exact_inputs?.exact_content === 'string' && step.exact_inputs.exact_content.length > 0) return true;
  const src = step?.exact_inputs?.content_source_path || step?.content_source_path;
  return typeof src === 'string' && src.trim().length > 0;
}

function hasAuthorableContract(step) {
  // First ship may author from twin task+spec; sealExactChangeIntoTwin then
  // writes exact bytes so any later rebuild is deterministic.
  const task = String(step?.task || step?.authoring?.task || '').trim();
  const spec = String(step?.spec || step?.authoring?.spec || '').trim();
  return Boolean(task && spec);
}

/**
 * Load the exact twin step object from on-disk blueprint / BUILD_QUEUE.
 */
export function getTwinStep(blueprint_id, blueprint_step_id, { repoRoot = _REPO_ROOT } = {}) {
  const follow = blueprintFollowClaim({
    blueprint_id,
    blueprint_step_id,
    claim_following_blueprint: true,
    repoRoot,
  });
  if (!follow.ok) {
    return { ok: false, status: follow.status, error: follow.error };
  }
  const resolved = resolveTwinBlueprint(blueprint_id, { repoRoot });
  if (!resolved.ok) {
    return { ok: false, status: 'NOT_ON_BLUEPRINT', error: resolved.reason };
  }
  const steps = Array.isArray(resolved.blueprint?.steps) ? resolved.blueprint.steps : [];
  const step = steps.find((s) => stepIdentity(s) === String(blueprint_step_id || '').trim());
  if (!step) {
    return {
      ok: false,
      status: 'NOT_ON_BLUEPRINT',
      error: `blueprint_step_id_not_on_twin:${blueprint_step_id}`,
    };
  }
  return {
    ok: true,
    status: 'ON_BLUEPRINT',
    step,
    twin: follow,
    twin_source: resolved.source,
    twin_path: resolved.path,
    blueprint: resolved.blueprint,
  };
}

/**
 * Exact-change law entry gate. Twin step must exist and be rebuildable
 * (sealed exact bytes, or one-shot authorable contract that must seal after ship).
 */
export function exactChangeClaim({
  blueprint_id = null,
  blueprint_step_id = null,
  claim_following_blueprint = true,
  require_sealed = false,
  repoRoot = _REPO_ROOT,
} = {}) {
  const follow = blueprintFollowClaim({
    blueprint_id,
    blueprint_step_id,
    claim_following_blueprint,
    repoRoot,
  });
  if (!follow.ok) {
    return {
      ok: false,
      status: follow.status || 'NOT_ON_BLUEPRINT',
      error: follow.error,
      trust_earned: false,
    };
  }
  const loaded = getTwinStep(blueprint_id, blueprint_step_id, { repoRoot });
  if (!loaded.ok) {
    return {
      ok: false,
      status: loaded.status || 'NOT_ON_BLUEPRINT',
      error: loaded.error,
      trust_earned: false,
    };
  }
  const step = loaded.step;
  const target_file = String(step.target_file || '').trim();
  if (!target_file) {
    return {
      ok: false,
      status: 'NOT_EXACT_BLUEPRINT_STEP',
      error: 'twin_step_missing_target_file',
      trust_earned: false,
      twin: follow,
    };
  }
  const sealed = hasExactRebuildBytes(step)
    && Boolean(step?.exactness?.content_sha256)
    && Boolean(step?.exactness?.shipped_at || step?.shipped_at);
  const authorable = hasAuthorableContract(step);
  if (require_sealed && !sealed) {
    return {
      ok: false,
      status: 'NOT_EXACT_BLUEPRINT_STEP',
      error: 'twin_step_not_sealed_exact',
      trust_earned: false,
      twin: follow,
      target_file,
    };
  }
  if (!sealed && !authorable && !hasExactRebuildBytes(step)) {
    return {
      ok: false,
      status: 'NOT_EXACT_BLUEPRINT_STEP',
      error: 'twin_step_not_rebuildable — need exact_content/content_source_path OR task+spec+assertion_spec',
      trust_earned: false,
      twin: follow,
      target_file,
    };
  }
  return {
    ok: true,
    status: sealed ? 'EXACT_SEALED' : (hasExactRebuildBytes(step) ? 'EXACT_BYTES' : 'EXACT_AUTHORABLE'),
    blueprint_id: follow.blueprint_id,
    blueprint_step_id: follow.blueprint_step_id,
    mission_id: follow.mission_id,
    twin_source: follow.twin_source,
    twin_path: follow.twin_path,
    target_file,
    step,
    sealed,
    reverse: step?.exactness?.reverse || step?.reverse || null,
    trust_earned: null,
  };
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function productIdFromTwinPath(twinPath) {
  const parts = String(twinPath || '').split(path.sep);
  const idx = parts.lastIndexOf('products');
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return null;
}

/**
 * After a successful ship: seal exact bytes into the twin so any system can
 * rebuild this aspect, and record reverse pinpoint (where/when/sha).
 */
export function sealExactChangeIntoTwin({
  blueprint_id,
  blueprint_step_id,
  content,
  commit_sha = null,
  prior_commit_sha = null,
  repoRoot = _REPO_ROOT,
} = {}) {
  const loaded = getTwinStep(blueprint_id, blueprint_step_id, { repoRoot });
  if (!loaded.ok) {
    return { ok: false, status: loaded.status, error: loaded.error };
  }
  const step = loaded.step;
  const target_file = String(step.target_file || '').trim();
  if (!target_file) {
    return { ok: false, status: 'NOT_EXACT_BLUEPRINT_STEP', error: 'twin_step_missing_target_file' };
  }
  let bytes = content;
  if (bytes == null) {
    const absTarget = path.join(repoRoot, target_file);
    if (!fs.existsSync(absTarget)) {
      return { ok: false, status: 'NOT_EXACT_BLUEPRINT_STEP', error: `shipped_target_missing:${target_file}` };
    }
    bytes = fs.readFileSync(absTarget, 'utf8');
  }
  const text = String(bytes);
  const content_sha256 = sha256Text(text);
  const productId = productIdFromTwinPath(loaded.twin_path);
  const artifactRel = productId
    ? path.join('docs', 'products', productId, 'twins', 'steps', `${blueprint_step_id}.exact`)
    : path.join('docs', 'products', '_unscoped', 'twins', 'steps', `${blueprint_id}__${blueprint_step_id}.exact`);
  const artifactAbs = path.join(repoRoot, artifactRel);
  fs.mkdirSync(path.dirname(artifactAbs), { recursive: true });
  fs.writeFileSync(artifactAbs, text, 'utf8');

  const fileExistedBefore = Boolean(prior_commit_sha);
  const reverse = {
    mode: fileExistedBefore ? 'restore_prior_commit_path' : 'delete_file',
    target_file,
    prior_commit_sha: prior_commit_sha || null,
    prior_content_sha256: null,
  };
  if (prior_commit_sha) {
    try {
      const prior = execFileSync('git', ['show', `${prior_commit_sha}:${target_file}`], {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
      });
      reverse.prior_content_sha256 = sha256Text(prior);
    } catch {
      reverse.mode = 'delete_file';
      reverse.prior_commit_sha = null;
    }
  }

  const now = new Date().toISOString();
  step.action_type = 'write_file_exact';
  step.exact_inputs = {
    content_source_path: artifactRel.replace(/\\/g, '/'),
  };
  step.exactness = {
    sealed: true,
    sealed_at: now,
    shipped_at: now,
    commit_sha: commit_sha || step.commit_sha || null,
    content_sha256,
    target_file,
    reverse,
    rebuild: {
      action_type: 'write_file_exact',
      content_source_path: artifactRel.replace(/\\/g, '/'),
      content_sha256,
    },
  };
  step.shipped_at = now;
  if (commit_sha) step.commit_sha = commit_sha;
  step.blueprint_id = step.blueprint_id || blueprint_id;
  step.blueprint_step_id = step.blueprint_step_id || blueprint_step_id;

  const twinPath = loaded.twin_path;
  const bp = loaded.blueprint;
  const idx = (bp.steps || []).findIndex((s) => stepIdentity(s) === String(blueprint_step_id).trim());
  if (idx >= 0) bp.steps[idx] = step;
  fs.writeFileSync(twinPath, `${JSON.stringify(bp, null, 2)}\n`, 'utf8');

  return {
    ok: true,
    status: 'EXACT_SEALED',
    blueprint_id,
    blueprint_step_id,
    target_file,
    content_sha256,
    artifact_path: artifactRel.replace(/\\/g, '/'),
    reverse,
    shipped_at: now,
    commit_sha: commit_sha || null,
    twin_path: twinPath,
  };
}

/**
 * Plan (and optionally apply) reverse of one sealed twin step — only that aspect.
 */
export function reverseExactChange({
  blueprint_id,
  blueprint_step_id,
  apply = false,
  repoRoot = _REPO_ROOT,
} = {}) {
  const loaded = getTwinStep(blueprint_id, blueprint_step_id, { repoRoot });
  if (!loaded.ok) {
    return { ok: false, status: loaded.status, error: loaded.error };
  }
  const step = loaded.step;
  const reverse = step?.exactness?.reverse || step?.reverse;
  const target_file = String(reverse?.target_file || step?.target_file || '').trim();
  if (!target_file) {
    return { ok: false, status: 'NOT_EXACT_BLUEPRINT_STEP', error: 'reverse_missing_target_file' };
  }
  if (!reverse?.mode) {
    return {
      ok: false,
      status: 'NOT_EXACT_BLUEPRINT_STEP',
      error: 'twin_step_has_no_reverse_contract — seal after ship first',
      target_file,
    };
  }
  const abs = path.join(repoRoot, target_file);
  const plan = {
    ok: true,
    status: 'REVERSE_PLAN',
    blueprint_id,
    blueprint_step_id,
    target_file,
    mode: reverse.mode,
    prior_commit_sha: reverse.prior_commit_sha || null,
    pinpoint: {
      shipped_at: step?.exactness?.shipped_at || step?.shipped_at || null,
      commit_sha: step?.exactness?.commit_sha || step?.commit_sha || null,
      content_sha256: step?.exactness?.content_sha256 || null,
    },
    applied: false,
  };
  if (!apply) return plan;

  if (reverse.mode === 'delete_file') {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    plan.applied = true;
    plan.status = 'REVERSED';
    return plan;
  }
  if (reverse.mode === 'restore_prior_commit_path' && reverse.prior_commit_sha) {
    const prior = execFileSync('git', ['show', `${reverse.prior_commit_sha}:${target_file}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, prior, 'utf8');
    plan.applied = true;
    plan.status = 'REVERSED';
    plan.restored_sha256 = sha256Text(prior);
    return plan;
  }
  return {
    ok: false,
    status: 'NOT_EXACT_BLUEPRINT_STEP',
    error: `unsupported_reverse_mode:${reverse.mode}`,
    target_file,
  };
}