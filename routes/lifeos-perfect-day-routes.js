/**
 * SYNOPSIS: Registers LifeosPerfectDayRoutes routes/handlers (routes/lifeos-perfect-day-routes.js).
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { planPerfectDay, getPerfectDay, checkIn, getDailyReminders, rateDay } from '../services/lifeos-perfect-day.js';

export function registerLifeosPerfectDayRoutes(app, deps) {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  router.post('/plan', deps.requireKey, async (req, res) => {
    try {
      const result = await planPerfectDay(req.body.user_id, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/plan', deps.requireKey, async (req, res) => {
    try {
      const result = await getPerfectDay(req.body.user_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/check-in', deps.requireKey, async (req, res) => {
    try {
      const result = await checkIn(req.body.user_id, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/reminders', deps.requireKey, async (req, res) => {
    try {
      const result = await getDailyReminders(req.body.user_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/rate', deps.requireKey, async (req, res) => {
    try {
      const result = await rateDay(req.body.user_id, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.use('/api/v1/lifeos/perfect-day', router);
}