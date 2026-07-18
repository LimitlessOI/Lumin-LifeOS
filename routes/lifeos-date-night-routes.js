/**
 * SYNOPSIS: Date-night / shared ritual planner routes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { createRequireLifeOSUserOrKey } from '../middleware/lifeos-auth-middleware.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { createDateNightPlanner } from '../services/lifeos-date-night.js';

function userHint(req) {
  const hint = req.query?.user || req.body?.user || req.lifeosUser?.handle || req.lifeosUser?.sub || 'adam';
  return hint === 'emergency-key' ? 'adam' : hint;
}

export function createDateNightRoutes({ pool, requireKey } = {}) {
  const router = express.Router();
  const svc = createDateNightPlanner({ pool });
  const auth = createRequireLifeOSUserOrKey(requireKey);
  const resolveUserId = makeLifeOSUserResolver(pool);

  router.get('/ideas', (_req, res) => {
    res.json({ ok: true, ideas: svc.listIdeas() });
  });

  router.get('/week', auth, async (req, res, next) => {
    try {
      const userId = await resolveUserId(userHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const partnerHint = req.query.partner_user_id || req.query.partner || null;
      const partnerUserId = partnerHint ? await resolveUserId(partnerHint) : null;
      const plan = await svc.planWeek(userId, {
        energy: req.query.energy || 'medium',
        partnerUserId,
      });
      res.json(plan);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosDateNightRoutes(app, { pool, requireKey } = {}) {
  app.use('/api/v1/lifeos/date-night', createDateNightRoutes({ pool, requireKey }));
}