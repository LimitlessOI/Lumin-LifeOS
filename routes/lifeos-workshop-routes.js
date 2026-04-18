/**
 * routes/lifeos-workshop-routes.js
 *
 * Workshop of the Mind API
 * Mounted at /api/v1/lifeos/workshop
 *
 * POST /sessions              — start a new workshop session
 * POST /sessions/:id/respond  — send a response in an active session
 * POST /sessions/:id/close    — close session + extract insight/anchor
 * GET  /sessions              — session history
 * GET  /anchors               — all anchor phrases from completed sessions
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createWorkshopOfMind } from '../services/workshop-of-mind.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSWorkshopRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();

  // ── AI helper ─────────────────────────────────────────────────────────────
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || r?.text || '';
      }
    : null;

  const workshop = createWorkshopOfMind({ pool, callAI });

  // Helper: resolve user_id (shared, case-insensitive)
  const resolveUserId = makeLifeOSUserResolver(pool);


  // ── POST /sessions ────────────────────────────────────────────────────────
  // Start a new workshop session.
  // Body: { user?, session_type, context?, intention? }
  router.post('/sessions', requireKey, async (req, res) => {
    try {
      const { user, session_type, context, intention } = req.body || {};

      if (!session_type) {
        return res.status(400).json({
          ok: false,
          error: 'session_type is required',
          valid_types: [
            'performance_rehearsal', 'future_self_meeting', 'goal_crystallization',
            'healing_visualization', 'morning_activation', 'evening_integration',
          ],
        });
      }

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const result = await workshop.startSession(userId, {
        sessionType: session_type,
        context,
        intention,
      });

      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      const status = err.message.includes('Invalid session_type') ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:id/respond ────────────────────────────────────────────
  // Send a user response and receive next guidance.
  // Body: { user?, response }
  router.post('/sessions/:id/respond', requireKey, async (req, res) => {
    try {
      const { user, response } = req.body || {};

      if (!response?.trim()) {
        return res.status(400).json({ ok: false, error: 'response is required' });
      }

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) return res.status(400).json({ ok: false, error: 'Invalid session id' });

      const result = await workshop.sendResponse(userId, sessionId, response);
      res.json({ ok: true, ...result });
    } catch (err) {
      const status = err.message.includes('not found') ? 404
        : err.message.includes('not active') ? 409
        : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:id/close ──────────────────────────────────────────────
  // Close the session and extract insight + anchor phrase.
  // Body: { user? }
  router.post('/sessions/:id/close', requireKey, async (req, res) => {
    try {
      const { user } = req.body || {};

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) return res.status(400).json({ ok: false, error: 'Invalid session id' });

      const result = await workshop.closeSession(userId, sessionId);
      res.json({ ok: true, ...result });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── GET /sessions ─────────────────────────────────────────────────────────
  // Session history for the user.
  router.get('/sessions', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const limit   = parseInt(req.query.limit) || 10;
      const sessions = await workshop.getSessionHistory(userId, limit);
      res.json({ ok: true, sessions, count: sessions.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /anchors ──────────────────────────────────────────────────────────
  // All anchor phrases from completed sessions.
  router.get('/anchors', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const phrases = await workshop.getAnchorPhrases(userId);
      res.json({ ok: true, anchors: phrases, count: phrases.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
