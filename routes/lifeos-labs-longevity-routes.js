/**
 * SYNOPSIS: Labs import + biological age + VO2 trend routes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { requireLifeOSUser } from '../middleware/lifeos-auth-middleware.js';
import {
  createLabsLongevityService,
  estimateBiologicalAge,
} from '../services/lifeos-labs-longevity.js';

export function createLabsLongevityRoutes({ pool } = {}) {
  const router = express.Router();
  const svc = createLabsLongevityService({ pool });

  router.post('/estimate', (req, res) => {
    res.json(estimateBiologicalAge(req.body || {}));
  });

  router.post('/import', requireLifeOSUser, async (req, res, next) => {
    try {
      const saved = await svc.importLabs(req.lifeosUser.sub, req.body || {});
      res.status(201).json({ ok: true, lab: saved });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', requireLifeOSUser, async (req, res, next) => {
    try {
      const labs = await svc.listLabs(req.lifeosUser.sub);
      res.json({ ok: true, labs });
    } catch (err) {
      next(err);
    }
  });

  router.get('/vo2', requireLifeOSUser, async (req, res, next) => {
    try {
      res.json(await svc.vo2Trend(req.lifeosUser.sub));
    } catch (err) {
      next(err);
    }
  });

  router.get('/snapshot', requireLifeOSUser, async (req, res, next) => {
    try {
      const chronological_age = req.query.age != null ? Number(req.query.age) : null;
      res.json(await svc.longevitySnapshot(req.lifeosUser.sub, { chronological_age }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosLabsLongevityRoutes(app, { pool } = {}) {
  app.use('/api/v1/lifeos/labs', createLabsLongevityRoutes({ pool }));
}