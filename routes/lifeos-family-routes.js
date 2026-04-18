/**
 * routes/lifeos-family-routes.js
 *
 * LifeOS Phase 4 — Family OS API
 * Mounted at /api/v1/lifeos/family
 *
 * Endpoints:
 *   POST /link                          — link two users
 *   GET  /linked                        — users linked to current user
 *   GET  /shared-commitments            — commitments shared with user
 *   POST /commitment/:id/share          — share a commitment with linked user
 *   POST /debrief                       — create a conversation debrief
 *   GET  /debrief                       — get user's debriefs
 *   POST /debrief/:id/acknowledge       — mark debrief acknowledged
 *   POST /tone/analyze                  — analyze tone of text
 *   POST /tone/pair                     — analyze pair dynamic
 *   GET  /relationship/pulse            — get relationship pulse
 *   POST /relationship/checkin          — log relationship check-in
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createHouseholdSync }       from '../services/household-sync.js';
import { createRelationshipDebrief } from '../services/relationship-debrief.js';
import { createToneIntelligence }    from '../services/tone-intelligence.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSFamilyRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();

  // ── AI helper ─────────────────────────────────────────────────────────────
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || r?.text || '';
      }
    : null;

  // ── Services ──────────────────────────────────────────────────────────────
  const householdSvc = createHouseholdSync({ pool });
  const debriefSvc   = createRelationshipDebrief({ pool, callAI });
  const toneSvc      = createToneIntelligence({ callAI });

  // Helper: resolve user_id (shared, case-insensitive)
  const resolveUserId = makeLifeOSUserResolver(pool);


  // ── POST /link ────────────────────────────────────────────────────────────
  router.post('/link', requireKey, async (req, res) => {
    try {
      const { user_a, user_b, relationship, permissions } = req.body;
      if (!user_a || !user_b) return res.status(400).json({ ok: false, error: 'user_a and user_b required' });
      const idA = await resolveUserId(user_a);
      const idB = await resolveUserId(user_b);
      if (!idA) return res.status(404).json({ ok: false, error: `User not found: ${user_a}` });
      if (!idB) return res.status(404).json({ ok: false, error: `User not found: ${user_b}` });
      const link = await householdSvc.linkUsers({ userIdA: idA, userIdB: idB, relationship, permissions });
      res.json({ ok: true, link });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /linked ───────────────────────────────────────────────────────────
  router.get('/linked', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const linked = await householdSvc.getLinkedUsers(userId);
      res.json({ ok: true, linked });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /shared-commitments ───────────────────────────────────────────────
  router.get('/shared-commitments', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const commitments = await householdSvc.getSharedCommitments(userId);
      res.json({ ok: true, commitments });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /commitment/:id/share ────────────────────────────────────────────
  router.post('/commitment/:id/share', requireKey, async (req, res) => {
    try {
      const commitmentId    = +req.params.id;
      const shareWithUserId = await resolveUserId(req.body.share_with_user);
      if (!shareWithUserId) return res.status(404).json({ ok: false, error: 'Target user not found' });
      const row = await householdSvc.shareCommitment({ commitmentId, sharedWithUserId: shareWithUserId });
      res.json({ ok: true, shared: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /debrief ─────────────────────────────────────────────────────────
  router.post('/debrief', requireKey, async (req, res) => {
    try {
      const { user, conversation_context, what_was_said } = req.body;
      if (!conversation_context) return res.status(400).json({ ok: false, error: 'conversation_context required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const debrief = await debriefSvc.createDebrief({ userId, conversationContext: conversation_context, whatWasSaid: what_was_said });
      res.json({ ok: true, debrief });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /debrief ──────────────────────────────────────────────────────────
  router.get('/debrief', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const days    = parseInt(req.query.days, 10) || 30;
      const debriefs = await debriefSvc.getDebriefs(userId, { days });
      res.json({ ok: true, debriefs });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /debrief/:id/acknowledge ─────────────────────────────────────────
  router.post('/debrief/:id/acknowledge', requireKey, async (req, res) => {
    try {
      const row = await debriefSvc.acknowledgeDebrief(+req.params.id);
      if (!row) return res.status(404).json({ ok: false, error: 'Debrief not found' });
      res.json({ ok: true, debrief: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /tone/analyze ────────────────────────────────────────────────────
  router.post('/tone/analyze', requireKey, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ ok: false, error: 'text required' });
      const analysis = await toneSvc.analyzeTone(text);
      res.json({ ok: true, analysis });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /tone/pair ───────────────────────────────────────────────────────
  router.post('/tone/pair', requireKey, async (req, res) => {
    try {
      const { message_a, message_b } = req.body;
      if (!message_a || !message_b) return res.status(400).json({ ok: false, error: 'message_a and message_b required' });
      const dynamic = await toneSvc.analyzePairDynamic(message_a, message_b);
      res.json({ ok: true, dynamic });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /relationship/pulse ───────────────────────────────────────────────
  router.get('/relationship/pulse', requireKey, async (req, res) => {
    try {
      const idA  = await resolveUserId(req.query.user_a || 'adam');
      const idB  = await resolveUserId(req.query.user_b);
      if (!idA || !idB) return res.status(400).json({ ok: false, error: 'user_a and user_b required' });
      const days = parseInt(req.query.days, 10) || 30;
      const pulse = await householdSvc.getRelationshipPulse(idA, idB, { days });
      res.json({ ok: true, ...pulse });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /relationship/checkin ────────────────────────────────────────────
  router.post('/relationship/checkin', requireKey, async (req, res) => {
    try {
      const {
        user, partner_user,
        connection_score, conflict_level,
        what_is_working, what_needs_attention, gratitude_note,
      } = req.body;
      const initiatorId = await resolveUserId(user || 'adam');
      const partnerId   = await resolveUserId(partner_user);
      if (!initiatorId) return res.status(404).json({ ok: false, error: 'Initiator user not found' });
      if (!partnerId)   return res.status(400).json({ ok: false, error: 'partner_user required' });
      const checkin = await householdSvc.logRelationshipCheckin({
        initiatorUserId:   initiatorId,
        partnerUserId:     partnerId,
        connectionScore:   connection_score,
        conflictLevel:     conflict_level,
        whatIsWorking:     what_is_working,
        whatNeedsAttention: what_needs_attention,
        gratitudeNote:     gratitude_note,
      });
      res.json({ ok: true, checkin });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
