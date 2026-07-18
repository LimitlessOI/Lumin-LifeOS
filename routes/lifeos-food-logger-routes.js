/**
 * SYNOPSIS: LifeOS AI photo food logger HTTP routes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { createRequireLifeOSUserOrKey } from '../middleware/lifeos-auth-middleware.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import {
  logFoodWithPhoto,
  getFoodLogs,
  getNutritionSummary,
} from '../services/lifeos-ai-photo-food-logger.js';

function userHint(req) {
  const hint = req.body?.user || req.query?.user || req.lifeosUser?.handle || req.lifeosUser?.sub || 'adam';
  return hint === 'emergency-key' ? 'adam' : hint;
}

export function createLifeosFoodLoggerRoutes({ pool, callCouncilMember, requireKey } = {}) {
  const router = express.Router();
  const db = pool;
  const auth = createRequireLifeOSUserOrKey(requireKey);
  const resolveUserId = makeLifeOSUserResolver(pool);

  router.post('/log', auth, async (req, res, next) => {
    try {
      if (!db) return res.status(503).json({ ok: false, error: 'pool_unavailable' });
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { imageUrl, imageBase64, description, loggedAt } = req.body || {};
      const row = await logFoodWithPhoto(db, userId, {
        imageUrl,
        imageBase64,
        description,
        loggedAt,
        callCouncilMember,
      });
      res.status(201).json({ ok: true, food_log: row });
    } catch (err) {
      next(err);
    }
  });

  router.get('/logs', auth, async (req, res, next) => {
    try {
      if (!db) return res.status(503).json({ ok: false, error: 'pool_unavailable' });
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const since = req.query.since || null;
      const rows = await getFoodLogs(db, userId, { limit, since });
      res.json({ ok: true, logs: rows });
    } catch (err) {
      next(err);
    }
  });

  router.get('/summary', auth, async (req, res, next) => {
    try {
      if (!db) return res.status(503).json({ ok: false, error: 'pool_unavailable' });
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const days = Math.min(Number(req.query.days) || 7, 90);
      const summary = await getNutritionSummary(db, userId, days);
      res.json({ ok: true, summary });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosFoodLoggerRoutes(app, { pool, callCouncilMember, requireKey } = {}) {
  app.use('/api/v1/lifeos/food', createLifeosFoodLoggerRoutes({ pool, callCouncilMember, requireKey }));
}