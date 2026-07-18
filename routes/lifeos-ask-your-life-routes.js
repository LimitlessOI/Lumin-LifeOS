/**
 * SYNOPSIS: Ask-your-life HTTP routes — natural language over captured LifeOS facts.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { requireLifeOSUser } from '../middleware/lifeos-auth-middleware.js';
import { queryLife, createAskYourLifeService } from '../services/lifeos-ask-your-life.js';

export function createAskYourLifeRoutes({ pool } = {}) {
  const router = express.Router();
  const svc = createAskYourLifeService({ pool });

  router.post('/ask-your-life', requireLifeOSUser, async (req, res, next) => {
    try {
      const q = req.body?.query || req.body?.q || req.body?.text || '';
      const result = await svc.queryLife(q, req.lifeosUser.sub);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/ask-your-life', requireLifeOSUser, async (req, res, next) => {
    try {
      const q = req.query?.q || req.query?.query || '';
      const result = await queryLife(q, req.lifeosUser.sub, { pool });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerAskYourLifeRoutes(app, { pool } = {}) {
  app.use('/api/v1/lifeos', createAskYourLifeRoutes({ pool }));
}