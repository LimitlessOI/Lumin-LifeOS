/**
 * SYNOPSIS: Listening Profile routes — preferences, Lumen onboarding, privacy matrix.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import express from 'express';
import { createLifeOSListeningProfile } from '../services/lifeos-listening-profile.js';
import { createLifeOSLumin } from '../services/lifeos-lumin.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { createRequireLifeOSUserOrKey } from '../middleware/lifeos-auth-middleware.js';

export function createLifeOSListeningRoutes({ pool, requireKey, callAI, logger }) {
  const router = express.Router();
  const listening = createLifeOSListeningProfile({ pool, callAI, logger });
  const lumin = createLifeOSLumin({ pool, callAI, logger });
  const resolveUserId = makeLifeOSUserResolver(pool);
  const requireAuth = createRequireLifeOSUserOrKey(requireKey);

  async function resolveRequestUserId(req) {
    const sub = req.lifeosUser?.sub;
    if (sub && sub !== 'emergency-key' && /^\d+$/.test(String(sub))) {
      return parseInt(sub, 10);
    }
    const handle = req.lifeosUser?.handle || req.query?.user || req.body?.user || 'adam';
    return resolveUserId(handle);
  }

  router.get('/profile', requireAuth, async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const data = await listening.getProfile(userId);
      res.json({
        ok: true,
        ...data,
        privacy_matrix: listening.getPrivacyMatrix(),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.put('/profile', requireAuth, async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const saved = await listening.saveProfile(userId, {
        profile: req.body?.profile,
        master_enabled: req.body?.master_enabled,
        onboarding_done: req.body?.onboarding_done,
        onboarding_step: req.body?.onboarding_step,
      });
      res.json({ ok: true, ...saved });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/privacy-matrix', requireAuth, async (_req, res) => {
    res.json({ ok: true, modes: listening.getPrivacyMatrix() });
  });

  router.post('/onboarding/message', requireAuth, async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const message = String(req.body?.message || '').trim();
      if (!message) return res.status(400).json({ ok: false, error: 'message is required' });
      const result = await listening.onboardingChat(userId, message, {
        threadId: req.body?.thread_id ? parseInt(req.body.thread_id, 10) : null,
        luminChat: {
          getThread: (id, uid) => lumin.getThread(id, uid),
          createThread: (uid, opts) => lumin.createThread(uid, opts),
          chatWithSystemOverride: (tid, uid, msg, opts) =>
            lumin.chatWithSystemOverride(tid, uid, msg, opts),
        },
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/onboarding/apply', requireAuth, async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const patch = req.body?.profile || req.body?.patch;
      if (!patch || typeof patch !== 'object') {
        return res.status(400).json({ ok: false, error: 'profile patch object required' });
      }
      const master = patch.master_enabled !== undefined
        ? Boolean(patch.master_enabled)
        : patch.mode && patch.mode !== 'off';
      const saved = await listening.saveProfile(userId, {
        profile: patch,
        master_enabled: master,
        onboarding_done: req.body?.onboarding_done !== false,
        onboarding_step: 'applied',
      });
      res.json({ ok: true, applied: true, ...saved });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
