/**
 * SYNOPSIS: Ask-your-life HTTP routes — natural language over captured LifeOS facts.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { createRequireLifeOSUserOrKey } from '../middleware/lifeos-auth-middleware.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { queryLife, createAskYourLifeService } from '../services/lifeos-ask-your-life.js';

function userHint(req) {
  const hint = req.query?.user || req.body?.user || req.lifeosUser?.handle || req.lifeosUser?.sub || 'adam';
  return hint === 'emergency-key' ? 'adam' : hint;
}

export function createAskYourLifeRoutes({ pool, requireKey } = {}) {
  const router = express.Router();
  const svc = createAskYourLifeService({ pool });
  const auth = createRequireLifeOSUserOrKey(requireKey);
  const resolveUserId = makeLifeOSUserResolver(pool);

  router.post('/ask-your-life', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const q = req.body?.query || req.body?.q || req.body?.text || '';
      const result = await svc.queryLife(q, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/ask-your-life', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const q = req.query?.q || req.query?.query || '';
      const result = await queryLife(q, userId, { pool });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerAskYourLifeRoutes(app, { pool, requireKey } = {}) {
  app.use('/api/v1/lifeos', createAskYourLifeRoutes({ pool, requireKey }));
}