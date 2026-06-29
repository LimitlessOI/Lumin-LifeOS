/**
 * SYNOPSIS: Capture Pipeline v2 API — Voice Rail → Action Inbox bridge status.
 * Capture Pipeline v2 API — Voice Rail → Action Inbox bridge status.
 * Mount at: /api/v1/lifeos/capture-pipeline
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * HISTORY_SNAPSHOT — not runtime authority; mission-era snapshot.
 */
import express from 'express';
import { createLifeOSCapturePipeline } from '../services/lifeos-capture-pipeline.js';

export function createCapturePipelineRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const pipeline = createLifeOSCapturePipeline({ pool, logger });

  router.get('/health', requireKey, (_req, res) => {
    res.json({
      ok: true,
      service: 'capture-pipeline-v2',
      version: '2.0',
      wiring: {
        voice_rail_hook: 'POST /api/v1/lifeos/voice-rail/message',
        inbox_api: '/api/v1/lifeos/action-inbox',
        source_tag: 'voice_rail',
      },
      rules: {
        private_mode: 'never staged',
        simulate_only: 'never staged',
        bp_build_request: 'staged-only in inbox — never auto-routed',
      },
    });
  });

  router.get('/stats', requireKey, async (req, res, next) => {
    try {
      const user = req.query.user || 'adam';
      const userId = await pipeline.inbox.resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const voiceRailCount = await pipeline.countVoiceRailStaged(userId);
      const staged = await pipeline.inbox.listItems(userId, { status: 'staged', limit: 100 });
      res.json({
        ok: true,
        user,
        voice_rail_staged_total: voiceRailCount,
        staged_count: staged.length,
        staged_voice_rail: staged.filter((i) => i.source === 'voice_rail').length,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/stage', requireKey, async (req, res, next) => {
    try {
      const { user, text, mode, session_id, voice_intent, private: isPrivate, simulate_only } = req.body;
      if (!user) return res.status(400).json({ ok: false, error: 'user_required' });
      if (!text) return res.status(400).json({ ok: false, error: 'text_required' });
      const userId = await pipeline.inbox.resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const inbox_staging = await pipeline.stageFromVoiceSubmit({
        userId,
        text,
        mode: mode || 'conversation',
        sessionId: session_id || null,
        voiceIntent: voice_intent || null,
        private: Boolean(isPrivate),
        simulateOnly: Boolean(simulate_only),
      });
      res.json({ ok: true, inbox_staging });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
