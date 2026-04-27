/**
 * services/joy-score.js
 *
 * Tracks and computes the Joy Score for a LifeOS user.
 *
 * Joy and peace are not the same as happiness:
 *  - Joy is often found in meaningful difficulty
 *  - Peace comes after integration, not avoidance
 *  - The system learns to distinguish them from each other and from pleasure
 *
 * Two layers:
 *  1. Raw check-ins  — daily self-report (1–10) + joy sources/drains
 *  2. Computed score — 7-day rolling average, trend, top patterns
 *
 * The system also infers joy signals from conversation tone over time
 * (Phase 2 — requires conversation history integration).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createJoyScore(pool) {

  // ── Write ──────────────────────────────────────────────────────────────────

  async function logCheckin({ userId, joyScore, peaceScore, energyScore, joySources, joyDrains, notes, checkinDate, source, inferredFrom }) {
    const date = checkinDate || new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(`
      INSERT INTO joy_checkins
        (user_id, checkin_date, joy_score, peace_score, energy_score,
         joy_sources, joy_drains, notes, source, inferred_from)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (user_id, checkin_date) DO UPDATE SET
        joy_score     = EXCLUDED.joy_score,
        peace_score   = EXCLUDED.peace_score,
        energy_score  = EXCLUDED.energy_score,
        joy_sources   = EXCLUDED.joy_sources,
        joy_drains    = EXCLUDED.joy_drains,
        notes         = EXCLUDED.notes,
        source        = EXCLUDED.source,
        inferred_from = EXCLUDED.inferred_from
      RETURNING *
    `, [
      userId, date,
      joyScore || null, peaceScore || null, energyScore || null,
      joySources || [], joyDrains || [],
      notes || null, source || 'manual', inferredFrom || null,
    ]);
    return rows[0];
  }

  // ── Compute rolling score ─────────────────────────────────────────────────

  async function computeAndSave(userId, scoreDate) {
    const date = scoreDate || new Date().toISOString().split('T')[0];

    const { rows: recent } = await pool.query(`
      SELECT joy_score, peace_score, energy_score, joy_sources, joy_drains
      FROM joy_checkins
      WHERE user_id = $1
        AND checkin_date >= CURRENT_DATE - 7
        AND checkin_date <= $2
    `, [userId, date]);

    const { rows: month } = await pool.query(`
      SELECT joy_score FROM joy_checkins
      WHERE user_id = $1
        AND checkin_date >= CURRENT_DATE - 30
        AND checkin_date <= $2
    `, [userId, date]);

    if (recent.length === 0) return null;

    const avg = (arr, key) => {
      const vals = arr.map(r => parseFloat(r[key])).filter(v => !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const avgJoy7d    = avg(recent, 'joy_score');
    const avgPeace7d  = avg(recent, 'peace_score');
    const avgEnergy7d = avg(recent, 'energy_score');
    const avgJoy30d   = avg(month, 'joy_score');

    // Aggregate sources and drains — find most frequent tags
    const allSources = recent.flatMap(r => r.joy_sources || []);
    const allDrains  = recent.flatMap(r => r.joy_drains  || []);
    const topSources = topN(allSources, 5);
    const topDrains  = topN(allDrains, 5);

    const trend = computeTrend(avgJoy7d, avgJoy30d);

    await pool.query(`
      INSERT INTO joy_score_log
        (user_id, score_date, avg_joy_7d, avg_peace_7d, avg_energy_7d,
         avg_joy_30d, top_sources_7d, top_drains_7d, trend)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (user_id, score_date) DO UPDATE SET
        avg_joy_7d    = EXCLUDED.avg_joy_7d,
        avg_peace_7d  = EXCLUDED.avg_peace_7d,
        avg_energy_7d = EXCLUDED.avg_energy_7d,
        avg_joy_30d   = EXCLUDED.avg_joy_30d,
        top_sources_7d= EXCLUDED.top_sources_7d,
        top_drains_7d = EXCLUDED.top_drains_7d,
        trend         = EXCLUDED.trend,
        computed_at   = NOW()
    `, [userId, date, avgJoy7d, avgPeace7d, avgEnergy7d, avgJoy30d, topSources, topDrains, trend]);

    return { avgJoy7d, avgPeace7d, avgEnergy7d, avgJoy30d, topSources, topDrains, trend };
  }

  function topN(arr, n) {
    const counts = {};
    for (const item of arr) counts[item] = (counts[item] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);
  }

  function computeTrend(current7d, prior30d) {
    if (current7d == null || prior30d == null) return 'building';
    if (current7d > prior30d + 0.5) return 'rising';
    if (current7d < prior30d - 0.5) return 'falling';
    return 'flat';
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async function getLatestScore(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM joy_score_log
      WHERE user_id = $1
      ORDER BY score_date DESC
      LIMIT 1
    `, [userId]);
    return rows[0] || null;
  }

  async function getTodayCheckin(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM joy_checkins
      WHERE user_id = $1 AND checkin_date = CURRENT_DATE
    `, [userId]);
    return rows[0] || null;
  }

  async function getCheckinHistory(userId, { days = 30 } = {}) {
    const { rows } = await pool.query(`
      SELECT * FROM joy_checkins
      WHERE user_id = $1
        AND checkin_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
      ORDER BY checkin_date DESC
    `, [userId, days]);
    return rows;
  }

  async function getScoreHistory(userId, { days = 90 } = {}) {
    const { rows } = await pool.query(`
      SELECT * FROM joy_score_log
      WHERE user_id = $1
        AND score_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
      ORDER BY score_date ASC
    `, [userId, days]);
    return rows;
  }

  // What sources appear most frequently over a longer window — the patterns
  async function getJoyPatterns(userId, { days = 90 } = {}) {
    const { rows } = await pool.query(`
      SELECT joy_sources, joy_drains, joy_score, peace_score
      FROM joy_checkins
      WHERE user_id = $1
        AND checkin_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
    `, [userId, days]);

    const sourceCounts = {};
    const drainCounts  = {};
    const sourceJoy    = {}; // avg joy on days when this source appears

    for (const row of rows) {
      const joy = parseFloat(row.joy_score) || 5;
      for (const s of (row.joy_sources || [])) {
        sourceCounts[s] = (sourceCounts[s] || 0) + 1;
        sourceJoy[s] = sourceJoy[s] ? [...sourceJoy[s], joy] : [joy];
      }
      for (const d of (row.joy_drains || [])) {
        drainCounts[d] = (drainCounts[d] || 0) + 1;
      }
    }

    const sources = Object.entries(sourceCounts)
      .map(([tag, count]) => {
        const joys = sourceJoy[tag] || [];
        const avgJoy = joys.reduce((a, b) => a + b, 0) / joys.length;
        return { tag, count, avg_joy: Math.round(avgJoy * 10) / 10 };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const drains = Object.entries(drainCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { sources, drains, checkins_analyzed: rows.length };
  }

  return {
    logCheckin,
    computeAndSave,
    getLatestScore,
    getTodayCheckin,
    getCheckinHistory,
    getScoreHistory,
    getJoyPatterns,
  };
}
