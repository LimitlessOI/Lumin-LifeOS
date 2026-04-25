/**
 * routes/lifeos-habits-routes.js
 *
 * LifeOS Habits API
 * Mounted at /api/v1/lifeos/habits
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createLifeOSHabits } from '../services/lifeos-habits.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { safeId, safeDays } from '../services/lifeos-request-helpers.js';

export function createLifeOSHabitsRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const svc = createLifeOSHabits({ pool });
  const resolveUserId = makeLifeOSUserResolver(pool);
  const log = logger || console;

  // GET /?user=adam
  router.get('/', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const habits = await svc.listHabits(userId);
      res.json({ ok: true, habits });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /
  router.post('/', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const habit = await svc.createHabit(userId, req.body || {});
      res.status(201).json({ ok: true, habit });
    } catch (err) {
      res.status(err.status || 500).json({ ok: false, error: err.message });
    }
  });

  // POST /:id/checkin
  router.post('/:id/checkin', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const habitId = safeId(req.params.id);
      if (!habitId) return res.status(400).json({ ok: false, error: 'Invalid habit id' });
      const completion = await svc.checkInHabit(userId, habitId, req.body || {});
      res.json({ ok: true, completion });
    } catch (err) {
      res.status(err.status || 500).json({ ok: false, error: err.message });
    }
  });

  // GET /summary?user=adam&days=7
  router.get('/summary', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const days = safeDays(req.query.days, { min: 7, max: 60, fallback: 7 });
      const summary = await svc.getHabitSummary(userId, days);
      res.json({ ok: true, ...summary });
    } catch (err) {
      log.error?.(`[HABITS] GET /summary: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
