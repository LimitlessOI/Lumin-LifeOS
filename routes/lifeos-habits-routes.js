/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * LifeOS Habits API — CRUD + streak queries.
 * Mounted at /api/v1/lifeos/habits
 */
import { Router } from 'express';
import { createHabitsStreakService } from '../services/lifeos-habits-streaks.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSHabitsRoutes({ pool, requireKey, logger }) {
  const router = Router();
  const resolveUserId = makeLifeOSUserResolver(pool);
  const streaks = createHabitsStreakService(pool);
  const log = logger || console;

  // GET / — list habits
  router.get('/', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { rows } = await pool.query(
        `SELECT id, name, description, frequency, created_at FROM lifeos_habits WHERE user_id = $1 ORDER BY name`,
        [userId]
      );
      res.json({ ok: true, habits: rows });
    } catch (err) {
      log.error?.('[HABITS] GET /:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /all-streaks — all habits with streak data
  router.get('/all-streaks', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const data = await streaks.getAllStreaks(userId);
      res.json({ ok: true, data });
    } catch (err) {
      log.error?.('[HABITS] GET /all-streaks:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /:id/streak — streak for one habit
  router.get('/:id/streak', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const habitId = parseInt(req.params.id, 10);
      if (!habitId) return res.status(400).json({ ok: false, error: 'Invalid habit id' });
      const data = await streaks.calculateStreak(userId, habitId);
      const milestone = streaks.checkMilestone(data.currentStreak);
      res.json({ ok: true, data: { ...data, milestone } });
    } catch (err) {
      log.error?.('[HABITS] GET /:id/streak:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /:id/complete — mark habit done today
  router.post('/:id/complete', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId((req.body || {}).user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const habitId = parseInt(req.params.id, 10);
      if (!habitId) return res.status(400).json({ ok: false, error: 'Invalid habit id' });
      await pool.query(
        `INSERT INTO lifeos_habit_completions (habit_id, user_id, completed_date)
         VALUES ($1, $2, CURRENT_DATE) ON CONFLICT (habit_id, user_id, completed_date) DO NOTHING`,
        [habitId, userId]
      );
      const streak = await streaks.calculateStreak(userId, habitId);
      res.json({ ok: true, streak, milestone: streaks.checkMilestone(streak.currentStreak) });
    } catch (err) {
      log.error?.('[HABITS] POST /:id/complete:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
