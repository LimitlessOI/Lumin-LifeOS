/**
 * SYNOPSIS: Cognitive Core — prediction auto-capture + auto-resolve sweep.
 * Turns EVERY real founder ship/build decision into a journaled decision carrying a
 * falsifiable prediction (predicted_option='pass') at a confidence inferred from ADAM's
 * OWN decision-time language — never the builder's self-confidence. The resulting build
 * receipt (in-process founder build job: pass_fail + commit_sha) auto-resolves it via the
 * Outcome Oracle, deterministically keyed by job_id/commit_sha (zero mis-attribution,
 * fail-closed when the outcome is genuinely unknown).
 *
 * Subject is the PRINCIPAL's judgment. This is what makes Era-1..8 stop being theoretical:
 * the scoreboard fills from real behaviour, not declared intent or manual probes.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';
import { createCognitiveCoreOracle } from './cognitive-core-oracle.js';
import { getFounderBuildJob as defaultGetFounderBuildJob } from './founder-build-job-store.js';

const SHIPPING_DOMAIN = 'shipping';
const SOURCE_SURFACE = 'founder_build';
const CAPTURE_DEDUPE_WINDOW_MIN = 15;

// ── Pure: infer the founder's implied prior from HIS OWN language ────────────
// Cheap, deterministic, and honest: it samples Adam's mind (how sure HE sounds),
// not the machine's. Low reliability is fine — the oracle's e-value refuses to
// trust a fuzzy prior until real density earns a correction (Law 2).

const HIGH_CUES = [
  /\bshould (just )?(work|be fine|be easy|be simple|be quick)\b/i,
  /\b(obviously|clearly|definitely|certainly|of course|no problem|trivial|straightforward|easy|simple|piece of cake|slam dunk)\b/i,
  /\bthis is (easy|simple|trivial|quick|nothing)\b/i,
  /\b(i('?m| am) (sure|certain|confident)|no doubt|for sure)\b/i,
  /\bjust (fix|change|add|flip|tweak|bump) (the|a|this|that)\b/i,
];

const LOW_CUES = [
  /\b(let'?s try|let me try|try to|give it a (try|shot)|take a shot|experiment|see if (this|it|that))\b/i,
  /\b(not sure|unsure|no idea|dunno|don'?t know if|might|maybe|possibly|hopefully|fingers crossed)\b/i,
  /\b(risky|tricky|hard|difficult|complicated|complex|hairy|gnarly|long shot|iffy|shaky|fragile)\b/i,
  /\b(i (doubt|suspect it (won'?t|might not))|probably won'?t|may not work|could break)\b/i,
  /\bworth a (try|shot)\b/i,
];

const MODERATE_CUES = [
  /\b(should|probably|likely|expect|i think (this|it|that)|pretty sure|fairly (sure|confident)|ought to)\b/i,
];

const HEDGE_CUES = [
  /\b(i'?m not sure,? but|not certain,? but|could be wrong,? but|no promises|we'?ll see)\b/i,
];

/**
 * Returns { prior, band, source, cues } — prior in [0,1] is the confidence to attach
 * to the "this ship/build will pass" prediction. Strongest signal wins; a hedge caps it.
 */
export function inferPriorConfidence(text = '') {
  const t = String(text || '');
  const cues = [];
  const hit = (patterns) => patterns.filter((re) => re.test(t)).map((re) => re.source.slice(0, 48));

  const hedged = hit(HEDGE_CUES);
  const low = hit(LOW_CUES);
  const high = hit(HIGH_CUES);
  const moderate = hit(MODERATE_CUES);

  // Explicit hedge ("not sure, but…") dominates — it's the founder naming his own doubt.
  if (hedged.length) {
    cues.push(...hedged.map((c) => `hedge:${c}`));
    return { prior: 0.45, band: 'hedged', source: 'language_hedged', cues };
  }
  // Low + high together => mixed signal, treat as moderate-low (the doubt words matter more).
  if (low.length && high.length) {
    cues.push(...low.map((c) => `low:${c}`), ...high.map((c) => `high:${c}`));
    return { prior: 0.5, band: 'mixed', source: 'language_mixed', cues };
  }
  if (low.length) {
    cues.push(...low.map((c) => `low:${c}`));
    return { prior: 0.35, band: 'low', source: 'language_low', cues };
  }
  if (high.length) {
    cues.push(...high.map((c) => `high:${c}`));
    return { prior: 0.8, band: 'high', source: 'language_high', cues };
  }
  if (moderate.length) {
    cues.push(...moderate.map((c) => `moderate:${c}`));
    return { prior: 0.65, band: 'moderate', source: 'language_moderate', cues };
  }
  // No confidence language at all — neutral prior, clearly labelled as a default (not a read).
  return { prior: 0.55, band: 'neutral', source: 'default_neutral', cues };
}

