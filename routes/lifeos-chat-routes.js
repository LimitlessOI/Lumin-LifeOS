/**
 * routes/lifeos-chat-routes.js
 *
 * Lumin — LifeOS conversational AI routes
 * Mounted at /api/v1/lifeos/chat
 *
 * Build bridge (same mount): GET /build/health, GET /build/ops (no council/AI; DB aggregates only), POST /build/plan, POST /build/draft,
 * POST /build/pending-adam, GET /build/jobs, GET /build/jobs/:id — plan/draft/queue are council-backed;
 * governance via `pending_adam` / verify scripts.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createLifeOSLumin } from '../services/lifeos-lumin.js';
import { createLifeOSLuminBuild } from '../services/lifeos-lumin-build.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSChatRoutes({ pool, requireKey, callAI, callCouncilMember, logger }) {
  const router = express.Router();
  const lumin  = createLifeOSLumin({ pool, callAI, logger });
  const resolveUserId = makeLifeOSUserResolver(pool);
  const luminBuild =
    pool && callCouncilMember
      ? createLifeOSLuminBuild({ pool, callCouncilMember, logger })
      : null;
  const buildHealthDiagnosis = (code) => {
    if (!code) return null;
    if (code === '28P01') return 'database_auth_failed: runtime DATABASE_URL credentials rejected';
    if (code === '42P01') return 'missing_table: run migrations to create lumin_programming_jobs';
    if (code === 'ECONNREFUSED') return 'database_unreachable: cannot connect to database host';
    return 'unknown';
  };

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

  // ── POST /threads/:id/messages/stream — SSE streaming reply ─────────────────
  // Sends the AI response as a stream of word tokens so the client can render
  // progressively. Falls back to chunking a completed response if streaming
  // isn't natively supported by the council provider.
  //
  // SSE events:
  //   data: {"token":"word "}      — one or more words
  //   data: {"done":true,"user_message":{...},"reply":{...}}   — final
  //   data: {"error":"..."}        — on failure
  router.post('/threads/:id/messages/stream', requireKey, async (req, res) => {
    const userId = await resolveUserId(req.body?.user || 'adam').catch(() => null);
    if (!userId) { res.status(404).json({ ok: false, error: 'User not found' }); return; }
    const message = (req.body?.message || '').trim();
    if (!message) { res.status(400).json({ ok: false, error: 'message required' }); return; }

    // Set SSE headers immediately so the browser starts receiving events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (obj) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    try {
      const result = await lumin.chat(
        parseInt(req.params.id, 10),
        userId,
        message,
        { contentType: req.body?.content_type || 'text' },
      );

      // Chunk the completed response into word-level tokens for progressive display
      const text = result?.reply?.content || '';
      const CHUNK = 3; // words per token event
      const words = text.split(/(\s+)/);
      let buf = '';
      for (let i = 0; i < words.length; i++) {
        buf += words[i];
        if ((i + 1) % CHUNK === 0 || i === words.length - 1) {
          send({ token: buf });
          buf = '';
          // ~30ms between chunks → natural reading pace without lag
          await new Promise(r => setTimeout(r, 30));
        }
      }

      send({ done: true, user_message: result.user_message, reply: result.reply });
    } catch (err) {
      send({ error: err.message });
    } finally {
      res.end();
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

  // ── Lumin programming bridge (plan / draft / pending_adam) ───────────────────

  router.get('/build/health', requireKey, async (req, res) => {
    const build = {
      hasPool: Boolean(pool),
      hasCallCouncilMember: typeof callCouncilMember === 'function',
      luminBuildReady: Boolean(luminBuild),
    };
    if (pool) {
      try {
        await pool.query('SELECT 1 FROM lumin_programming_jobs LIMIT 0');
        build.lumin_programming_jobs_reachable = true;
      } catch (err) {
        build.lumin_programming_jobs_reachable = false;
        build.lumin_programming_jobs_error = err.code || err.message;
        build.lumin_programming_jobs_diagnosis = buildHealthDiagnosis(err.code || err.message);
      }
    } else {
      build.lumin_programming_jobs_reachable = false;
      build.lumin_programming_jobs_diagnosis = 'missing_pool: database pool not configured';
    }
    res.json({ ok: true, build });
  });

  router.get('/build/ops', requireKey, async (req, res) => {
    if (!luminBuild) {
      return res.status(503).json({ ok: false, error: 'Lumin build service not configured' });
    }
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const hours = parseInt(String(req.query.hours || '24'), 10);
      const ops = await luminBuild.getBuildOps(userId, { hours });
      res.json({ ok: true, ...ops });
    } catch (err) {
      const status = err.code === '42P01' || err.code === '28P01' ? 503 : 500;
      res.status(status).json({ ok: false, error: err.message, code: err.code });
    }
  });

  router.post('/build/plan', requireKey, async (req, res) => {
    if (!luminBuild) {
      return res.status(503).json({ ok: false, error: 'Lumin build service not configured' });
    }
    try {
      const userId = await resolveUserId(req.body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { goal, domain = null, project_slug = null, thread_id = null } = req.body || {};
      const tid = thread_id != null ? parseInt(String(thread_id), 10) : null;
      const out = await luminBuild.planGoal({
        userId,
        threadId: Number.isFinite(tid) ? tid : null,
        goal,
        domain,
        project_slug,
      });
      res.json({ ok: true, ...out });
    } catch (err) {
      const status = err.status || (err.code === '42P01' ? 503 : 500);
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  router.post('/build/draft', requireKey, async (req, res) => {
    if (!luminBuild) {
      return res.status(503).json({ ok: false, error: 'Lumin build service not configured' });
    }
    try {
      const userId = await resolveUserId(req.body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const {
        goal,
        domain = null,
        spec = null,
        files = null,
        project_slug = null,
        thread_id = null,
      } = req.body || {};
      const tid = thread_id != null ? parseInt(String(thread_id), 10) : null;
      const out = await luminBuild.draftGoal({
        userId,
        threadId: Number.isFinite(tid) ? tid : null,
        goal,
        domain,
        spec,
        files: Array.isArray(files) ? files : null,
        project_slug,
      });
      res.json({ ok: true, ...out });
    } catch (err) {
      const status = err.status || (err.code === '42P01' ? 503 : 500);
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  router.post('/build/pending-adam', requireKey, async (req, res) => {
    if (!luminBuild) {
      return res.status(503).json({ ok: false, error: 'Lumin build service not configured' });
    }
    try {
      const userId = await resolveUserId(req.body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const {
        title,
        description = null,
        project_slug = null,
        type = 'approval',
        priority = 'normal',
        thread_id = null,
        job_id = null,
      } = req.body || {};
      const tid = thread_id != null ? parseInt(String(thread_id), 10) : null;
      const jid = job_id != null ? parseInt(String(job_id), 10) : null;
      const out = await luminBuild.queuePendingAdam({
        userId,
        threadId: Number.isFinite(tid) ? tid : null,
        project_slug,
        title,
        description,
        type,
        priority,
        jobId: Number.isFinite(jid) ? jid : null,
      });
      res.status(201).json({ ok: true, ...out });
    } catch (err) {
      const status = err.status || (err.code === '42P01' ? 503 : 500);
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  router.get('/build/jobs', requireKey, async (req, res) => {
    if (!luminBuild) {
      return res.status(503).json({ ok: false, error: 'Lumin build service not configured' });
    }
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const jobs = await luminBuild.listJobs(userId, { limit: req.query.limit });
      res.json({ ok: true, jobs });
    } catch (err) {
      const status = err.code === '42P01' ? 503 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  router.get('/build/jobs/:id', requireKey, async (req, res) => {
    if (!luminBuild) {
      return res.status(503).json({ ok: false, error: 'Lumin build service not configured' });
    }
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const jobId = parseInt(req.params.id, 10);
      if (!Number.isFinite(jobId)) return res.status(400).json({ ok: false, error: 'invalid job id' });
      const job = await luminBuild.getJob(jobId, userId);
      if (!job) return res.status(404).json({ ok: false, error: 'Job not found' });
      res.json({ ok: true, job });
    } catch (err) {
      const status = err.code === '42P01' ? 503 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  return router;
}
