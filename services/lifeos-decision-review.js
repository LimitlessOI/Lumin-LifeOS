/**
 * @fileoverview Decision Review Service
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * 
 * Manages scheduled reviews of decisions at 30-day and 90-day intervals.
 * Allows users to reflect on outcomes and capture hindsight notes.
 */

import { safeInt, safeDays } from "./lifeos-request-helpers.js";

export function createDecisionReviewService({ pool }) {
  return {
    /**
     * Schedule 30-day and 90-day reviews for a decision
     * @param {number} userId
     * @param {number} decisionLogId
     * @returns {Promise<void>}
     */
    async scheduleReviews(userId, decisionLogId) {
      const uid = safeInt(userId);
      const dlId = safeInt(decisionLogId);

      const query = `
        INSERT INTO decision_review_queue (user_id, decision_log_id, review_due_at, status)
        SELECT $1, $2, NOW() + interval '30 days', 'pending'
        WHERE NOT EXISTS (
          SELECT 1 FROM decision_review_queue 
          WHERE decision_log_id = $2 AND review_due_at BETWEEN NOW() + interval '29 days' AND NOW() + interval '31 days'
        )
        UNION ALL
        SELECT $1, $2, NOW() + interval '90 days', 'pending'
        WHERE NOT EXISTS (
          SELECT 1 FROM decision_review_queue 
          WHERE decision_log_id = $2 AND review_due_at BETWEEN NOW() + interval '89 days' AND NOW() + interval '91 days'
        )
      `;

      await pool.query(query, [uid, dlId]);
    },

    /**
     * Get pending reviews that are due
     * @param {number} userId
     * @returns {Promise<Array>}
     */
    async getPendingReviews(userId) {
      const uid = safeInt(userId);

      const query = `
        SELECT * FROM decision_review_queue 
        WHERE user_id = $1 
          AND status = 'pending' 
          AND review_due_at <= NOW() 
        ORDER BY review_due_at ASC
      `;

      const result = await pool.query(query, [uid]);
      return result.rows;
    },

    /**
     * Mark a review as completed with notes and rating
     * @param {Object} params
     * @param {number} params.reviewId
     * @param {number} params.userId
     * @param {string} params.hindsightNotes
     * @param {number} params.outcomeRating
     * @returns {Promise<Object>}
     */
    async completeReview({ reviewId, userId, hindsightNotes, outcomeRating }) {
      const rid = safeInt(reviewId);
      const uid = safeInt(userId);
      const rating = safeInt(outcomeRating);

      const query = `
        UPDATE decision_review_queue 
        SET status = 'done', 
            completed_at = NOW(), 
            hindsight_notes = $3, 
            outcome_rating = $4 
        WHERE id = $1 AND user_id = $2 
        RETURNING *
      `;

      const result = await pool.query(query, [rid, uid, hindsightNotes, rating]);
      return result.rows[0];
    },

    /**
     * Skip a review
     * @param {Object} params
     * @param {number} params.reviewId
     * @param {number} params.userId
     * @returns {Promise<Object>}
     */
    async skipReview({ reviewId, userId }) {
      const rid = safeInt(reviewId);
      const uid = safeInt(userId);

      const query = `
        UPDATE decision_review_queue 
        SET status = 'skipped' 
        WHERE id = $1 AND user_id = $2 
        RETURNING *
      `;

      const result = await pool.query(query, [rid, uid]);
      return result.rows[0];
    },

    /**
     * Get review history for a user
     * @param {number} userId
     * @param {number} days - Number of days to look back (default 90)
     * @returns {Promise<Array>}
     */
    async getReviewHistory(userId, days = 90) {
      const uid = safeInt(userId);
      const d = safeDays(days);

      const query = `
        SELECT drq.*, dl.title as decision_title 
        FROM decision_review_queue drq 
        LEFT JOIN decision_logs dl ON drq.decision_log_id = dl.id 
        WHERE drq.user_id = $1 
          AND drq.completed_at >= NOW() - ($2 || ' days')::INTERVAL 
        ORDER BY drq.completed_at DESC
      `;

      const result = await pool.query(query, [uid, d]);
      return result.rows;
    }
  };
}