/**
 * Voice Rail v1 API — canonical communication layer.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * @ssot builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/FOUNDER_PACKET.md
 */
import express from 'express';
import { createVoiceRailV1 } from '../services/voice-rail-v1.js';
import { createCommitmentTracker } from '../services/commitment-tracker.js';
import { createLifeOSLumin } from '../services/lifeos-lumin.js';

export function createLifeOSVoiceRailRoutes({ pool, requireKey, callAI, logger }) {
  const router = express.Router();
  const commitmentTracker = pool ? createCommitmentTracker(pool, callAI) : null;
  const lumin = pool && callAI ? createLifeOSLumin({ pool, callAI, logger }) : null;
  const voiceRail = createVoiceRailV1({ pool, commitmentTracker, callAI, lumin, logger });

  router.get('/health', requireKey, (_req, res) => {
    res.json({
      ok: true,
      service: 'voice-rail-v1',
      modes: voiceRail.MODES,
      intents: voiceRail.INTENTS,
      reply_engine: lumin ? 'lifeos/lumin+council' : 'template_only',
      council_member: lumin ? (process.env.LIFEOS_CHAT_COUNCIL_MEMBER || process.env.LUMIN_COUNCIL_MEMBER || 'anthropic') : null,
    });
  });

  router.post('/session', requireKey, async (req, res, next) => {
    try {
      const userId = await voiceRail.resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const session = await voiceRail.getOrCreateSession({
        userId,
        mode: req.body.mode || 'conversation',
        tag: req.body.tag || null,
        sessionId: req.body.session_id || null,
      });
      const messages = await voiceRail.listMessages(session.id, userId);
      res.json({ ok: true, session, messages: messages || [] });
    } catch (err) {
      next(err);
    }
  });

  router.get('/session/:id/messages', requireKey, async (req, res, next) => {
    try {
      const userId = await voiceRail.resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const messages = await voiceRail.listMessages(req.params.id, userId);
      if (messages === null) return res.status(404).json({ ok: false, error: 'session_not_found' });
      res.json({ ok: true, messages });
    } catch (err) {
      next(err);
    }
  });

  router.post('/classify', requireKey, async (req, res, next) => {
    try {
      const result = await voiceRail.classifyOnly(req.body.text, req.body.mode || 'conversation');
      res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  router.post('/message', requireKey, async (req, res, next) => {
    try {
      const userId = await voiceRail.resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const result = await voiceRail.submitMessage({
        userId,
        sessionId: req.body.session_id || null,
        mode: req.body.mode || 'conversation',
        tag: req.body.tag || null,
        text: req.body.text,
        private: Boolean(req.body.private),
        simulateOnly: Boolean(req.body.simulate_only),
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/staged-commands', requireKey, async (req, res, next) => {
    try {
      const userId = await voiceRail.resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const staged = await voiceRail.listStagedCommands(userId);
      res.json({ ok: true, staged_commands: staged });
    } catch (err) {
      next(err);
    }
  });

  router.post('/private-leak-check', requireKey, async (req, res, next) => {
    try {
      const userId = await voiceRail.resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const needle = String(req.body.needle || '').trim();
      if (!needle) return res.status(400).json({ ok: false, error: 'needle_required' });
      const leak = await voiceRail.findPrivateLeak(userId, needle);
      res.json({ ok: true, ...leak });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
