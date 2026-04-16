/**
 * services/health-pattern-engine.js
 * Runs weekly correlation analysis: sleep vs mood, HRV vs decisions, glucose vs energy.
 * Stores findings in health_correlations.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

'use strict';

/**
 * @param {{ pool: import('pg').Pool, callAI: Function, logger: import('pino').Logger }} opts
 */
export function createHealthPatternEngine({ pool, callAI, logger }) {
  /**
   * Run full correlation analysis for a user over the last 30 days.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>} array of correlation observations saved
   */
  async function runAnalysis(userId) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all data sources in parallel
    const [wearableRes, checkinRes, joyRes, integrityRes] = await Promise.allSettled([
      pool.query(
        `SELECT
           DATE(recorded_at) AS day,
           metric,
           AVG(value)::float AS avg_val
         FROM wearable_data
         WHERE user_id = $1
           AND recorded_at >= $2
           AND metric IN ('hrv','heart_rate','sleep_deep_min','sleep_rem_min','sleep_awake_min')
         GROUP BY day, metric
         ORDER BY day ASC`,
        [userId, cutoff]
      ),
      pool.query(
        `SELECT
           DATE(created_at) AS day,
           AVG(sleep_hours)::float AS sleep_hours,
           AVG(energy_score)::float AS energy_score,
           AVG(mood_score)::float AS mood_score
         FROM health_checkins
         WHERE user_id = $1
           AND created_at >= $2
         GROUP BY day
         ORDER BY day ASC`,
        [userId, cutoff]
      ),
      pool.query(
        `SELECT
           DATE(created_at) AS day,
           AVG(joy_score)::float AS joy_score,
           AVG(peace_score)::float AS peace_score
         FROM joy_checkins
         WHERE user_id = $1
           AND created_at >= $2
         GROUP BY day
         ORDER BY day ASC`,
        [userId, cutoff]
      ),
      pool.query(
        `SELECT
           DATE(logged_at) AS day,
           AVG(total_score)::float AS integrity_score
         FROM integrity_score_log
         WHERE user_id = $1
           AND logged_at >= $2
         GROUP BY day
         ORDER BY day ASC`,
        [userId, cutoff]
      ),
    ]);

    const wearableRows = wearableRes.status === 'fulfilled' ? wearableRes.value.rows : [];
    const checkinRows = checkinRes.status === 'fulfilled' ? checkinRes.value.rows : [];
    const joyRows = joyRes.status === 'fulfilled' ? joyRes.value.rows : [];
    const integrityRows = integrityRes.status === 'fulfilled' ? integrityRes.value.rows : [];

    // Summarise wearable by metric
    const wearableSummary = {};
    for (const row of wearableRows) {
      if (!wearableSummary[row.metric]) wearableSummary[row.metric] = [];
      wearableSummary[row.metric].push({ day: row.day, avg: row.avg_val });
    }

    const avgOf = arr => arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2) : 'N/A';

    const summaryLines = [
      `30-day health summary for correlation analysis:`,
      ``,
      `Sleep (from check-ins): avg ${avgOf(checkinRows.map(r => r.sleep_hours))} hours/night`,
      `Energy score (1-10): avg ${avgOf(checkinRows.map(r => r.energy_score))}`,
      `Mood score (1-10): avg ${avgOf(checkinRows.map(r => r.mood_score))}`,
      `Joy score (1-10): avg ${avgOf(joyRows.map(r => r.joy_score))}`,
      `Peace score (1-10): avg ${avgOf(joyRows.map(r => r.peace_score))}`,
      `Integrity score (0-100): avg ${avgOf(integrityRows.map(r => r.integrity_score))}`,
    ];

    for (const [metric, points] of Object.entries(wearableSummary)) {
      summaryLines.push(`${metric}: avg ${avgOf(points.map(p => p.avg))} (${points.length} days of data)`);
    }

    summaryLines.push(``, `Daily data points available: ${checkinRows.length} check-in days, ${wearableRows.length > 0 ? Object.values(wearableSummary)[0]?.length ?? 0 : 0} wearable days`);

    const prompt = `${summaryLines.join('\n')}

Based on this person's health data patterns, what 3-5 correlations do you observe?

For each correlation, provide a JSON object with these exact keys:
- factor_a: string (what variable)
- factor_b: string (what it correlates to)
- direction: "positive" | "negative" | "none"
- strength: number from 0.0 to 1.0
- observation: string (one clear sentence describing the pattern)

Return ONLY a valid JSON array of objects, no other text.`;

    let observations = [];
    try {
      const aiResponse = await callAI(prompt);
      const text = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content ?? aiResponse?.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        observations = JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      logger.warn({ err, userId }, 'health-pattern-engine: failed to parse AI response');
      return [];
    }

    // Upsert each observation
    const saved = [];
    for (const obs of observations) {
      if (!obs.factor_a || !obs.factor_b) continue;
      try {
        await pool.query(
          `INSERT INTO health_correlations
             (user_id, factor_a, factor_b, direction, strength, observation, based_on_days, computed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (user_id, factor_a, factor_b)
           DO UPDATE SET
             direction    = EXCLUDED.direction,
             strength     = EXCLUDED.strength,
             observation  = EXCLUDED.observation,
             based_on_days = EXCLUDED.based_on_days,
             computed_at  = EXCLUDED.computed_at`,
          [userId, obs.factor_a, obs.factor_b, obs.direction ?? 'none', obs.strength ?? 0, obs.observation ?? '', 30]
        );
        saved.push(obs);
      } catch (err) {
        logger.warn({ err, obs }, 'health-pattern-engine: failed to save correlation');
      }
    }

    logger.info({ userId, saved: saved.length }, 'health-pattern-engine: analysis complete');
    return saved;
  }

  /**
   * Fetch stored correlations for a user, strongest first.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>}
   */
  async function getCorrelations(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM health_correlations
       WHERE user_id = $1
       ORDER BY strength DESC NULLS LAST`,
      [userId]
    );
    return rows;
  }

  /**
   * Returns a plain-English summary of the top 3 correlations.
   * @param {number|string} userId
   * @returns {Promise<string>}
   */
  async function getInsightSummary(userId) {
    const correlations = await getCorrelations(userId);
    if (correlations.length === 0) {
      return 'No correlation data yet. Run an analysis to see health patterns.';
    }
    const top3 = correlations.slice(0, 3);
    const lines = top3.map((c, i) => {
      const dir = c.direction === 'positive' ? 'increases' : c.direction === 'negative' ? 'decreases' : 'has no clear effect on';
      return `${i + 1}. When ${c.factor_a} is higher, ${c.factor_b} tends to ${dir === 'has no clear effect on' ? 'not change' : dir} (strength: ${(parseFloat(c.strength) * 100).toFixed(0)}%). ${c.observation ?? ''}`;
    });
    return lines.join('\n');
  }

  return { runAnalysis, getCorrelations, getInsightSummary };
}
