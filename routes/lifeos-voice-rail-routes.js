/**
 * Voice Rail v1 API — canonical communication layer.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * @ssot builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/FOUNDER_PACKET.md
 */
import express from 'express';
import { createVoiceRailV1 } from '../services/voice-rail-v1.js';
import { synthesizeVoiceRailSpeech, voiceRailTtsStatus } from '../services/voice-rail-tts.js';
import { createCommitmentTracker } from '../services/commitment-tracker.js';
import { createLifeOSLumin } from '../services/lifeos-lumin.js';

export function createLifeOSVoiceRailRoutes({
  pool,
  requireKey,
  callAI,
  callCouncilMember,
  councilMembers,
  councilAliasMap,
  logger,
}) {
  const router = express.Router();
  const commitmentTracker = pool ? createCommitmentTracker(pool, callAI) : null;
  const lumin = pool && callAI ? createLifeOSLumin({ pool, callAI, logger }) : null;
  const voiceRail = createVoiceRailV1({
    pool,
    commitmentTracker,
    callAI,
    callCouncilMember,
    councilMembers,
    councilAliasMap,
    lumin,
    logger,
  });

  const chairMemberKey =
    process.env.VOICE_RAIL_CHAIR_MEMBER ||
    process.env.LIFEOS_CHAIR_COUNCIL_MEMBER ||
    process.env.LIFEOS_CHAT_COUNCIL_MEMBER ||
    process.env.LUMIN_COUNCIL_MEMBER ||
    'anthropic';
  const resolvedKey = councilAliasMap?.[chairMemberKey] || chairMemberKey;
  const councilCfg = councilMembers?.[resolvedKey] || {};
  const chairModel =
    process.env.VOICE_RAIL_MODEL ||
    process.env.LIFEOS_CHAIR_MODEL ||
    councilCfg.model ||
    null;

  router.get('/health', requireKey, (_req, res) => {
    res.json({
      ok: true,
      service: 'voice-rail-v1',
      build: 'voice-rail-v2.1',
      modes: voiceRail.MODES,
      intents: voiceRail.INTENTS,
      reply_engine: callCouncilMember ? 'lifeos/department' : 'template_only',
      default_department: 'ChC',
      departments: voiceRail.listDepartments(),
      providers: voiceRail.listProviders(),
      tts: voiceRailTtsStatus(),
      council_member: chairMemberKey,
      model_id: chairModel,
      provider: councilCfg.provider || null,
      display_name: councilCfg.name || null,
    });
  });

  router.get('/departments', requireKey, (_req, res) => {
    res.json({ ok: true, departments: voiceRail.listDepartments() });
  });

  router.get('/providers', requireKey, (_req, res) => {
    res.json({ ok: true, providers: voiceRail.listProviders(), tts: voiceRailTtsStatus() });
  });

  router.get('/tts/status', requireKey, (_req, res) => {
    res.json({ ok: true, ...voiceRailTtsStatus() });
  });

  router.post('/tts', requireKey, async (req, res, next) => {
    try {
      const text = String(req.body.text || '').trim();
      if (!text) return res.status(400).json({ ok: false, error: 'text_required' });
      const result = await synthesizeVoiceRailSpeech(text, { logger });
      if (!result.ok) {
        return res.status(503).json({ ok: false, error: result.error, detail: result.detail });
      }
      res.set('Content-Type', result.contentType || 'audio/mpeg');
      res.set('X-Voice-Rail-TTS-Engine', result.engine || 'unknown');
      return res.send(result.buffer);
    } catch (err) {
      next(err);
    }
  });

  router.get('/history', requireKey, async (req, res, next) => {
    try {
      const userId = await voiceRail.resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const timeline = await voiceRail.loadFounderTimeline(userId, {
        before: req.query.before || null,
        limit: req.query.limit || 40,
      });
      res.json({ ok: true, ...timeline });
    } catch (err) {
      next(err);
    }
  });

  router.get('/history/search', requireKey, async (req, res, next) => {
    try {
      const userId = await voiceRail.resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const q = String(req.query.q || '').trim();
      if (q.length < 2) {
        return res.status(400).json({ ok: false, error: 'query_too_short', min_length: 2 });
      }
      const messages = await voiceRail.searchFounderHistory(userId, q, {
        limit: req.query.limit || 40,
      });
      res.json({ ok: true, query: q, messages, count: messages.length });
    } catch (err) {
      next(err);
    }
  });

  router.post('/session', requireKey, async (req, res, next) => {
    try {
      const userId = await voiceRail.resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const continuous = req.body.continuous !== false;
      if (continuous) {
        const timeline = await voiceRail.loadFounderTimeline(userId, {
          limit: req.body.limit || 40,
        });
        return res.json({
          ok: true,
          session: { id: timeline.session_id, mode: timeline.mode, tag: timeline.tag },
          messages: timeline.messages || [],
          has_more: timeline.has_more,
          continuous: true,
        });
      }
      const session = await voiceRail.getOrCreateSession({
        userId,
        mode: req.body.mode || 'conversation',
        tag: req.body.tag || null,
        sessionId: req.body.session_id || null,
        continuous: false,
      });
      const messages = await voiceRail.listMessages(session.id, userId);
      res.json({ ok: true, session, messages: messages || [], continuous: false });
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
        department: req.body.department || 'ChC',
        councilMember: req.body.council_member || null,
        text: req.body.text,
        private: Boolean(req.body.private),
        simulateOnly: Boolean(req.body.simulate_only),
        continuous: req.body.continuous !== false,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 503) {
        return res.status(503).json({
          ok: false,
          error: err.message,
          code: err.code,
          detail: err.detail,
        });
      }
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
