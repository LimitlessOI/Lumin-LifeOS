/**
 * SYNOPSIS: Labs import + biological age + VO2 trend routes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { createRequireLifeOSUserOrKey } from '../middleware/lifeos-auth-middleware.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import {
  createLabsLongevityService,
  estimateBiologicalAge,
} from '../services/lifeos-labs-longevity.js';

export function createLabsLongevityRoutes({ pool, requireKey } = {}) {
  const router = express.Router();
  const svc = createLabsLongevityService({ pool });
  const resolveUserId = makeLifeOSUserResolver(pool);
  const auth = createRequireLifeOSUserOrKey(requireKey);

  async function resolveLabsUserId(req) {
    const hint = req.body?.user || req.query?.user
      || req.lifeosUser?.handle
      || req.lifeosUser?.sub
      || 'adam';
    const safe = String(hint) === 'emergency-key' ? 'adam' : hint;
    return resolveUserId(safe);
  }

  router.post('/estimate', (req, res) => {
    res.json(estimateBiologicalAge(req.body || {}));
  });

  router.get('/health', (_req, res) => {
    res.json({ ok: true, product: 'lifeos-labs', mount: '/api/v1/lifeos/labs' });
  });

  router.post('/import', auth, async (req, res, next) => {
    try {
      const userId = await resolveLabsUserId(req);
      const saved = await svc.importLabs(userId, req.body || {});
      const status = saved?.persisted === 'memory_fallback' ? 200 : 201;
      res.status(status).json({
        ok: true,
        lab: saved,
        persisted: saved?.persisted || 'db',
        user_id: userId,
        auth_mode: req.auth_mode || null,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', auth, async (req, res, next) => {
    try {
      const userId = await resolveLabsUserId(req);
      const labs = await svc.listLabs(userId);
      res.json({
        ok: true,
        labs,
        user_id: userId,
        auth_mode: req.auth_mode || null,
        source: labs?.[0]?.persisted === 'memory_fallback' ? 'memory' : 'db_or_empty',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/vo2', auth, async (req, res, next) => {
    try {
      const userId = await resolveLabsUserId(req);
      res.json(await svc.vo2Trend(userId));
    } catch (err) {
      next(err);
    }
  });

  router.get('/snapshot', auth, async (req, res, next) => {
    try {
      const userId = await resolveLabsUserId(req);
      const chronological_age = req.query.age != null ? Number(req.query.age) : null;
      res.json(await svc.longevitySnapshot(userId, { chronological_age }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosLabsLongevityRoutes(app, deps = {}) {
  app.use('/api/v1/lifeos/labs', createLabsLongevityRoutes(deps));
}
