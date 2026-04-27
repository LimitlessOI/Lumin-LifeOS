/**
 * routes/lifeos-scorecard-routes.js
 *
 * LifeOS Daily Scorecard + MIT API + Life Balance Wheel
 * Mounted at /api/v1/lifeos/scorecard
 *
 * Balance Wheel endpoints:
 *   POST /balance-wheel         — upsert today's 8-area ratings
 *   GET  /balance-wheel         — get most recent score
 *   GET  /balance-wheel/history — last N scores (default 12)
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createLifeOSDailyScorecard } from '../services/lifeos-daily-scorecard.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSScorecardRoutes({ pool, requireKey, callAI, logger }) {
  const router = express.Router();
  const svc    = createLifeOSDailyScorecard({ pool, callAI, logger });
  const resolveUserId = makeLifeOSUserResolver(pool);

  const today = () => new Date().toISOString().slice(0, 10);

  // ── GET /today — MITs + scorecard for today ──────────────────────────────────
  router.get('/today', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const summary = await svc.getTodaySummary(userId, req.query.date || today());
      res.json({ ok: true, ...summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /mits — get MITs for a date ─────────────────────────────────────────
  router.get('/mits', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const mits = await svc.getMITs(userId, req.query.date || today());
      res.json({ ok: true, mits });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /mits — set MITs for today (or a date) ──────────────────────────────
  // Body: { user, date?, mits: [{ position: 1|2|3, title, notes? }] }
  router.post('/mits', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { mits, date } = req.body;
      if (!Array.isArray(mits) || !mits.length) {
        return res.status(400).json({ ok: false, error: 'mits array required' });
      }
      const result = await svc.setMITs(userId, date || today(), mits);
      res.json({ ok: true, mits: result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── PATCH /mits/:id — update status of a single MIT ─────────────────────────
  // Body: { user, status: 'done'|'deferred'|'dropped'|'pending', deferred_to? }
  router.patch('/mits/:id', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const mit = await svc.updateMITStatus(
        userId,
        parseInt(req.params.id, 10),
        { status: req.body.status, deferredTo: req.body.deferred_to }
      );
      res.json({ ok: true, mit });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── POST /score — compute (and store) scorecard for a date ───────────────────
  router.post('/score', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const card = await svc.generateScorecard(
        userId,
        req.body.date || today(),
        { force: req.body.force === true }
      );
      res.json({ ok: true, scorecard: card });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /history — scorecard history ────────────────────────────────────────
  router.get('/history', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const history = await svc.getScorecardHistory(userId, {
        days: parseInt(req.query.days || '30', 10),
      });
      res.json({ ok: true, history });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /deferrals — chronic deferral patterns ───────────────────────────────
  router.get('/deferrals', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const patterns = await svc.getDeferralPatterns(userId, {
        limit: parseInt(req.query.limit || '10', 10),
      });
      res.json({ ok: true, patterns });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LIFE BALANCE WHEEL
  // ─────────────────────────────────────────────────────────────────────────

  const WHEEL_AREAS = ['health','relationships','finance','work','growth','spirituality','fun','environment'];

  // POST /balance-wheel — upsert today's 8-area ratings
  // Body: { user, scored_on?, health, relationships, finance, work, growth, spirituality, fun, environment, notes? }
  router.post('/balance-wheel', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const scoredOn = req.body.scored_on || today();

      // Validate + collect area scores
      const cols = []; const params = [userId, scoredOn];
      for (const area of WHEEL_AREAS) {
        if (req.body[area] !== undefined) {
          const v = parseInt(req.body[area], 10);
          if (isNaN(v) || v < 1 || v > 10) {
            return res.status(400).json({ ok: false, error: `${area} must be 1–10` });
          }
          cols.push(area);
          params.push(v);
        }
      }
      if (req.body.notes !== undefined) {
        cols.push('notes');
        params.push(String(req.body.notes).slice(0, 500));
      }

      const { rows } = await pool.query(`
        INSERT INTO balance_wheel_scores (user_id, scored_on, ${cols.join(', ')})
        VALUES ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(', ')})
        ON CONFLICT (user_id, scored_on) DO UPDATE SET ${cols.map(c => `${c} = EXCLUDED.${c}`).join(', ')}
        RETURNING *
      `, params);

      res.json({ ok: true, score: rows[0] });
    } catch (err) {
      logger?.error?.(`[SCORECARD] POST /balance-wheel: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /balance-wheel?user=adam&date=2026-04-20 — get a single date's score (defaults to most recent)
  router.get('/balance-wheel', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      let query, params;
      if (req.query.date) {
        query  = 'SELECT * FROM balance_wheel_scores WHERE user_id=$1 AND scored_on=$2';
        params = [userId, req.query.date];
      } else {
        query  = 'SELECT * FROM balance_wheel_scores WHERE user_id=$1 ORDER BY scored_on DESC LIMIT 1';
        params = [userId];
      }

      const { rows } = await pool.query(query, params);
      res.json({ ok: true, score: rows[0] || null });
    } catch (err) {
      logger?.error?.(`[SCORECARD] GET /balance-wheel: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /balance-wheel/history?user=adam&limit=12 — trend over time
  router.get('/balance-wheel/history', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 52);
      const { rows } = await pool.query(
        `SELECT * FROM balance_wheel_scores WHERE user_id=$1 ORDER BY scored_on DESC LIMIT $2`,
        [userId, limit]
      );
      res.json({ ok: true, history: rows, count: rows.length });
    } catch (err) {
      logger?.error?.(`[SCORECARD] GET /balance-wheel/history: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
