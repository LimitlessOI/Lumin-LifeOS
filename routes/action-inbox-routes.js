/**
 * SYNOPSIS: Action Inbox v1 API routes — capture, classify, stage, approve, route, receipt.
 * Action Inbox v1 API routes — capture, classify, stage, approve, route, receipt.
 * Mount at: /api/v1/lifeos/action-inbox
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import express from 'express';
import { createActionInbox } from '../services/action-inbox.js';

export function createActionInboxRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const inbox = createActionInbox({ pool, logger });

  router.get('/health', requireKey, (_req, res) => {
    res.json({
      ok: true,
      service: 'action-inbox-v1',
      classification_types: inbox.CLASSIFICATION_TYPES,
      status_machine: inbox.STATUS_MACHINE,
      rules: {
        bp_build_request: 'staged-only — never auto-routed to BuilderOS',
        private_no_save: 'zero DB writes — local response only',
        status_transitions: 'forward-only: staged → approved → routed → done',
      },
    });
  });

  router.post('/capture', requireKey, async (req, res, next) => {
    try {
      const { user, session_id, source, text, metadata, mode } = req.body;
      if (!user) return res.status(400).json({ ok: false, error: 'user_required' });
      if (!text) return res.status(400).json({ ok: false, error: 'text_required' });

      const userId = await inbox.resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });

      const item = await inbox.captureItem({
        userId,
        sessionId: session_id || null,
        source: source || 'api',
        rawText: text,
        metadata: metadata || {},
        mode: mode || 'conversation',
      });

      res.json({ ok: true, item });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/items', requireKey, async (req, res, next) => {
    try {
      const { user, status, limit } = req.query;
      if (!user) return res.status(400).json({ ok: false, error: 'user_required' });
      const userId = await inbox.resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const items = await inbox.listItems(userId, { status, limit });
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      next(err);
    }
  });

  router.get('/items/:id', requireKey, async (req, res, next) => {
    try {
      const { user } = req.query;
      if (!user) return res.status(400).json({ ok: false, error: 'user_required' });
      const userId = await inbox.resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const item = await inbox.getItem(req.params.id, userId);
      res.json({ ok: true, item });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.post('/items/:id/approve', requireKey, async (req, res, next) => {
    try {
      const item = await inbox.approveItem(req.params.id);
      res.json({ ok: true, item });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message, detail: err.detail });
      next(err);
    }
  });

  router.post('/items/:id/route', requireKey, async (req, res, next) => {
    try {
      const { department } = req.body;
      const result = await inbox.routeItem(req.params.id, { department });
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message, detail: err.detail });
      next(err);
    }
  });

  router.post('/items/:id/done', requireKey, async (req, res, next) => {
    try {
      const item = await inbox.markDone(req.params.id);
      res.json({ ok: true, item });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.post('/items/:id/failed', requireKey, async (req, res, next) => {
    try {
      const { reason } = req.body;
      const result = await inbox.markFailed(req.params.id, { reason });
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/receipts', requireKey, async (req, res, next) => {
    try {
      const { user, limit } = req.query;
      if (!user) return res.status(400).json({ ok: false, error: 'user_required' });
      const userId = await inbox.resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'user_not_found' });
      const receipts = await inbox.listReceipts(userId, { limit });
      res.json({ ok: true, receipts, count: receipts.length });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
