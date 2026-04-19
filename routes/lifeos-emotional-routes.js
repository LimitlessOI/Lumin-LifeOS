/**
 * routes/lifeos-emotional-routes.js
 *
 * LifeOS Phase 5 — Emotional Intelligence + Parenting API
 * Mounted at /api/v1/lifeos/emotional
 *
 * Endpoints:
 *   GET  /patterns                        — emotional patterns for user
 *   POST /patterns/analyze                — trigger AI pattern analysis
 *   GET  /parenting                       — recent parenting moments (limit 50)
 *   POST /parenting                       — log/debrief a parenting moment
 *   GET  /parenting/insights              — repair rate + insights for user
 *   GET  /inner-work                      — inner work effectiveness log for user
 *   POST /inner-work                      — run effectiveness analysis and store
 *   GET  /inner-work/effectiveness        — stored effectiveness correlations
 *   POST /sabotage/detect                 — detect self-sabotage patterns
 *   GET  /sabotage/history                — pattern history for user
 *   POST /sabotage/:id/acknowledge        — mark a detected pattern as acknowledged
 *   GET  /sabotage/patterns               — list all known pattern definitions
 *   POST /daily                           — upsert today's emotional check-in (weather/intensity/valence/tags)
 *   GET  /daily/today                     — get today's check-in (or null if none)
 *   GET  /daily/recent                    — last N daily check-ins
 *   GET  /daily/trend                     — 14-day emotional trend summary (no AI)
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createEmotionalPatternEngine } from '../services/emotional-pattern-engine.js';
import { createParentingCoach }         from '../services/parenting-coach.js';
import { createInnerWorkEffectiveness } from '../services/inner-work-effectiveness.js';
import { createSelfSabotageMonitor }    from '../services/self-sabotage-monitor.js';
import { makeLifeOSUserResolver }       from '../services/lifeos-user-resolver.js';
import { safeInt, safeLimit, safeDays, safeId } from '../services/lifeos-request-helpers.js';

export function createLifeOSEmotionalRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();

  // ── AI helper ─────────────────────────────────────────────────────────────
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || r?.text || '';
      }
    : null;

  // ── Services ──────────────────────────────────────────────────────────────
  const emotionalEngine   = createEmotionalPatternEngine({ pool, callAI });
  const parentingCoach    = createParentingCoach({ pool, callAI });
  const innerWork         = createInnerWorkEffectiveness({ pool, callAI });
  const sabotageMonitor   = createSelfSabotageMonitor({ pool, callAI });

  // ── Helper: resolve user_id from handle or numeric id (shared, case-insensitive) ──
  const resolveUserId = makeLifeOSUserResolver(pool);

  // ── GET /patterns ─────────────────────────────────────────────────────────
  // Returns all known emotional patterns for the user, ordered by frequency.
  router.get('/patterns', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const patterns = await emotionalEngine.getPatterns(userId);
      res.json({ ok: true, patterns });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /patterns/analyze ────────────────────────────────────────────────
  // Triggers AI analysis of the last 30 days of emotional data and upserts patterns.
  router.post('/patterns/analyze', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body?.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const patterns = await emotionalEngine.analyzePatterns(userId);
      res.json({ ok: true, patterns });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /parenting ────────────────────────────────────────────────────────
  // Returns the 50 most recent parenting moments (last 60 days by default).
  router.get('/parenting', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const moments = await parentingCoach.getMoments(userId, { days: 60 });
      res.json({ ok: true, moments: moments.slice(0, 50) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /parenting ───────────────────────────────────────────────────────
  // Log and debrief a parenting moment. Runs AI coaching if available.
  // Body: { user?, child_name, child_age?, what_happened, user_response?, what_user_felt? }
  router.post('/parenting', requireKey, async (req, res) => {
    try {
      const {
        user,
        child_name,
        child_age,
        what_happened,
        user_response,
        what_user_felt,
      } = req.body || {};

      if (!what_happened) {
        return res.status(400).json({ ok: false, error: 'what_happened is required' });
      }

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const moment = await parentingCoach.debrief({
        userId,
        childName:    child_name   || null,
        childAge:     child_age    || null,
        whatHappened: what_happened,
        userResponse: user_response || null,
        whatUserFelt: what_user_felt || null,
      });

      res.status(201).json({ ok: true, moment });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /parenting/insights ───────────────────────────────────────────────
  // Returns repair rate statistics: total moments, repaired count, success rate.
  router.get('/parenting/insights', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const insights = await parentingCoach.getRepairRate(userId);
      res.json({ ok: true, ...insights });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /inner-work ───────────────────────────────────────────────────────
  // Returns stored effectiveness data for each inner work practice type.
  router.get('/inner-work', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const log = await innerWork.getEffectiveness(userId);
      res.json({ ok: true, log });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /inner-work ──────────────────────────────────────────────────────
  // Runs correlation analysis across practice types and upserts results.
  // Body: { user? }
  router.post('/inner-work', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body?.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const results = await innerWork.analyze(userId);
      res.json({ ok: true, results });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /inner-work/effectiveness ─────────────────────────────────────────
  // Alias: returns stored effectiveness correlations, ordered by computed_at DESC.
  router.get('/inner-work/effectiveness', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const effectiveness = await innerWork.getEffectiveness(userId);
      res.json({ ok: true, effectiveness });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /sabotage/patterns ────────────────────────────────────────────────
  // Returns all known sabotage pattern definitions (for frontend display).
  router.get('/sabotage/patterns', requireKey, async (req, res) => {
    try {
      res.json({ ok: true, patterns: sabotageMonitor.getPatternDefinitions() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sabotage/detect ─────────────────────────────────────────────────
  // Analyze user's recent data for self-sabotage patterns.
  // Body: { user?, lookback_days? }
  router.post('/sabotage/detect', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body?.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const lookbackDays = parseInt(req.body?.lookback_days) || 90;
      const result = await sabotageMonitor.detectPatterns(userId, lookbackDays);

      // Log detected patterns
      for (const p of result.patterns_detected) {
        await sabotageMonitor.logPattern(userId, p.pattern_id, p.confidence, p.evidence, p.framing);
      }

      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /sabotage/history ─────────────────────────────────────────────────
  // Returns pattern detection history for the user.
  router.get('/sabotage/history', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const limit = safeLimit(req.query.limit, { fallback: 20, max: 200 });
      const history = await sabotageMonitor.getPatternHistory(userId, limit);
      res.json({ ok: true, history });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sabotage/:id/acknowledge ────────────────────────────────────────
  // Mark a detected pattern as acknowledged by the user.
  router.post('/sabotage/:id/acknowledge', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body?.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const logId = safeId(req.params.id);
      if (!logId) return res.status(400).json({ ok: false, error: 'invalid pattern log id' });
      const acknowledged = await sabotageMonitor.acknowledgePattern(userId, logId);

      if (!acknowledged) return res.status(404).json({ ok: false, error: 'Pattern log not found' });
      res.json({ ok: true, acknowledged: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Daily emotional check-in (Amendment 21 Layer 5 — "name the weather")
  // These endpoints are the capture/retrieval surface for the single most
  // important daily ritual in LifeOS: ONE weather word + ONE intensity number.
  // They are also the primary data source for the emotional-pattern-engine,
  // early-warning notifications, joy score, and truth-delivery calibration.
  // ─────────────────────────────────────────────────────────────────────────

  // ── POST /daily ───────────────────────────────────────────────────────────
  // Upsert today's emotional check-in for the user.
  // Body: { user?, weather, intensity, valence?, depletion_tags?, note?, somatic_note?, source? }
  router.post('/daily', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const userId = await resolveUserId(body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const weather = typeof body.weather === 'string' ? body.weather.trim() : '';
      if (!weather) return res.status(400).json({ ok: false, error: 'weather is required' });

      const intensity = safeInt(body.intensity, { fallback: null, min: 1, max: 10 });
      if (intensity == null) {
        return res.status(400).json({ ok: false, error: 'intensity must be an integer 1..10' });
      }

      const valence = body.valence == null || body.valence === ''
        ? null
        : safeInt(body.valence, { fallback: null, min: -5, max: 5 });

      const depletionTags = Array.isArray(body.depletion_tags)
        ? body.depletion_tags
        : (typeof body.depletion_tags === 'string' && body.depletion_tags.length
          ? body.depletion_tags.split(',')
          : []);

      const checkin = await emotionalEngine.logDailyCheckin({
        userId,
        weather,
        intensity,
        valence,
        depletionTags,
        note:        body.note        || null,
        somaticNote: body.somatic_note || null,
        source:      typeof body.source === 'string' ? body.source : 'overlay',
      });

      res.status(201).json({ ok: true, checkin });
    } catch (err) {
      const status = /required|integer|weather/.test(err.message) ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── GET /daily/today ──────────────────────────────────────────────────────
  // Returns today's check-in, or { checkin: null } if the user hasn't logged yet.
  router.get('/daily/today', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const checkin = await emotionalEngine.getTodayCheckin(userId);
      res.json({ ok: true, checkin });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /daily/recent ─────────────────────────────────────────────────────
  // Returns the last N daily check-ins (default 14, max 90) over the last
  // ?days (default 30, max 365).
  router.get('/daily/recent', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const limit = safeLimit(req.query.limit, { fallback: 14, max: 90 });
      const days  = safeDays(req.query.days,  { fallback: 30, max: 365 });
      const checkins = await emotionalEngine.getRecentCheckins(userId, { limit, days });
      res.json({ ok: true, checkins });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /daily/trend ──────────────────────────────────────────────────────
  // Returns 14-day rolling emotional trend summary (no AI, SQL aggregation only).
  router.get('/daily/trend', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const trend = await emotionalEngine.getTrend(userId);
      res.json({ ok: true, trend });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
