/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * Ambient intelligence API — contextual proactive nudges from calendar, MITs, habits.
 * Mounted at /api/v1/lifeos/ambient-intel
 */
import { Router } from 'express';
import { createAmbientIntelligenceService } from '../services/lifeos-ambient-intelligence.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSAmbientIntelligenceRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = Router();
  const resolveUserId = makeLifeOSUserResolver(pool);
  const svc = createAmbientIntelligenceService(pool, callCouncilMember);
  const log = logger || console;

  // GET /nudge?user=adam — get the next proactive nudge to speak/display
  router.get('/nudge', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await svc.getContextualNudge(userId);
      res.json({ ok: true, ...result });
    } catch (err) {
      log.error?.('[AMBIENT-INTEL] GET /nudge:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /status?user=adam — raw context flags (no AI call)
  router.get('/status', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const now = new Date();
      const windowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();

      const [eventsRes, mitsRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS n FROM lifeos_calendar_events
           WHERE user_id = $1 AND starts_at >= $2 AND starts_at <= $3`,
          [userId, now.toISOString(), windowEnd]
        ),
        pool.query(
          `SELECT COUNT(*) AS n FROM lifeos_mits
           WHERE user_id = $1 AND completed = false AND due_date < $2`,
          [userId, now.toISOString()]
        ),
      ]);

      res.json({
        ok: true,
        hasUpcomingEvents: parseInt(eventsRes.rows[0]?.n || 0) > 0,
        hasOverdueMITs: parseInt(mitsRes.rows[0]?.n || 0) > 0,
        checkedAt: now.toISOString(),
      });
    } catch (err) {
      log.error?.('[AMBIENT-INTEL] GET /status:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
