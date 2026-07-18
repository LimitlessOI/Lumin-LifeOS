/**
 * SYNOPSIS: Member feedback intake routes — founder queue only, never builder execute.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { createMemberFeedbackIntake } from '../services/lifeos-member-feedback.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { requireLifeOSAdmin, createRequireLifeOSUserOrKey } from '../middleware/lifeos-auth-middleware.js';

export function createMemberFeedbackRoutes({ pool, requireKey } = {}) {
  const router = express.Router();
  const intake = createMemberFeedbackIntake({ pool });
  const resolveUserId = makeLifeOSUserResolver(pool);
  const auth = createRequireLifeOSUserOrKey(requireKey);

  router.post('/', auth, async (req, res) => {
    try {
      const body = req.body?.feedback ?? req.body?.body ?? req.body?.message;
      const handle = req.body?.user || req.body?.handle || req.lifeosUser?.handle || null;
      const userId = await resolveUserId(handle || req.lifeosUser?.sub || 'adam');
      const result = await intake.submit({
        userId,
        handle,
        category: req.body?.category || 'general',
        body,
        context: req.body?.context || { source: 'member_feedback_api' },
      });
      return res.status(201).json({ ok: true, ...result });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/', auth, requireLifeOSAdmin, async (req, res) => {
    try {
      const result = await intake.listForFounder({
        status: req.query.status || 'queued',
        limit: req.query.limit,
      });
      return res.json({ ok: true, ...result });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.patch('/:id', auth, requireLifeOSAdmin, async (req, res) => {
    try {
      const item = await intake.updateStatus({
        id: req.params.id,
        status: req.body?.status,
        operatorNote: req.body?.operator_note ?? null,
      });
      return res.json({ ok: true, item, builder_execute: false });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export function registerMemberFeedbackRoutes(app, deps = {}) {
  app.use('/api/v1/lifeos/member-feedback', createMemberFeedbackRoutes(deps));
}