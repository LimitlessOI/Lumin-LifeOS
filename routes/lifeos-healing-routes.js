/**
 * routes/lifeos-healing-routes.js
 *
 * LifeOS Memory & Healing API
 * Mounted at /api/v1/lifeos/healing
 *
 * Sessions:
 *   POST /sessions                   — start session (types: grief|regression|memory_walk|completion|inner_child|memorial)
 *   GET  /sessions                   — all sessions for user (?type=grief)
 *   GET  /sessions/:id               — single session with full conversation
 *   POST /sessions/:id/message       — send message, get AI response
 *   POST /sessions/:id/complete      — complete + extract insights
 *
 * Completion conversations:
 *   POST /completion                 — create completion conversation
 *   POST /completion/:id/reply       — add user reply + mark complete
 *
 * Artifacts:
 *   POST /artifacts                  — store artifact metadata
 *   GET  /artifacts                  — list artifacts (?session=id)
 *
 * Memory palace:
 *   POST /memories                   — add a memory
 *   GET  /memories                   — get memory palace
 *
 * Healing videos:
 *   POST /videos                     — queue a healing video
 *   GET  /videos                     — list healing videos (?session=id)
 *
 * Erasure:
 *   DELETE /erase                    — delete all healing data for user
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { Router } from 'express';
import { createMemoryHealing } from '../services/memory-healing.js';
import { createVideoProduction } from '../services/video-production.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSHealingRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = Router();
  const resolveUserId = makeLifeOSUserResolver(pool);

  async function resolveUser(req) {
    const raw = req.query.user ?? req.body?.user ?? req.body?.userId ?? null;
    return resolveUserId(raw || 'adam');
  }

  const callAI = (prompt, opts = {}) =>
    callCouncilMember(opts.model || 'claude', prompt, opts.systemPrompt || '', opts);

  const videoProduction = createVideoProduction({ pool, callAI, logger });
  const healing = createMemoryHealing({ pool, callAI, videoProduction, logger });

  // ── Sessions ──────────────────────────────────────────────────────────────

  router.post('/sessions', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    const { sessionType, title, subject, personName, consent } = req.body;
    if (!userId) return res.status(400).json({ error: 'user required' });
    if (!sessionType) return res.status(400).json({ error: 'sessionType required (grief|regression|memory_walk|completion|inner_child|memorial)' });

    try {
      const result = await healing.startSession({ userId, sessionType, title, subject, personName, consent: !!consent });
      if (result.requiresConsent) {
        return res.status(200).json({
          requiresConsent: true,
          framing: result.framing,
          message: 'Please read the note above and resubmit with consent: true to begin.',
        });
      }
      res.status(201).json(result);
    } catch (err) {
      logger?.error({ err }, '[healing] start session failed');
      res.status(err.message.includes('Unknown') ? 400 : 500).json({ error: err.message });
    }
  });

  router.get('/sessions', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    const sessionType = req.query.type ?? null;
    try {
      const sessions = await healing.getSessions({ userId, sessionType });
      res.json({ sessions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/sessions/:id', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    const sessionId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const session = await healing.getSession({ sessionId, userId });
      res.json({ session });
    } catch (err) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
  });

  router.post('/sessions/:id/message', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    const sessionId = parseInt(req.params.id, 10);
    const { message } = req.body;
    if (!userId || !message) return res.status(400).json({ error: 'user and message required' });
    try {
      const result = await healing.sendMessage({ sessionId, userId, message });
      res.json(result);
    } catch (err) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
  });

  router.post('/sessions/:id/complete', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    const sessionId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const result = await healing.completeSession({ sessionId, userId });
      res.json(result);
    } catch (err) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
  });

  // ── Completion conversations ──────────────────────────────────────────────

  router.post('/completion', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    const { personName, relationship, whatHappened, unsaidThings, sessionId } = req.body;
    if (!userId || !personName || !unsaidThings) {
      return res.status(400).json({ error: 'user, personName, and unsaidThings required' });
    }
    try {
      const conversation = await healing.createCompletionConversation({
        userId, personName, relationship, whatHappened, unsaidThings,
        sessionId: sessionId ? parseInt(sessionId, 10) : undefined,
      });
      res.status(201).json({ conversation });
    } catch (err) {
      logger?.error({ err }, '[healing] completion conversation failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/completion/:id/reply', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    const conversationId = parseInt(req.params.id, 10);
    const { reply, feltComplete } = req.body;
    if (!userId || !reply) return res.status(400).json({ error: 'user and reply required' });
    try {
      const conversation = await healing.replyToCompletion({ conversationId, userId, reply, feltComplete });
      res.json({ conversation });
    } catch (err) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
  });

  // ── Artifacts ─────────────────────────────────────────────────────────────

  router.post('/artifacts', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    const { sessionId, artifactType, subject, description, url } = req.body;
    if (!userId || !artifactType) return res.status(400).json({ error: 'user and artifactType required' });
    try {
      const artifact = await healing.addArtifact({
        userId,
        sessionId: sessionId ? parseInt(sessionId, 10) : undefined,
        artifactType, subject, description, url,
      });
      res.status(201).json({ artifact });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/artifacts', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    const sessionId = req.query.session ? parseInt(req.query.session, 10) : null;
    try {
      const artifacts = await healing.getArtifacts({ userId, sessionId });
      res.json({ artifacts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Memory palace ─────────────────────────────────────────────────────────

  router.post('/memories', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    const { memoryTitle, place, approximateAge, memoryText, sensoryDetails, emotion, significance } = req.body;
    if (!userId || !memoryTitle) return res.status(400).json({ error: 'user and memoryTitle required' });
    try {
      const memory = await healing.addMemory({ userId, memoryTitle, place, approximateAge, memoryText, sensoryDetails, emotion, significance });
      res.status(201).json({ memory });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/memories', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const memories = await healing.getMemoryPalace(userId);
      res.json({ memories });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Healing videos ────────────────────────────────────────────────────────

  router.post('/videos', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    const { sessionId, videoType, subject, additionalContext, artifactIds } = req.body;
    if (!userId || !videoType) return res.status(400).json({ error: 'user and videoType required (memorial|memory_reconstruction|inner_child|regression)' });

    let artifacts = [];
    if (artifactIds?.length) {
      try {
        const { rows } = await pool.query(
          `SELECT * FROM healing_artifacts WHERE id = ANY($1) AND user_id = $2`,
          [artifactIds, userId]
        );
        artifacts = rows;
      } catch { /* non-fatal */ }
    }

    try {
      const result = await healing.queueHealingVideo({
        userId,
        sessionId: sessionId ? parseInt(sessionId, 10) : undefined,
        videoType, subject, artifacts, additionalContext: additionalContext ?? '',
      });
      res.status(201).json(result);
    } catch (err) {
      logger?.error({ err }, '[healing] queue video failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/videos', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    const sessionId = req.query.session ? parseInt(req.query.session, 10) : null;
    try {
      const videos = await healing.getHealingVideos({ userId, sessionId });
      res.json({ videos });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Data erasure ──────────────────────────────────────────────────────────

  router.delete('/erase', requireKey, async (req, res) => {
    const userId = await resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const result = await healing.eraseAllHealingData(userId);
      res.json(result);
    } catch (err) {
      logger?.error({ err }, '[healing] erase failed');
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
