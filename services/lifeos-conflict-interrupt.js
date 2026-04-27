/**
 * @fileoverview Conflict Interrupt Service
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * 
 * Manages conflict interrupts triggered by escalation detection.
 * Tracks interrupt lifecycle: pending → resolved/escalated/dismissed
 */

import { safeInt } from './lifeos-request-helpers.js';

/**
 * Creates the conflict interrupt service
 * @param {object} deps - Dependencies
 * @param {object} deps.pool - PostgreSQL connection pool
 * @returns {object} Service methods
 */
export function createConflictInterruptService({ pool }) {
  return {
    /**
     * Trigger a new conflict interrupt
     * @param {object} params
     * @param {number} params.userId - User who triggered the interrupt
     * @param {number} params.partnerId - Partner user ID (optional)
     * @param {string} params.triggerSource - Source of trigger (e.g., 'message', 'session')
     * @param {object} params.conflictContext - Context data (horseman, confidence, etc.)
     * @param {string} params.interruptType - Type of interrupt (e.g., 'escalation', 'flooding')
     * @returns {Promise<object>} Created interrupt record
     */
    async triggerInterrupt({ userId, partnerId, triggerSource, conflictContext, interruptType }) {
      const result = await pool.query(
        `INSERT INTO conflict_interrupts 
         (user_id, partner_id, trigger_source, conflict_context, interrupt_type, resolution_status, triggered_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
         RETURNING *`,
        [
          safeInt(userId),
          partnerId ? safeInt(partnerId) : null,
          triggerSource,
          JSON.stringify(conflictContext),
          interruptType
        ]
      );
      return result.rows[0];
    },

    /**
     * Get the most recent active (pending) interrupt for a user
     * @param {number} userId
     * @returns {Promise<object|null>} Active interrupt or null
     */
    async getActiveInterrupt(userId) {
      const result = await pool.query(
        `SELECT * FROM conflict_interrupts 
         WHERE user_id = $1 AND resolution_status = 'pending'
         ORDER BY triggered_at DESC 
         LIMIT 1`,
        [safeInt(userId)]
      );
      return result.rows[0] || null;
    },

    /**
     * Resolve an interrupt
     * @param {object} params
     * @param {number} params.interruptId
     * @param {number} params.userId
     * @param {string} params.notes - Optional resolution notes
     * @returns {Promise<object>} Updated interrupt record
     */
    async resolveInterrupt({ interruptId, userId, notes }) {
      const result = await pool.query(
        `UPDATE conflict_interrupts 
         SET resolution_status = 'resolved', 
             resolved_at = NOW(), 
             notes = $3
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [safeInt(interruptId), safeInt(userId), notes || null]
      );
      return result.rows[0];
    },

    /**
     * Escalate an interrupt to higher-level intervention
     * @param {object} params
     * @param {number} params.interruptId
     * @param {number} params.userId
     * @returns {Promise<object>} Updated interrupt record
     */
    async escalateInterrupt({ interruptId, userId }) {
      const result = await pool.query(
        `UPDATE conflict_interrupts 
         SET resolution_status = 'escalated',
             resolved_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [safeInt(interruptId), safeInt(userId)]
      );
      return result.rows[0];
    },

    /**
     * Get interrupt history for a user
     * @param {number} userId
     * @param {number} days - Number of days to look back (default 30)
     * @returns {Promise<Array>} Array of interrupt records
     */
    async getInterruptHistory(userId, days = 30) {
      const result = await pool.query(
        `SELECT * FROM conflict_interrupts 
         WHERE user_id = $1 
         AND triggered_at >= NOW() - ($2 || ' days')::INTERVAL
         ORDER BY triggered_at DESC`,
        [safeInt(userId), safeInt(days)]
      );
      return result.rows;
    },

    /**
     * Get escalation pattern analysis for a user
     * @param {number} userId
     * @returns {Promise<object>} Pattern analysis with count and most common trigger
     */
    async getEscalationPattern(userId) {
      const result = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE resolution_status = 'escalated') as escalation_count,
           COUNT(*) as total_interrupts,
           MODE() WITHIN GROUP (ORDER BY trigger_source) as most_common_trigger
         FROM conflict_interrupts
         WHERE user_id = $1 
         AND triggered_at >= NOW() - INTERVAL '30 days'`,
        [safeInt(userId)]
      );
      
      const row = result.rows[0];
      return {
        escalation_count: parseInt(row.escalation_count) || 0,
        total_interrupts: parseInt(row.total_interrupts) || 0,
        most_common_trigger: row.most_common_trigger || null,
        period_days: 30
      };
    }
  };
}