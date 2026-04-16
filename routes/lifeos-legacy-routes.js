/**
 * routes/lifeos-legacy-routes.js
 *
 * LifeOS Phase 15 — Legacy, Community & Meta API
 * Mounted at /api/v1/lifeos/legacy
 *
 * Health Extensions (Ideas 16–17):
 *   POST /food-analysis              — Food as Medicine (analyze 90-day biometrics)
 *   GET  /food-insights              — Stored food insights
 *   POST /pre-disease-check          — Pre-disease pattern warning
 *   GET  /health-warnings            — Outstanding health warnings
 *
 * Purpose & Legacy (Ideas 18–20):
 *   POST /monetization-map           — Generate monetization paths from purpose profile
 *   GET  /monetization-paths         — Stored monetization paths
 *   POST /legacy-projects            — Create a legacy project
 *   GET  /legacy-projects            — List active legacy projects
 *   POST /legacy-projects/:id/milestone — Add/update a milestone
 *   POST /death-meditation           — Get prompts (no body) or submit reflection
 *   GET  /death-meditation           — Past sessions
 *
 * Community (Ideas 21–23):
 *   POST /flourishing/consent        — Opt in to anonymised data contribution
 *   GET  /flourishing/insights       — Anonymised aggregate insights
 *   POST /group-rooms                — Create a group coaching room
 *   POST /group-rooms/join           — Join a room by code
 *   GET  /group-rooms/:id            — Get a room (membership required)
 *   POST /group-rooms/check-in       — Facilitate group weekly check-in
 *   POST /partnerships               — Create accountability partnership
 *   POST /partnerships/:id/check-in  — Submit partner check-in
 *
 * Life Review & Mentor (Ideas 24–25):
 *   POST /life-review                — Start a quarterly life review
 *   POST /life-review/:id/answer     — Submit answer to current question
 *   GET  /life-review                — Past reviews
 *   POST /sovereign-mentor           — Run sovereign mentor session
 *   GET  /sovereign-mentor           — Past mentor sessions
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { Router } from 'express';
import { createHealthExtensions } from '../services/health-extensions.js';
import { createCommunityGrowth } from '../services/community-growth.js';

function resolveUser(req) {
  return req.query.user ?? req.body?.user ?? req.body?.userId ?? null;
}

export function createLifeOSLegacyRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = Router();

  const callAI = (prompt, opts = {}) =>
    callCouncilMember(opts.model || 'claude', prompt, opts.systemPrompt || '', opts);

  const health    = createHealthExtensions({ pool, callAI, logger });
  const community = createCommunityGrowth({ pool, callAI, logger });

  // ── HEALTH EXTENSIONS ────────────────────────────────────────────────────

  router.post('/food-analysis', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const insights = await health.analyzeFoodPatterns(userId);
      res.json({ insights });
    } catch (err) {
      logger?.error({ err }, '[legacy] food-analysis failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/food-insights', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const { rows } = await pool.query(
        'SELECT * FROM food_insights WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      res.json({ insights: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/pre-disease-check', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const result = await health.runPreDiseaseCheck(userId);
      res.json(result);
    } catch (err) {
      logger?.error({ err }, '[legacy] pre-disease-check failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/health-warnings', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const warnings = await health.getHealthWarnings(userId);
      res.json({ warnings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── PURPOSE & LEGACY ─────────────────────────────────────────────────────

  router.post('/monetization-map', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const paths = await health.mapMonetizationPaths(userId);
      res.json({ paths });
    } catch (err) {
      logger?.error({ err }, '[legacy] monetization-map failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/monetization-paths', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const paths = await health.getMonetizationPaths(userId);
      res.json({ paths });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/legacy-projects', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    const { title, description, whyItMatters, impactVision } = req.body;
    if (!userId || !title) return res.status(400).json({ error: 'user and title required' });
    try {
      const project = await health.createLegacyProject({ userId, title, description, whyItMatters, impactVision });
      res.status(201).json({ project });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/legacy-projects', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const projects = await health.getLegacyProjects(userId);
      res.json({ projects });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/legacy-projects/:id/milestone', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    const projectId = parseInt(req.params.id, 10);
    const { milestone, completed } = req.body;
    if (!userId || !milestone) return res.status(400).json({ error: 'user and milestone required' });
    try {
      const project = await health.updateLegacyMilestone({ projectId, userId, milestone, completed: !!completed });
      res.json({ project });
    } catch (err) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
  });

  router.post('/death-meditation', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    const { reflection } = req.body;
    try {
      const result = await health.runDeathMeditation({ userId, reflection });
      res.json(result);
    } catch (err) {
      logger?.error({ err }, '[legacy] death-meditation failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/death-meditation', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const sessions = await health.getDeathMeditationSessions(userId);
      res.json({ sessions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── COMMUNITY ────────────────────────────────────────────────────────────

  router.post('/flourishing/consent', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const record = await community.grantFlourishingConsent(userId);
      res.json({ record });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/flourishing/insights', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const result = await community.getFlourishingInsights({ userId });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/group-rooms', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    const { name, memberLabels } = req.body;
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const room = await community.createGroupRoom({ createdByUserId: userId, name, memberLabels });
      res.status(201).json({ room });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/group-rooms/join', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    const { roomCode, label } = req.body;
    if (!userId || !roomCode) return res.status(400).json({ error: 'user and roomCode required' });
    try {
      const room = await community.joinGroup({ roomCode, userId, label });
      res.json({ room });
    } catch (err) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
  });

  router.get('/group-rooms/:id', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    const roomId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const { rows: [room] } = await pool.query(
        'SELECT * FROM group_coaching_rooms WHERE id = $1',
        [roomId]
      );
      if (!room) return res.status(404).json({ error: 'Room not found' });
      res.json({ room });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/group-rooms/check-in', requireKey, async (req, res) => {
    const { roomCode } = req.body;
    if (!roomCode) return res.status(400).json({ error: 'roomCode required' });
    try {
      const result = await community.facilitateGroupCheckIn({ roomCode });
      res.json(result);
    } catch (err) {
      logger?.error({ err }, '[legacy] group check-in failed');
      res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
  });

  router.post('/partnerships', requireKey, async (req, res) => {
    const { userAId, userBId, focusAreaA, focusAreaB } = req.body;
    if (!userAId || !userBId) return res.status(400).json({ error: 'userAId and userBId required' });
    try {
      const partnership = await community.createPartnership({ userAId, userBId, focusAreaA, focusAreaB });
      res.status(201).json({ partnership });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/partnerships/:id/check-in', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    const partnershipId = parseInt(req.params.id, 10);
    const { update } = req.body;
    if (!userId || !update) return res.status(400).json({ error: 'user and update required' });
    try {
      const result = await community.facilitatePartnerCheckIn({ partnershipId, userSubmittingId: userId, update });
      res.json(result);
    } catch (err) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
  });

  // ── LIFE REVIEW & MENTOR ─────────────────────────────────────────────────

  router.post('/life-review', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    const { quarter } = req.body;
    if (!userId || !quarter) return res.status(400).json({ error: 'user and quarter required (e.g. "2026-Q1")' });
    try {
      const result = await community.runLifeReview({ userId, quarter });
      res.status(201).json(result);
    } catch (err) {
      logger?.error({ err }, '[legacy] life-review start failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/life-review/:id/answer', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    const reviewId = parseInt(req.params.id, 10);
    const { answer } = req.body;
    if (!userId || !answer) return res.status(400).json({ error: 'user and answer required' });
    try {
      const result = await community.submitReviewAnswer({ reviewId, userId, answer });
      res.json(result);
    } catch (err) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
  });

  router.get('/life-review', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const reviews = await community.getLifeReviews(userId);
      res.json({ reviews });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/sovereign-mentor', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const result = await community.runSovereignMentor(userId);
      res.json(result);
    } catch (err) {
      logger?.error({ err }, '[legacy] sovereign-mentor failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/sovereign-mentor', requireKey, async (req, res) => {
    const userId = resolveUser(req);
    if (!userId) return res.status(400).json({ error: 'user required' });
    try {
      const sessions = await community.getSovereignMentorSessions(userId);
      res.json({ sessions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
