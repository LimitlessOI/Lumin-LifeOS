/**
 * SYNOPSIS: Date-night / shared ritual planner routes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { requireLifeOSUser } from '../middleware/lifeos-auth-middleware.js';
import { createDateNightPlanner } from '../services/lifeos-date-night.js';

export function createDateNightRoutes({ pool } = {}) {
  const router = express.Router();
  const svc = createDateNightPlanner({ pool });

  router.get('/ideas', (_req, res) => {
    res.json({ ok: true, ideas: svc.listIdeas() });
  });

  router.get('/week', requireLifeOSUser, async (req, res, next) => {
    try {
      const plan = await svc.planWeek(req.lifeosUser.sub, {
        energy: req.query.energy || 'medium',
        partnerUserId: req.query.partner_user_id || null,
      });
      res.json(plan);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosDateNightRoutes(app, { pool } = {}) {
  app.use('/api/v1/lifeos/date-night', createDateNightRoutes({ pool }));
}