const BUILD_VERB = /\b(fix|update|add|remove|delete|create|make|build|improve|edit|modify|resize|increase|decrease|enable|disable|install|configure|rename|move|replace|set|reset|adjust|implement|wire|connect|upgrade|rewrite|refactor|ship|deploy|redeploy|push)\b/i;
const EXPLICIT_SHIP = /\b(ship it|make it happen|do it now|just do it|get it done|execute (it|this|that)|run it now|push (it|this)|go ahead)\b/i;

/**
 * Pure fallback detector for whether a message is a ship/build decision (the HTTP boundary
 * already knows the channel and is authoritative; this backs the /oracle/capture endpoint
 * and tests). Returns 'ship' | 'build' | null.
 */
export function detectShipDecision(text = '') {
  const t = String(text || '').trim();
  if (!t) return null;
  if (EXPLICIT_SHIP.test(t)) return 'ship';
  // A question about a build ("what did the last build do?", "did it ship?") is a status
  // recall, not a decision to build — don't capture it as a falsifiable prediction.
  if (/\?\s$/.test(t) && /\b(did|has|have|was|what|how|is|are|when|status)\b/i.test(t)) return null;
  if (BUILD_VERB.test(t)) return 'build';
  return null;
}

/** Map a terminal founder-build job to an oracle verdict (fail-closed on non-terminal). */
export function verdictFromBuildJob(job) {
  if (!job || !job.result) return null;
  const passFail = String(job.result.pass_fail || '').toUpperCase();
  if (job.status === 'failed' || passFail === 'FAIL') return 'fail';
  if (passFail === 'PASS') return 'pass'; // committed landed; live-behaviour proof is a separate Layer-B question
  return null;
}

/**
 * @param {{ pool: import('pg').Pool, logger?: Console, oracle?: object, judgment?: object,
 *   getFounderBuildJob?: (id:string)=>object }} deps
 */
