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
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createEmotionalPatternEngine } from '../services/emotional-pattern-engine.js';
import { createParentingCoach }         from '../services/parenting-coach.js';
import { createInnerWorkEffectiveness } from '../services/inner-work-effectiveness.js';
import { createSelfSabotageMonitor }    from '../services/self-sabotage-monitor.js';

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

  // ── Helper: resolve user_id from handle or numeric id ────────────────────
  async function resolveUserId(handleOrId) {
    if (!handleOrId) return null;
    if (!isNaN(handleOrId)) {
      const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE id = $1', [+handleOrId]);
      return rows[0]?.id || null;
    }
    const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE user_handle = $1', [handleOrId]);
    return rows[0]?.id || null;
  }

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

      const limit = parseInt(req.query.limit) || 20;
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

      const logId = parseInt(req.params.id);
      const acknowledged = await sabotageMonitor.acknowledgePattern(userId, logId);

      if (!acknowledged) return res.status(404).json({ ok: false, error: 'Pattern log not found' });
      res.json({ ok: true, acknowledged: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
