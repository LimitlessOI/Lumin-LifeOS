import express from 'express';
import { createSleepService } from '../services/lifeos-sleep-service.js';
import { requireLifeOSUser } from './lifeos-auth-routes.js';
import { safeInt, safeDays } from '../services/lifeos-request-helpers.js';

export function mountSleepRoutes(app, { pool }) {
  const router = express.Router();
  const svc = createSleepService({ pool });

  // POST /api/v1/lifeos/sleep — log a sleep session
  // Body: { user, sleep_start, sleep_end, quality, source, notes }
  router.post('/', requireLifeOSUser, async (req, res) => {
    try {
      const userId = req.lifeos_user.id;
      const { sleep_start, sleep_end, quality, source, notes } = req.body;

      if (!sleep_start || !sleep_end) {
        return res.status(400).json({ error: 'sleep_start and sleep_end are required' });
      }

      const result = await svc.logSleep({
        userId,
        sleep_start,
        sleep_end,
        quality: safeInt(quality, null),
        source: source || 'manual',
        notes: notes || null
      });

      res.status(201).json(result);
    } catch (err) {
      console.error('POST /api/v1/lifeos/sleep error:', err);
      res.status(500).json({ error: 'Failed to log sleep session' });
    }
  });

  // GET /api/v1/lifeos/sleep — get history
  // Query: user (required), days (default 30)
  router.get('/', requireLifeOSUser, async (req, res) => {
    try {
      const userId = req.lifeos_user.id;
      const days = safeDays(req.query.days, 30);

      const history = await svc.getSleepHistory({ userId, days });

      res.json({ history, days });
    } catch (err) {
      console.error('GET /api/v1/lifeos/sleep error:', err);
      res.status(500).json({ error: 'Failed to retrieve sleep history' });
    }
  });

  // GET /api/v1/lifeos/sleep/last — most recent entry
  router.get('/last', requireLifeOSUser, async (req, res) => {
    try {
      const userId = req.lifeos_user.id;

      const lastEntry = await svc.getLastSleep({ userId });

      if (!lastEntry) {
        return res.status(404).json({ error: 'No sleep entries found' });
      }

      res.json(lastEntry);
    } catch (err) {
      console.error('GET /api/v1/lifeos/sleep/last error:', err);
      res.status(500).json({ error: 'Failed to retrieve last sleep entry' });
    }
  });

  // GET /api/v1/lifeos/sleep/debt — 7-day sleep debt analysis
  router.get('/debt', requireLifeOSUser, async (req, res) => {
    try {
      const userId = req.lifeos_user.id;

      const debtAnalysis = await svc.getSleepDebt({ userId });

      res.json(debtAnalysis);
    } catch (err) {
      console.error('GET /api/v1/lifeos/sleep/debt error:', err);
      res.status(500).json({ error: 'Failed to calculate sleep debt' });
    }
  });

  app.use('/api/v1/lifeos/sleep', router);
}