/**
 * SYNOPSIS: 30/90-day decision review HTTP routes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { requireLifeOSUser } from '../middleware/lifeos-auth-middleware.js';
import { createDecisionReviewService } from '../services/lifeos-decision-review.js';
import { safeInt } from '../services/lifeos-request-helpers.js';

export function createDecisionReviewRoutes({ pool } = {}) {
  const router = express.Router();
  const svc = createDecisionReviewService({ pool });

  router.get('/pending', requireLifeOSUser, async (req, res, next) => {
    try {
      const reviews = await svc.getPendingReviews(req.lifeosUser.sub);
      res.json({ ok: true, reviews });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/complete', requireLifeOSUser, async (req, res, next) => {
    try {
      const result = await svc.completeReview({
        reviewId: safeInt(req.params.id),
        userId: req.lifeosUser.sub,
        hindsightNotes: req.body?.hindsightNotes || req.body?.notes || '',
        outcomeRating: req.body?.outcomeRating ?? req.body?.rating,
      });
      res.json({ ok: true, review: result });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/skip', requireLifeOSUser, async (req, res, next) => {
    try {
      const result = await svc.skipReview({
        reviewId: safeInt(req.params.id),
        userId: req.lifeosUser.sub,
      });
      res.json({ ok: true, review: result });
    } catch (err) {
      next(err);
    }
  });

  router.get('/history', requireLifeOSUser, async (req, res, next) => {
    try {
      const days = safeInt(req.query.days) || 30;
      const history = await svc.getReviewHistory(req.lifeosUser.sub, days);
      res.json({ ok: true, history });
    } catch (err) {
      next(err);
    }
  });

  router.post('/schedule', requireLifeOSUser, async (req, res, next) => {
    try {
      const decisionLogId = safeInt(req.body?.decision_log_id || req.body?.decisionLogId);
      if (!decisionLogId) return res.status(400).json({ ok: false, error: 'decision_log_id required' });
      await svc.scheduleReviews(req.lifeosUser.sub, decisionLogId);
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosDecisionReviewRoutes(app, { pool } = {}) {
  app.use('/api/v1/lifeos/decision-reviews', createDecisionReviewRoutes({ pool }));
}