/**
 * routes/lifeos-mediation-routes.js
 *
 * LifeOS Mediation Engine API
 * Mounted at /api/v1/lifeos/mediation
 *
 * Auth model:
 *   POST /sessions         — requireKey (initiator must be authenticated)
 *   GET  /sessions         — requireKey (list sessions for a LifeOS user)
 *   All  /sessions/:code/* — NO auth required
 *
 * Why /sessions/:code routes carry no auth:
 *   The session code itself is the shared secret. Both parties receive it
 *   (initiator from the response, respondent via invitation). Requiring an API
 *   key would lock out the respondent, who may not have a LifeOS account.
 *   The code is unguessable (adjective-noun-number from a large space), and
 *   exposure to session data is limited to participants who have the code.
 *
 * Endpoints:
 *   POST /sessions                    — create a new session
 *   GET  /sessions?user=handle        — list sessions for a user
 *   GET  /sessions/:code              — get session + turns + agreements
 *   POST /sessions/:code/consent      — record consent for a party
 *   POST /sessions/:code/accept       — respondent accepts invitation
 *   POST /sessions/:code/ready        — party signals they're ready to begin
 *   POST /sessions/:code/statement    — party submits a statement
 *   POST /sessions/:code/propose      — request AI resolution proposals
 *   POST /sessions/:code/accept-proposal — party accepts a proposed agreement
 *   POST /sessions/:code/close        — close the session
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createMediationEngine } from '../services/mediation-engine.js';

export function createLifeOSMediationRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();

  // Normalise callCouncilMember → callAI string helper (matches other LifeOS routes)
  const callAI = callCouncilMember
    ? async (p) => {
        const r = await callCouncilMember('anthropic', p);
        return typeof r === 'string' ? r : r?.content || '';
      }
    : null;

  const engine = createMediationEngine({ pool, callAI, logger });

  // ── Helper: resolve user id from handle or numeric id ─────────────────────

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

  // ── POST /sessions — create a new mediation session ───────────────────────

  router.post('/sessions', requireKey, async (req, res) => {
    try {
      const {
        user,
        initiator_label,
        respondent_label,
        respondent_email,
        topic,
        session_type,
      } = req.body;

      const initiatorUserId = user ? await resolveUserId(user) : null;

      const session = await engine.createSession({
        initiatorUserId,
        initiatorLabel:  initiator_label,
        respondentLabel: respondent_label,
        respondentEmail: respondent_email,
        topic,
        sessionType:     session_type,
      });

      res.status(201).json({ ok: true, session });
    } catch (err) {
      logger?.error?.(`[MEDIATION] POST /sessions: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /sessions — list sessions for a user ──────────────────────────────

  router.get('/sessions', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const sessions = await engine.getSessions({ userId });
      res.json({ ok: true, sessions, count: sessions.length });
    } catch (err) {
      logger?.error?.(`[MEDIATION] GET /sessions: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /sessions/:code — get full session state ──────────────────────────
  // No auth — session code is the shared secret

  router.get('/sessions/:code', async (req, res) => {
    try {
      const session = await engine.getSession(req.params.code);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });
      res.json({ ok: true, session });
    } catch (err) {
      logger?.error?.(`[MEDIATION] GET /sessions/${req.params.code}: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:code/consent — record consent for a party ────────────
  // No auth — session code is the shared secret

  router.post('/sessions/:code/consent', async (req, res) => {
    try {
      const { party } = req.body;
      if (!party) return res.status(400).json({ ok: false, error: 'party is required' });

      const session = await engine.recordConsent({ sessionCode: req.params.code, party });
      res.json({ ok: true, session });
    } catch (err) {
      logger?.error?.(`[MEDIATION] POST /sessions/${req.params.code}/consent: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:code/accept — respondent accepts invitation ───────────
  // No auth — session code is the shared secret

  router.post('/sessions/:code/accept', async (req, res) => {
    try {
      const { respondent_label, respondent_user_id } = req.body;

      const session = await engine.acceptInvitation({
        sessionCode:       req.params.code,
        respondentUserId:  respondent_user_id || null,
        respondentLabel:   respondent_label   || null,
      });
      res.json({ ok: true, session });
    } catch (err) {
      logger?.error?.(`[MEDIATION] POST /sessions/${req.params.code}/accept: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:code/ready — party signals readiness ─────────────────
  // No auth — session code is the shared secret

  router.post('/sessions/:code/ready', async (req, res) => {
    try {
      const { party } = req.body;
      if (!party) return res.status(400).json({ ok: false, error: 'party is required' });

      const session = await engine.setReady({ sessionCode: req.params.code, party });
      res.json({ ok: true, session });
    } catch (err) {
      logger?.error?.(`[MEDIATION] POST /sessions/${req.params.code}/ready: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:code/statement — submit a statement ──────────────────
  // No auth — session code is the shared secret

  router.post('/sessions/:code/statement', async (req, res) => {
    try {
      const { party, content } = req.body;
      if (!party)   return res.status(400).json({ ok: false, error: 'party is required' });
      if (!content) return res.status(400).json({ ok: false, error: 'content is required' });

      const result = await engine.submitStatement({
        sessionCode: req.params.code,
        party,
        content,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.(`[MEDIATION] POST /sessions/${req.params.code}/statement: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:code/propose — request resolution proposals ───────────
  // No auth — session code is the shared secret

  router.post('/sessions/:code/propose', async (req, res) => {
    try {
      const result = await engine.proposeResolution({ sessionCode: req.params.code });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.(`[MEDIATION] POST /sessions/${req.params.code}/propose: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:code/accept-proposal — accept a proposed agreement ────
  // No auth — session code is the shared secret

  router.post('/sessions/:code/accept-proposal', async (req, res) => {
    try {
      const { party, agreement_id } = req.body;
      if (!party)        return res.status(400).json({ ok: false, error: 'party is required' });
      if (!agreement_id) return res.status(400).json({ ok: false, error: 'agreement_id is required' });

      const result = await engine.acceptProposal({
        sessionCode: req.params.code,
        party,
        agreementId: agreement_id,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.(`[MEDIATION] POST /sessions/${req.params.code}/accept-proposal: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions/:code/close — close the session ───────────────────────
  // No auth — session code is the shared secret

  router.post('/sessions/:code/close', async (req, res) => {
    try {
      const { reason } = req.body;
      const session = await engine.closeSession({ sessionCode: req.params.code, reason });
      res.json({ ok: true, session });
    } catch (err) {
      logger?.error?.(`[MEDIATION] POST /sessions/${req.params.code}/close: ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
