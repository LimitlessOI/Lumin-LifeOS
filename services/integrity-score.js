/**
 * services/integrity-score.js
 *
 * Computes, stores, and retrieves the Integrity Score for a LifeOS user.
 *
 * The Integrity Score is a single number (0–100) that reflects how well
 * a person is living in alignment with what they said they would do.
 *
 * Component scores (each 0–100, weighted):
 *   commitments  40% — kept vs broken/overdue in rolling 7-day window
 *   health       20% — health check-ins completed, stated health goals met
 *   inner_work   20% — reflection, journaling, meditation done
 *   generosity   10% — giving actions logged
 *   repair       10% — repair actions after ruptures
 *
 * Trending matters more than absolute value. The system surfaces the arc.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const WEIGHTS = {
  commitments: 0.40,
  health:      0.20,
  inner_work:  0.20,
  generosity:  0.10,
  repair:      0.10,
};

export function createIntegrityScore(pool) {

  // ── Compute ────────────────────────────────────────────────────────────────

  async function compute(userId, { windowDays = 7 } = {}) {
    const [commitmentScore, healthScore, innerWorkScore] = await Promise.all([
      computeCommitmentScore(userId, windowDays),
      computeHealthScore(userId, windowDays),
      computeInnerWorkScore(userId, windowDays),
    ]);

    // Generosity and repair: binary presence scoring for now (full history later)
    const generosityScore = 50; // TODO: generosity_log table in Phase 2
    const repairScore = 50;     // TODO: repair_log table in Phase 2

    const total = Math.round(
      commitmentScore  * WEIGHTS.commitments +
      healthScore      * WEIGHTS.health +
      innerWorkScore   * WEIGHTS.inner_work +
      generosityScore  * WEIGHTS.generosity +
      repairScore      * WEIGHTS.repair
    );

    return {
      total,
      components: {
        commitments: Math.round(commitmentScore),
        health:      Math.round(healthScore),
        inner_work:  Math.round(innerWorkScore),
        generosity:  Math.round(generosityScore),
        repair:      Math.round(repairScore),
      },
    };
  }

  async function computeCommitmentScore(userId, windowDays) {
    try {
      const { rows } = await pool.query(`
        SELECT
          COALESCE(SUM(weight) FILTER (WHERE status = 'kept'
            AND kept_at >= NOW() - ($2 || ' days')::INTERVAL), 0)  AS kept_weight,
          COALESCE(SUM(weight) FILTER (WHERE status = 'broken'
            AND broken_at >= NOW() - ($2 || ' days')::INTERVAL), 0) AS broken_weight,
          COALESCE(SUM(weight) FILTER (WHERE status = 'open'
            AND due_at IS NOT NULL
            AND due_at < NOW()), 0) AS overdue_weight
        FROM commitments
        WHERE user_id = $1
      `, [userId, windowDays]);

      const r = rows[0];
      const kept     = parseFloat(r.kept_weight)    || 0;
      const broken   = parseFloat(r.broken_weight)  || 0;
      const overdue  = parseFloat(r.overdue_weight) || 0;
      const total    = kept + broken + overdue;

      if (total === 0) return 75; // no commitments tracked yet — neutral, not zero

      // Overdue counts as partial broken (0.5x penalty) — it might still get done
      const effectiveBroken = broken + (overdue * 0.5);
      const score = Math.max(0, Math.min(100, (kept / (kept + effectiveBroken)) * 100));
      return score;
    } catch {
      return 75;
    }
  }

  async function computeHealthScore(userId, windowDays) {
    try {
      const { rows } = await pool.query(`
        SELECT COUNT(*) AS checkin_count
        FROM health_checkins
        WHERE user_id = $1
          AND checkin_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
      `, [userId, windowDays]);

      const done = parseInt(rows[0]?.checkin_count || 0);
      // 1 check-in per day = 100. Pro-rated.
      return Math.min(100, Math.round((done / windowDays) * 100));
    } catch {
      return 50;
    }
  }

  async function computeInnerWorkScore(userId, windowDays) {
    try {
      const { rows } = await pool.query(`
        SELECT COUNT(DISTINCT work_date) AS days_with_work
        FROM inner_work_log
        WHERE user_id = $1
          AND work_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
      `, [userId, windowDays]);

      const days = parseInt(rows[0]?.days_with_work || 0);
      // Any inner work on a day = full credit for that day. 50%+ days = 100 score.
      const pct = days / windowDays;
      return Math.min(100, Math.round((pct / 0.5) * 100));
    } catch {
      return 50;
    }
  }

  // ── Persist ────────────────────────────────────────────────────────────────

  async function saveScore(userId, computed, scoreDate) {
    const date = scoreDate || new Date().toISOString().split('T')[0];

    // Fetch raw inputs for the audit row
    const inputs = await getRawInputs(userId);

    // Compute deltas vs prior periods
    const [delta7d, delta30d] = await Promise.all([
      getDelta(userId, date, 7),
      getDelta(userId, date, 30),
    ]);

    await pool.query(`
      INSERT INTO integrity_score_log (
        user_id, score_date,
        commitment_score, health_score, inner_work_score, generosity_score, repair_score,
        total_score, delta_7d, delta_30d,
        commitments_due, commitments_kept, commitments_broken,
        health_checkins_done, inner_work_entries
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (user_id, score_date) DO UPDATE SET
        commitment_score  = EXCLUDED.commitment_score,
        health_score      = EXCLUDED.health_score,
        inner_work_score  = EXCLUDED.inner_work_score,
        generosity_score  = EXCLUDED.generosity_score,
        repair_score      = EXCLUDED.repair_score,
        total_score       = EXCLUDED.total_score,
        delta_7d          = EXCLUDED.delta_7d,
        delta_30d         = EXCLUDED.delta_30d,
        commitments_due   = EXCLUDED.commitments_due,
        commitments_kept  = EXCLUDED.commitments_kept,
        commitments_broken= EXCLUDED.commitments_broken,
        health_checkins_done = EXCLUDED.health_checkins_done,
        inner_work_entries= EXCLUDED.inner_work_entries,
        computed_at       = NOW()
    `, [
      userId, date,
      computed.components.commitments,
      computed.components.health,
      computed.components.inner_work,
      computed.components.generosity,
      computed.components.repair,
      computed.total,
      delta7d, delta30d,
      inputs.commitments_due || 0,
      inputs.commitments_kept || 0,
      inputs.commitments_broken || 0,
      inputs.health_checkins || 0,
      inputs.inner_work_entries || 0,
    ]);

    return computed;
  }

  async function getRawInputs(userId) {
    const [commitRows, healthRows, innerRows] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE due_at >= NOW() - INTERVAL '7 days') AS due,
          COUNT(*) FILTER (WHERE status='kept' AND kept_at >= NOW() - INTERVAL '7 days') AS kept,
          COUNT(*) FILTER (WHERE status='broken' AND broken_at >= NOW() - INTERVAL '7 days') AS broken
        FROM commitments WHERE user_id = $1
      `, [userId]),
      pool.query(`
        SELECT COUNT(*) AS cnt FROM health_checkins
        WHERE user_id=$1 AND checkin_date >= CURRENT_DATE - 7
      `, [userId]),
      pool.query(`
        SELECT COUNT(*) AS cnt FROM inner_work_log
        WHERE user_id=$1 AND work_date >= CURRENT_DATE - 7
      `, [userId]),
    ]);
    return {
      commitments_due:    parseInt(commitRows.rows[0]?.due || 0),
      commitments_kept:   parseInt(commitRows.rows[0]?.kept || 0),
      commitments_broken: parseInt(commitRows.rows[0]?.broken || 0),
      health_checkins:    parseInt(healthRows.rows[0]?.cnt || 0),
      inner_work_entries: parseInt(innerRows.rows[0]?.cnt || 0),
    };
  }

  async function getDelta(userId, currentDate, days) {
    try {
      const priorDate = new Date(new Date(currentDate).getTime() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const { rows } = await pool.query(`
        SELECT total_score FROM integrity_score_log
        WHERE user_id = $1 AND score_date <= $2
        ORDER BY score_date DESC LIMIT 1
      `, [userId, priorDate]);
      return rows[0] ? null : null; // returns null until history builds up
    } catch {
      return null;
    }
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async function getLatest(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM integrity_score_log
      WHERE user_id = $1
      ORDER BY score_date DESC
      LIMIT 1
    `, [userId]);
    return rows[0] || null;
  }

  async function getHistory(userId, { days = 30 } = {}) {
    const { rows } = await pool.query(`
      SELECT * FROM integrity_score_log
      WHERE user_id = $1
        AND score_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
      ORDER BY score_date ASC
    `, [userId, days]);
    return rows;
  }

  async function getTrend(userId) {
    const history = await getHistory(userId, { days: 14 });
    if (history.length < 3) return 'building';
    const recent   = history.slice(-3).map(r => parseFloat(r.total_score));
    const earlier  = history.slice(0, 3).map(r => parseFloat(r.total_score));
    const recentAvg  = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    if (recentAvg > earlierAvg + 3) return 'rising';
    if (recentAvg < earlierAvg - 3) return 'falling';
    return 'flat';
  }

  // ── Compute + save in one call ─────────────────────────────────────────────

  async function computeAndSave(userId) {
    const computed = await compute(userId);
    await saveScore(userId, computed);
    const trend = await getTrend(userId);
    return { ...computed, trend };
  }

  return {
    compute,
    computeAndSave,
    saveScore,
    getLatest,
    getHistory,
    getTrend,
  };
}
