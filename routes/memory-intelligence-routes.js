/**
 * Memory Intelligence Routes
 *
 * API surface for the epistemic fact store, lessons, debates,
 * agent performance/routing, protocol violations, task authority,
 * and intent drift logging.
 *
 * All routes require x-command-key authentication.
 *
 * @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
 */

'use strict';

import { Router } from 'express';
import {
  createMemoryIntelligenceService,
  LEVEL,
  LEVEL_LABEL,
  AUTHORITY_STATUS,
  VIOLATION_SEVERITY,
} from '../services/memory-intelligence-service.js';

export function createMemoryIntelligenceRoutes(deps) {
  const { pool, logger, requireKey } = deps;
  const router = Router();
  const svc = createMemoryIntelligenceService(pool, logger);

  // ─── System health ──────────────────────────────────────────────────────

  /**
   * GET /api/v1/memory/health
   * System summary: total facts, invariants, debates, lessons, open drifts, stale hypotheses
   */
  router.get('/health', requireKey, async (req, res) => {
    try {
      const summary = await svc.getSystemSummary();
      res.json({ ok: true, summary });
    } catch (err) {
      logger?.error({ err }, 'memory/health error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─── Epistemic facts ────────────────────────────────────────────────────

  /**
   * GET /api/v1/memory/facts
   * Query facts with context-weighted scoring.
   * Query params: context, domain, minLevel (0–6), limit, visibilityClass
   */
  router.get('/facts', requireKey, async (req, res) => {
    try {
      const {
        context = null,
        domain = null,
        minLevel = '0',
        limit = '20',
        visibilityClass = 'internal',
      } = req.query;

      const facts = await svc.queryFacts({
        context,
        domain,
        minLevel: parseInt(minLevel, 10),
        limit: Math.min(parseInt(limit, 10), 100),
        visibilityClass,
      });
      res.json({ ok: true, count: facts.length, facts });
    } catch (err) {
      logger?.error({ err }, 'memory/facts GET error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/memory/facts
   * Record a new epistemic fact.
   * Body: { text, domain?, level?, contextRequired?, falseWhen?, disproofRecipe?,
   *         visibilityClass?, residueRisk?, reviewBy?, createdBy? }
   */
  router.post('/facts', requireKey, async (req, res) => {
    try {
      const {
        text, domain, level = 0, contextRequired, falseWhen,
        disproofRecipe, visibilityClass, residueRisk, reviewBy, createdBy,
      } = req.body;

      if (!text) return res.status(400).json({ ok: false, error: 'text is required' });
      if (level < 0 || level > 6) return res.status(400).json({ ok: false, error: 'level must be 0–6' });

      const fact = await svc.recordFact({
        text, domain, level, contextRequired, falseWhen,
        disproofRecipe, visibilityClass, residueRisk,
        reviewBy: reviewBy ? new Date(reviewBy) : null,
        createdBy,
      });
      res.json({ ok: true, fact, level_label: LEVEL_LABEL[fact.level] });
    } catch (err) {
      logger?.error({ err }, 'memory/facts POST error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/memory/facts/:id
   * Get a single fact with full metadata.
   */
  router.get('/facts/:id', requireKey, async (req, res) => {
    try {
      const fact = await svc.getFact(req.params.id);
      if (!fact) return res.status(404).json({ ok: false, error: 'fact not found' });
      res.json({ ok: true, fact });
    } catch (err) {
      logger?.error({ err }, 'memory/facts/:id GET error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/memory/facts/:id/evidence
   * Add evidence to a fact (may trigger automatic promotion or demotion).
   * Body: { eventType, result, evidenceText, source?, sourceIsIndependent?,
   *         adversarialQuality?, overrideReason? }
   */
  router.post('/facts/:id/evidence', requireKey, async (req, res) => {
    try {
      const { eventType, result, evidenceText, source, sourceIsIndependent,
              adversarialQuality, overrideReason } = req.body;

      if (!eventType || !result || !evidenceText) {
        return res.status(400).json({ ok: false, error: 'eventType, result, and evidenceText are required' });
      }

      const out = await svc.addEvidence(req.params.id, {
        eventType, result, evidenceText, source,
        sourceIsIndependent: !!sourceIsIndependent,
        adversarialQuality: adversarialQuality != null ? parseInt(adversarialQuality, 10) : null,
        overrideReason,
      });

      res.json({
        ok: true,
        levelChanged: out.levelChanged,
        newLevel: out.newLevel,
        newLevelLabel: LEVEL_LABEL[out.newLevel],
        evidence: out.evidence,
      });
    } catch (err) {
      logger?.error({ err }, 'memory/facts/:id/evidence POST error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/memory/facts/:id/promote
   * Manually promote a fact one level (requires reason; INVARIANT requires adversarial gate).
   * Body: { reason, evidenceId?, promotedBy? }
   */
  router.post('/facts/:id/promote', requireKey, async (req, res) => {
    try {
      const { reason, evidenceId, promotedBy } = req.body;
      if (!reason) return res.status(400).json({ ok: false, error: 'reason is required' });

      const result = await svc.promoteFact(req.params.id, { reason, evidenceId, promotedBy });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error({ err }, 'memory/facts/:id/promote error');
      const status = err.message.includes('not found') ? 404 : 400;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/memory/facts/:id/demote
   * Demote a fact (immediate; any exception should trigger this).
   * Body: { toLevel, reason, evidenceId?, demotedBy? }
   */
  router.post('/facts/:id/demote', requireKey, async (req, res) => {
    try {
      const { toLevel, reason, evidenceId, demotedBy } = req.body;
      if (toLevel == null || !reason) return res.status(400).json({ ok: false, error: 'toLevel and reason are required' });

      const result = await svc.demoteFact(req.params.id, {
        toLevel: parseInt(toLevel, 10), reason, evidenceId, demotedBy,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error({ err }, 'memory/facts/:id/demote error');
      const status = err.message.includes('not found') ? 404 : 400;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ─── Debates ────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/memory/debates
   * Query debates by problem class.
   * Query params: problemClass, limit
   */
  router.get('/debates', requireKey, async (req, res) => {
    try {
      const { problemClass, limit = '10' } = req.query;
      const debates = await svc.getDebatesByProblemClass(problemClass || null, parseInt(limit, 10));
      res.json({ ok: true, count: debates.length, debates });
    } catch (err) {
      logger?.error({ err }, 'memory/debates GET error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/memory/debates
   * Record a full debate with positions, arguments, consensus, and residue.
   * Body: { subject, relatedFactId?, initialPositions, arguments, whatMovedMinds?,
   *         consensus?, consensusMethod?, consensusReachedBy?, lessonsLearned?,
   *         problemClass?, residueRisk?, futureLookback?, councilRunId?, durationMinutes? }
   */
  router.post('/debates', requireKey, async (req, res) => {
    try {
      const { subject } = req.body;
      if (!subject) return res.status(400).json({ ok: false, error: 'subject is required' });

      const debate = await svc.recordDebate(req.body);
      res.json({ ok: true, debate });
    } catch (err) {
      logger?.error({ err }, 'memory/debates POST error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─── Lessons ────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/memory/lessons
   * Get lessons by domain (sorted by retrieval frequency × impact).
   * Query params: domain (required), limit
   */
  router.get('/lessons', requireKey, async (req, res) => {
    try {
      const { domain, limit = '20' } = req.query;
      if (!domain) return res.status(400).json({ ok: false, error: 'domain query param is required' });

      const lessons = await svc.getLessonsByDomain(domain, parseInt(limit, 10));
      res.json({ ok: true, count: lessons.length, lessons });
    } catch (err) {
      logger?.error({ err }, 'memory/lessons GET error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/memory/lessons/roi
   * Lesson ROI report — cost to write vs retrieval value. Surfaces low-ROI categories.
   */
  router.get('/lessons/roi', requireKey, async (req, res) => {
    try {
      const roi = await svc.getLessonROI(50);
      res.json({ ok: true, roi });
    } catch (err) {
      logger?.error({ err }, 'memory/lessons/roi error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/memory/lessons
   * Record a lesson learned.
   * Body: { domain, problem, solution, impactClass?, howNovel?, surfacedBy?, tags?, writeCostTokens? }
   */
  router.post('/lessons', requireKey, async (req, res) => {
    try {
      const { domain, problem, solution } = req.body;
      if (!domain || !problem || !solution) {
        return res.status(400).json({ ok: false, error: 'domain, problem, and solution are required' });
      }

      const lesson = await svc.recordLesson(req.body);
      res.json({ ok: true, lesson });
    } catch (err) {
      logger?.error({ err }, 'memory/lessons POST error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─── Agent performance ──────────────────────────────────────────────────

  /**
   * GET /api/v1/memory/agents/:agentId/accuracy
   * Agent accuracy by task type (includes "adam" as an agent).
   * Query params: taskType (optional)
   */
  router.get('/agents/:agentId/accuracy', requireKey, async (req, res) => {
    try {
      const { taskType } = req.query;
      const accuracy = await svc.getAgentAccuracy(req.params.agentId, taskType || null);
      res.json({ ok: true, agentId: req.params.agentId, accuracy });
    } catch (err) {
      logger?.error({ err }, 'memory/agents accuracy error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/memory/agents/performance
   * Record an agent performance event (correct / incorrect / partial / overridden).
   * Body: { agentId, taskType, prediction?, outcome, confidenceAtTime?, notes? }
   */
  router.post('/agents/performance', requireKey, async (req, res) => {
    try {
      const { agentId, taskType, outcome } = req.body;
      if (!agentId || !taskType || !outcome) {
        return res.status(400).json({ ok: false, error: 'agentId, taskType, and outcome are required' });
      }

      const record = await svc.recordAgentPerformance(req.body);
      res.json({ ok: true, record });
    } catch (err) {
      logger?.error({ err }, 'memory/agents/performance POST error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/memory/agents/violations
   * List protocol violations by agent/task.
   * Query params: agentId?, taskType?, limit?
   */
  router.get('/agents/violations', requireKey, async (req, res) => {
    try {
      const { agentId = null, taskType = null, limit = '50' } = req.query;
      const violations = await svc.listProtocolViolations({
        agentId,
        taskType,
        limit: parseInt(limit, 10),
      });
      res.json({ ok: true, count: violations.length, violations });
    } catch (err) {
      logger?.error({ err }, 'memory/agents/violations GET error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/memory/agents/violations
   * Record a protocol violation and optionally auto-demote authority.
   * Body: { agentId, taskType, violationType, severity?, details?, evidenceText?,
   *         detectedBy?, sourceRoute?, relatedFactId?, relatedDebateId?, asked?, delivered?,
   *         autoAction?, authorityNotes?, expiresAt? }
   */
  router.post('/agents/violations', requireKey, async (req, res) => {
    try {
      const { agentId, taskType, violationType } = req.body;
      if (!agentId || !taskType || !violationType) {
        return res.status(400).json({ ok: false, error: 'agentId, taskType, and violationType are required' });
      }

      const result = await svc.recordProtocolViolation(req.body);
      res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error({ err }, 'memory/agents/violations POST error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/memory/agents/authority
   * List active authority rows.
   * Query params: agentId?, taskType?, limit?
   */
  router.get('/agents/authority', requireKey, async (req, res) => {
    try {
      const { agentId = null, taskType = null, limit = '100' } = req.query;
      const authorities = await svc.listTaskAuthorities({
        agentId,
        taskType,
        limit: parseInt(limit, 10),
      });
      res.json({ ok: true, count: authorities.length, authorities });
    } catch (err) {
      logger?.error({ err }, 'memory/agents/authority GET error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/memory/agents/:agentId/authority
   * Current authority for a given task type.
   * Query params: taskType (required)
   */
  router.get('/agents/:agentId/authority', requireKey, async (req, res) => {
    try {
      const { taskType } = req.query;
      if (!taskType) return res.status(400).json({ ok: false, error: 'taskType query param is required' });

      const authority = await svc.getTaskAuthority(req.params.agentId, String(taskType));
      res.json({ ok: true, agentId: req.params.agentId, taskType, authority });
    } catch (err) {
      logger?.error({ err }, 'memory/agents authority GET error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/memory/agents/authority
   * Explicitly set authority for an agent on a task type.
   * Body: { agentId, taskType, authorityStatus, reason, notes?, metadata?, setBy?, expiresAt? }
   */
  router.post('/agents/authority', requireKey, async (req, res) => {
    try {
      const { agentId, taskType, authorityStatus, reason } = req.body;
      if (!agentId || !taskType || !authorityStatus || !reason) {
        return res.status(400).json({ ok: false, error: 'agentId, taskType, authorityStatus, and reason are required' });
      }
      if (!Object.values(AUTHORITY_STATUS).includes(String(authorityStatus).toLowerCase())) {
        return res.status(400).json({ ok: false, error: 'authorityStatus must be allowed|watch|blocked' });
      }

      const authority = await svc.setTaskAuthority({
        ...req.body,
        expiresAt: req.body?.expiresAt ? new Date(req.body.expiresAt) : null,
      });
      res.json({ ok: true, authority });
    } catch (err) {
      logger?.error({ err }, 'memory/agents/authority POST error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/memory/routing/recommendation
   * Recommend the best currently-authorized model for a task type.
   * Query params: taskType (required), preferredModel?, candidates? (csv)
   */
  router.get('/routing/recommendation', requireKey, async (req, res) => {
    try {
      const { taskType, preferredModel = null, candidates = '' } = req.query;
      if (!taskType) return res.status(400).json({ ok: false, error: 'taskType query param is required' });
      const candidateModels = String(candidates || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const recommendation = await svc.getRoutingRecommendation({
        taskType: String(taskType),
        proposedModel: preferredModel ? String(preferredModel) : null,
        candidateModels,
      });
      res.json({ ok: true, recommendation });
    } catch (err) {
      logger?.error({ err }, 'memory/routing/recommendation GET error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─── Intent drift ───────────────────────────────────────────────────────

  /**
   * POST /api/v1/memory/intent-drift
   * Log a §2.11b intent drift event (asked vs shipped).
   * Body: { asked, delivered, driftReason?, agentId?, relatedFactId? }
   */
  router.post('/intent-drift', requireKey, async (req, res) => {
    try {
      const { asked, delivered } = req.body;
      if (!asked || !delivered) {
        return res.status(400).json({ ok: false, error: 'asked and delivered are required' });
      }

      const event = await svc.recordIntentDrift(req.body);
      res.json({ ok: true, event });
    } catch (err) {
      logger?.error({ err }, 'memory/intent-drift POST error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─── Maintenance ────────────────────────────────────────────────────────

  /**
   * GET /api/v1/memory/stale-hypotheses
   * All HYPOTHESIS facts past their review_by date.
   */
  router.get('/stale-hypotheses', requireKey, async (req, res) => {
    try {
      const stale = await svc.getStaleHypotheses();
      res.json({ ok: true, count: stale.length, stale });
    } catch (err) {
      logger?.error({ err }, 'memory/stale-hypotheses error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/constants', requireKey, async (req, res) => {
    res.json({
      ok: true,
      levelLabels: LEVEL_LABEL,
      authorityStatus: AUTHORITY_STATUS,
      violationSeverity: VIOLATION_SEVERITY,
    });
  });

  return router;
}
