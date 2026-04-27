/**
 * @fileoverview Decision review routes for LifeOS decisions module
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * @module routes/lifeos-decision-review-routes
 */

import express from 'express';
import { createDecisionReviewService } from '../services/lifeos-decision-review.js';
import { requireLifeOSUser } from './lifeos-auth-routes.js';
import { safeInt } from '../services/lifeos-request-helpers.js';

/**
 * Creates decision review routes
 * @param {Object} deps - Dependencies
 * @param {import('pg').Pool} deps.pool - Database connection pool
 * @returns {express.Router} Express router
 */
export function createDecisionReviewRoutes({ pool }) {
  const router = express.Router();
  const svc = createDecisionReviewService({ pool });

  /**
   * GET /pending
   * Returns pending reviews for the authenticated user due within 7 days
   */
  router.get('/pending', requireLifeOSUser, async (req, res) => {
    try {
      const userId = req.lifeos_user.id;
      const pending = await svc.getPendingReviews(userId, 7);
      res.json({ pending });
    } catch (err) {
      console.error('[decision-review-routes] GET /pending error:', err);
      res.status(500).json({ error: 'Failed to fetch pending reviews' });
    }
  });

  /**
   * POST /:id/complete
   * Completes a decision review
   * Body: { hindsight_notes, outcome_rating }
   */
  router.post('/:id/complete', requireLifeOSUser, async (req, res) => {
    try {
      const reviewId = safeInt(req.params.id);
      const userId = req.lifeos_user.id;
      const { hindsight_notes, outcome_rating } = req.body;

      if (!reviewId) {
        return res.status(400).json({ error: 'Invalid review ID' });
      }

      const result = await svc.completeReview(reviewId, userId, {
        hindsight_notes,
        outcome_rating
      });

      res.json(result);
    } catch (err) {
      console.error('[decision-review-routes] POST /:id/complete error:', err);
      res.status(500).json({ error: 'Failed to complete review' });
    }
  });

  /**
   * POST /:id/skip
   * Skips a decision review
   */
  router.post('/:id/skip', requireLifeOSUser, async (req, res) => {
    try {
      const reviewId = safeInt(req.params.id);
      const userId = req.lifeos_user.id;

      if (!reviewId) {
        return res.status(400).json({ error: 'Invalid review ID' });
      }

      const result = await svc.skipReview(reviewId, userId);
      res.json(result);
    } catch (err) {
      console.error('[decision-review-routes] POST /:id/skip error:', err);
      res.status(500).json({ error: 'Failed to skip review' });
    }
  });

  /**
   * GET /history
   * Returns completed reviews
   * Query: ?days (defaults to 90)
   */
  router.get('/history', requireLifeOSUser, async (req, res) => {
    try {
      const userId = req.lifeos_user.id;
      const days = safeInt(req.query.days) || 90;

      const history = await svc.getReviewHistory(userId, days);
      res.json({ history });
    } catch (err) {
      console.error('[decision-review-routes] GET /history error:', err);
      res.status(500).json({ error: 'Failed to fetch review history' });
    }
  });

  return router;
}
---METADATA---
```json
{
  "target_file": "routes/lifeos-decision-review-routes.js",
  "insert_after_line": null,
  "confidence": 0.92
}
```