/**
 * LifeOS ambient context API — opt-in lightweight snapshots + proactive nudges.
 *
 * Mounted at /api/v1/lifeos/ambient
 *
 * POST /snapshot — body: { user?, signals }
 * GET  /recent   — recent snapshots for a user
 * GET  /nudge    — proactive spoken nudge based on upcoming calendar events
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createLifeOSAmbientContextService } from '../services/lifeos-ambient-context.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { createLifeOSCalendarService } from '../services/lifeos-calendar.js';

export function createLifeOSAmbientRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const log = logger || console;
  const ambient = createLifeOSAmbientContextService({ pool, logger: log });
  const resolveUserId = makeLifeOSUserResolver(pool);
  const calendar = createLifeOSCalendarService(pool);

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

  // GET /nudge — proactive spoken nudge based on next calendar event
  router.get('/nudge', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const now = new Date();
      const windowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
      const events = await calendar.listEvents(userId, { from: now.toISOString(), to: windowEnd, limit: 5 });

      if (!events.length) {
        return res.json({ ok: true, speak: null, type: 'clear', urgency: 'low' });
      }

      const next = events[0];
      const minutesUntil = Math.round((new Date(next.starts_at) - now) / 60000);
      const name = next.title || 'your next event';
      const loc = (next.location || '').trim();
      const hasTravel = loc && !/zoom|teams|meet|virtual|online|call|phone/i.test(loc);
      const travelBuffer = 30; // assume 30 min travel if location looks physical

      let speak = null;
      let urgency = 'low';
      let type = 'upcoming';

      if (minutesUntil <= 0) {
        speak = `${name} is starting right now. Go!`;
        urgency = 'high';
      } else if (minutesUntil <= 15) {
        urgency = 'high';
        speak = hasTravel
          ? `Urgent — ${name} starts in ${minutesUntil} minutes at ${loc}. You needed to leave by now.`
          : `${name} starts in ${minutesUntil} minutes. Time to wrap up immediately.`;
      } else if (minutesUntil <= 30) {
        urgency = 'high';
        speak = hasTravel
          ? `You have ${name} in ${minutesUntil} minutes at ${loc}. If it's away from home you should be leaving very soon.`
          : `${name} is coming up in ${minutesUntil} minutes. Good time to finish what you're doing.`;
      } else if (minutesUntil <= 60) {
        urgency = 'medium';
        speak = hasTravel
          ? `Heads up — ${name} in about ${minutesUntil} minutes at ${loc}. It's away from home, so plan to leave in about ${minutesUntil - travelBuffer} minutes. Time to start getting ready.`
          : `You have ${name} in about ${minutesUntil} minutes. Start wrapping up in the next 20 minutes.`;
      } else if (minutesUntil <= 90) {
        urgency = 'low';
        type = 'free_window';
        speak = hasTravel
          ? `Your next event is ${name} in ${minutesUntil} minutes at ${loc}. You have about ${minutesUntil - travelBuffer} minutes of free time before you need to head out.`
          : `You have ${minutesUntil} minutes before ${name}. Good window for a focused sprint.`;
      } else {
        // > 90 min away — don't interrupt
        speak = null;
        type = 'free_window';
      }

      res.json({ ok: true, speak, type, urgency, event: { name, minutesUntil, hasTravel, location: loc || null } });
    } catch (err) {
      log.error?.('[lifeos-ambient] nudge error', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
