/**
 * SYNOPSIS: LifeOS Perfect Day API — plan, reminders, check-in, rate.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import {
  planPerfectDay,
  getPerfectDay,
  checkIn,
  getDailyReminders,
  rateDay,
  defaultSchedule,
} from '../services/lifeos-perfect-day.js';

function resolveUserKey(req) {
  return String(
    req.body?.user_id
    || req.query?.user_id
    || req.body?.user
    || req.query?.user
    || req.lifeosUser?.handle
    || req.user?.handle
    || 'adam',
  ).trim().toLowerCase() || 'adam';
}

export function registerLifeosPerfectDayRoutes(app, deps = {}) {
  const router = express.Router();
  const requireKey = deps.requireKey || ((_req, _res, next) => next());

  router.get('/health', (_req, res) => {
    res.json({ ok: true, surface: 'perfect_day', version: 'v2_founder_day_arc' });
  });

  router.get('/template', requireKey, (_req, res) => {
    res.json({ ok: true, schedule: defaultSchedule(), wake_time: '06:00' });
  });

  router.post('/plan', requireKey, async (req, res) => {
    try {
      const userId = resolveUserKey(req);
      const result = await planPerfectDay(userId, {
        wakeTime: req.body?.wake_time || req.body?.wakeTime,
        schedule: req.body?.schedule,
      });
      res.json({ ok: true, plan: result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/plan', requireKey, async (req, res) => {
    try {
      const userId = resolveUserKey(req);
      const result = await getPerfectDay(userId, { seedIfMissing: true });
      res.json({ ok: true, plan: result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/check-in', requireKey, async (req, res) => {
    try {
      const userId = resolveUserKey(req);
      const result = await checkIn(userId, {
        currentActivity: req.body?.current_activity || req.body?.currentActivity,
        distraction: req.body?.distraction,
        priority: req.body?.priority,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/reminders', requireKey, async (req, res) => {
    try {
      const userId = resolveUserKey(req);
      const result = await getDailyReminders(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/rate', requireKey, async (req, res) => {
    try {
      const userId = resolveUserKey(req);
      const result = await rateDay(userId, {
        rating: req.body?.rating,
        note: req.body?.note,
        whatMatteredMore: req.body?.what_mattered_more || req.body?.whatMatteredMore,
        workScore: req.body?.work_score ?? req.body?.workScore,
        husbandScore: req.body?.husband_score ?? req.body?.husbandScore,
        selfScore: req.body?.self_score ?? req.body?.selfScore,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.use('/api/v1/lifeos/perfect-day', router);
}
