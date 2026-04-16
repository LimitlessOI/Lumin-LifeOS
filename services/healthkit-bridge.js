/**
 * services/healthkit-bridge.js
 * Receives Apple Watch / HealthKit data via iOS Shortcuts webhook.
 * Normalizes and stores in wearable_data.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

'use strict';

/**
 * @param {{ pool: import('pg').Pool, logger: import('pino').Logger }} opts
 */
export function createHealthKitBridge({ pool, logger }) {
  /**
   * Bulk-insert an array of metric readings for a user.
   * @param {{ userId: number|string, metrics: Array<{metric:string, value:number, unit?:string, recorded_at:string}>, source?: string }} params
   * @returns {Promise<number>} count of rows inserted
   */
  async function ingestMetrics({ userId, metrics, source = 'apple_watch' }) {
    if (!Array.isArray(metrics) || metrics.length === 0) return 0;

    const values = [];
    const placeholders = metrics.map((m, i) => {
      const base = i * 5;
      values.push(userId, source, m.metric, m.value, m.unit ?? null, m.recorded_at);
      // 6 params per row
      const b = i * 6;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
    });

    // rebuild values properly (6 params per row)
    const vals = [];
    for (const m of metrics) {
      vals.push(userId, source, m.metric, m.value, m.unit ?? null, m.recorded_at);
    }

    const sql = `
      INSERT INTO wearable_data (user_id, source, metric, value, unit, recorded_at)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    const result = await pool.query(sql, vals);
    logger.info({ userId, count: result.rowCount, source }, 'healthkit-bridge: ingested metrics');
    return result.rowCount ?? 0;
  }

  /**
   * Returns the latest value per metric for a user over the last N days.
   * @param {number|string} userId
   * @param {{ metrics?: string[], days?: number }} opts
   * @returns {Promise<Record<string, {value: number, unit: string|null, recorded_at: string}>>}
   */
  async function getLatest(userId, { metrics = [], days = 7 } = {}) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let sql = `
      SELECT DISTINCT ON (metric)
        metric, value, unit, recorded_at
      FROM wearable_data
      WHERE user_id = $1
        AND recorded_at >= $2
    `;
    const params = [userId, cutoff];

    if (metrics.length > 0) {
      sql += ` AND metric = ANY($3)`;
      params.push(metrics);
    }

    sql += ` ORDER BY metric, recorded_at DESC`;

    const { rows } = await pool.query(sql, params);
    const out = {};
    for (const row of rows) {
      out[row.metric] = {
        value: parseFloat(row.value),
        unit: row.unit,
        recorded_at: row.recorded_at,
      };
    }
    return out;
  }

  /**
   * Returns time series for a specific metric.
   * @param {number|string} userId
   * @param {string} metric
   * @param {{ days?: number }} opts
   * @returns {Promise<Array<{recorded_at: string, value: number}>>}
   */
  async function getTimeSeries(userId, metric, { days = 30 } = {}) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { rows } = await pool.query(
      `SELECT recorded_at, value::float AS value
       FROM wearable_data
       WHERE user_id = $1
         AND metric = $2
         AND recorded_at >= $3
       ORDER BY recorded_at ASC`,
      [userId, metric, cutoff]
    );
    return rows;
  }

  /**
   * Checks the last 10 heart_rate readings for abnormal values.
   * @param {number|string} userId
   * @returns {Promise<{alert: boolean, reason?: string, values?: number[]}>}
   */
  async function checkAbnormalHR(userId) {
    const { rows } = await pool.query(
      `SELECT value::float AS value
       FROM wearable_data
       WHERE user_id = $1
         AND metric = 'heart_rate'
       ORDER BY recorded_at DESC
       LIMIT 10`,
      [userId]
    );

    if (rows.length === 0) return { alert: false };

    const values = rows.map(r => r.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const hasSpike = values.some(v => v > 150);

    if (hasSpike) {
      return {
        alert: true,
        reason: `Heart rate spike detected: ${Math.max(...values)} bpm`,
        values,
      };
    }
    if (avg > 120) {
      return {
        alert: true,
        reason: `Elevated average heart rate: ${avg.toFixed(1)} bpm`,
        values,
      };
    }
    return { alert: false };
  }

  return { ingestMetrics, getLatest, getTimeSeries, checkAbnormalHR };
}
