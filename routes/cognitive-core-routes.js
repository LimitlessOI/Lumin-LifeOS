/**
 * SYNOPSIS: Cognitive Core Era-1 API — journal, outcomes, miss reports, scoreboard, capsules.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { Router } from 'express';
import { createCognitiveCoreJudgment } from '../services/cognitive-core-judgment.js';
import { createCognitiveCorePrograms } from '../services/cognitive-core-programs.js';
import { createCognitiveCoreImprove } from '../services/cognitive-core-improve.js';
import {
  listWearableCapsules,
  detectJudgmentTurn,
  COMPILER_VERSION,
} from '../services/cognitive-core-perspective.js';
import { listAdvisors } from '../config/cognitive-core-advisors.js';

/**
 * @param {{ pool: import('pg').Pool, logger?: Console, requireKey?: Function }} deps
 */
/**
 * Auto-register entrypoint (founder runtime) — avoids editing protected startup/.
 * @param {import('express').Application} app
 * @param {{ pool?: import('pg').Pool, logger?: Console, requireKey?: Function }} deps
 */
export function registerCognitiveCoreRoutes(app, deps = {}) {
  const logger = deps.logger || console;
  const requireKey = deps.requireKey;
  app.use('/api/v1/cognitive-core', createCognitiveCoreRoutes({
    pool: deps.pool,
    logger,
    requireKey,
  }));
  logger.info?.('✅ [COGNITIVE-CORE] Auto-registered at /api/v1/cognitive-core/*');
}

