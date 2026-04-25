/**
 * LifeOS ambient context API — opt-in lightweight snapshots.
 *
 * Mounted at /api/v1/lifeos/ambient
 *
 * POST /snapshot — body: { user?, signals }
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createLifeOSAmbientContextService } from '../services/lifeos-ambient-context.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSAmbientRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const log = logger || console;
  const ambient = createLifeOSAmbientContextService({ pool, logger: log });
  const resolveUserId = makeLifeOSUserResolver(pool);

  router.post('/snapshot', requireKey, async (req, res) => {
    try {
      const { user = 'adam', signals } = req.body || {};
      if (!signals || typeof signals !== 'object' || Array.isArray(signals)) {
        return res.status(400).json({ ok: false, error: 'signals object is required' });
      }
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const row = await ambient.appendSnapshot(userId, signals);
      res.status(201).json({ ok: true, id: row.id, created_at: row.created_at });
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) log.error?.('[lifeos-ambient] snapshot error', err);
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  router.get('/recent', requireKey, async (req, res) => {
    try {
      const { user = 'adam', limit = '8' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const rows = await ambient.listRecentSafe(userId, parseInt(limit, 10) || 8);
      res.json({ ok: true, snapshots: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
