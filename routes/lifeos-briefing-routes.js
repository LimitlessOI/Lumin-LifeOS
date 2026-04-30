/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * Daily briefing API — morning context assembled from calendar, MITs, habits.
 * Mounted at /api/v1/lifeos/briefing
 */
import { Router } from 'express';
import { createDailyBriefingService } from '../services/lifeos-daily-briefing.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSBriefingRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = Router();
  const resolveUserId = makeLifeOSUserResolver(pool);
  const briefingSvc = createDailyBriefingService(pool, callCouncilMember);
  const log = logger || console;

  // GET /today — structured briefing data
  router.get('/today', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const briefing = await briefingSvc.assembleBriefing(userId);
      res.json({ ok: true, briefing });
    } catch (err) {
      log.error?.('[BRIEFING] GET /today:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /spoken — AI-generated spoken text + raw data
  router.get('/spoken', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await briefingSvc.generateSpokenBriefing(userId);
      res.json({ ok: true, text: result.text, data: result.data });
    } catch (err) {
      log.error?.('[BRIEFING] GET /spoken:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
