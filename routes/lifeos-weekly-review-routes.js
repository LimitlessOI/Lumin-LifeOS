/**
 * routes/lifeos-weekly-review-routes.js
 *
 * LifeOS Weekly Review API — narrative generation + interactive conversation
 * Mounted at /api/v1/lifeos/weekly-review
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createLifeOSWeeklyReview } from '../services/lifeos-weekly-review.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSWeeklyReviewRoutes({ pool, requireKey, callAI, logger }) {
  const router  = express.Router();
  const log     = logger || console;
  const svc     = createLifeOSWeeklyReview({ pool, callAI, logger });
  const resolveUserId = makeLifeOSUserResolver(pool);

  // ── GET /latest — most recent review for user ────────────────────────────────
  router.get('/latest', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const review = await svc.getReview(userId);
      res.json({ ok: true, review });
    } catch (err) {
      log.warn?.(err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /history — list of past reviews ─────────────────────────────────────
  router.get('/history', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const reviews = await svc.listReviews(userId, { limit: parseInt(req.query.limit || '12', 10) });
      res.json({ ok: true, reviews });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /week/:date — fetch a specific week's review (YYYY-MM-DD) ────────────
  router.get('/week/:date', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const review = await svc.getReview(userId, req.params.date);
      if (!review) return res.status(404).json({ ok: false, error: 'No review for that week' });
      res.json({ ok: true, review });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /generate — trigger generation (system uses this on schedule too) ───
  router.post('/generate', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const review = await svc.generateReview(userId, {
        referenceDate: req.body.reference_date ? new Date(req.body.reference_date) : null,
        force: req.body.force === true,
      });
      res.json({ ok: true, review });
    } catch (err) {
      log.warn?.(err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /:review_id/session — open or resume conversation ──────────────────
  router.post('/:review_id/session', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await svc.openSession(userId, parseInt(req.params.review_id, 10));
      res.json({ ok: true, ...result });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── POST /session/:session_id/message — send a message in the conversation ──
  router.post('/session/:session_id/message', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ ok: false, error: 'message required' });
      const result = await svc.sendMessage(
        parseInt(req.params.session_id, 10),
        userId,
        message.trim()
      );
      res.json({ ok: true, ...result });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── GET /session/:session_id/actions — pending staged actions ────────────────
  router.get('/session/:session_id/actions', requireKey, async (req, res) => {
    try {
      const actions = await svc.getPendingActions(parseInt(req.params.session_id, 10));
      res.json({ ok: true, actions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /session/:session_id/apply — write agreed actions into LifeOS ───────
  router.post('/session/:session_id/apply', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const results = await svc.applyActions(parseInt(req.params.session_id, 10), userId);
      res.json({ ok: true, results });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /session/:session_id/close ─────────────────────────────────────────
  router.post('/session/:session_id/close', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      await svc.closeSession(parseInt(req.params.session_id, 10), userId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
