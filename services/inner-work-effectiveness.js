/**
 * services/inner-work-effectiveness.js
 *
 * Correlates inner work practices with actual behavior change.
 * Answers: which practices actually move the needle for this person?
 *
 * Exports:
 *   createInnerWorkEffectiveness({ pool, callAI }) → InnerWorkEffectiveness
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createInnerWorkEffectiveness({ pool, callAI }) {

  /**
   * Compute a simple correlation coefficient between two arrays of numbers.
   * Returns value in [-1, 1], or null if insufficient data.
   * @param {number[]} xs  — binary 0/1 (practice done / not done)
   * @param {number[]} ys  — outcome scores for same days
   * @returns {number|null}
   */
  function pearson(xs, ys) {
    const n = xs.length;
    if (n < 3) return null;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, dX = 0, dY = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      dX  += dx * dx;
      dY  += dy * dy;
    }
    const denom = Math.sqrt(dX * dY);
    if (denom === 0) return null;
    return +(num / denom).toFixed(2);
  }

  /**
   * Analyze all inner work practices for a user and compute correlations.
   * Upserts results into inner_work_effectiveness.
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async function analyze(userId) {
    // 1. Get distinct practice types
    const { rows: practiceRows } = await pool.query(`
      SELECT DISTINCT practice_type
      FROM inner_work_log
      WHERE user_id = $1
        AND logged_date >= CURRENT_DATE - INTERVAL '60 days'
    `, [userId]).catch(() => ({ rows: [] }));

    if (!practiceRows.length) return [];

    // 2. Build a day-indexed map of practice activity + scores (last 60 days)
    const { rows: dayRows } = await pool.query(`
      SELECT
        d.day::date,
        COALESCE(
          (SELECT AVG(isl.total_score)
           FROM integrity_score_log isl
           WHERE isl.user_id = $1
             AND isl.computed_at::date = d.day::date),
          NULL
        ) AS integrity_score,
        COALESCE(
          (SELECT jsl.avg_joy_7d
           FROM joy_score_log jsl
           WHERE jsl.user_id = $1
             AND jsl.log_date = d.day::date
           LIMIT 1),
          NULL
        ) AS joy_score
      FROM generate_series(
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS d(day)
    `, [userId]).catch(() => ({ rows: [] }));

    const results = [];

    for (const { practice_type } of practiceRows) {
      // 3. Days this practice was done
      const { rows: practDays } = await pool.query(`
        SELECT logged_date::date AS day
        FROM inner_work_log
        WHERE user_id = $1
          AND practice_type = $2
          AND logged_date >= CURRENT_DATE - INTERVAL '60 days'
      `, [userId, practice_type]).catch(() => ({ rows: [] }));

      const practiceDateSet = new Set(practDays.map(r => String(r.day).slice(0, 10)));

      // 4. Build parallel arrays per available score
      const integrityXs = [], integrityYs = [];
      const joyXs = [], joyYs = [];

      for (const row of dayRows) {
        const day = String(row.day).slice(0, 10);
        const done = practiceDateSet.has(day) ? 1 : 0;
        if (row.integrity_score !== null && row.integrity_score !== undefined) {
          integrityXs.push(done);
          integrityYs.push(+row.integrity_score);
        }
        if (row.joy_score !== null && row.joy_score !== undefined) {
          joyXs.push(done);
          joyYs.push(+row.joy_score);
        }
      }

      const integrityCorr = pearson(integrityXs, integrityYs);
      const joyCorr       = pearson(joyXs, joyYs);

      // 5. Ask AI for a plain-English observation
      let observation = null;
      if (callAI && (integrityCorr !== null || joyCorr !== null)) {
        const intStr = integrityCorr !== null ? `${integrityCorr > 0 ? '+' : ''}${integrityCorr}` : 'insufficient data';
        const joyStr = joyCorr       !== null ? `${joyCorr       > 0 ? '+' : ''}${joyCorr}`       : 'insufficient data';
        try {
          observation = await callAI(
            `A person practices "${practice_type}" regularly. ` +
            `Over 60 days, their integrity score correlation with practice days is ${intStr} ` +
            `and their joy score correlation is ${joyStr} (range -1 to 1; positive = practice days have higher scores). ` +
            `Write one plain-English sentence (max 30 words) explaining what this means for them. No hedging, no "it seems".`
          );
          observation = (observation || '').trim().replace(/^["']|["']$/g, '');
        } catch (_) {
          observation = null;
        }
      }

      // 6. Upsert
      await pool.query(`
        INSERT INTO inner_work_effectiveness
          (user_id, practice_type, integrity_score_correlation, joy_score_correlation, observation, computed_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id, practice_type) DO UPDATE
          SET integrity_score_correlation = EXCLUDED.integrity_score_correlation,
              joy_score_correlation       = EXCLUDED.joy_score_correlation,
              observation                 = EXCLUDED.observation,
              computed_at                 = NOW()
      `, [userId, practice_type, integrityCorr, joyCorr, observation]);

      results.push({ practice_type, integrity_score_correlation: integrityCorr, joy_score_correlation: joyCorr, observation });
    }

    return results;
  }

  /**
   * Return stored effectiveness data for a user.
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async function getEffectiveness(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM inner_work_effectiveness
      WHERE user_id = $1
      ORDER BY computed_at DESC
    `, [userId]).catch(() => ({ rows: [] }));
    return rows;
  }

  /**
   * Return the top N practices by combined integrity + joy correlation.
   * @param {number} userId
   * @param {number} [n=3]
   * @returns {Promise<Array>}
   */
  async function getTopPractices(userId, n = 3) {
    const { rows } = await pool.query(`
      SELECT *,
        COALESCE(integrity_score_correlation, 0) + COALESCE(joy_score_correlation, 0) AS combined_score
      FROM inner_work_effectiveness
      WHERE user_id = $1
      ORDER BY combined_score DESC
      LIMIT $2
    `, [userId, n]).catch(() => ({ rows: [] }));
    return rows;
  }

  return {
    analyze,
    getEffectiveness,
    getTopPractices,
  };
}
