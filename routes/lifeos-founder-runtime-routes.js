/**
 * SYNOPSIS: Minimal founder-builder routes required by the canonical /lifeos shell.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import express from 'express';
import { suggestStack } from '../services/lifeos-context-router.js';
import { createLuminContextLoader } from '../services/lumin-context-loader.js';
import { createLuminConversationLearner } from '../services/lumin-conversation-learner.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

function clampLimit(value, fallback = 20, max = 50) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function createLifeOSFounderRuntimeRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();
  const log = logger || console;
  const resolveUserId = makeLifeOSUserResolver(pool);
  const luminContext = createLuminContextLoader({ pool, callAI: callCouncilMember, logger: log });
  const luminLearner = createLuminConversationLearner({ pool, callAI: callCouncilMember, logger: log });

  router.get('/status', requireKey, async (_req, res) => {
    try {
      res.json({
        ok: true,
        api: 'lifeos-founder-builder',
        runtime_profile: 'founder_builder',
        direct_system: true,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/context/suggest', requireKey, (req, res) => {
    res.json({
      ok: true,
      ...suggestStack({
        text: req.query?.q || req.query?.text || '',
        explicitStack: req.query?.stack || null,
        page: req.query?.page || null,
      }),
    });
  });

  router.get('/lumin/moments', requireKey, async (req, res) => {
    try {
      const user = String(req.query?.user || 'adam').trim() || 'adam';
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const moments = await luminContext.loadRecentMoments(userId, clampLimit(req.query?.limit, 20, 50));
      res.json({ ok: true, moments, count: moments.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/lumin/moments', requireKey, async (req, res) => {
    try {
      const { user = 'adam', clip_type = 'lesson', title, body, tags = [] } = req.body || {};
      const userId = await resolveUserId(String(user).trim() || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      if (!String(title || body || '').trim()) {
        return res.status(400).json({ ok: false, error: 'title or body required' });
      }
      const clip = await luminLearner.saveMoment({
        userId,
        clipType: clip_type,
        title: String(title || body).trim().slice(0, 200),
        body: String(body || title).trim(),
        source: req.body?.source || 'manual',
        sourceRef: req.body?.source_ref || null,
        tags: Array.isArray(tags) ? tags : ['saved'],
      });
      res.status(201).json({ ok: true, clip });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