export function createCognitiveCoreCapture(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const judgment = deps.judgment || (pool ? createCognitiveCoreJudgment({ pool, logger }) : null);
  const oracle = deps.oracle || (pool ? createCognitiveCoreOracle({ pool, logger }) : null);
  const getJob = deps.getFounderBuildJob || defaultGetFounderBuildJob;

  async function findRecentDuplicate({ userId, question, threadId, jobId }) {
    if (!pool) return null;
    // A build turn that produced a job_id is uniquely keyed by that job — prefer it.
    if (jobId) {
      const { rows } = await pool.query(
        `SELECT decision_id FROM judgment_decisions
         WHERE user_id = $1 AND source_surface = $2
           AND situation_snapshot->>'job_id' = $3
         ORDER BY created_at DESC LIMIT 1`,
        [String(userId), SOURCE_SURFACE, String(jobId)],
      );
      if (rows[0]) return rows[0].decision_id;
    }
    const { rows } = await pool.query(
      `SELECT decision_id FROM judgment_decisions
       WHERE user_id = $1 AND source_surface = $2 AND domain = $3
         AND question = $4
         AND ($5::text IS NULL OR thread_id IS NOT DISTINCT FROM $5)
         AND created_at > NOW() - ($6 || ' minutes')::interval
       ORDER BY created_at DESC LIMIT 1`,
      [
        String(userId), SOURCE_SURFACE, SHIPPING_DOMAIN,
        String(question || '').slice(0, 4000),
        threadId != null ? String(threadId) : null,
        String(CAPTURE_DEDUPE_WINDOW_MIN),
      ],
    );
    return rows[0]?.decision_id || null;
  }

  /**
   * Journal a founder ship/build decision with a language-implied prior. Idempotent on
   * (job_id) or (thread+question within the dedupe window). Best-effort by design — the
   * caller must never let this affect the reply.
   */
  async function captureBuildDecision({
    userId = '1',
    text,
    threadId = null,
    stakes = 'medium',
    jobId = null,
    commitSha = null,
    channel = null,
  } = {}) {
    if (!pool || !judgment) throw new Error('cognitive_core_requires_pool');
    const question = String(text || '').trim();
    if (!question) return { ok: false, reason: 'empty_text' };

    const dupId = await findRecentDuplicate({ userId, question, threadId, jobId });
    if (dupId) {
      return { ok: true, deduped: true, decision_id: dupId };
    }

    const prior = inferPriorConfidence(question);
    const decision = await judgment.recordDecisionTurn({
      userId,
      domain: SHIPPING_DOMAIN,
      question,
      options: ['pass', 'fail'],
      situationSnapshot: {
        capture: 'auto',
        channel: channel || null,
        job_id: jobId || null,
        commit_sha: commitSha || null,
        prior_source: prior.source,
        prior_band: prior.band,
        prior_cues: prior.cues,
      },
      stakes,
      sourceSurface: SOURCE_SURFACE,
      threadId,
    });

    await judgment.recordPrediction({
      decisionId: decision.decision_id,
      predictedOption: 'pass',
      predictedReasons: [`implied prior from founder language (${prior.source}: ${prior.band})`],
      confidence: prior.prior,
      synthesisSummary: 'auto-captured founder ship/build decision — outcome resolves from the build receipt',
    });

    return { ok: true, decision_id: decision.decision_id, prior };
  }

  /** Deterministic resolve of a captured decision from a known build result. */
  async function resolveCaptured({
    userId = '1',
    decisionId,
    commitSha = null,
    jobId = null,
    passFail = null,
    receiptKind = 'ci',
    raw = {},
  } = {}) {
    if (!oracle) throw new Error('cognitive_core_requires_pool');
    if (!decisionId) return { ok: false, reason: 'decision_id_required' };
    const pf = String(passFail || '').toUpperCase();
    const verdict = pf === 'PASS' ? 'pass' : pf === 'FAIL' ? 'fail' : null;
    if (!verdict) return { ok: false, reason: 'no_terminal_verdict' };
    return oracle.resolveFromReceipt({
      userId,
      decisionId,
      receiptKind,
      receiptRef: commitSha || jobId || null,
      verdict,
      raw: { ...raw, pass_fail: pf, job_id: jobId || null, commit_sha: commitSha || null },
    });
  }

  /**
   * Reconcile open founder_build decisions against the in-process build job store.
   * Deterministic (keyed by the decision's own job_id) → never mis-attributes.
   * Fail-closed: a decision whose job is still running / pruned / unknown stays open.
   */
  async function sweepOpenBuildDecisions({ userId = '1', limit = 100 } = {}) {
    if (!pool || !judgment) throw new Error('cognitive_core_requires_pool');
    const open = await judgment.listOpenDecisions(userId, limit);
    const buildDecisions = open.filter((d) => d.source_surface === SOURCE_SURFACE);
    const resolved = [];
    const pending = [];
    for (const d of buildDecisions) {
      const snap = d.situation_snapshot || {};
      const jobId = snap.job_id || null;
      const commitSha = snap.commit_sha || null;
      const job = jobId ? getJob(jobId) : null;
      const verdict = verdictFromBuildJob(job);
      if (!verdict) {
        pending.push({ decision_id: d.decision_id, job_id: jobId, reason: job ? 'job_running' : 'job_unknown' });
        continue;
      }
      try {
        const out = await resolveCaptured({
          userId,
          decisionId: d.decision_id,
          commitSha: job.result?.commit_sha || commitSha,
          jobId,
          passFail: verdict === 'pass' ? 'PASS' : 'FAIL',
          raw: {
            transport_status: job.result?.transport_status || null,
            execution_path: job.result?.execution_path || null,
            committed: job.result?.committed ?? null,
          },
        });
        resolved.push({ decision_id: d.decision_id, verdict, ok: out?.ok === true });
      } catch (e) {
        pending.push({ decision_id: d.decision_id, job_id: jobId, reason: `resolve_failed:${e.message}` });
      }
    }
    return { ok: true, scanned: buildDecisions.length, resolved, pending };
  }

  return {
    inferPriorConfidence,
    detectShipDecision,
    verdictFromBuildJob,
    captureBuildDecision,
    resolveCaptured,
    sweepOpenBuildDecisions,
    SHIPPING_DOMAIN,
    SOURCE_SURFACE,
  };
}

export default createCognitiveCoreCapture;