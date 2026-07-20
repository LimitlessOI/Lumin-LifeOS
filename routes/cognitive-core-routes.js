/**
 * SYNOPSIS: Cognitive Core Era-1–4 API — journal through Trust Me (earned delegation).
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { Router } from 'express';
import { createCognitiveCoreJudgment } from '../services/cognitive-core-judgment.js';
import { createCognitiveCorePrograms } from '../services/cognitive-core-programs.js';
import { createCognitiveCoreImprove } from '../services/cognitive-core-improve.js';
import { createCognitiveCoreExtend } from '../services/cognitive-core-extend.js';
import { createCognitiveCoreValues } from '../services/cognitive-core-values.js';
import { createCognitiveCoreIdeas } from '../services/cognitive-core-ideas.js';
import { createCognitiveCoreTrust } from '../services/cognitive-core-trust.js';
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
  const extend = createCognitiveCoreExtend({ pool, logger });
  const values = createCognitiveCoreValues({ pool, logger });
  const ideas = createCognitiveCoreIdeas({ pool, logger });
  const trust = createCognitiveCoreTrust({ pool, logger });

  if (typeof requireKey === 'function') {
    router.use(requireKey);
  }

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      product: 'cognitive-core',
      era: 4,
      compiler_version: COMPILER_VERSION,
      era2: [
        'programs', 'program_activations', 'miss_loop', 'decision_replay',
        'counterfactual', 'relationship_twins', 'learning_style',
        'external_mind_advisors', 'future_self',
      ],
      era3: [
        'energy', 'value_drift', 'consequence_simulator', 'missing_info',
        'idea_graph', 'curiosity',
      ],
      era4: [
        'expert_collaboration', 'memory_compression', 'legacy_recorder',
        'apprenticeship', 'delegation_confidence', 'autonomous_advisor',
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
      const value_drift = await extend.checkValueDrift({ decisionId: req.params.id })
        .catch((e) => ({ ok: false, reason: e.message }));
      res.status(201).json({ ok: true, outcome, miss, value_drift });
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

  // ── Era-3: Values + drift ──
  router.get('/values', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const rows = await values.listValues(userId, { status: req.query.status || 'active' });
      res.json({ ok: true, values: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/values', async (req, res) => {
    try {
      const b = req.body || {};
      const row = await values.createValue({
        userId: b.user_id || req.user?.id || '1',
        principle: b.principle,
        hypothesis: b.hypothesis,
        confidence: b.confidence,
        source: b.source,
        evidence: b.evidence,
      });
      res.status(201).json({ ok: true, value: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/values/drift', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const resolved = req.query.resolved === 'true' || req.query.resolved === true;
      const rows = await values.listDriftEvents(userId, {
        resolved,
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, drift_events: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/values/drift/:id/resolve', async (req, res) => {
    try {
      const row = await values.resolveDrift(req.params.id);
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, drift: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Era-3: Missing info + consequences ──
  router.post('/decisions/:id/missing-info', async (req, res) => {
    try {
      const out = await extend.detectMissingInfo({ decisionId: req.params.id });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/decisions/:id/consequences', async (req, res) => {
    try {
      const out = await extend.simulateConsequences({
        decisionId: req.params.id,
        option: (req.body || {}).option,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Era-3: Idea graph ──
  router.get('/ideas', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const graph = await ideas.getGraph(userId, { limit: Number(req.query.limit) || 200 });
      res.json({ ok: true, ...graph });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/ideas', async (req, res) => {
    try {
      const b = req.body || {};
      const row = await ideas.addIdea({
        userId: b.user_id || req.user?.id || '1',
        label: b.label,
        description: b.description,
        origin: b.origin,
        status: b.status,
      });
      res.status(201).json({ ok: true, idea: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/ideas/link', async (req, res) => {
    try {
      const b = req.body || {};
      const row = await ideas.linkIdeas({
        userId: b.user_id || req.user?.id || '1',
        fromIdea: b.from_idea || b.fromIdea,
        toIdea: b.to_idea || b.toIdea,
        relation: b.relation,
        note: b.note,
      });
      res.status(201).json({ ok: true, edge: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.patch('/ideas/:id/status', async (req, res) => {
    try {
      const row = await ideas.setIdeaStatus({
        ideaId: req.params.id,
        status: (req.body || {}).status,
      });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, idea: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Era-3: Curiosity + energy ──
  router.get('/curiosity', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const rows = await extend.listCuriosity(userId, { status: req.query.status || 'open' });
      res.json({ ok: true, prompts: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/curiosity', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await extend.suggestCuriosity({
        userId: b.user_id || req.user?.id || '1',
        limit: b.limit,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/energy', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const out = await extend.energyAdvisory({ userId });
      res.status(out.ok ? 200 : 422).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Era-4: Trust Me ──
  router.get('/trust/can-act', async (req, res) => {
    try {
      const out = await trust.canAct({
        userId: String(req.query.user_id || req.user?.id || '1'),
        domain: String(req.query.domain || 'general'),
        stakes: String(req.query.stakes || 'medium'),
        action: req.query.action || null,
      });
      res.status(out.ok ? 200 : 422).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/trust/scopes', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const scopes = await trust.listDelegationScopes(userId);
      res.json({ ok: true, scopes });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/trust/scopes/sync', async (req, res) => {
    try {
      const userId = String((req.body || {}).user_id || req.user?.id || '1');
      const out = await trust.syncDelegationScopes(userId);
      res.status(out.ok ? 200 : 422).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/trust/scopes/approve', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await trust.approveDelegationScope({
        userId: b.user_id || req.user?.id || '1',
        domain: b.domain,
        stakesMax: b.stakes_max,
        approvedActions: b.approved_actions,
        notes: b.notes,
      });
      res.status(out.ok ? 200 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/trust/actions', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const rows = await trust.listAutonomousActions(userId, {
        status: req.query.status || null,
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, actions: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/trust/actions', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await trust.proposeAutonomousAction({
        userId: b.user_id || req.user?.id || '1',
        domain: b.domain,
        proposedAction: b.proposed_action || b.action,
        reasoning: b.reasoning,
        stakes: b.stakes,
        decisionId: b.decision_id,
        executeIfAllowed: b.execute_if_allowed === true,
      });
      res.status(201).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/trust/actions/:id/override', async (req, res) => {
    try {
      const b = req.body || {};
      const row = await trust.overrideAutonomousAction({
        actionId: req.params.id,
        overrideNote: b.override_note || b.note,
        status: b.status || 'overridden',
      });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, action: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/trust/debate', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await trust.runExpertDebate({
        userId: b.user_id || req.user?.id || '1',
        question: b.question,
        advisorIds: b.advisor_ids || b.advisors,
        decisionId: b.decision_id,
        options: b.options,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/trust/models', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const models = await trust.listMentalModels(userId);
      res.json({ ok: true, models });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/trust/models/compress', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await trust.compressMemory({
        userId: b.user_id || req.user?.id || '1',
        lookback: b.lookback,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/trust/legacy', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const entries = await trust.listLegacy(userId, { kind: req.query.kind || null });
      res.json({ ok: true, entries });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/trust/legacy', async (req, res) => {
    try {
      const b = req.body || {};
      const row = await trust.recordLegacy({
        userId: b.user_id || req.user?.id || '1',
        kind: b.kind,
        title: b.title,
        content: b.content,
        domain: b.domain,
        confidence: b.confidence,
        evidence: b.evidence,
      });
      res.status(201).json({ ok: true, entry: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/trust/apprentice/:decisionId', async (req, res) => {
    try {
      const out = await trust.teachApprenticeship({
        userId: (req.body || {}).user_id || req.user?.id || '1',
        decisionId: req.params.decisionId,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default createCognitiveCoreRoutes;
