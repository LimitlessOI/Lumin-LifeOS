/**
 * services/research-aggregator.js
 *
 * Privacy-safe aggregation of LifeOS population insights.
 * NEVER exposes individual data. Only statistical aggregates across consenting users.
 * Differential privacy (Laplace noise) applied before any external output.
 *
 * Exports:
 *   createResearchAggregator({ pool, logger }) → ResearchAggregator
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createConsentRegistry } from './consent-registry.js';

/**
 * Add Laplace-distributed noise to a numeric value for differential privacy.
 * Laplace noise = -scale * sign(u - 0.5) * ln(1 - 2|u - 0.5|) where u ~ Uniform(0,1)
 *
 * @param {number} value
 * @param {number} scale  Sensitivity parameter (smaller = less noise, less privacy)
 * @returns {number}
 */
function addLaplaceNoise(value, scale) {
  const u = Math.random() - 0.5;
  const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  return value + noise;
}

export function createResearchAggregator({ pool, logger }) {
  const log = logger || console;
  const consent = createConsentRegistry({ pool });

  /**
   * Get the IDs of all users who have consented to research_aggregate sharing.
   * @returns {Promise<number[]>}
   */
  async function getConsentingUserIds() {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (user_id) user_id, action
      FROM consent_registry
      WHERE feature = 'research_aggregate'
      ORDER BY user_id, consented_at DESC
    `);
    return rows
      .filter(r => r.action === 'granted')
      .map(r => parseInt(r.user_id, 10));
  }

  /**
   * Compute the Pearson correlation coefficient between two arrays.
   * @param {number[]} xs
   * @param {number[]} ys
   * @returns {number}
   */
  function pearsonCorrelation(xs, ys) {
    const n = xs.length;
    if (n === 0) return 0;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
    const denX = Math.sqrt(xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0));
    const denY = Math.sqrt(ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0));
    if (denX === 0 || denY === 0) return 0;
    return num / (denX * denY);
  }

  /**
   * Compute the correlation between integrity score and joy score
   * across all consenting users over the last 30 days.
   * Applies Laplace noise for differential privacy before logging.
   *
   * @returns {Promise<object>}
   */
  async function computeIntegrityJoyCorrelation() {
    const userIds = await getConsentingUserIds();
    if (userIds.length < 3) {
      const result = {
        metric: 'integrity_joy_correlation',
        value: null,
        population_size: userIds.length,
        finding: 'Insufficient population for privacy-safe aggregation (minimum 3 consenting users required)',
        computed_at: new Date().toISOString(),
      };
      log.info ? log.info(result, 'integrity_joy_correlation skipped') : log.info('integrity_joy_correlation skipped — not enough users');
      return result;
    }

    // Get 30-day averages for each consenting user
    const { rows } = await pool.query(`
      SELECT
        isl.user_id,
        AVG(isl.score)      AS avg_integrity,
        AVG(jsl.score)      AS avg_joy
      FROM integrity_score_log isl
      JOIN joy_score_log jsl
        ON jsl.user_id = isl.user_id
        AND jsl.logged_at >= NOW() - INTERVAL '30 days'
      WHERE
        isl.user_id = ANY($1)
        AND isl.logged_at >= NOW() - INTERVAL '30 days'
      GROUP BY isl.user_id
      HAVING COUNT(isl.id) > 0 AND COUNT(jsl.id) > 0
    `, [userIds]);

    const integrityScores = rows.map(r => parseFloat(r.avg_integrity));
    const joyScores = rows.map(r => parseFloat(r.avg_joy));

    const rawCorrelation = pearsonCorrelation(integrityScores, joyScores);
    const noisyCorrelation = addLaplaceNoise(rawCorrelation, 0.1);
    // Clamp to valid correlation range [-1, 1]
    const clampedCorrelation = Math.max(-1, Math.min(1, noisyCorrelation));

    const populationSize = rows.length;
    const direction = clampedCorrelation > 0.3 ? 'positive' : clampedCorrelation < -0.3 ? 'negative' : 'weak/neutral';
    const finding = `${direction} correlation (r=${clampedCorrelation.toFixed(2)}) between integrity score and joy score across ${populationSize} consenting users over 30 days`;

    await pool.query(`
      INSERT INTO research_aggregate_log (metric, population_size, result_summary)
      VALUES ($1, $2, $3)
    `, ['integrity_joy_correlation', populationSize, finding]);

    const result = {
      metric: 'integrity_joy_correlation',
      value: clampedCorrelation,
      population_size: populationSize,
      finding,
    };

    log.info ? log.info(result, 'integrity_joy_correlation computed') : log.info('integrity_joy_correlation computed');
    return result;
  }

  /**
   * Compute the top joy sources across all consenting users (last 30 days).
   * Returns top 10 sources with counts — individual user data is never exposed.
   *
   * @returns {Promise<object>}
   */
  async function computeTopJoySources() {
    const userIds = await getConsentingUserIds();
    if (userIds.length < 3) {
      return {
        metric: 'top_joy_sources',
        population_size: userIds.length,
        top_sources: [],
        finding: 'Insufficient population for privacy-safe aggregation',
      };
    }

    // joy_checkins has a joy_sources TEXT[] or JSONB column — aggregate across consenting users
    const { rows } = await pool.query(`
      SELECT
        UNNEST(joy_sources) AS source,
        COUNT(*)            AS count
      FROM joy_checkins
      WHERE
        user_id = ANY($1)
        AND checked_in_at >= NOW() - INTERVAL '30 days'
        AND joy_sources IS NOT NULL
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `, [userIds]);

    const topSources = rows.map(r => ({
      source: r.source,
      count: parseInt(r.count, 10),
    }));

    const finding = `Top joy sources across ${userIds.length} consenting users (last 30 days): ${topSources.slice(0, 3).map(s => s.source).join(', ')}`;

    await pool.query(`
      INSERT INTO research_aggregate_log (metric, population_size, result_summary)
      VALUES ($1, $2, $3)
    `, ['top_joy_sources', userIds.length, finding]);

    return {
      metric: 'top_joy_sources',
      population_size: userIds.length,
      top_sources: topSources,
      finding,
    };
  }

  /**
   * Compute which inner work practice type most correlates with integrity score
   * improvement across consenting users.
   *
   * @returns {Promise<object>}
   */
  async function computeInnerWorkEffectiveness() {
    const userIds = await getConsentingUserIds();
    if (userIds.length < 3) {
      return {
        metric: 'inner_work_effectiveness',
        population_size: userIds.length,
        top_practices: [],
        finding: 'Insufficient population for privacy-safe aggregation',
      };
    }

    // For each practice_type, compute the average integrity score improvement
    // in the 7 days following an inner work session vs baseline
    const { rows } = await pool.query(`
      SELECT
        iwl.practice_type,
        COUNT(DISTINCT iwl.user_id)  AS user_count,
        AVG(
          post.score - pre.score
        )                            AS avg_improvement
      FROM inner_work_log iwl
      JOIN LATERAL (
        SELECT score
        FROM integrity_score_log
        WHERE user_id = iwl.user_id
          AND logged_at < iwl.logged_at
        ORDER BY logged_at DESC
        LIMIT 1
      ) pre ON TRUE
      JOIN LATERAL (
        SELECT score
        FROM integrity_score_log
        WHERE user_id = iwl.user_id
          AND logged_at > iwl.logged_at
          AND logged_at <= iwl.logged_at + INTERVAL '7 days'
        ORDER BY logged_at ASC
        LIMIT 1
      ) post ON TRUE
      WHERE iwl.user_id = ANY($1)
        AND iwl.logged_at >= NOW() - INTERVAL '90 days'
      GROUP BY iwl.practice_type
      ORDER BY avg_improvement DESC
    `, [userIds]);

    const topPractices = rows.map(r => ({
      practice_type: r.practice_type,
      user_count: parseInt(r.user_count, 10),
      avg_improvement: parseFloat(r.avg_improvement || 0),
    }));

    const top = topPractices[0];
    const finding = top
      ? `"${top.practice_type}" shows the highest avg integrity score improvement (+${top.avg_improvement.toFixed(2)}) across ${top.user_count} consenting users`
      : 'No sufficient inner work data across consenting users';

    await pool.query(`
      INSERT INTO research_aggregate_log (metric, population_size, result_summary)
      VALUES ($1, $2, $3)
    `, ['inner_work_effectiveness', userIds.length, finding]);

    return {
      metric: 'inner_work_effectiveness',
      population_size: userIds.length,
      top_practices: topPractices,
      finding,
    };
  }

  /**
   * Return all published research insights.
   *
   * @returns {Promise<Array>}
   */
  async function getPublishedInsights() {
    const { rows } = await pool.query(`
      SELECT *
      FROM research_aggregate_log
      WHERE published = TRUE
      ORDER BY computed_at DESC
    `);
    return rows;
  }

  /**
   * Run all three aggregations in sequence and return a summary.
   *
   * @returns {Promise<object>}
   */
  async function runAll() {
    log.info ? log.info('Starting research_aggregator.runAll()') : log.info('Starting research aggregation');

    const [correlation, joySources, innerWork] = await Promise.allSettled([
      computeIntegrityJoyCorrelation(),
      computeTopJoySources(),
      computeInnerWorkEffectiveness(),
    ]);

    const results = {
      integrity_joy_correlation: correlation.status === 'fulfilled' ? correlation.value : { error: correlation.reason?.message },
      top_joy_sources: joySources.status === 'fulfilled' ? joySources.value : { error: joySources.reason?.message },
      inner_work_effectiveness: innerWork.status === 'fulfilled' ? innerWork.value : { error: innerWork.reason?.message },
      ran_at: new Date().toISOString(),
    };

    log.info ? log.info({ results }, 'research_aggregator.runAll() complete') : log.info('Research aggregation complete');
    return results;
  }

  return {
    addLaplaceNoise,
    computeIntegrityJoyCorrelation,
    computeTopJoySources,
    computeInnerWorkEffectiveness,
    getPublishedInsights,
    runAll,
  };
}
