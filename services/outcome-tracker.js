/**
 * services/outcome-tracker.js
 * Tracks whether the things we built actually worked.
 * Connects features → real-world results (revenue, conversions, time saved, errors fixed).
 *
 * Exports: createOutcomeTracker(pool) → { record, get, getForIdea, getSummary, calculateROI }
 */

export function createOutcomeTracker(pool) {
  // ── Record an outcome ──────────────────────────────────────────────────────
  /**
   * @param {object} outcome
   * @param {string} outcome.featureName
   * @param {string} outcome.metricType     — 'revenue'|'conversion'|'retention'|'time_saved'|'errors'|'usage'
   * @param {number} outcome.beforeValue    — baseline before the feature
   * @param {number} outcome.afterValue     — value after shipping
   * @param {string} outcome.metricUnit     — '$'|'%'|'minutes'|'requests'
   * @param {string} [outcome.ideaId]
   * @param {string} [outcome.notes]
   * @param {boolean} [outcome.verified]    — Adam confirmed this is accurate
   */
  async function record(outcome) {
    const {
      featureName,
      metricType,
      beforeValue,
      afterValue,
      metricUnit = '',
      ideaId = null,
      notes = null,
      verified = false,
    } = outcome;

    const deltaPct = beforeValue && beforeValue !== 0
      ? ((afterValue - beforeValue) / Math.abs(beforeValue)) * 100
      : null;

    const result = await pool.query(
      `INSERT INTO outcomes
         (idea_id, feature_name, metric_type, metric_value, metric_unit,
          before_value, after_value, delta_pct, notes, verified, measurement_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [
        ideaId,
        featureName,
        metricType,
        afterValue,
        metricUnit,
        beforeValue,
        afterValue,
        deltaPct ? parseFloat(deltaPct.toFixed(2)) : null,
        notes,
        verified,
      ]
    );

    const row = result.rows[0];
    const direction = afterValue > beforeValue ? '📈' : '📉';
    console.log(`${direction} [OUTCOME] ${featureName}: ${beforeValue} → ${afterValue} ${metricUnit} (${deltaPct ? deltaPct.toFixed(1) + '%' : 'no baseline'})`);
    return row;
  }

  // ── Get outcomes for an idea ───────────────────────────────────────────────
  async function getForIdea(ideaId) {
    const result = await pool.query(
      `SELECT * FROM outcomes WHERE idea_id = $1 ORDER BY measurement_date DESC`,
      [ideaId]
    );
    return result.rows;
  }

  // ── Get all outcomes with optional filter ──────────────────────────────────
  async function get({ metricType, limit = 50, since, verifiedOnly = false } = {}) {
    const params = [limit];
    let where = verifiedOnly ? 'WHERE verified = TRUE' : 'WHERE 1=1';

    if (metricType) where += ` AND metric_type = $${params.push(metricType)}`;
    if (since) where += ` AND measurement_date >= $${params.push(since)}`;

    const result = await pool.query(
      `SELECT * FROM outcomes ${where} ORDER BY measurement_date DESC LIMIT $1`,
      params
    );
    return result.rows;
  }

  // ── Summary: total impact by metric type ──────────────────────────────────
  async function getSummary() {
    const result = await pool.query(
      `SELECT
         metric_type,
         COUNT(*) as count,
         AVG(delta_pct) as avg_change_pct,
         SUM(CASE WHEN delta > 0 THEN 1 ELSE 0 END) as improved,
         SUM(CASE WHEN delta < 0 THEN 1 ELSE 0 END) as worsened,
         SUM(CASE WHEN metric_type = 'revenue' THEN delta ELSE 0 END) as total_revenue_delta
       FROM outcomes
       GROUP BY metric_type
       ORDER BY count DESC`
    );

    return result.rows;
  }

  // ── Calculate ROI for an idea ──────────────────────────────────────────────
  async function calculateROI(ideaId) {
    const outcomes = await getForIdea(ideaId);
    if (outcomes.length === 0) return null;

    const revenue = outcomes
      .filter(o => o.metric_type === 'revenue')
      .reduce((sum, o) => sum + parseFloat(o.delta || 0), 0);

    const timeSaved = outcomes
      .filter(o => o.metric_type === 'time_saved')
      .reduce((sum, o) => sum + parseFloat(o.delta || 0), 0);

    const errorReduction = outcomes
      .filter(o => o.metric_type === 'errors')
      .reduce((sum, o) => sum + parseFloat(o.delta || 0), 0);

    const improvements = outcomes.filter(o => parseFloat(o.delta || 0) > 0).length;
    const regressions = outcomes.filter(o => parseFloat(o.delta || 0) < 0).length;

    return {
      ideaId,
      revenue_delta: revenue,
      time_saved_minutes: timeSaved,
      error_reduction: errorReduction,
      improvements,
      regressions,
      net_positive: improvements > regressions,
      outcome_count: outcomes.length,
    };
  }

  // ── Find features with no outcomes tracked yet (needs measurement) ─────────
  async function getUntrackedFeatures(pool_ref) {
    try {
      const result = await (pool_ref || pool).query(
        `SELECT i.id, i.title, i.approval_status, i.implemented_at
         FROM ideas i
         LEFT JOIN outcomes o ON o.idea_id = i.id::text
         WHERE i.approval_status IN ('built', 'deployed')
           AND o.id IS NULL
         ORDER BY i.implemented_at DESC
         LIMIT 20`
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  return { record, get, getForIdea, getSummary, calculateROI, getUntrackedFeatures };
}