export function createCognitiveCoreRoutes(deps = {}) {
  const router = Router();
  const pool = deps.pool;
  const logger = deps.logger || console;
  const requireKey = deps.requireKey;
  const core = createCognitiveCoreJudgment({ pool, logger });
  const programs = createCognitiveCorePrograms({ pool, logger });
  const improve = createCognitiveCoreImprove({ pool, logger });

  if (typeof requireKey === 'function') {
    router.use(requireKey);
  }

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      product: 'cognitive-core',
      era: 2,
      compiler_version: COMPILER_VERSION,
      era2: [
        'programs', 'program_activations', 'miss_loop', 'decision_replay',
        'counterfactual', 'relationship_twins', 'learning_style',
        'external_mind_advisors', 'future_self',
      ],
      laws: 'docs/constitution/COGNITIVE_CORE_LAWS.md',
    });
  });

  router.get('/capsules', (_req, res) => {
    res.json({ ok: true, capsules: listWearableCapsules() });
  });

  router.get('/advisors', (_req, res) => {
    res.json({ ok: true, advisors: listAdvisors() });
  });

  router.post('/detect', (req, res) => {
    const message = String(req.body?.message || '');
    const worn = req.body?.worn_capsules || req.body?.worn || [];
    const stakes = req.body?.stakes;
    res.json({ ok: true, ...detectJudgmentTurn(message, { worn, stakes }) });
  });

  router.get('/scoreboard', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.body?.user_id || req.user?.id || '1');
      const board = await core.getScoreboard(userId);
      res.json(board);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/decisions/open', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const rows = await core.listOpenDecisions(userId, Number(req.query.limit) || 20);
      res.json({ ok: true, decisions: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/decisions/:id', async (req, res) => {
    try {
      const pack = await core.getDecision(req.params.id);
      if (!pack) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, ...pack });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/decisions', async (req, res) => {
    try {
      const b = req.body || {};
      const row = await core.recordDecisionTurn({
        userId: b.user_id || req.user?.id || '1',
        domain: b.domain,
        question: b.question,
        options: b.options,
        situationSnapshot: b.situation_snapshot,
        wornCapsuleIds: b.worn_capsule_ids || b.worn_capsules,
        stakes: b.stakes,
        sourceSurface: b.source_surface,
        threadId: b.thread_id,
      });
      res.status(201).json({ ok: true, decision: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/decisions/:id/predictions', async (req, res) => {
    try {
      const b = req.body || {};
      const row = await core.recordPrediction({
        decisionId: req.params.id,
        predictedOption: b.predicted_option,
        predictedReasons: b.predicted_reasons,
        activatedProgramIds: b.activated_program_ids,
        confidence: b.confidence,
        tensionLedger: b.tension_ledger,
        synthesisSummary: b.synthesis_summary,
        compilerVersion: b.compiler_version,
      });
      res.status(201).json({ ok: true, prediction: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/decisions/:id/outcomes', async (req, res) => {
    try {
      const b = req.body || {};
      const outcome = await core.recordOutcome({
        decisionId: req.params.id,
        actualOption: b.actual_option,
        statedReasons: b.stated_reasons,
        capturedHow: b.captured_how || 'explicit',
      });
      // Law 5: on a miss, classify + correct the compiler unless the caller opts out.
      let miss = null;
      if (b.auto_miss !== false) {
        miss = await improve.classifyMissAndCorrect({ decisionId: req.params.id })
          .catch((e) => ({ ok: false, reason: e.message }));
      }
      res.status(201).json({ ok: true, outcome, miss });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Era-2: Programs layer ──
  router.get('/programs', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const rows = await programs.listPrograms(userId, {
        status: req.query.status || 'active',
        domain: req.query.domain || null,
        limit: Number(req.query.limit) || 100,
      });
      res.json({ ok: true, programs: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/programs', async (req, res) => {
    try {
      const b = req.body || {};
      const row = await programs.createProgram({
        userId: b.user_id || req.user?.id || '1',
        label: b.label,
        hypothesis: b.hypothesis,
        origin: b.origin,
        triggers: b.triggers,
        typicalBehavior: b.typical_behavior,
        protectivePurpose: b.protective_purpose,
        currentCost: b.current_cost,
        confidence: b.confidence,
        evidenceFor: b.evidence_for,
        evidenceAgainst: b.evidence_against,
        changeTrajectory: b.change_trajectory,
        domain: b.domain,
      });
      res.status(201).json({ ok: true, program: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.patch('/programs/:id', async (req, res) => {
    try {
      const b = req.body || {};
      const row = await programs.adjustConfidence({
        programId: req.params.id,
        delta: b.delta,
        evidenceNote: b.evidence_note,
        supports: b.supports !== false,
        retire: b.retire === true,
      });
      res.json({ ok: true, program: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/programs/induce', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await improve.induceProgramsFromHistory({
        userId: b.user_id || req.user?.id || '1',
        lookback: b.lookback,
      });
      res.json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Era-2: Replay + Counterfactual ──
  router.post('/decisions/:id/replay', async (req, res) => {
    try {
      const out = await improve.replayDecision({ decisionId: req.params.id });
      res.status(out.ok ? 200 : 422).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/decisions/:id/counterfactual', async (req, res) => {
    try {
      const out = await improve.counterfactual({
        decisionId: req.params.id,
        alternativeOption: (req.body || {}).alternative_option,
      });
      res.status(out.ok ? 200 : 422).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Era-2: Relationship twins ──
  router.get('/relationships', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const rows = await improve.getRelationshipTwins(userId);
      res.json({ ok: true, relationships: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/relationships', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await improve.inferRelationshipTwin({
        userId: b.user_id || req.user?.id || '1',
        personLabel: b.person_label,
        relationship: b.relationship,
        observations: b.observations,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Era-2: Learning-style model ──
  router.get('/learning-style', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const row = await improve.getLearningStyle(userId);
      res.json({ ok: true, learning_style: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.put('/learning-style', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await improve.inferLearningStyle({
        userId: b.user_id || req.user?.id || '1',
        signals: b.signals,
      });
      res.status(out.ok ? 200 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/decisions/:id/miss', async (req, res) => {
    try {
      const b = req.body || {};
      const miss = await core.buildMissReport({
        decisionId: req.params.id,
        predictionId: b.prediction_id,
        failureClass: b.failure_class,
        earliestDivergence: b.earliest_divergence,
        correctionHypothesis: b.correction_hypothesis,
        retestResult: b.retest_result,
      });
      res.status(201).json({ ok: true, miss });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/trust/can-act', async (req, res) => {
    try {
      const userId = String(req.query.user_id || '1');
      const domain = String(req.query.domain || 'general');
      const board = await core.getScoreboard(userId);
      const row = (board.by_domain || []).find((d) => d.domain === domain);
      const tier = row?.delegation_tier || 'refuse';
      const stakes = String(req.query.stakes || 'medium');
      let allow = false;
      if (tier === 'allow') allow = true;
      else if (tier === 'suggest' && stakes === 'low') allow = true;
      else if (tier === 'ask') allow = false;
      res.json({
        ok: true,
        domain,
        stakes,
        delegation_tier: tier,
        can_act: allow,
        action: allow ? 'allow' : (tier === 'suggest' ? 'suggest' : tier === 'ask' ? 'ask' : 'refuse'),
        accuracy: row?.accuracy ?? null,
        brier_score: row?.brier_score ?? null,
        n: row?.n ?? 0,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default createCognitiveCoreRoutes;