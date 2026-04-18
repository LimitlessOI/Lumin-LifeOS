/**
 * routes/lifeos-decisions-routes.js
 *
 * Decision Intelligence API — Ideas 5-8
 * Mounted at /api/v1/lifeos/decisions
 *
 * Endpoints:
 *   POST  /log                   — log a decision with full context (Decision Archaeology)
 *   GET   /                      — list decisions for a user (?user=adam&category=financial)
 *   POST  /:id/outcome           — record outcome + rating for a decision
 *   POST  /analyze               — AI pattern analysis of decision history
 *   POST  /second-opinion        — steelman the opposing position (Second Opinion Engine)
 *   GET   /second-opinions       — list second opinions for a user
 *   POST  /second-opinions/:id/proceed — mark user proceeded after reading second opinion
 *   POST  /detect-biases         — detect cognitive biases in decision history
 *   GET   /biases                — retrieve stored bias detections
 *   POST  /biases/:id/acknowledge — mark a bias as acknowledged
 *   GET   /energy                — per-hour energy + cognitive state profile
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createDecisionIntelligence } from '../services/decision-intelligence.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSDecisionsRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();
  const log    = logger || console;

  // callAI adapter — consistent with all other LifeOS route files
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || r?.text || '';
      }
    : null;

  const svc = createDecisionIntelligence({ pool, callAI, logger: log });

  // Helper: resolve user_id (shared, case-insensitive)
  const resolveUserId = makeLifeOSUserResolver(pool);


  // ── POST /log ──────────────────────────────────────────────────────────────

  router.post('/log', requireKey, async (req, res) => {
    try {
      const {
        user = 'adam',
        title,
        category,
        decision_made,
        alternatives_considered,
        emotional_state,
      } = req.body;

      if (!title?.trim()) return res.status(400).json({ ok: false, error: 'title is required' });

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      // alternatives_considered can be a comma-separated string or an array
      let alts = alternatives_considered;
      if (typeof alts === 'string') {
        alts = alts.split(',').map(s => s.trim()).filter(Boolean);
      }

      const decision = await svc.logDecision({
        userId,
        title,
        category,
        decisionMade:             decision_made,
        alternativesConsidered:   alts,
        emotionalState:           emotional_state,
      });

      res.status(201).json({ ok: true, decision });
    } catch (err) {
      log.error({ err }, 'lifeos-decisions POST /log');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET / ──────────────────────────────────────────────────────────────────

  router.get('/', requireKey, async (req, res) => {
    try {
      const { user = 'adam', category, limit = '20' } = req.query;

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const decisions = await svc.getDecisions({ userId, category, limit: parseInt(limit) });
      res.json({ ok: true, decisions, count: decisions.length });
    } catch (err) {
      log.error({ err }, 'lifeos-decisions GET /');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /:id/outcome ──────────────────────────────────────────────────────

  router.post('/:id/outcome', requireKey, async (req, res) => {
    try {
      const { user = 'adam', outcome, outcome_rating } = req.body;

      if (!outcome?.trim()) return res.status(400).json({ ok: false, error: 'outcome is required' });

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const updated = await svc.recordOutcome({
        decisionId:    req.params.id,
        userId,
        outcome,
        outcomeRating: outcome_rating ? parseInt(outcome_rating) : null,
      });

      if (!updated) return res.status(404).json({ ok: false, error: 'Decision not found or not yours' });
      res.json({ ok: true, decision: updated });
    } catch (err) {
      log.error({ err }, `lifeos-decisions POST /${req.params.id}/outcome`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /analyze ──────────────────────────────────────────────────────────

  router.post('/analyze', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.body;

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const analysis = await svc.analyzeDecisionPatterns(userId);
      res.json({ ok: true, analysis });
    } catch (err) {
      log.error({ err }, 'lifeos-decisions POST /analyze');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /second-opinion ───────────────────────────────────────────────────

  router.post('/second-opinion', requireKey, async (req, res) => {
    try {
      const { user = 'adam', decision_description, decision_id } = req.body;

      if (!decision_description?.trim()) {
        return res.status(400).json({ ok: false, error: 'decision_description is required' });
      }

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const result = await svc.getSecondOpinion({
        userId,
        decisionDescription: decision_description,
        decisionId:          decision_id || null,
      });

      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      log.error({ err }, 'lifeos-decisions POST /second-opinion');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /second-opinions ───────────────────────────────────────────────────

  router.get('/second-opinions', requireKey, async (req, res) => {
    try {
      const { user = 'adam', limit = '20' } = req.query;

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const opinions = await svc.getSecondOpinions(userId, { limit: parseInt(limit) });
      res.json({ ok: true, opinions, count: opinions.length });
    } catch (err) {
      log.error({ err }, 'lifeos-decisions GET /second-opinions');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /second-opinions/:id/proceed ─────────────────────────────────────

  router.post('/second-opinions/:id/proceed', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const updated = await svc.markProceedingAfterSecondOpinion(req.params.id, userId);
      if (!updated) return res.status(404).json({ ok: false, error: 'Second opinion not found or not yours' });

      res.json({ ok: true, opinion: updated });
    } catch (err) {
      log.error({ err }, `lifeos-decisions POST /second-opinions/${req.params.id}/proceed`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /detect-biases ────────────────────────────────────────────────────

  router.post('/detect-biases', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.body;

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const biases = await svc.detectBiases(userId);
      res.json({ ok: true, biases, count: biases.length });
    } catch (err) {
      log.error({ err }, 'lifeos-decisions POST /detect-biases');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /biases ────────────────────────────────────────────────────────────

  router.get('/biases', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const biases = await svc.getBiasReport(userId);
      res.json({ ok: true, biases, count: biases.length });
    } catch (err) {
      log.error({ err }, 'lifeos-decisions GET /biases');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /biases/:id/acknowledge ───────────────────────────────────────────

  router.post('/biases/:id/acknowledge', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const updated = await svc.acknowledgeBias(req.params.id, userId);
      if (!updated) return res.status(404).json({ ok: false, error: 'Bias not found or not yours' });

      res.json({ ok: true, bias: updated });
    } catch (err) {
      log.error({ err }, `lifeos-decisions POST /biases/${req.params.id}/acknowledge`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /energy ────────────────────────────────────────────────────────────

  router.get('/energy', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const profile = await svc.getEnergyProfile(userId);
      res.json({ ok: true, ...profile });
    } catch (err) {
      log.error({ err }, 'lifeos-decisions GET /energy');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
