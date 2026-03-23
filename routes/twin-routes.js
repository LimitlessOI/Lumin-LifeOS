/**
 * routes/twin-routes.js
 * Digital twin, outcome tracking, and continuous improvement API.
 *
 * Mounted at /api/v1/twin
 *
 * Endpoints:
 *   GET  /api/v1/twin/profile               — Adam's current decision profile
 *   GET  /api/v1/twin/decisions             — full decision log
 *   POST /api/v1/twin/decisions             — log a raw conversation/statement
 *   POST /api/v1/twin/simulate              — simulate what Adam would decide
 *   POST /api/v1/twin/profile/rebuild       — rebuild profile from all decisions
 *
 *   GET  /api/v1/twin/outcomes              — all outcome measurements
 *   POST /api/v1/twin/outcomes              — record a new outcome measurement
 *   GET  /api/v1/twin/outcomes/summary      — impact by metric type
 *   GET  /api/v1/twin/outcomes/untracked    — features with no outcomes yet
 *
 *   GET  /api/v1/twin/proposals             — improvement proposals for Adam to review
 *   POST /api/v1/twin/proposals/:id/approve — approve a proposal (→ creates an idea)
 *   POST /api/v1/twin/proposals/:id/reject  — reject a proposal
 *   POST /api/v1/twin/monitor               — run improvement monitor cycle now
 */

import express from 'express';
import { createAdamLogger, EVENTS } from '../services/adam-logger.js';
import { createOutcomeTracker } from '../services/outcome-tracker.js';
import { createContinuousImprovement } from '../services/continuous-improvement.js';
import { createIdeaQueue } from '../core/idea-queue.js';

