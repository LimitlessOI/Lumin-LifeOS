/**
 * routes/lifeos-conflict-routes.js
 *
 * LifeOS Conflict Intelligence + Communication Coaching API
 * Mounted at /api/v1/lifeos/conflict
 *
 * Auth model:
 *   Most routes require x-command-key (requireKey)
 *   Recording-level routes (/recordings/:code/*) use the session code as the
 *   shared secret — no API key required, so a partner without a LifeOS
 *   account can still participate in a shared recording.
 *   POST /detect — no auth (quick utility check, no user data exposed)
 *
 * Endpoints:
 *   GET  /consent                      — get consent status for a pair
 *   POST /consent                      — grant consent
 *   POST /consent/revoke               — revoke consent
 *
 *   POST /recordings                   — start a new recording
 *   GET  /recordings                   — list recordings for a user
 *   GET  /recordings/:code             — get recording by code
 *   POST /recordings/:code/turn        — add a turn (no auth)
 *   POST /recordings/:code/complete    — mark recording captured (no auth)
 *   POST /recordings/:code/mode        — choose processing mode
 *
 *   POST /detect                       — escalation detection (no auth)
 *
 *   POST /coaching                     — start a coaching session
 *   GET  /coaching                     — list sessions for a user
 *   GET  /coaching/patterns            — get communication patterns (must come before /:id)
 *   GET  /coaching/growth              — get growth summary (must come before /:id)
 *   POST /coaching/clarity             — start an individual_clarity session (must come before /:id)
 *   GET  /coaching/:id                 — get a single session (ownership enforced)
 *   POST /coaching/:id/message         — send a message
 *   POST /coaching/:id/complete        — complete the session
 *   POST /coaching/:id/assess-state    — assess / update emotional state for a session
 *   POST /coaching/:id/prep            — generate pre-conversation prep
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createConflictIntelligence } from '../services/conflict-intelligence.js';
import { createCommunicationCoach }   from '../services/communication-coach.js';

export function createLifeOSConflictRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();

  // ── callAI adapter (system + prompt) ─────────────────────────────────────

  const callAI = callCouncilMember
    ? async (system, prompt) => {
        const r = await callCouncilMember('anthropic', prompt, system);
        return typeof r === 'string' ? r : r?.content || '';
      }
    : null;

  const intel = createConflictIntelligence({ pool, callAI, logger });
  const coach = createCommunicationCoach({ pool, callAI, logger });

  // ── Helper: resolve user id from handle or numeric id ────────────────────

  async function resolveUserId(handleOrId) {
    if (!handleOrId) return null;
    if (!isNaN(handleOrId)) {
      const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE id=$1', [handleOrId]);
      return rows[0]?.id || null;
    }
    const { rows } = await pool.query(
      'SELECT id FROM lifeos_users WHERE user_handle=$1',
      [handleOrId]
    );
    return rows[0]?.id || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSENT
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /consent?user=adam&partner=sherry
  router.get('/consent', requireKey, async (req, res) => {
    try {
      const { user, partner } = req.query;
      if (!user || !partner) return res.status(400).json({ ok: false, error: 'user and partner are required' });

      const [userId, partnerUserId] = await Promise.all([
        resolveUserId(user),
        resolveUserId(partner),
      ]);
      if (!userId)        return res.status(404).json({ ok: false, error: 'User not found' });
      if (!partnerUserId) return res.status(404).json({ ok: false, error: 'Partner not found' });

      const status = await intel.getConsentStatus({ userId, partnerUserId });
      res.json({ ok: true, consent: status });
    } catch (err) {
      logger?.error?.(`[CONFLICT] GET /consent: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /consent — grant consent
  router.post('/consent', requireKey, async (req, res) => {
    try {
      const { user, partner, consent_type } = req.body;
      if (!user || !partner || !consent_type) {
        return res.status(400).json({ ok: false, error: 'user, partner, and consent_type are required' });
      }

      const [userId, partnerUserId] = await Promise.all([
        resolveUserId(user),
        resolveUserId(partner),
      ]);
      if (!userId)        return res.status(404).json({ ok: false, error: 'User not found' });
      if (!partnerUserId) return res.status(404).json({ ok: false, error: 'Partner not found' });

      const record = await intel.grantConsent({ userId, partnerUserId, consentType: consent_type });
      res.status(201).json({ ok: true, consent: record });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /consent: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /consent/revoke
  router.post('/consent/revoke', requireKey, async (req, res) => {
    try {
      const { user, partner, consent_type } = req.body;
      if (!user || !partner || !consent_type) {
        return res.status(400).json({ ok: false, error: 'user, partner, and consent_type are required' });
      }

      const [userId, partnerUserId] = await Promise.all([
        resolveUserId(user),
        resolveUserId(partner),
      ]);
      if (!userId)        return res.status(404).json({ ok: false, error: 'User not found' });
      if (!partnerUserId) return res.status(404).json({ ok: false, error: 'Partner not found' });

      const record = await intel.revokeConsent({ userId, partnerUserId, consentType: consent_type });
      res.json({ ok: true, consent: record });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /consent/revoke: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RECORDINGS
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /recordings — start a new recording
  router.post('/recordings', requireKey, async (req, res) => {
    try {
      const { user, partner_user, initiator_label, partner_label, topic } = req.body;

      const [initiatorUserId, partnerUserId] = await Promise.all([
        user         ? resolveUserId(user)         : Promise.resolve(null),
        partner_user ? resolveUserId(partner_user) : Promise.resolve(null),
      ]);

      const recording = await intel.startRecording({
        initiatorUserId,
        partnerUserId,
        initiatorLabel: initiator_label,
        partnerLabel:   partner_label,
        topic,
      });

      res.status(201).json({ ok: true, recording });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /recordings: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // GET /recordings?user=adam — list recordings for a user
  router.get('/recordings', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const recordings = await intel.getRecordings({ userId });
      res.json({ ok: true, recordings, count: recordings.length });
    } catch (err) {
      logger?.error?.(`[CONFLICT] GET /recordings: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /recordings/:code — get recording (no auth — code is the secret)
  router.get('/recordings/:code', async (req, res) => {
    try {
      const recording = await intel.getRecording(req.params.code);
      if (!recording) return res.status(404).json({ ok: false, error: 'Recording not found' });
      res.json({ ok: true, recording });
    } catch (err) {
      logger?.error?.(`[CONFLICT] GET /recordings/${req.params.code}: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /recordings/:code/turn — add a turn (no auth)
  router.post('/recordings/:code/turn', async (req, res) => {
    try {
      const { speaker, content, tone_flags } = req.body;
      if (!content) return res.status(400).json({ ok: false, error: 'content is required' });

      const recording = await intel.addTurn({
        sessionCode: req.params.code,
        speaker,
        content,
        toneFlags: tone_flags,
      });
      res.json({ ok: true, recording });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /recordings/${req.params.code}/turn: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /recordings/:code/complete — mark recording captured (no auth)
  router.post('/recordings/:code/complete', async (req, res) => {
    try {
      const recording = await intel.captureComplete({ sessionCode: req.params.code });
      res.json({ ok: true, recording });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /recordings/${req.params.code}/complete: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /recordings/:code/mode — choose processing mode
  router.post('/recordings/:code/mode', requireKey, async (req, res) => {
    try {
      const { user, mode } = req.body;
      if (!mode) return res.status(400).json({ ok: false, error: 'mode is required' });

      const requestingUserId = user ? await resolveUserId(user) : null;

      const recording = await intel.chooseProcessingMode({
        sessionCode:       req.params.code,
        requestingUserId,
        mode,
      });
      res.json({ ok: true, recording });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /recordings/${req.params.code}/mode: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESCALATION DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /detect — no auth (utility check, no user data exposed)
  router.post('/detect', async (req, res) => {
    try {
      const { text } = req.body;
      const result = intel.detectEscalation({ text });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /detect: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COACHING SESSIONS
  // NOTE: /coaching/patterns and /coaching/growth MUST come before /coaching/:id
  // to prevent Express matching 'patterns' and 'growth' as numeric IDs.
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /coaching/patterns?user=adam — get communication patterns for a user
  router.get('/coaching/patterns', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const patterns = await coach.getPatterns({ userId });
      res.json({ ok: true, patterns, count: patterns.length });
    } catch (err) {
      logger?.error?.(`[CONFLICT] GET /coaching/patterns: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /coaching/growth?user=adam — get growth summary
  router.get('/coaching/growth', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const result = await coach.getGrowthSummary({ userId });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.(`[CONFLICT] GET /coaching/growth: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /coaching/clarity — start an individual_clarity session
  // NOTE: This named route MUST appear before POST /coaching/:id/* routes to
  // avoid 'clarity' being misread as a session ID in a PUT/PATCH context.
  router.post('/coaching/clarity', requireKey, async (req, res) => {
    try {
      const { user, situation_description, self_report } = req.body;
      if (!user) return res.status(400).json({ ok: false, error: 'user is required' });

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const result = await coach.startClaritySession({
        userId,
        situationDescription: situation_description || '',
        selfReport:           self_report           || '',
      });

      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /coaching/clarity: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /coaching — start a new coaching session
  router.post('/coaching', requireKey, async (req, res) => {
    try {
      const { user, session_type, recording_id, perspective } = req.body;
      if (!user || !session_type) {
        return res.status(400).json({ ok: false, error: 'user and session_type are required' });
      }

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const result = await coach.startSession({
        userId,
        sessionType: session_type,
        recordingId: recording_id || null,
        perspective: perspective  || 'individual',
      });

      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /coaching: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // GET /coaching?user=adam — list coaching sessions for a user
  router.get('/coaching', requireKey, async (req, res) => {
    try {
      const { user = 'adam', limit } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const sessions = await coach.getSessions({ userId, limit: limit ? parseInt(limit, 10) : 50 });
      res.json({ ok: true, sessions, count: sessions.length });
    } catch (err) {
      logger?.error?.(`[CONFLICT] GET /coaching: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /coaching/:id?user=adam — get a single session (ownership enforced)
  router.get('/coaching/:id', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const session = await coach.getSession(parseInt(req.params.id, 10), userId);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found or access denied' });

      res.json({ ok: true, session });
    } catch (err) {
      logger?.error?.(`[CONFLICT] GET /coaching/${req.params.id}: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /coaching/:id/message — send a message to the coach
  router.post('/coaching/:id/message', requireKey, async (req, res) => {
    try {
      const { user, content } = req.body;
      if (!user || !content) {
        return res.status(400).json({ ok: false, error: 'user and content are required' });
      }

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      // Ownership is enforced inside sendMessage via getSession
      const result = await coach.sendMessage({
        sessionId: parseInt(req.params.id, 10),
        userId,
        content,
      });

      res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /coaching/${req.params.id}/message: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /coaching/:id/complete — complete the session + extract insights
  router.post('/coaching/:id/complete', requireKey, async (req, res) => {
    try {
      const { user } = req.body;
      if (!user) return res.status(400).json({ ok: false, error: 'user is required' });

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      // Ownership check
      const existing = await coach.getSession(parseInt(req.params.id, 10), userId);
      if (!existing) return res.status(404).json({ ok: false, error: 'Session not found or access denied' });

      const session = await coach.completeSession({ sessionId: parseInt(req.params.id, 10) });
      res.json({ ok: true, session });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /coaching/${req.params.id}/complete: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /coaching/:id/assess-state — assess or update the emotional state for a session
  router.post('/coaching/:id/assess-state', requireKey, async (req, res) => {
    try {
      const { user, self_report } = req.body;
      if (!user)        return res.status(400).json({ ok: false, error: 'user is required' });
      if (!self_report) return res.status(400).json({ ok: false, error: 'self_report is required' });

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      // Ownership gate
      const session = await coach.getSession(parseInt(req.params.id, 10), userId);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found or access denied' });

      const result = await coach.assessEmotionalState({
        sessionId:  parseInt(req.params.id, 10),
        userId,
        selfReport: self_report,
      });

      res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /coaching/${req.params.id}/assess-state: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /coaching/:id/prep — generate pre-conversation prep for a clarity session
  router.post('/coaching/:id/prep', requireKey, async (req, res) => {
    try {
      const { user } = req.body;
      if (!user) return res.status(400).json({ ok: false, error: 'user is required' });

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      // Ownership gate (enforced inside generatePreConversationPrep via getSession)
      const prep = await coach.generatePreConversationPrep({
        sessionId: parseInt(req.params.id, 10),
        userId,
      });

      res.json({ ok: true, prep });
    } catch (err) {
      logger?.error?.(`[CONFLICT] POST /coaching/${req.params.id}/prep: ${err.message}`);
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  return router;
}
