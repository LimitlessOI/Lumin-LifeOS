/**
 * SYNOPSIS: 30/90-day decision review HTTP routes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { createRequireLifeOSUserOrKey } from '../middleware/lifeos-auth-middleware.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { createDecisionReviewService } from '../services/lifeos-decision-review.js';
import { safeInt } from '../services/lifeos-request-helpers.js';

function userHint(req) {
  const hint = req.query?.user || req.body?.user || req.lifeosUser?.handle || req.lifeosUser?.sub || 'adam';
  return hint === 'emergency-key' ? 'adam' : hint;
}

export function createDecisionReviewRoutes({ pool, requireKey } = {}) {
  const router = express.Router();
  const svc = createDecisionReviewService({ pool });
  const auth = createRequireLifeOSUserOrKey(requireKey);
  const resolveUserId = makeLifeOSUserResolver(pool);

  router.get('/pending', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const reviews = await svc.getPendingReviews(userId);
      res.json({ ok: true, reviews });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/complete', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await svc.completeReview({
        reviewId: safeInt(req.params.id),
        userId,
        hindsightNotes: req.body?.hindsightNotes || req.body?.notes || '',
        outcomeRating: req.body?.outcomeRating ?? req.body?.rating,
      });
      res.json({ ok: true, review: result });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/skip', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await svc.skipReview({
        reviewId: safeInt(req.params.id),
        userId,
      });
      res.json({ ok: true, review: result });
    } catch (err) {
      next(err);
    }
  });

  router.get('/history', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const days = safeInt(req.query.days) || 30;
      const history = await svc.getReviewHistory(userId, days);
      res.json({ ok: true, history });
    } catch (err) {
      next(err);
    }
  });

  router.post('/schedule', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const decisionLogId = safeInt(req.body?.decision_log_id || req.body?.decisionLogId);
      if (!decisionLogId) return res.status(400).json({ ok: false, error: 'decision_log_id required' });
      await svc.scheduleReviews(userId, decisionLogId);
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosDecisionReviewRoutes(app, { pool, requireKey } = {}) {
  app.use('/api/v1/lifeos/decision-reviews', createDecisionReviewRoutes({ pool, requireKey }));
}