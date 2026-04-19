/**
 * routes/lifeos-scorecard-routes.js
 *
 * LifeOS Daily Scorecard + MIT API
 * Mounted at /api/v1/lifeos/scorecard
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

  return router;
}