export function createTwinRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();
  const adamLogger = createAdamLogger(pool);
  const outcomeTracker = createOutcomeTracker(pool);
  const ideaQueue = createIdeaQueue(pool);

  // Build AI helper
  const callAI = callCouncilMember
    ? async (prompt) => {
        const result = await callCouncilMember('anthropic', prompt);
        return typeof result === 'string' ? result : result?.content || result?.text || '';
      }
    : null;

  const ci = createContinuousImprovement({ pool, callAI, adamLogger });

  // ══ DIGITAL TWIN ══════════════════════════════════════════════════════════

  // Get current profile
  router.get('/profile', requireKey, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM adam_profile WHERE is_current = TRUE LIMIT 1`
      );
      const profile = result.rows[0] || null;
      res.json({ ok: true, profile });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Get decision log
  router.get('/decisions', requireKey, async (req, res) => {
    try {
      const { event_type, limit = 100, since } = req.query;
      const decisions = await adamLogger.getDecisions({
        eventType: event_type,
        limit: Math.min(parseInt(limit, 10), 500),
        since,
      });
      res.json({ ok: true, count: decisions.length, decisions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Log a conversation / statement from Adam
  router.post('/decisions', requireKey, async (req, res) => {
    try {
      const { text, event_type = EVENTS.CONVERSATION, subject, decision, reasoning, context, tags } = req.body;
      if (!text && !subject) {
        return res.status(400).json({ ok: false, error: 'text or subject required' });
      }

      await adamLogger.log(event_type, {
        subject: subject || text?.substring(0, 100) || '',
        inputText: text,
        decision,
        reasoning,
        context,
        tags,
      });

      res.json({ ok: true, message: 'Logged' });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Simulate what Adam would decide
  router.post('/simulate', requireKey, async (req, res) => {
    try {
      const { scenario } = req.body;
      if (!scenario) return res.status(400).json({ ok: false, error: 'scenario required' });
      if (!callAI) return res.status(503).json({ ok: false, error: 'AI not available' });

      const prediction = await adamLogger.simulateDecision(scenario, callAI);
      res.json({ ok: true, prediction });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Rebuild profile from all decisions
  router.post('/profile/rebuild', requireKey, async (req, res) => {
    try {
      if (!callAI) return res.status(503).json({ ok: false, error: 'AI not available' });
      const profile = await adamLogger.buildProfile(callAI);
      res.json({ ok: true, profile });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ══ OUTCOMES ══════════════════════════════════════════════════════════════

  // Get all outcomes
  router.get('/outcomes', requireKey, async (req, res) => {
    try {
      const { metric_type, since, verified_only } = req.query;
      const outcomes = await outcomeTracker.get({
        metricType: metric_type,
        since,
        verifiedOnly: verified_only === 'true',
        limit: 100,
      });
      res.json({ ok: true, count: outcomes.length, outcomes });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Record a new outcome
  router.post('/outcomes', requireKey, async (req, res) => {
    try {
      const { feature_name, metric_type, before_value, after_value, metric_unit, idea_id, notes, verified } = req.body;

      if (!feature_name || !metric_type || after_value === undefined) {
        return res.status(400).json({ ok: false, error: 'feature_name, metric_type, and after_value are required' });
      }

      const outcome = await outcomeTracker.record({
        featureName: feature_name,
        metricType: metric_type,
        beforeValue: parseFloat(before_value) || 0,
        afterValue: parseFloat(after_value),
        metricUnit: metric_unit,
        ideaId: idea_id,
        notes,
        verified: !!verified,
      });

      // Log as an Adam decision
      await adamLogger.log(EVENTS.OUTCOME_LOGGED, {
        subject: feature_name,
        subjectId: idea_id,
        decision: 'measured',
        reasoning: `${metric_type}: ${before_value} → ${after_value} ${metric_unit || ''}`,
        tags: ['outcome', metric_type],
      });

      res.status(201).json({ ok: true, outcome });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Summary of all outcomes
  router.get('/outcomes/summary', requireKey, async (req, res) => {
    try {
      const summary = await outcomeTracker.getSummary();
      res.json({ ok: true, summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Features with no outcomes tracked
  router.get('/outcomes/untracked', requireKey, async (req, res) => {
    try {
      const untracked = await outcomeTracker.getUntrackedFeatures();
      res.json({ ok: true, count: untracked.length, features: untracked });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ══ IMPROVEMENT PROPOSALS ═════════════════════════════════════════════════

  // Get proposals
  router.get('/proposals', requireKey, async (req, res) => {
    try {
      const { status = 'pending' } = req.query;
      const proposals = await ci.getProposals({ status });
      res.json({ ok: true, count: proposals.length, proposals });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Approve a proposal → creates an idea
  router.post('/proposals/:id/approve', requireKey, async (req, res) => {
    try {
      const result = await ci.approveProposal(parseInt(req.params.id, 10), ideaQueue);

      await adamLogger.log(EVENTS.IDEA_APPROVED, {
        subject: result.proposal.title,
        subjectId: result.proposal.id?.toString(),
        decision: 'approved',
        reasoning: 'Approved improvement proposal',
        tags: ['improvement', result.proposal.category],
      });

      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Reject a proposal
  router.post('/proposals/:id/reject', requireKey, async (req, res) => {
    try {
      const { reason = 'No reason provided' } = req.body;
      const proposal = await ci.rejectProposal(parseInt(req.params.id, 10), reason);

      await adamLogger.log(EVENTS.IDEA_REJECTED, {
        subject: proposal.title,
        subjectId: proposal.id?.toString(),
        decision: 'rejected',
        reasoning: reason,
        tags: ['improvement', proposal.category],
      });

      res.json({ ok: true, proposal });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Run monitor cycle on demand
  router.post('/monitor', requireKey, async (req, res) => {
    try {
      const result = await ci.runMonitorCycle();
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Free-tier usage status ────────────────────────────────────────────────
  // GET /api/v1/twin/free-tier — shows remaining free calls per provider today
  router.get('/free-tier', requireKey, async (req, res) => {
    try {
      const { createFreeTierGovernor } = await import('../services/free-tier-governor.js');
      const governor = createFreeTierGovernor({ pool });
      const status = await governor.getStatus();
      res.json({ ok: true, ...status });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Token optimization stats + savings report ─────────────────────────────
  // GET /api/v1/twin/tokens — today's token savings, cost avoided, recommendations
  router.get('/tokens', requireKey, async (req, res) => {
    try {
      const { createTokenOptimizer } = await import('../services/token-optimizer.js');
      const optimizer = createTokenOptimizer(pool);
      const report = await optimizer.getReport();
      res.json({ ok: true, ...report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/twin/tokens/history — DB-backed daily rollup (last 30 days)
  router.get('/tokens/history', requireKey, async (req, res) => {
    try {
      const rows = await pool.query(
        `SELECT * FROM token_usage_daily WHERE day >= NOW() - INTERVAL '30 days' ORDER BY day DESC, requests DESC`
      );
      res.json({ ok: true, history: rows.rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
