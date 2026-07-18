/**
 * SYNOPSIS: Chronotype + wind-down helpers over LifeOS sleep service.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { createRequireLifeOSUserOrKey } from '../middleware/lifeos-auth-middleware.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { createSleepService } from '../services/lifeos-sleep-service.js';

function userHint(req) {
  const hint = req.query?.user || req.body?.user || req.lifeosUser?.handle || req.lifeosUser?.sub || 'adam';
  return hint === 'emergency-key' ? 'adam' : hint;
}

export function createLifeosSleepChronotypeRoutes({ pool, requireKey } = {}) {
  const router = express.Router();
  const svc = createSleepService({ pool });
  const auth = createRequireLifeOSUserOrKey(requireKey);
  const resolveUserId = makeLifeOSUserResolver(pool);

  router.get('/chronotype', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, ...(await svc.getChronotype(userId)) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/wind-down', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, ...(await svc.getWindDownSuggestion(userId)) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/debt', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, ...(await svc.getSleepDebt(userId)) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosSleepChronotypeRoutes(app, { pool, requireKey } = {}) {
  app.use('/api/v1/lifeos/sleep-insights', createLifeosSleepChronotypeRoutes({ pool, requireKey }));
}