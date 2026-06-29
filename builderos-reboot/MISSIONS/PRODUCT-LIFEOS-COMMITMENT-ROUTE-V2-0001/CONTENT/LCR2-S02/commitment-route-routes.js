/**
 * SYNOPSIS: Commitment Route v2.1 API — inbox commitment → lifeos_commitments.
 * Commitment Route v2.1 API — inbox commitment → lifeos_commitments.
 * Mount at: /api/v1/lifeos/commitment-route
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * HISTORY_SNAPSHOT — not runtime authority; mission-era snapshot.
 */
import express from 'express';
import { createLifeOSCommitmentRoute } from '../services/lifeos-commitment-route.js';

export function createCommitmentRouteRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const routerSvc = createLifeOSCommitmentRoute({ pool, logger });

  router.get('/health', requireKey, (_req, res) => {
    res.json({
      ok: true,
      service: 'commitment-route-v2',
      version: '2.1',
      flow: 'inbox commitment → approve → lifeos_commitments → done',
    });
  });

  router.post('/from-inbox/:id', requireKey, async (req, res, next) => {
    try {
      const { user } = req.body;
      if (!user) return res.status(400).json({ ok: false, error: 'user_required' });
      const userId = await routerSvc.inbox.resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const result = await routerSvc.routeFromInbox(req.params.id, userId);
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message, detail: err.detail });
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  return router;
}
