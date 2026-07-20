/**
 * SYNOPSIS: Cognitive Core Era-1 — decision journal, predictions, outcomes, miss reports, scoreboard.
 * Meta-learning loop: predict → observe → explain miss → improve compiler metrics.
 * Aligns with Am 39 historian (decision/reason/prediction/outcome/lesson).
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createMemoryIntelligenceService } from './memory-intelligence-service.js';
import { COMPILER_VERSION } from '../config/judgment-capsule-contracts.js';

const FAILURE_CLASSES = new Set([
  'missing_program',
  'known_not_activated',
  'activated_underweighted',
  'situation_misread',
  'novel_change',
]);

function tierFromAccuracy(n, accuracy, brier) {
  if (n < 5) return 'refuse';
  if (accuracy >= 0.9 && (brier == null || brier <= 0.15)) return 'allow';
  if (accuracy >= 0.8 && (brier == null || brier <= 0.22)) return 'suggest';
  if (accuracy >= 0.65) return 'ask';
  return 'refuse';
}

/**
 * @param {{ pool: import('pg').Pool, logger?: Console }} deps
 */
export function createCognitiveCoreJudgment(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const evidence = pool ? createMemoryIntelligenceService({ pool, logger }) : null;

  async function recordDecisionTurn({
    userId,
    domain = 'general',
    question,
    options = [],
    situationSnapshot = {},
    wornCapsuleIds = [],
    stakes = 'medium',
    sourceSurface = null,
    threadId = null,
  }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const { rows } = await pool.query(
      `INSERT INTO judgment_decisions
         (user_id, domain, question, options, situation_snapshot, worn_capsule_ids, stakes, source_surface, thread_id)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9)
       RETURNING *`,
      [
        String(userId),
        String(domain || 'general').slice(0, 80),
        String(question || '').slice(0, 4000),
        JSON.stringify(Array.isArray(options) ? options : []),
        JSON.stringify(situationSnapshot || {}),
        Array.isArray(wornCapsuleIds) ? wornCapsuleIds.map(String) : [],
        ['low', 'medium', 'high'].includes(stakes) ? stakes : 'medium',
        sourceSurface || null,
        threadId || null,
      ],
    );
    return rows[0];
  }

  async function recordPrediction({
    decisionId,
    predictedOption = null,
    predictedReasons = [],
    activatedProgramIds = [],
    confidence = 0.5,
    tensionLedger = [],
    synthesisSummary = null,
    compilerVersion = COMPILER_VERSION,
  }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const conf = Math.max(0, Math.min(1, Number(confidence) || 0.5));
    const { rows } = await pool.query(
      `INSERT INTO judgment_predictions
         (decision_id, predicted_option, predicted_reasons, activated_program_ids, confidence,
          tension_ledger, synthesis_summary, compiler_version)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6::jsonb,$7,$8)
       RETURNING *`,
      [
        decisionId,
        predictedOption,
        JSON.stringify(Array.isArray(predictedReasons) ? predictedReasons : []),
        Array.isArray(activatedProgramIds) ? activatedProgramIds.map(String) : [],
        conf,
        JSON.stringify(Array.isArray(tensionLedger) ? tensionLedger : []),
        synthesisSummary,
        compilerVersion,
      ],
    );
    return rows[0];
  }

  async function recordOutcome({
    decisionId,
    actualOption,
    statedReasons = [],
    capturedHow = 'explicit',
    receiptLinkId = null,
  }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    if (capturedHow === 'inferred_forbidden') {
      throw new Error('outcomes_must_not_be_inferred');
    }
    let how = ['explicit', 'deferred_review', 'chair_confirm', 'receipt_verified'].includes(capturedHow)
      ? capturedHow
      : 'explicit';
    // 'receipt_verified' is a claim about real, external proof — never trust it
    // as a bare string from a caller. Require a matching row in
    // judgment_receipt_links for this exact decision; otherwise downgrade to
    // 'explicit' rather than let an unproven claim inflate the evidence count.
    if (how === 'receipt_verified') {
      const { rows: linkCheck } = receiptLinkId
        ? await pool.query(
            `SELECT 1 FROM judgment_receipt_links WHERE decision_id = $1 AND link_id = $2 LIMIT 1`,
            [decisionId, receiptLinkId],
          )
        : { rows: [] };
      if (linkCheck.length === 0) {
        logger.warn?.(`[cognitive-core] rejected unproven receipt_verified claim on decision ${decisionId} — downgraded to explicit`);
        how = 'explicit';
      }
    }
    const nextActualOption = String(actualOption || '').slice(0, 2000);

    // A decision only ever has one CURRENT outcome row, but the previous
    // state must never just vanish — an outcome getting silently corrected
    // with no trace is exactly the kind of unfalsifiable claim this whole
    // system exists to prevent. Archive whatever was there before touching it.
    const { rows: existingRows } = await pool.query(
      `SELECT outcome_id, actual_option, stated_reasons, captured_how, captured_at
       FROM judgment_outcomes WHERE decision_id = $1`,
      [decisionId],
    );
    const existing = existingRows[0];
    if (existing && existing.actual_option !== nextActualOption) {
      await pool.query(
        `INSERT INTO judgment_outcome_history
           (decision_id, outcome_id, prior_actual_option, prior_stated_reasons, prior_captured_how,
            prior_captured_at, superseded_by_actual_option, superseded_by_captured_how)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)`,
        [
          decisionId,
          existing.outcome_id,
          existing.actual_option,
          JSON.stringify(existing.stated_reasons || []),
          existing.captured_how,
          existing.captured_at,
          nextActualOption,
          how,
        ],
      ).catch((e) => {
        logger.warn?.(`[cognitive-core] failed to archive prior outcome for decision ${decisionId}: ${e.message}`);
      });
      logger.warn?.(`[cognitive-core] outcome for decision ${decisionId} corrected: "${existing.actual_option}" -> "${nextActualOption}" (archived to judgment_outcome_history)`);
    }

    const { rows } = await pool.query(
      `INSERT INTO judgment_outcomes (decision_id, actual_option, stated_reasons, captured_how)
       VALUES ($1,$2,$3::jsonb,$4)
       ON CONFLICT (decision_id) DO UPDATE SET
         actual_option = EXCLUDED.actual_option,
         stated_reasons = EXCLUDED.stated_reasons,
         captured_how = EXCLUDED.captured_how,
         captured_at = NOW()
       RETURNING *`,
      [
        decisionId,
        nextActualOption,
        JSON.stringify(Array.isArray(statedReasons) ? statedReasons : []),
        how,
      ],
    );
    const outcome = rows[0];
    await refreshDomainTrustForDecision(decisionId).catch((e) => {
      logger.warn?.(`[cognitive-core] trust refresh failed: ${e.message}`);
    });
    return outcome;
  }

  /** Every prior outcome value for a decision, most recent correction first. */
  async function getOutcomeHistory(decisionId) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const { rows } = await pool.query(
      `SELECT * FROM judgment_outcome_history WHERE decision_id = $1 ORDER BY superseded_at DESC`,
      [decisionId],
    );
    return rows;
  }

  async function buildMissReport({
    decisionId,
    predictionId = null,
    failureClass,
    earliestDivergence = null,
    correctionHypothesis = null,
    retestResult = null,
  }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    if (!FAILURE_CLASSES.has(failureClass)) {
      throw new Error(`invalid_failure_class:${failureClass}`);
    }
    const { rows } = await pool.query(
      `INSERT INTO judgment_miss_reports
         (decision_id, prediction_id, failure_class, earliest_divergence, correction_hypothesis, retest_result)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       RETURNING *`,
      [
        decisionId,
        predictionId,
        failureClass,
        earliestDivergence,
        correctionHypothesis,
        retestResult ? JSON.stringify(retestResult) : null,
      ],
    );
    return rows[0];
  }

  async function loadLatestPrediction(decisionId) {
    const { rows } = await pool.query(
      `SELECT * FROM judgment_predictions WHERE decision_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [decisionId],
    );
    return rows[0] || null;
  }

  async function refreshDomainTrustForDecision(decisionId) {
    const { rows } = await pool.query(
      `SELECT d.user_id, d.domain, p.predicted_option, p.confidence, o.actual_option
       FROM judgment_decisions d
       JOIN judgment_outcomes o ON o.decision_id = d.decision_id
       LEFT JOIN LATERAL (
         SELECT predicted_option, confidence
         FROM judgment_predictions
         WHERE decision_id = d.decision_id
         ORDER BY created_at DESC
         LIMIT 1
       ) p ON TRUE
       WHERE d.decision_id = $1`,
      [decisionId],
    );
    const row = rows[0];
    if (!row) return null;

    const correct = String(row.predicted_option || '').trim().toLowerCase()
      === String(row.actual_option || '').trim().toLowerCase();
    const conf = Math.max(0, Math.min(1, Number(row.confidence) || 0.5));
    const brierComponent = (conf - (correct ? 1 : 0)) ** 2;

    const { rows: agg } = await pool.query(
      `SELECT
         COUNT(*)::int AS n,
         COUNT(*) FILTER (
           WHERE LOWER(TRIM(p.predicted_option)) = LOWER(TRIM(o.actual_option))
         )::int AS correct_n,
         AVG(POWER(
           COALESCE(p.confidence, 0.5) - CASE
             WHEN LOWER(TRIM(p.predicted_option)) = LOWER(TRIM(o.actual_option)) THEN 1.0
             ELSE 0.0
           END, 2
         )) AS brier
       FROM judgment_decisions d
       JOIN judgment_outcomes o ON o.decision_id = d.decision_id
       JOIN LATERAL (
         SELECT predicted_option, confidence
         FROM judgment_predictions
         WHERE decision_id = d.decision_id
         ORDER BY created_at DESC
         LIMIT 1
       ) p ON TRUE
       WHERE d.user_id = $1 AND d.domain = $2`,
      [row.user_id, row.domain],
    );

    const n = agg[0]?.n || 0;
    const correctN = agg[0]?.correct_n || 0;
    const accuracy = n > 0 ? correctN / n : 0;
    const brier = agg[0]?.brier != null ? Number(agg[0].brier) : brierComponent;
    const tier = tierFromAccuracy(n, accuracy, brier);

    const { rows: trustRows } = await pool.query(
      `INSERT INTO judgment_trust_by_domain
         (user_id, domain, n, correct_n, accuracy, brier_score, delegation_tier, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (user_id, domain) DO UPDATE SET
         n = EXCLUDED.n,
         correct_n = EXCLUDED.correct_n,
         accuracy = EXCLUDED.accuracy,
         brier_score = EXCLUDED.brier_score,
         delegation_tier = EXCLUDED.delegation_tier,
         updated_at = NOW()
       RETURNING *`,
      [row.user_id, row.domain, n, correctN, accuracy, brier, tier],
    );

    if (evidence) {
      await evidence.recordAgentPerformance({
        agentId: 'cognitive_core_compiler',
        taskType: `judgment:${row.domain}`,
        prediction: row.predicted_option,
        outcome: correct ? 'correct' : 'incorrect',
        confidenceAtTime: conf,
        notes: JSON.stringify({ decision_id: decisionId, brier_component: brierComponent }),
      }).catch(() => null);
    }

    return trustRows[0];
  }

  async function getScoreboard(userId) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const { rows: domains } = await pool.query(
      `SELECT * FROM judgment_trust_by_domain WHERE user_id = $1 ORDER BY domain ASC`,
      [String(userId)],
    );
    const { rows: totals } = await pool.query(
      `SELECT
         COUNT(d.decision_id)::int AS decisions,
         COUNT(o.outcome_id)::int AS outcomes,
         COUNT(p.prediction_id)::int AS predictions,
         COUNT(m.miss_id)::int AS miss_reports
       FROM judgment_decisions d
       LEFT JOIN judgment_outcomes o ON o.decision_id = d.decision_id
       LEFT JOIN judgment_predictions p ON p.decision_id = d.decision_id
       LEFT JOIN judgment_miss_reports m ON m.decision_id = d.decision_id
       WHERE d.user_id = $1`,
      [String(userId)],
    );
    const scored = domains.filter((d) => d.n > 0);
    const overallAccuracy = scored.length
      ? scored.reduce((s, d) => s + Number(d.accuracy) * d.n, 0) / scored.reduce((s, d) => s + d.n, 0)
      : null;
    const overallBrier = scored.length
      ? scored.reduce((s, d) => s + (Number(d.brier_score) || 0) * d.n, 0) / scored.reduce((s, d) => s + d.n, 0)
      : null;

    return {
      ok: true,
      compiler_version: COMPILER_VERSION,
      user_id: String(userId),
      totals: totals[0] || {},
      overall: {
        accuracy: overallAccuracy,
        brier_score: overallBrier,
        note: 'Calibration: lower Brier is better; confidence should match hit rate',
      },
      by_domain: domains,
      laws: 'docs/constitution/COGNITIVE_CORE_LAWS.md',
    };
  }

  async function getDecision(decisionId) {
    const { rows } = await pool.query(`SELECT * FROM judgment_decisions WHERE decision_id = $1`, [decisionId]);
    if (!rows[0]) return null;
    const pred = await loadLatestPrediction(decisionId);
    const { rows: outcomes } = await pool.query(
      `SELECT * FROM judgment_outcomes WHERE decision_id = $1`,
      [decisionId],
    );
    const { rows: misses } = await pool.query(
      `SELECT * FROM judgment_miss_reports WHERE decision_id = $1 ORDER BY created_at DESC`,
      [decisionId],
    );
    return {
      decision: rows[0],
      prediction: pred,
      outcome: outcomes[0] || null,
      miss_reports: misses,
    };
  }

  async function listOpenDecisions(userId, limit = 20) {
    const { rows } = await pool.query(
      `SELECT d.*, p.predicted_option, p.confidence
       FROM judgment_decisions d
       LEFT JOIN LATERAL (
         SELECT predicted_option, confidence
         FROM judgment_predictions WHERE decision_id = d.decision_id
         ORDER BY created_at DESC LIMIT 1
       ) p ON TRUE
       LEFT JOIN judgment_outcomes o ON o.decision_id = d.decision_id
       WHERE d.user_id = $1 AND o.outcome_id IS NULL
       ORDER BY d.created_at DESC
       LIMIT $2`,
      [String(userId), Math.min(100, Math.max(1, Number(limit) || 20))],
    );
    return rows;
  }

  return {
    recordDecisionTurn,
    recordPrediction,
    recordOutcome,
    getOutcomeHistory,
    buildMissReport,
    getScoreboard,
    getDecision,
    listOpenDecisions,
    refreshDomainTrustForDecision,
    loadLatestPrediction,
    COMPILER_VERSION,
    FAILURE_CLASSES: [...FAILURE_CLASSES],
  };
}

export default createCognitiveCoreJudgment;