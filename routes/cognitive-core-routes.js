/**
 * SYNOPSIS: Cognitive Core Era-1–10 API — journal through Govern Me + Multiply Me.
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
import { createCognitiveCorePreserve } from '../services/cognitive-core-preserve.js';
import { createCognitiveCoreTransmit } from '../services/cognitive-core-transmit.js';
import { createCognitiveCoreCalibrate } from '../services/cognitive-core-calibrate.js';
import { createCognitiveCoreCompound } from '../services/cognitive-core-compound.js';
import { createCognitiveCoreGovern } from '../services/cognitive-core-govern.js';
import { createCognitiveCoreMultiply } from '../services/cognitive-core-multiply.js';
import { createCognitiveCoreOracle } from '../services/cognitive-core-oracle.js';
import { createCognitiveCoreCapture } from '../services/cognitive-core-capture.js';
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
  const preserve = createCognitiveCorePreserve({ pool, logger });
  const transmit = createCognitiveCoreTransmit({ pool, logger });
  const calibrate = createCognitiveCoreCalibrate({ pool, logger });
  const compound = createCognitiveCoreCompound({ pool, logger });
  const govern = createCognitiveCoreGovern({ pool, logger });
  const multiply = createCognitiveCoreMultiply({ pool, logger });
  const oracle = createCognitiveCoreOracle({ pool, logger });
  const capture = createCognitiveCoreCapture({ pool, logger, oracle });

  if (typeof requireKey === 'function') {
    router.use(requireKey);
  }

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      product: 'cognitive-core',
      era: 10,
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
      era5: [
        'judgment_packages', 'legacy_transmission', 'confidence_map',
      ],
      era6: [
        'capsule_marketplace', 'subconscious_interrupts', 'cognitive_debt',
        'consequence_trees', 'portable_handshake',
      ],
      era7: [
        'decision_heuristics', 'calibration_dashboard', 'trust_transfer',
        'high_stakes_auto_tree', 'recalibration_rituals',
      ],
      era8: [
        'product_consumers', 'cross_product_can_act', 'improvement_proposals',
        'compound_log', 'role_sync', 'autonomy_ladder_review',
      ],
      era9: [
        'integrity_auditor', 'constitutional_conformance', 'calibration_decay',
        'compiler_drift_ledger', 'self_audit_findings',
      ],
      era10: [
        'advisor_council_consensus', 'cohort_benchmark', 'judgment_replay_sim',
        'compound_roi_ledger', 'ship_queue_bridge',
      ],
      loop_closed: true,
      closed_loop: [
        'outcome_oracle_from_receipts', 'murphy_decomposition', 'calibration_e_value',
        'platt_recalibration', 'chow_decide_gate', 'receipt_provenance',
      ],
      auto_capture: [
        'founder_build_decision_capture', 'language_implied_prior',
        'deterministic_job_resolve', 'auto_resolve_sweep',
      ],
      loop_subject: 'principal_judgment',
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

  // ── Era-5 Preserve Me ────────────────────────────────────────────────
  router.get('/preserve/packages', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const packages = await preserve.listPackages(userId, {
        status: req.query.status || null,
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, packages, framing_note: preserve.FRAMING });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/preserve/packages/:id', async (req, res) => {
    try {
      const pkg = await preserve.getPackage(req.params.id);
      if (!pkg) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, package: pkg, framing_note: preserve.FRAMING });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/preserve/packages', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await preserve.createPackage({
        userId: b.user_id || req.user?.id || '1',
        label: b.label,
        seal: b.seal === true,
      });
      res.status(201).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/preserve/packages/:id/seal', async (req, res) => {
    try {
      const out = await preserve.sealPackage({
        packageId: req.params.id,
        userId: (req.body || {}).user_id || req.user?.id || '1',
      });
      res.status(out.ok ? 200 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/preserve/transmissions', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const transmissions = await preserve.listTransmissions(userId, {
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, transmissions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/preserve/transmit', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await preserve.transmitPackage({
        packageId: b.package_id,
        userId: b.user_id || req.user?.id || '1',
        recipientLabel: b.recipient_label || b.recipient,
        purpose: b.purpose,
        consentAttested: b.consent_attested === true || b.consent === true,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Era-6 Transmit Me ────────────────────────────────────────────────
  router.get('/transmit/marketplace', async (req, res) => {
    try {
      const listings = await transmit.listMarketplace({
        visibility: req.query.visibility || null,
        status: req.query.status || 'published',
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, listings });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transmit/marketplace', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await transmit.publishListing({
        userId: b.user_id || req.user?.id || '1',
        packageId: b.package_id,
        title: b.title,
        description: b.description,
        visibility: b.visibility,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/transmit/marketplace/:id/install', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await transmit.installListing({
        userId: b.user_id || req.user?.id || '1',
        listingId: req.params.id,
        worn: b.worn === true,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/transmit/debt', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      if (req.query.refresh === '1' || req.query.refresh === 'true') {
        await transmit.refreshDebt(userId);
      }
      const items = await transmit.listDebt(userId, {
        status: req.query.status || 'open',
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, debt: items });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transmit/debt/refresh', async (req, res) => {
    try {
      const userId = (req.body || {}).user_id || req.user?.id || '1';
      const out = await transmit.refreshDebt(userId);
      res.json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transmit/debt/:id/resolve', async (req, res) => {
    try {
      const row = await transmit.resolveDebt({
        debtId: req.params.id,
        status: (req.body || {}).status || 'resolved',
      });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, debt: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/transmit/interrupts', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const interrupts = await transmit.listInterrupts(userId, {
        status: req.query.status || 'pending',
        limit: Number(req.query.limit) || 30,
      });
      res.json({ ok: true, interrupts });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transmit/interrupts/generate', async (req, res) => {
    try {
      const userId = (req.body || {}).user_id || req.user?.id || '1';
      const out = await transmit.generateInterrupts(userId);
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transmit/interrupts/:id/dismiss', async (req, res) => {
    try {
      const row = await transmit.dismissInterrupt({
        interruptId: req.params.id,
        status: (req.body || {}).status || 'dismissed',
      });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, interrupt: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/transmit/trees', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const trees = await transmit.listConsequenceTrees(userId, {
        limit: Number(req.query.limit) || 20,
      });
      res.json({ ok: true, trees });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transmit/trees', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await transmit.buildConsequenceTree({
        userId: b.user_id || req.user?.id || '1',
        question: b.question,
        depth: b.depth,
        decisionId: b.decision_id,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/transmit/imports', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const imports = await transmit.listImports(userId, {
        limit: Number(req.query.limit) || 30,
      });
      res.json({ ok: true, imports });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transmit/imports/accept', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await transmit.acceptTransmission({
        userId: b.user_id || req.user?.id || '1',
        transmissionId: b.transmission_id,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Era-7 Calibrate Me ───────────────────────────────────────────────
  router.get('/calibrate/heuristics', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const heuristics = await calibrate.listHeuristics(userId, {
        status: req.query.status || 'active',
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, heuristics });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/calibrate/heuristics/seed', async (req, res) => {
    try {
      const userId = (req.body || {}).user_id || req.user?.id || '1';
      const out = await calibrate.seedHeuristics(userId);
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/calibrate/heuristics', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await calibrate.createHeuristic({
        userId: b.user_id || req.user?.id || '1',
        name: b.name,
        rule: b.rule,
        whenToUse: b.when_to_use,
        whenNotToUse: b.when_not_to_use,
        domain: b.domain,
        confidence: b.confidence,
      });
      res.status(201).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/calibrate/heuristics/:id/activate', async (req, res) => {
    try {
      const row = await calibrate.activateHeuristic({
        heuristicId: req.params.id,
        hit: (req.body || {}).hit === true,
      });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, heuristic: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/calibrate/dashboard', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const out = await calibrate.getCalibrationDashboard(userId);
      res.json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/calibrate/transfers', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const proposals = await calibrate.listTrustTransfers(userId, {
        status: req.query.status || 'proposed',
      });
      res.json({ ok: true, proposals });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/calibrate/transfers/propose', async (req, res) => {
    try {
      const userId = (req.body || {}).user_id || req.user?.id || '1';
      const out = await calibrate.proposeTrustTransfers(userId);
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/calibrate/transfers/:id/resolve', async (req, res) => {
    try {
      const row = await calibrate.resolveTrustTransfer({
        transferId: req.params.id,
        status: (req.body || {}).status || 'accepted',
      });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, transfer: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/calibrate/auto-tree', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await calibrate.maybeAutoTree({
        userId: b.user_id || req.user?.id || '1',
        question: b.question,
        stakes: b.stakes || 'high',
        decisionId: b.decision_id,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/calibrate/auto-tree', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const triggers = await calibrate.listAutoTreeTriggers(userId);
      res.json({ ok: true, triggers });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/calibrate/ritual', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await calibrate.runRecalibrationRitual({
        userId: b.user_id || req.user?.id || '1',
        triggerKind: b.trigger_kind || 'manual',
        domain: b.domain || null,
      });
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/calibrate/rituals', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const rituals = await calibrate.listRituals(userId);
      res.json({ ok: true, rituals });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Era-8 Compound Me ────────────────────────────────────────────────
  router.get('/compound/consumers', async (_req, res) => {
    try {
      const consumers = await compound.listConsumers();
      res.json({ ok: true, consumers });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/compound/consumers/seed', async (_req, res) => {
    try {
      const out = await compound.registerDefaultConsumers();
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/compound/can-act', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await compound.canActForProduct({
        userId: b.user_id || req.user?.id || '1',
        productId: b.product_id || b.product,
        domain: b.domain,
        stakes: b.stakes || 'low',
        actionHint: b.action,
      });
      res.status(out.ok ? 200 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/compound/can-act/calls', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const calls = await compound.listCanActCalls(userId, {
        productId: req.query.product_id || null,
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, calls });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/compound/log', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const entries = await compound.listCompoundLog(userId, {
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, entries });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/compound/improvements', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const proposals = await compound.listImprovementProposals(userId, {
        status: req.query.status || 'proposed',
      });
      res.json({ ok: true, proposals });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/compound/improvements/from-debt', async (req, res) => {
    try {
      const userId = (req.body || {}).user_id || req.user?.id || '1';
      const out = await compound.proposeImprovementsFromDebt(userId);
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/compound/improvements/:id', async (req, res) => {
    try {
      const row = await compound.updateImprovementProposal({
        proposalId: req.params.id,
        status: (req.body || {}).status || 'queued',
      });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, proposal: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/compound/role-sync', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await compound.syncRolePackage({
        userId: b.user_id || req.user?.id || '1',
        packageId: b.package_id,
        roleLabel: b.role_label || b.role,
        direction: b.direction || 'export',
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/compound/role-syncs', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const syncs = await compound.listRoleSyncs(userId);
      res.json({ ok: true, syncs });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/compound/ladder/review', async (req, res) => {
    try {
      const userId = (req.body || {}).user_id || req.user?.id || '1';
      const out = await compound.reviewAutonomyLadder(userId);
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/compound/ladder', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const reviews = await compound.listLadderReviews(userId, {
        status: req.query.status || 'suggested',
      });
      res.json({ ok: true, reviews });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/compound/ladder/:id/resolve', async (req, res) => {
    try {
      const row = await compound.resolveLadderReview({
        reviewId: req.params.id,
        status: (req.body || {}).status || 'applied',
      });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, review: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Era-9 Govern Me ──────────────────────────────────────────────────
  router.post('/govern/audit', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await govern.runIntegrityAudit({
        userId: b.user_id || req.user?.id || '1',
        scope: b.scope || 'full',
      });
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/govern/audits', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const audits = await govern.listAudits(userId, { limit: Number(req.query.limit) || 20 });
      res.json({ ok: true, audits });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/govern/findings', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const findings = await govern.listFindings(userId, {
        status: req.query.status || 'open',
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, findings });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/govern/findings/:id', async (req, res) => {
    try {
      const row = await govern.updateFinding({
        findingId: req.params.id,
        status: (req.body || {}).status || 'queued',
      });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, finding: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/govern/drift', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const drift = await govern.listDrift(userId, {
        resolved: req.query.resolved === '1' || req.query.resolved === 'true',
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, drift });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/govern/drift/:id/resolve', async (req, res) => {
    try {
      const row = await govern.resolveDrift({ driftId: req.params.id });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, drift: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/govern/conformance', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const checks = await govern.checkConstitution(userId);
      res.json({ ok: true, checks });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Era-10 Multiply Me ───────────────────────────────────────────────
  router.post('/multiply/council', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await multiply.runCouncil({
        userId: b.user_id || req.user?.id || '1',
        question: b.question,
        advisorIds: b.advisor_ids || b.advisors || [],
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/multiply/council', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const sessions = await multiply.listCouncilSessions(userId, { limit: Number(req.query.limit) || 20 });
      res.json({ ok: true, sessions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/multiply/benchmark', async (req, res) => {
    try {
      const userId = (req.body || {}).user_id || req.user?.id || '1';
      const out = await multiply.benchmarkCohort(userId);
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/multiply/benchmarks', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const benchmarks = await multiply.listBenchmarks(userId, { limit: Number(req.query.limit) || 30 });
      res.json({ ok: true, benchmarks });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/multiply/replay', async (req, res) => {
    try {
      const userId = (req.body || {}).user_id || req.user?.id || '1';
      const out = await multiply.replayJudgment(userId);
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/multiply/replays', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const runs = await multiply.listReplays(userId, { limit: Number(req.query.limit) || 20 });
      res.json({ ok: true, runs });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/multiply/roi', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await multiply.recordRoi(b.user_id || req.user?.id || '1', {
        windowDays: b.window_days,
      });
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/multiply/roi', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const roi = await multiply.listRoi(userId, { limit: Number(req.query.limit) || 30 });
      res.json({ ok: true, roi });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/multiply/bridge', async (req, res) => {
    try {
      const userId = (req.body || {}).user_id || req.user?.id || '1';
      const out = await multiply.bridgeFindingsToQueue(userId);
      res.status(201).json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/multiply/bridge', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const items = await multiply.listBridgeItems(userId, {
        status: req.query.status || 'staged',
        limit: Number(req.query.limit) || 50,
      });
      res.json({ ok: true, items });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/multiply/bridge/:id', async (req, res) => {
    try {
      const row = await multiply.updateBridgeItem({
        bridgeId: req.params.id,
        status: (req.body || {}).status || 'submitted',
      });
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, item: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Closed loop: Outcome Oracle + calibration engine + decide gate ─────
  // Layer A — resolve a journaled decision's outcome from a REAL receipt (no retype).
  router.post('/oracle/resolve', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await oracle.resolveFromReceipt({
        userId: b.user_id || req.user?.id || '1',
        decisionId: b.decision_id,
        receiptKind: b.receipt_kind || b.kind,
        receiptRef: b.receipt_ref || b.ref,
        verdict: b.verdict,
        raw: b.raw || {},
        observedAt: b.observed_at,
        outcomeVocab: b.outcome_vocab || null,
      });
      res.status(out.ok ? 201 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // The rich mirror — proper-scoring metrics on real resolved rows.
  router.get('/oracle/report', async (req, res) => {
    try {
      const out = await oracle.calibrationReport({
        userId: String(req.query.user_id || req.user?.id || '1'),
        domain: req.query.domain || null,
      });
      res.json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Load-bearing: proceed / verify / abstain, corrected by track record + stake.
  router.post('/oracle/decide', async (req, res) => {
    try {
      const b = req.body || {};
      const out = await oracle.decide({
        userId: b.user_id || req.user?.id || '1',
        domain: b.domain || 'general',
        statedProb: b.stated_prob ?? b.p ?? b.confidence,
        stake: b.stake,
        stakesLabel: b.stakes || b.stakes_label,
        verifyCost: b.verify_cost,
        decisionId: b.decision_id,
      });
      res.status(out.ok ? 200 : 422).json(out);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/oracle/receipts', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const links = await oracle.listReceiptLinks(userId, { limit: Number(req.query.limit) || 50 });
      res.json({ ok: true, receipts: links });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/oracle/decide-log', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const log = await oracle.listDecideLog(userId, { limit: Number(req.query.limit) || 50 });
      res.json({ ok: true, decide_log: log });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Auto-capture: real founder ship/build decisions → prediction, then auto-resolve ──
  // Journal a decision with a prior inferred from the founder's own language.
  router.post('/oracle/capture', async (req, res) => {
    try {
      const b = req.body || {};
      const text = b.text || b.message || b.question;
      const kind = capture.detectShipDecision(text);
      if (!kind && b.force !== true) {
        return res.status(422).json({ ok: false, reason: 'not_a_ship_build_decision', hint: 'pass force:true to capture anyway' });
      }
      const out = await capture.captureBuildDecision({
        userId: b.user_id || req.user?.id || '1',
        text,
        threadId: b.thread_id || null,
        stakes: b.stakes || 'medium',
        jobId: b.job_id || null,
        commitSha: b.commit_sha || null,
        channel: b.channel || null,
      });
      // If a terminal build result was supplied inline, resolve deterministically now.
      if (out?.ok && out.decision_id && !out.deduped && b.pass_fail) {
        out.resolution = await capture.resolveCaptured({
          userId: b.user_id || req.user?.id || '1',
          decisionId: out.decision_id,
          commitSha: b.commit_sha || null,
          jobId: b.job_id || null,
          passFail: String(b.pass_fail).toUpperCase(),
        }).catch((e) => ({ ok: false, reason: e.message }));
      }
      res.status(out?.ok ? 201 : 422).json({ ship_kind: kind, ...out });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // Reconcile open founder_build decisions against the in-process build job store.
  router.post('/oracle/sweep', async (req, res) => {
    try {
      const out = await capture.sweepOpenBuildDecisions({
        userId: (req.body || {}).user_id || req.query.user_id || req.user?.id || '1',
        limit: Number((req.body || {}).limit || req.query.limit) || 100,
      });
      res.json(out);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Visibility: open founder ship/build decisions awaiting a receipt.
  router.get('/oracle/build-decisions', async (req, res) => {
    try {
      const userId = String(req.query.user_id || req.user?.id || '1');
      const rows = await core.listOpenDecisions(userId, Number(req.query.limit) || 50);
      const decisions = rows
        .filter((d) => d.source_surface === capture.SOURCE_SURFACE)
        .map((d) => ({
          decision_id: d.decision_id,
          question: d.question,
          predicted_option: d.predicted_option,
          prior_confidence: d.confidence,
          prior_source: d.situation_snapshot?.prior_source || null,
          job_id: d.situation_snapshot?.job_id || null,
          commit_sha: d.situation_snapshot?.commit_sha || null,
          created_at: d.created_at,
        }));
      res.json({ ok: true, subject: 'principal_judgment', open_build_decisions: decisions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default createCognitiveCoreRoutes;