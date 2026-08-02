/**
 * SYNOPSIS: Smoke tests for Phase 1 constitutional learning architecture engines.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const load = async (n) => import(pathToFileURL(path.join(root, `services/${n}.js`)).href);

test('human-constellation exports and runs', async () => {
  const m = await load('human-constellation');
  const c = m.createConstellation('p1');
  assert.equal(c.personId, 'p1');
  const n1 = m.addObservation(c, 'value', { label: 'family' });
  const n2 = m.addObservation(c, 'goal', { label: 'spend time' });
  m.weightEdge(c, n1.id, n2.id, { strength: 0.8 });
  const view = m.projectForProduct(c, 'lifeos');
  assert.equal(view.personId, 'p1');
  assert.ok(view.nodes.length >= 2);
  assert.ok(view.edges.length >= 1);
});

test('reality-alignment exports and runs', async () => {
  const m = await load('reality-alignment');
  const r = m.computeRealityAlignment({
    observed: ['sun rises'],
    experienced: ['felt warm'],
    remembered: ['always rises'],
    predicted: ['will rise'],
    shared: ['sun rises'],
  }, 'sun rises');
  assert.equal(typeof r.alignment_score, 'number');
  assert.ok(Array.isArray(r.drift_report));
  assert.equal(typeof r.reconciliation, 'string');
  const d = m.explainDrift({ observed: ['a'], experienced: ['b'] });
  assert.ok(Array.isArray(d));
  const pc = m.promoteConfidence({ observed: ['x'] }, 'claim', { alignment_score: 0.9, drift_report: [] });
  assert.ok(pc);
});

test('confidence-vector exports and runs', async () => {
  const m = await load('confidence-vector');
  const sc = m.scoreConfidence({ type: 'observation', weight: 1 });
  assert.equal(typeof sc.epistemic, 'number');
  assert.equal(typeof sc.commitment, 'number');
  const pt = m.promoteEvidenceTier({ type: 'empirical', weight: 1 }, 'Hypothesis');
  assert.equal(typeof pt.newTier, 'string');
  assert.equal(typeof pt.confidence.epistemic, 'number');
});

test('causality-engine exports and runs', async () => {
  const m = await load('causality-engine');
  const causes = m.estimateCauses([{ type: 'stress', timestamp: 1 }, { type: 'interrupt', timestamp: 2 }], {});
  assert.ok(causes && Array.isArray(causes.edges));
  const interventions = m.proposeInterventions({ name: 'calm' }, []);
  assert.ok(Array.isArray(interventions));
  const score = m.scoreCausalModel({ edges: [{ from: 'a', to: 'b', confidence: 0.8 }] }, [{ from: 'a', to: 'b', observed: true }]);
  assert.equal(typeof score.fit, 'number');
  assert.equal(typeof score.accuracy, 'number');
});

test('readiness-engine exports and runs', async () => {
  const m = await load('readiness-engine');
  const recipient = { cognitiveLoad: 0.3, emotionalState: 'calm', constellation: { avoidances: ['avoid conflict'] } };
  const insight = { topic: 'conflict', complexity: 'low', emotionalWeight: 'low' };
  const r = m.assessReadiness(recipient, insight);
  assert.equal(typeof r.readiness_score, 'number');
  assert.equal(typeof r.risk_if_forced, 'string');
  const avoid = m.detectAvoidancePattern({ avoidances: ['avoid conflict'] }, 'conflict');
  assert.equal(typeof avoid, 'boolean');
  const form = m.selectForm(recipient, insight);
  assert.equal(typeof form, 'string');
});

test('perspective-expansion exports and runs', async () => {
  const m = await load('perspective-expansion');
  const summary = m.generatePerspectiveSummary({
    nodes: [{ type: 'states', name: 'overwhelmed' }],
    edges: [],
  }, 'I feel overwhelmed');
  assert.equal(typeof summary, 'string');
  const needs = m.identifyUnstatedNeeds({
    nodes: [
      { id: 'v1', type: 'values', name: 'family' },
      { id: 'r1', type: 'risks', name: 'conflict', strength: 0.8 },
    ],
    edges: [],
  });
  assert.ok(Array.isArray(needs));
  const q = m.askBetterQuestion({
    nodes: [
      { id: 'n1', type: 'needs', name: 'connection', strength: 0.9 },
      { id: 'g1', type: 'goals', name: 'balance', strength: 0.8 },
    ],
    edges: [],
  });
  assert.equal(typeof q, 'string');
});

test('calibration-ledger exports and runs', async () => {
  const m = await load('calibration-ledger');
  const predId = m.recordPrediction({ officeId: 'p1', modelId: 'm1', prediction: 1 });
  assert.ok(predId);
  const out = m.recordOutcome(predId, 1);
  assert.equal(out, true);
  assert.equal(typeof m.getCalibrationScore('p1'), 'number');
  assert.equal(typeof m.getTrustScore('p1'), 'number');
});

test('office-trust-ledger exports and runs', async () => {
  const m = await load('office-trust-ledger');
  const upd = m.updateTrust('chair', 'transparency', 0.5);
  assert.ok(upd);
  const score = m.getTrustScore('chair');
  assert.ok(score);
});

test('solomon-wisdom-lab exports and runs', async () => {
  const m = await load('solomon-wisdom-lab');
  let pkg = m.createEvidencePackage('topic');
  pkg = m.addFinding(pkg, { text: 'finding' });
  pkg = m.addRecommendation(pkg, 'recommend', true);
  const rev = m.getRevelation(pkg, 'decided');
  assert.equal(rev, 'recommend');
});
