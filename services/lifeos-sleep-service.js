/**
 * SYNOPSIS: Exports createSleepService — services/lifeos-sleep-service.js.
 * @fileoverview Sleep tracking service for LifeOS health module
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
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
    },

    /**
     * Classify chronotype from median recent sleep_start hour (local server TZ).
     * early < 22:30, late >= 00:30, else intermediate.
     */
    async getChronotype(userId) {
      const r = await pool.query(
        `SELECT sleep_start FROM sleep_logs
         WHERE user_id=$1 AND sleep_start >= NOW() - INTERVAL '21 days'
         ORDER BY sleep_start DESC LIMIT 21`,
        [userId],
      );
      if (!r.rows.length) {
        return { chronotype: 'unknown', sample_n: 0 };
      }
      const hours = r.rows.map((row) => {
        const d = new Date(row.sleep_start);
        return d.getHours() + d.getMinutes() / 60;
      }).sort((a, b) => a - b);
      const mid = hours[Math.floor(hours.length / 2)];
      let chronotype = 'intermediate';
      if (mid < 22.5 && mid >= 12) chronotype = 'early';
      if (mid >= 0.5 && mid < 12) chronotype = 'late';
      return { chronotype, median_sleep_start_hour: mid, sample_n: hours.length };
    },

    /**
     * Wind-down suggestion from flourishing_prefs.wind_down_start or chronotype default.
     */
    async getWindDownSuggestion(userId, opts = {}) {
      const chrono = await this.getChronotype(userId);
      const defaults = { early: '20:30', intermediate: '21:30', late: '22:30', unknown: '21:30' };
      let preferred = opts.wind_down_start || null;
      if (!preferred && pool) {
        try {
          const pref = await pool.query(
            `SELECT flourishing_prefs FROM lifeos_users WHERE id=$1 LIMIT 1`,
            [userId],
          );
          preferred = pref.rows[0]?.flourishing_prefs?.wind_down_start || null;
        } catch {
          preferred = null;
        }
      }
      return {
        suggested_wind_down_local: preferred || defaults[chrono.chronotype] || defaults.unknown,
        chronotype: chrono.chronotype,
        source: preferred ? 'flourishing_prefs.wind_down_start' : 'chronotype_default',
      };
    },
  };
}