/**
 * routes/lifeos-vision-routes.js
 *
 * LifeOS Phase 11 — Future Vision + Video Production API
 * Mounted at /api/v1/lifeos/vision
 *
 * Vision sessions:
 *   POST /sessions                  — start a vision session
 *   GET  /sessions?user=            — all sessions for user
 *   GET  /sessions/:id?user=        — single session (ownership check)
 *   POST /sessions/:id/message      — send message (ownership check)
 *   POST /sessions/:id/complete     — complete session (ownership check)
 *
 * Timelines:
 *   GET  /timeline?user=            — get latest timelines
 *   POST /timeline/generate         — generate compounding timeline
 *
 * Videos:
 *   POST /videos/queue              — queue a video for generation
 *   GET  /videos?user=              — all videos for user
 *   GET  /videos/:id/status         — check Replicate status
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createFutureVision }    from '../services/future-vision.js';
import { createVideoProduction } from '../services/video-production.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSVisionRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();

  // callAI adapter — uses Claude Opus for vision sessions (most emotionally significant)
  const callAI = callCouncilMember
    ? async (system, prompt) => {
        const r = await callCouncilMember('anthropic', prompt, system, { model: 'claude-opus-4-6' });
        return typeof r === 'string' ? r : r?.content || '';
      }
    : null;

  const vision          = createFutureVision({ pool, callAI, logger });
  const videoProduction = createVideoProduction({ pool, callAI, logger });

  // Helper: resolve user_id (shared, case-insensitive)
  const resolveUserId = makeLifeOSUserResolver(pool);


  // ── VISION SESSIONS ─────────────────────────────────────────────────────

  // POST /sessions — start a vision session
  router.post('/sessions', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const { session_type } = req.body;
      const result = await vision.startSession({ userId, sessionType: session_type });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /sessions — all sessions for user
  router.get('/sessions', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const sessions = await vision.getSessions({ userId });
      res.json({ ok: true, count: sessions.length, sessions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /sessions/:id — single session (ownership check)
  router.get('/sessions/:id', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const session = await vision.getSession(parseInt(req.params.id, 10), userId);
      if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

      res.json({ ok: true, session });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /sessions/:id/message — send a message (ownership check)
  router.post('/sessions/:id/message', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const { content } = req.body;
      if (!content?.trim()) {
        return res.status(400).json({ ok: false, error: 'content is required' });
      }

      const result = await vision.sendMessage({
        sessionId: parseInt(req.params.id, 10),
        userId,
        content,
      });

      res.json({ ok: true, ...result });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // POST /sessions/:id/complete — complete session (ownership check)
  router.post('/sessions/:id/complete', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const session = await vision.completeSession({
        sessionId: parseInt(req.params.id, 10),
        userId,
      });

      res.json({ ok: true, session });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── TIMELINES ───────────────────────────────────────────────────────────

  // GET /timeline — latest timelines for user
  router.get('/timeline', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const timelines = await vision.getTimelines({ userId });
      res.json({ ok: true, count: timelines.length, timelines });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /timeline/generate — generate compounding timeline
  router.post('/timeline/generate', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const result = await vision.generateCompoundingTimeline({ userId });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── VIDEOS ──────────────────────────────────────────────────────────────

  // POST /videos/queue — queue a video for generation
  router.post('/videos/queue', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const { vision_session_id, video_type, script } = req.body;

      if (!video_type) {
        return res.status(400).json({ ok: false, error: 'video_type is required' });
      }

      // Build prompt from vision session if available
      let prompt = req.body.prompt || null;
      let generatedScript = script || null;

      if (!prompt) {
        if (video_type === 'future_life' && vision_session_id) {
          const sessionId = parseInt(vision_session_id, 10);
          const session = await vision.getSession(sessionId, userId);
          if (session?.status === 'completed') {
            prompt = await videoProduction.buildFutureLifePrompt({
              userId,
              narrative: session.narrative,
              answers:   session.answers,
            });
            if (!generatedScript) {
              generatedScript = await videoProduction.generateScript({
                userId,
                videoType: video_type,
                narrative: session.narrative,
                answers:   session.answers,
              });
            }
          }
        } else if (video_type === 'compounding_timeline') {
          const timelines = await vision.getTimelines({ userId });
          const current = timelines.find(t => t.projection_type === 'current_trajectory');
          const aligned = timelines.find(t => t.projection_type === 'aligned_trajectory');
          if (current && aligned) {
            prompt = await videoProduction.buildCompoundingPrompt({
              currentTrajectory: current,
              alignedTrajectory: aligned,
              hingeDecisions:    aligned.key_decisions || [],
            });
            if (!generatedScript) {
              generatedScript = await videoProduction.generateScript({
                userId,
                videoType: video_type,
                narrative: null,
                answers:   null,
              });
            }
          }
        } else if (video_type === 'weekly_reflection') {
          // Build week summary from recent data
          const weekSummary = await buildWeekSummary(userId);
          prompt = await videoProduction.buildWeeklyReflectionPrompt({ userId, weekSummary });
          if (!generatedScript) {
            generatedScript = await videoProduction.generateScript({
              userId,
              videoType: video_type,
              narrative: null,
              answers:   null,
            });
          }
        }
      }

      if (!prompt) {
        return res.status(400).json({ ok: false, error: 'Could not build video prompt — provide prompt directly or ensure vision session / timeline data exists' });
      }

      const video = await videoProduction.queueVideo({
        userId,
        visionSessionId: vision_session_id ? parseInt(vision_session_id, 10) : null,
        videoType:       video_type,
        prompt,
        script:          generatedScript,
      });

      res.json({ ok: true, video });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /videos — all videos for user
  router.get('/videos', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const videos = await videoProduction.getVideos({ userId });
      res.json({ ok: true, count: videos.length, videos });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /videos/:id/status — check Replicate status
  router.get('/videos/:id/status', requireKey, async (req, res) => {
    try {
      const video = await videoProduction.checkVideoStatus({
        videoId: parseInt(req.params.id, 10),
      });
      res.json({ ok: true, video });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── Internal: build week summary for weekly_reflection video ───────────
  async function buildWeekSummary(userId) {
    const [commitmentsRes, integrityRes, joyRes] = await Promise.allSettled([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'kept'   AND kept_at   >= NOW() - INTERVAL '7 days') AS kept,
           COUNT(*) FILTER (WHERE status = 'open'   AND due_at    >= NOW() - INTERVAL '7 days') AS total
         FROM commitments
         WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT total_score FROM integrity_score_log
          WHERE user_id = $1
          ORDER BY score_date DESC LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT joy_score FROM joy_score_log
          WHERE user_id = $1
          ORDER BY score_date DESC LIMIT 1`,
        [userId]
      ),
    ]);

    const cRow = commitmentsRes.status === 'fulfilled' ? commitmentsRes.value.rows[0] : {};
    const iRow = integrityRes.status   === 'fulfilled' ? integrityRes.value.rows[0]  : {};
    const jRow = joyRes.status         === 'fulfilled' ? joyRes.value.rows[0]        : {};

    return {
      commitmentsKept:  parseInt(cRow?.kept  || 0),
      commitmentsTotal: parseInt(cRow?.total || 0),
      integrityScore:   iRow?.total_score || null,
      joyScore:         jRow?.joy_score   || null,
      biggestWin:       null,
      biggestChallenge: null,
    };
  }

  return router;
}
