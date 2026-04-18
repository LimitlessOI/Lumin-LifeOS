/**
 * routes/lifeos-copilot-routes.js
 *
 * LifeOS Live CoPilot + Emergency Repair API
 * Mounted at /api/v1/lifeos/copilot
 *
 * Emergency Repair:
 *   POST /repair                          — activate emergency repair button
 *   POST /repair/:id/outcome              — log outcome after repair
 *   GET  /repair/history                  — repair history for user
 *
 * Live CoPilot Sessions:
 *   POST /sessions                        — start a live copilot session
 *   POST /sessions/:id/message            — send a message during live session
 *   POST /sessions/:id/close              — close session + extract insights
 *   GET  /sessions                        — session history for user
 *   GET  /sessions/:id/messages           — messages in a session
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createEmergencyRepair } from '../services/emergency-repair.js';
import { createLiveCopilot }     from '../services/live-copilot.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSCopilotRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();

  // ── AI helper ─────────────────────────────────────────────────────────────
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || r?.text || '';
      }
    : null;

  // ── Services ──────────────────────────────────────────────────────────────
  const emergencyRepair = createEmergencyRepair({ pool, callAI });
  const liveCopilot     = createLiveCopilot({ pool, callAI });

  // Helper: resolve user_id (shared, case-insensitive)
  const resolveUserId = makeLifeOSUserResolver(pool);


  // ══════════════════════════════════════════════════════════════════════════
  // EMERGENCY REPAIR
  // ══════════════════════════════════════════════════════════════════════════

  // ── POST /repair ──────────────────────────────────────────────────────────
  // Activate the emergency repair button.
  // Body: { user?, situation, repair_type? }
  router.post('/repair', requireKey, async (req, res) => {
    try {
      const { user, situation, repair_type } = req.body || {};

      if (!situation) {
        return res.status(400).json({ ok: false, error: 'situation is required' });
      }

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const result = await emergencyRepair.activate(userId, situation, repair_type || null);
      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /repair/:id/outcome ──────────────────────────────────────────────
  // Log the outcome of a repair attempt.
  // Body: { user?, resolved, notes?, repair_approach? }
  router.post('/repair/:id/outcome', requireKey, async (req, res) => {
    try {
      const { user, resolved, notes, repair_approach } = req.body || {};
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const recordId = parseInt(req.params.id);
      await emergencyRepair.logOutcome(userId, recordId, {
        resolved: resolved === true || resolved === 'true',
        notes: notes || null,
        repair_approach: repair_approach || null,
      });

      res.json({ ok: true, recorded: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /repair/history ───────────────────────────────────────────────────
  // Returns repair history for the user.
  router.get('/repair/history', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const limit = parseInt(req.query.limit) || 20;
      const history = await emergencyRepair.getHistory(userId, limit);
      res.json({ ok: true, history });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LIVE COPILOT SESSIONS
  // ══════════════════════════════════════════════════════════════════════════

  // ── POST /sessions ────────────────────────────────────────────────────────
  // Start a new live CoPilot session.
  // Body: { user?, session_type, context?, goal? }
  router.post('/sessions', requireKey, async (req, res) => {
    try {
      const { user, session_type, context, goal } = req.body || {};

      if (!session_type) {
        return res.status(400).json({
          ok: false,
          error: 'session_type is required',
          valid_types: ['negotiation', 'hard_conversation', 'decision', 'presentation', 'interview', 'other'],
        });
      }

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const session = await liveCopilot.startSession(userId, { sessionType: session_type, context, goal });
      res.status(201).json({ ok: true, ...session });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:id/message ────────────────────────────────────────────
  // Send a message in an active session and receive guidance.
  // Body: { user?, message }
  router.post('/sessions/:id/message', requireKey, async (req, res) => {
    try {
      const { user, message } = req.body || {};

      if (!message) {
        return res.status(400).json({ ok: false, error: 'message is required' });
      }

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const sessionId = parseInt(req.params.id);
      const result = await liveCopilot.sendMessage(userId, sessionId, message);
      res.json({ ok: true, ...result });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:id/close ──────────────────────────────────────────────
  // Close a session and extract insights.
  // Body: { user?, outcome?, notes? }
  router.post('/sessions/:id/close', requireKey, async (req, res) => {
    try {
      const { user, outcome, notes } = req.body || {};
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const sessionId = parseInt(req.params.id);
      const result = await liveCopilot.closeSession(userId, sessionId, { outcome, notes });
      res.json({ ok: true, ...result });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── GET /sessions ─────────────────────────────────────────────────────────
  // Returns CoPilot session history for the user.
  router.get('/sessions', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const limit = parseInt(req.query.limit) || 20;
      const sessions = await liveCopilot.getSessionHistory(userId, limit);
      res.json({ ok: true, sessions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /sessions/:id/messages ────────────────────────────────────────────
  // Returns all messages in a specific session.
  router.get('/sessions/:id/messages', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const sessionId = parseInt(req.params.id);
      const messages = await liveCopilot.getSessionMessages(userId, sessionId);
      res.json({ ok: true, messages });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  return router;
}
