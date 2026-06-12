/**
 * Voice Rail v1 API — canonical communication layer.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * @ssot builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/FOUNDER_PACKET.md
 */
import express from 'express';
import multer from 'multer';
import { createVoiceRailV1, isVoiceRailFailClosedEnabled } from '../services/voice-rail-v1.js';
import {
  buildVoiceRailExecutionManifest,
  VOICE_RAIL_EXECUTION_MANIFEST,
} from '../services/voice-rail-execution-truth.js';
import { synthesizeVoiceRailSpeech, voiceRailTtsStatus } from '../services/voice-rail-tts.js';
import { transcribeVoiceRailAudio, voiceRailSttStatus } from '../services/voice-rail-stt.js';
import {
  describeVoiceRailImages,
  normalizeVoiceRailAttachments,
} from '../services/voice-rail-attachments.js';
import { createCommitmentTracker } from '../services/commitment-tracker.js';
import { createLifeOSLumin } from '../services/lifeos-lumin.js';
import { createCommunicationProfile } from '../services/communication-profile.js';

const sttUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

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
  const communicationProfile =
    pool && callAI ? createCommunicationProfile({ pool, callAI, logger }) : null;
  const voiceRail = createVoiceRailV1({
    pool,
    commitmentTracker,
    callAI,
    callCouncilMember,
    councilMembers,
    councilAliasMap,
    lumin,
    communicationProfile,
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
      build: 'voice-rail-v2.19',
      founder_auto_routing: true,
      fail_closed_founder_comms: isVoiceRailFailClosedEnabled(),
      founder_command_execute: process.env.VOICE_RAIL_EXECUTE_COMMANDS !== '0',
      execution_truth: buildVoiceRailExecutionManifest(),
      modes: voiceRail.MODES,
      intents: voiceRail.INTENTS,
      reply_engine: callCouncilMember ? 'lifeos/department' : 'template_only',
      default_department: 'ChC',
      departments: voiceRail.listDepartments(),
      providers: voiceRail.listProviders(),
      tts: voiceRailTtsStatus(),
      stt: voiceRailSttStatus(),
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

  router.get('/context-probe', requireKey, async (req, res, next) => {
    try {
      const userId = await voiceRail.resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const probe = await voiceRail.probeFounderContext(userId);
      res.json({
        ok: probe.sufficient,
        ...probe,
        execution_truth: buildVoiceRailExecutionManifest(),
        note: probe.sufficient
          ? 'LifeOS context CONNECTED — founder replies allowed.'
          : 'LifeOS context below CONNECTED bar — founder replies blocked until fixed.',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/connection-proof', requireKey, async (req, res, next) => {
    try {
      const userId = await voiceRail.resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const probe = await voiceRail.probeFounderContext(userId);
      res.json({
        ok: probe.sufficient === true,
        connected: probe.sufficient === true,
        fail_closed: isVoiceRailFailClosedEnabled(),
        context_health: probe.context_health,
        execution_truth: buildVoiceRailExecutionManifest(),
        acceptance_command: 'npm run lifeos:voice-rail:capability-proof',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/tts/status', requireKey, (_req, res) => {
    res.json({ ok: true, ...voiceRailTtsStatus() });
  });

  router.get('/stt/status', requireKey, (_req, res) => {
    res.json({ ok: true, ...voiceRailSttStatus() });
  });

  router.post('/stt', requireKey, sttUpload.single('audio'), async (req, res, next) => {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ ok: false, error: 'audio_required' });
      }
      const context = String(req.body?.context || '').trim();
      const result = await transcribeVoiceRailAudio(
        req.file.buffer,
        req.file.mimetype || 'audio/webm',
        { context, filename: req.file.originalname || 'voice-rail.webm' },
      );
      if (!result.ok) {
        return res.status(503).json({ ok: false, error: result.error, detail: result.detail });
      }
      return res.json({
        ok: true,
        text: result.text,
        engine: 'openai-whisper',
        raw_text: result.raw_text || undefined,
        skipped: result.skipped || undefined,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/tts', requireKey, async (req, res, next) => {
    try {
      const text = String(req.body.text || '').trim();
      if (!text) return res.status(400).json({ ok: false, error: 'text_required' });
      const result = await synthesizeVoiceRailSpeech(text, {
        department: req.body.department || null,
        voiceKey: req.body.voice_key || null,
        logger,
      });
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

  router.post('/describe-attachments', requireKey, async (req, res, next) => {
    try {
      const attachments = normalizeVoiceRailAttachments(req.body.attachments);
      if (!attachments.length) {
        return res.status(400).json({ ok: false, error: 'attachments_required' });
      }
      const result = await describeVoiceRailImages(attachments, { logger });
      res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  function resolveRequestCommandKey(req) {
    return (
      req.headers['x-command-key']
      || req.headers['x-command-center-key']
      || req.headers['x-lifeos-key']
      || req.headers['x-api-key']
      || null
    );
  }

  function resolveRequestBaseUrl(req) {
    const envBase = String(process.env.PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '').replace(/\/$/, '');
    if (envBase) return envBase;
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
    return host ? `${proto}://${host}`.replace(/\/$/, '') : null;
  }

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
        councilMemberKeys: Array.isArray(req.body.council_members) ? req.body.council_members : null,
        text: req.body.text,
        attachments: req.body.attachments,
        private: Boolean(req.body.private),
        simulateOnly: Boolean(req.body.simulate_only),
        continuous: req.body.continuous !== false,
        commandKey: resolveRequestCommandKey(req),
        baseUrl: resolveRequestBaseUrl(req),
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
