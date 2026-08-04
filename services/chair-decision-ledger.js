/**
 * SYNOPSIS: Decision -> prediction -> outcome -> comparison -> calibration ledger.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 *
 * Design: docs/products/lifeos/DECISION_OUTCOME_LEDGER_V1.md. Founder's exact
 * required sequence: decision record -> prediction -> action -> outcome ->
 * comparison -> calibration -> Wisdom. This module is the ledger only
 * (decision/prediction/outcome/comparison/calibration) -- it does not build
 * "Wisdom" itself, which the founder explicitly said must wait until real
 * outcome history exists ("Wisdom without real outcome history will become
 * another intelligent-sounding but ungrounded service").
 *
 * Audited before building: no existing system matches this shape.
 * services/calibration-ledger.js is in-memory only (wiped every restart/
 * deploy -- confirmed the same non-persistence gap the constitutional audit
 * already flagged, F-04/F-05). services/outcome-tracker.js is DB-backed and
 * live, but tracks product-FEATURE ROI (revenue/conversion) keyed to the
 * `ideas` table -- a different, valid, unrelated purpose. services/
 * chair-solomon-calibration.js and services/solomon-wisdom-lab.js are
 * completely unreachable orphans (0 real importers).
 */

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS decision_outcome_ledger (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT,
      source TEXT NOT NULL,
      decision_text TEXT NOT NULL,
      prediction_text TEXT NOT NULL,
      confidence_before SMALLINT,
      status TEXT NOT NULL DEFAULT 'open',
      actual_outcome_text TEXT,
      outcome_match TEXT,
      confidence_after SMALLINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);
}

/**
 * @param {object} entry
 * @param {number} [entry.userId]
 * @param {string} entry.source - what part of the system made this decision
 * @param {string} entry.decisionText - what was decided
 * @param {string} entry.predictionText - what was predicted to happen
 * @param {number} [entry.confidenceBefore] - 0-100, honest self-rated confidence
 * @returns {Promise<object>} the created row
 */
export async function recordDecision(pool, entry) {
  await ensureTable(pool);
  const { userId, source, decisionText, predictionText, confidenceBefore } = entry;
  if (!decisionText || !predictionText) {
    throw new Error('recordDecision requires decisionText and predictionText');
  }
  const { rows } = await pool.query(
    `INSERT INTO decision_outcome_ledger
       (user_id, source, decision_text, prediction_text, confidence_before, status)
     VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
    [userId || null, source || 'unknown', decisionText, predictionText, confidenceBefore ?? null],
  );
  return rows[0];
}

/**
 * Compares the actual outcome against the original prediction and calibrates.
 * outcomeMatch is one of 'correct' | 'incorrect' | 'partial' -- caller states
 * this honestly; this function does not attempt automated judgment of a
 * free-text comparison (that would itself be an ungrounded AI claim).
 * @param {number} decisionId
 * @param {object} resolution
 * @param {string} resolution.actualOutcomeText
 * @param {'correct'|'incorrect'|'partial'} resolution.outcomeMatch
 * @param {number} [resolution.confidenceAfter]
 */
export async function recordOutcome(pool, decisionId, resolution) {
  await ensureTable(pool);
  const { actualOutcomeText, outcomeMatch, confidenceAfter } = resolution;
  if (!actualOutcomeText || !outcomeMatch) {
    throw new Error('recordOutcome requires actualOutcomeText and outcomeMatch');
  }
  const { rows } = await pool.query(
    `UPDATE decision_outcome_ledger
     SET status = 'resolved', actual_outcome_text = $1, outcome_match = $2,
         confidence_after = $3, resolved_at = NOW()
     WHERE id = $4 RETURNING *`,
    [actualOutcomeText, outcomeMatch, confidenceAfter ?? null, decisionId],
  );
  return rows[0] || null;
}

/**
 * Honest summary -- explicitly reports when there isn't enough data for a
 * real calibration insight, rather than producing a confident-sounding
 * number from a handful of points. This is the guard against exactly the
 * "intelligent-sounding but ungrounded" failure mode the founder named.
 */
export async function getCalibrationSummary(pool, { userId, minSampleSize = 20 } = {}) {
  await ensureTable(pool);
  const params = [];
  let where = "WHERE status = 'resolved'";
  if (userId) where += ` AND user_id = $${params.push(userId)}`;
  const { rows } = await pool.query(
    `SELECT outcome_match, COUNT(*) AS count FROM decision_outcome_ledger ${where} GROUP BY outcome_match`,
    params,
  );
  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
  const correct = Number(rows.find((r) => r.outcome_match === 'correct')?.count || 0);
  return {
    total_resolved: total,
    correct_count: correct,
    accuracy_rate: total > 0 ? Number((correct / total).toFixed(3)) : null,
    sufficient_for_wisdom: total >= minSampleSize,
    honest_note: total >= minSampleSize
      ? null
      : `Only ${total} resolved decision(s) recorded -- below the ${minSampleSize}-sample floor this function requires before treating accuracy_rate as meaningful. Do not build Wisdom insights on this yet.`,
  };
}

export default { recordDecision, recordOutcome, getCalibrationSummary };
