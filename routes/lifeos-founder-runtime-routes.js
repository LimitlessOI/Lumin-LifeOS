/**
 * SYNOPSIS: Minimal founder-builder routes required by the canonical /lifeos shell.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import express from 'express';
import { suggestStack } from '../services/lifeos-context-router.js';
import { createLuminContextLoader } from '../services/lumin-context-loader.js';
import { createLuminConversationLearner } from '../services/lumin-conversation-learner.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

const FOUNDER_RUNTIME_TIMEOUT_MS = Number(process.env.LIFEOS_FOUNDER_RUNTIME_TIMEOUT_MS || '3500');

function clampLimit(value, fallback = 20, max = 50) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

async function withTimeout(work, ms, label) {
  let timer = null;
  try {
    return await Promise.race([
      Promise.resolve().then(work),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
      const limit = clampLimit(req.query?.limit, 20, 50);
      const userId = await withTimeout(
        () => resolveUserId(user),
        FOUNDER_RUNTIME_TIMEOUT_MS,
        'LUMIN_MOMENTS_RESOLVE_TIMEOUT'
      );
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const moments = await withTimeout(
        () => luminContext.loadRecentMoments(userId, limit),
        FOUNDER_RUNTIME_TIMEOUT_MS,
        'LUMIN_MOMENTS_LOAD_TIMEOUT'
      );
      res.json({ ok: true, moments, count: moments.length });
    } catch (err) {
      if (String(err?.message || '').includes('TIMEOUT')) {
        return res.status(200).json({
          ok: true,
          moments: [],
          count: 0,
          degraded: true,
          degraded_reason: err.message,
        });
      }
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/lumin/moments', requireKey, async (req, res) => {
    try {
      const { user = 'adam', clip_type = 'lesson', title, body, tags = [] } = req.body || {};
      const userId = await withTimeout(
        () => resolveUserId(String(user).trim() || 'adam'),
        FOUNDER_RUNTIME_TIMEOUT_MS,
        'LUMIN_MOMENT_RESOLVE_TIMEOUT'
      );
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      if (!String(title || body || '').trim()) {
        return res.status(400).json({ ok: false, error: 'title or body required' });
      }
      const clip = await withTimeout(
        () => luminLearner.saveMoment({
          userId,
          clipType: clip_type,
          title: String(title || body).trim().slice(0, 200),
          body: String(body || title).trim(),
          source: req.body?.source || 'manual',
          sourceRef: req.body?.source_ref || null,
          tags: Array.isArray(tags) ? tags : ['saved'],
        }),
        FOUNDER_RUNTIME_TIMEOUT_MS,
        'LUMIN_MOMENT_SAVE_TIMEOUT'
      );
      res.status(201).json({ ok: true, clip });
    } catch (err) {
      if (String(err?.message || '').includes('TIMEOUT')) {
        return res.status(202).json({
          ok: false,
          degraded: true,
          degraded_reason: err.message,
          error: 'Moment save timed out before confirmation',
        });
      }
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
