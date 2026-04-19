/**
 * routes/lifeos-chat-routes.js
 *
 * Lumin — LifeOS conversational AI routes
 * Mounted at /api/v1/lifeos/chat
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createLifeOSLumin } from '../services/lifeos-lumin.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSChatRoutes({ pool, requireKey, callAI, logger }) {
  const router = express.Router();
  const lumin  = createLifeOSLumin({ pool, callAI, logger });
  const resolveUserId = makeLifeOSUserResolver(pool);

  // ── GET /threads ─────────────────────────────────────────────────────────────
  router.get('/threads', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const threads = await lumin.listThreads(userId, {
        includeArchived: req.query.archived === 'true',
        limit: parseInt(req.query.limit || '20', 10),
      });
      res.json({ ok: true, threads });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /threads — create a new thread ──────────────────────────────────────
  router.post('/threads', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const thread = await lumin.createThread(userId, {
        mode: req.body.mode || 'general',
        title: req.body.title || null,
      });
      res.status(201).json({ ok: true, thread });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /threads/default — get or create the general thread ─────────────────
  router.get('/threads/default', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const thread = await lumin.getOrCreateDefaultThread(userId);
      res.json({ ok: true, thread });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── PATCH /threads/:id ───────────────────────────────────────────────────────
  router.patch('/threads/:id', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const thread = await lumin.updateThread(parseInt(req.params.id, 10), userId, req.body);
      res.json({ ok: true, thread });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /threads/:id/messages ────────────────────────────────────────────────
  router.get('/threads/:id/messages', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const messages = await lumin.getMessages(parseInt(req.params.id, 10), {
        limit: parseInt(req.query.limit || '50', 10),
        before: req.query.before ? parseInt(req.query.before, 10) : null,
      });
      res.json({ ok: true, messages });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /threads/:id/messages — send a message, get Lumin's reply ───────────
  router.post('/threads/:id/messages', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { message, content_type } = req.body;
      if (!message?.trim()) return res.status(400).json({ ok: false, error: 'message required' });
      const result = await lumin.chat(
        parseInt(req.params.id, 10),
        userId,
        message.trim(),
        { contentType: content_type || 'text' }
      );
      res.json({ ok: true, ...result });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── GET /threads/:id/pinned ──────────────────────────────────────────────────
  router.get('/threads/:id/pinned', requireKey, async (req, res) => {
    try {
      const messages = await lumin.getPinnedMessages(parseInt(req.params.id, 10));
      res.json({ ok: true, messages });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── PATCH /messages/:id/pin ──────────────────────────────────────────────────
  router.patch('/messages/:id/pin', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const msg = await lumin.pinMessage(
        parseInt(req.params.id, 10),
        userId,
        req.body.pinned !== false
      );
      res.json({ ok: true, message: msg });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── PATCH /messages/:id/react ────────────────────────────────────────────────
  router.patch('/messages/:id/react', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const msg = await lumin.reactToMessage(
        parseInt(req.params.id, 10),
        userId,
        req.body.reaction || null
      );
      res.json({ ok: true, message: msg });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── GET /search?q= ───────────────────────────────────────────────────────────
  router.get('/search', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      if (!req.query.q?.trim()) return res.status(400).json({ ok: false, error: 'q required' });
      const results = await lumin.searchMessages(userId, req.query.q.trim(), {
        limit: parseInt(req.query.limit || '20', 10),
      });
      res.json({ ok: true, results });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
