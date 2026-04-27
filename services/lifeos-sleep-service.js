/**
 * @fileoverview Sleep tracking service for LifeOS health module
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { safeInt, safeDays } from './lifeos-request-helpers.js';

/**
 * Creates sleep tracking service with database operations
 * @param {Object} deps - Dependencies
 * @param {Object} deps.pool - PostgreSQL connection pool
 * @returns {Object} Sleep service methods
 */
export function createSleepService({ pool }) {
  return {
    /**
     * Log a sleep session
     * @param {Object} params - Sleep log parameters
     * @param {number} params.userId - User ID
     * @param {string} params.sleepStart - ISO timestamp for sleep start
     * @param {string} params.sleepEnd - ISO timestamp for sleep end
     * @param {number} [params.quality] - Sleep quality rating (1-5)
     * @param {string} [params.source] - Data source (manual, device, etc)
     * @param {string} [params.notes] - Optional notes
     * @returns {Promise<Object>} Created sleep log record
     */
    async logSleep({ userId, sleepStart, sleepEnd, quality, source, notes }) {
      const r = await pool.query(
        `INSERT INTO sleep_logs(user_id, sleep_start, sleep_end, quality, source, notes) VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, sleepStart, sleepEnd, quality || null, source || 'manual', notes || null]
      );
      return r.rows[0];
    },

    /**
     * Get sleep history for a user
     * @param {Object} params - Query parameters
     * @param {number} params.userId - User ID
     * @param {number} [params.days] - Number of days to retrieve (default 30)
     * @returns {Promise<Array>} Array of sleep log records
     */
    async getSleepHistory({ userId, days }) {
      const d = safeDays(days, 30);
      const r = await pool.query(
        `SELECT * FROM sleep_logs WHERE user_id=$1 AND sleep_start >= NOW() - ($2 || ' days')::INTERVAL ORDER BY sleep_start DESC`,
        [userId, d]
      );
      return r.rows;
    },

    /**
     * Get the most recent sleep log for a user
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Most recent sleep log or null
     */
    async getLastSleep(userId) {
      const r = await pool.query(
        `SELECT * FROM sleep_logs WHERE user_id=$1 ORDER BY sleep_start DESC LIMIT 1`,
        [userId]
      );
      return r.rows[0] || null;
    },

    /**
     * Calculate sleep debt based on 7-day average vs 8-hour target
     * @param {number} userId - User ID
     * @returns {Promise<Object>} Sleep debt analysis
     */
    async getSleepDebt(userId) {
      const r = await pool.query(
        `SELECT AVG(duration_minutes) AS avg_min FROM sleep_logs WHERE user_id=$1 AND sleep_start >= NOW() - INTERVAL '7 days'`,
        [userId]
      );
      const avg = Math.round(parseFloat(r.rows[0]?.avg_min) || 0);
      const debt = 480 - avg;
      const grade = avg >= 480 ? 'A' : avg >= 420 ? 'B' : avg >= 360 ? 'C' : 'D';
      return { avgMinutes: avg, targetMinutes: 480, debtMinutes: debt, grade };
    }
  };
}
---METADATA---
```json
{
  "target_file": "services/lifeos-sleep-service.js",
  "insert_after_line": null,
  "confidence": 0.85
}
```