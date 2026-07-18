/**
 * SYNOPSIS: LifeOS AI photo food logger HTTP routes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { requireLifeOSUser } from '../middleware/lifeos-auth-middleware.js';
import {
  logFoodWithPhoto,
  getFoodLogs,
  getNutritionSummary,
} from '../services/lifeos-ai-photo-food-logger.js';

export function createLifeosFoodLoggerRoutes({ pool, callCouncilMember } = {}) {
  const router = express.Router();
  const db = pool;

  router.post('/log', requireLifeOSUser, async (req, res, next) => {
    try {
      if (!db) return res.status(503).json({ ok: false, error: 'pool_unavailable' });
      const userId = req.lifeosUser.sub;
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

  router.get('/logs', requireLifeOSUser, async (req, res, next) => {
    try {
      if (!db) return res.status(503).json({ ok: false, error: 'pool_unavailable' });
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const since = req.query.since || null;
      const rows = await getFoodLogs(db, req.lifeosUser.sub, { limit, since });
      res.json({ ok: true, logs: rows });
    } catch (err) {
      next(err);
    }
  });

  router.get('/summary', requireLifeOSUser, async (req, res, next) => {
    try {
      if (!db) return res.status(503).json({ ok: false, error: 'pool_unavailable' });
      const days = Math.min(Number(req.query.days) || 7, 90);
      const summary = await getNutritionSummary(db, req.lifeosUser.sub, days);
      res.json({ ok: true, summary });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosFoodLoggerRoutes(app, { pool, callCouncilMember } = {}) {
  app.use('/api/v1/lifeos/food', createLifeosFoodLoggerRoutes({ pool, callCouncilMember }));
}