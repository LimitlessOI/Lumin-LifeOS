/**
 * SYNOPSIS: Chronotype + wind-down helpers over LifeOS sleep service.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { requireLifeOSUser } from '../middleware/lifeos-auth-middleware.js';
import { createSleepService } from '../services/lifeos-sleep-service.js';

export function createLifeosSleepChronotypeRoutes({ pool } = {}) {
  const router = express.Router();
  const svc = createSleepService({ pool });

  router.get('/chronotype', requireLifeOSUser, async (req, res, next) => {
    try {
      res.json({ ok: true, ...(await svc.getChronotype(req.lifeosUser.sub)) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/wind-down', requireLifeOSUser, async (req, res, next) => {
    try {
      res.json({ ok: true, ...(await svc.getWindDownSuggestion(req.lifeosUser.sub)) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/debt', requireLifeOSUser, async (req, res, next) => {
    try {
      res.json({ ok: true, ...(await svc.getSleepDebt(req.lifeosUser.sub)) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosSleepChronotypeRoutes(app, { pool } = {}) {
  app.use('/api/v1/lifeos/sleep-insights', createLifeosSleepChronotypeRoutes({ pool }));
}