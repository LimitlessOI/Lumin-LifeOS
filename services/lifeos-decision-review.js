import { safeInt } from './lifeos-request-helpers.js';

export function createDecisionReviewService({ pool }) {
  return {
    // Schedule 30-day and 90-day reviews when a decision is logged
    // Insert two rows into decision_review_queue
    async scheduleReviews(userId, decisionLogId) {
      const now = new Date();
      const d30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const d90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      await pool.query(
        `INSERT INTO decision_review_queue(user_id, decision_log_id, review_due_at, review_type) VALUES($1, $2, $3, '30_day'), ($1, $2, $4, '90_day') ON CONFLICT DO NOTHING`,
        [userId, decisionLogId, d30, d90]
      );
    },

    // Get pending reviews due within next 7 days for a user
    async getPendingReviews(userId) {
      const r = await pool.query(
        `SELECT q.*, dl.decision_text, dl.chosen_option 
         FROM decision_review_queue q 
         LEFT JOIN decision_logs dl ON dl.id = q.decision_log_id 
         WHERE q.user_id = $1 
         AND q.status = 'pending' 
         AND q.review_due_at <= NOW() + INTERVAL '7 days' 
         ORDER BY q.review_due_at`,
        [userId]
      );
      return r.rows;
    },

    // Complete a review — record hindsight notes and outcome rating
    async completeReview(reviewId, userId, { hindsightNotes, outcomeRating }) {
      const r = await pool.query(
        `UPDATE decision_review_queue 
         SET status = 'done', 
             completed_at = NOW(), 
             hindsight_notes = $3, 
             outcome_rating = $4 
         WHERE id = $1 AND user_id = $2 
         RETURNING *`,
        [reviewId, userId, hindsightNotes || null, outcomeRating || null]
      );
      return r.rows[0] || null;
    },

    // Skip a review
    async skipReview(reviewId, userId) {
      const r = await pool.query(
        `UPDATE decision_review_queue 
         SET status = 'skipped', 
             completed_at = NOW() 
         WHERE id = $1 AND user_id = $2 
         RETURNING *`,
        [reviewId, userId]
      );
      return r.rows[0] || null;
    },

    // Get completed review history for a user
    async getReviewHistory(userId, { days } = {}) {
      const d = safeInt(days, 90);
      const r = await pool.query(
        `SELECT q.*, dl.decision_text 
         FROM decision_review_queue q 
         LEFT JOIN decision_logs dl ON dl.id = q.decision_log_id 
         WHERE q.user_id = $1 
         AND q.status = 'done' 
         AND q.completed_at >= NOW() - ($2 || ' days')::INTERVAL 
         ORDER BY q.completed_at DESC`,
        [userId, d]
      );
      return r.rows;
    }
  };
}
---METADATA---
```json
{
  "target_file": "services/lifeos-decision-review.js",
  "insert_after_line": null,
  "confidence": 0.95
}
```