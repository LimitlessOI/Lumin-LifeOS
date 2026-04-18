/**
 * routes/lifeos-growth-routes.js
 *
 * LifeOS Phase 14 — Growth & Mastery + Relationship Intelligence API
 * Mounted at /api/v1/lifeos/growth
 *
 * Endpoints:
 *   Mastery:
 *   POST /skills                       — createSkill
 *   GET  /skills                       — getSkills
 *   POST /skills/:id/session           — logPracticeSession
 *   GET  /skills/:id/coaching          — getProgressCoaching
 *   POST /practice-protocol            — designPracticeProtocol
 *
 *   Wisdom:
 *   POST /wisdom                       — extractWisdom
 *   GET  /wisdom                       — getAllWisdom
 *   POST /wisdom/search                — searchWisdom
 *
 *   Victory Vault:
 *   POST /victories                    — logVictoryMoment
 *   GET  /victories                    — getVictoryMoments
 *   POST /victories/reels              — buildVictoryReplay
 *   GET  /victories/reels              — getVictoryReplays
 *
 *   Relationships:
 *   POST /relationship-health          — computeRelationshipHealth
 *   GET  /relationship-health          — getRelationshipHealth
 *   POST /apology                      — craftApology
 *   GET  /forecast                     — getCurrentForecast
 *   POST /forecast/generate            — getForecast
 *
 *   Family Values:
 *   GET  /family-values                — reviewFamilyValues
 *   POST /family-values                — setFamilyValue
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createMasteryTracker }           from '../services/mastery-tracker.js';
import { createRelationshipIntelligence } from '../services/relationship-intelligence.js';
import { createVictoryVault }             from '../services/victory-vault.js';
import { makeLifeOSUserResolver }         from '../services/lifeos-user-resolver.js';

export function createLifeOSGrowthRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();

  // ── AI adapter ─────────────────────────────────────────────────────────────
  const providerOrder = [
    { member: 'anthropic', enabled: !!process.env.ANTHROPIC_API_KEY?.trim() },
    { member: 'gemini', enabled: !!(process.env.GOOGLE_AI_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()) },
    { member: 'groq', enabled: !!process.env.GROQ_API_KEY?.trim() },
    { member: 'cerebras', enabled: !!process.env.CEREBRAS_API_KEY?.trim() },
  ];
  const enabledProviders = providerOrder.filter((provider) => provider.enabled);

  const callAI = callCouncilMember
    ? async (prompt) => {
        const candidates = enabledProviders.length ? enabledProviders : providerOrder;
        let lastError = null;

        for (const provider of candidates) {
          try {
            const r = await callCouncilMember(provider.member, prompt);
            return typeof r === 'string' ? r : r?.content || r?.text || '';
          } catch (err) {
            lastError = err;
            logger?.warn?.({ provider: provider.member, err: err.message }, 'lifeos-growth: provider failed, trying fallback');
          }
        }

        throw lastError || new Error('No LifeOS AI providers available');
      }
    : null;

  // ── Services ──────────────────────────────────────────────────────────────
  const masterySvc  = createMasteryTracker({ pool, callAI, logger });
  const relSvc      = createRelationshipIntelligence({ pool, callAI, logger });
  const victorySvc  = createVictoryVault({ pool, callAI, logger });

  // ── resolveUserId (shared, case-insensitive) ──────────────────────────────
  const resolveUserId = makeLifeOSUserResolver(pool);

  // ═══════════════════════════════════════════════════════════════════════════
  // MASTERY
  // ═══════════════════════════════════════════════════════════════════════════

  // ── POST /skills ───────────────────────────────────────────────────────────
  router.post('/skills', requireKey, async (req, res) => {
    try {
      const { user, skill_name, goal } = req.body;
      if (!skill_name) return res.status(400).json({ ok: false, error: 'skill_name required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const skill = await masterySvc.createSkill({ userId, skillName: skill_name, goal });
      res.json({ ok: true, skill });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /skills ────────────────────────────────────────────────────────────
  router.get('/skills', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const skills = await masterySvc.getSkills({ userId });
      res.json({ ok: true, skills });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /skills/:id/session ───────────────────────────────────────────────
  router.post('/skills/:id/session', requireKey, async (req, res) => {
    try {
      const skillTrackId = +req.params.id;
      const { user, duration_minutes, quality_rating, notes } = req.body;
      if (!duration_minutes) return res.status(400).json({ ok: false, error: 'duration_minutes required' });
      if (quality_rating == null) return res.status(400).json({ ok: false, error: 'quality_rating required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await masterySvc.logPracticeSession({
        userId,
        skillTrackId,
        durationMinutes: +duration_minutes,
        qualityRating:   +quality_rating,
        notes,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /skills/:id/coaching ───────────────────────────────────────────────
  router.get('/skills/:id/coaching', requireKey, async (req, res) => {
    try {
      const skillTrackId = +req.params.id;
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const coaching = await masterySvc.getProgressCoaching({ skillTrackId, userId });
      res.json({ ok: true, coaching });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /practice-protocol ────────────────────────────────────────────────
  router.post('/practice-protocol', requireKey, async (req, res) => {
    try {
      const { user, goal, skill_track_id } = req.body;
      if (!goal) return res.status(400).json({ ok: false, error: 'goal required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const protocol = await masterySvc.designPracticeProtocol({
        userId,
        goal,
        skillTrackId: skill_track_id ? +skill_track_id : undefined,
      });
      res.json({ ok: true, protocol });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WISDOM
  // ═══════════════════════════════════════════════════════════════════════════

  // ── POST /wisdom ───────────────────────────────────────────────────────────
  router.post('/wisdom', requireKey, async (req, res) => {
    try {
      const { user, experience_description } = req.body;
      if (!experience_description) return res.status(400).json({ ok: false, error: 'experience_description required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const entry = await masterySvc.extractWisdom({ userId, experienceDescription: experience_description });
      res.json({ ok: true, entry });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /wisdom ────────────────────────────────────────────────────────────
  router.get('/wisdom', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const entries = await masterySvc.getAllWisdom({ userId });
      res.json({ ok: true, entries });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /wisdom/search ────────────────────────────────────────────────────
  router.post('/wisdom/search', requireKey, async (req, res) => {
    try {
      const { user, situation } = req.body;
      if (!situation) return res.status(400).json({ ok: false, error: 'situation required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const results = await masterySvc.searchWisdom({ userId, situation });
      res.json({ ok: true, ...results });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VICTORY VAULT
  // ═══════════════════════════════════════════════════════════════════════════

  // ── POST /victories ───────────────────────────────────────────────────────
  router.post('/victories', requireKey, async (req, res) => {
    try {
      const {
        user,
        title,
        moment_type,
        what_was_hard,
        what_you_did,
        what_it_proves,
        outcome_summary,
        emotional_before,
        emotional_after,
        goal_link,
        media_type,
        media_url,
        transcript,
        source_type,
      } = req.body;
      if (!title) return res.status(400).json({ ok: false, error: 'title required' });
      if (!what_you_did) return res.status(400).json({ ok: false, error: 'what_you_did required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const moment = await victorySvc.logMoment({
        userId,
        title,
        momentType: moment_type,
        whatWasHard: what_was_hard,
        whatYouDid: what_you_did,
        whatItProves: what_it_proves,
        outcomeSummary: outcome_summary,
        emotionalBefore: emotional_before,
        emotionalAfter: emotional_after,
        goalLink: goal_link,
        mediaType: media_type,
        mediaUrl: media_url,
        transcript,
        sourceType: source_type,
      });
      res.json({ ok: true, moment });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /victories ────────────────────────────────────────────────────────
  router.get('/victories', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const moments = await victorySvc.getMoments({ userId, limit: req.query.limit });
      res.json({ ok: true, moments });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /victories/reels ────────────────────────────────────────────────
  router.post('/victories/reels', requireKey, async (req, res) => {
    try {
      const { user, title, purpose, moment_ids } = req.body;
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const normalizedIds = Array.isArray(moment_ids)
        ? moment_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
        : [];
      const result = await victorySvc.buildReplay({ userId, title, purpose, momentIds: normalizedIds });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /victories/reels ─────────────────────────────────────────────────
  router.get('/victories/reels', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const reels = await victorySvc.getReels({ userId, limit: req.query.limit });
      res.json({ ok: true, reels });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RELATIONSHIPS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── POST /relationship-health ──────────────────────────────────────────────
  router.post('/relationship-health', requireKey, async (req, res) => {
    try {
      const { user, relationship_label, period_days } = req.body;
      if (!relationship_label) return res.status(400).json({ ok: false, error: 'relationship_label required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const record = await relSvc.computeRelationshipHealth({
        userId,
        relationshipLabel: relationship_label,
        periodDays: period_days ? +period_days : 30,
      });
      res.json({ ok: true, record });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /relationship-health ───────────────────────────────────────────────
  router.get('/relationship-health', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const relationship = req.query.relationship;
      if (!relationship) return res.status(400).json({ ok: false, error: 'relationship query param required' });
      const records = await relSvc.getRelationshipHealth({ userId, relationshipLabel: relationship });
      res.json({ ok: true, records });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /apology ──────────────────────────────────────────────────────────
  router.post('/apology', requireKey, async (req, res) => {
    try {
      const { user, relationship_label, incident_description } = req.body;
      if (!relationship_label)    return res.status(400).json({ ok: false, error: 'relationship_label required' });
      if (!incident_description)  return res.status(400).json({ ok: false, error: 'incident_description required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await relSvc.craftApology({ userId, relationshipLabel: relationship_label, incidentDescription: incident_description });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /forecast ──────────────────────────────────────────────────────────
  router.get('/forecast', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const forecasts = await relSvc.getCurrentForecast(userId);
      res.json({ ok: true, forecasts });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /forecast/generate ────────────────────────────────────────────────
  router.post('/forecast/generate', requireKey, async (req, res) => {
    try {
      const { user, weeks_ahead } = req.body;
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const forecasts = await relSvc.getForecast({ userId, weeksAhead: weeks_ahead ? +weeks_ahead : 8 });
      res.json({ ok: true, forecasts });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FAMILY VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GET /family-values ─────────────────────────────────────────────────────
  router.get('/family-values', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await relSvc.reviewFamilyValues({ userId });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /family-values ────────────────────────────────────────────────────
  router.post('/family-values', requireKey, async (req, res) => {
    try {
      const { user, value_name, description, how_we_live_this } = req.body;
      if (!value_name) return res.status(400).json({ ok: false, error: 'value_name required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const value = await relSvc.setFamilyValue({ userId, valueName: value_name, description, howWeLiveThis: how_we_live_this });
      res.json({ ok: true, value });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
