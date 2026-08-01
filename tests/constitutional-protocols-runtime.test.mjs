/**
 * SYNOPSIS: Runtime tests for constitutional protocol services.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { splitKnowledgeAndJudgment, tagOutput } from '../services/knowledge-judgment-split.js';
import { decomposeGoal, nextReadySubGoal, markSubGoalDone } from '../services/goal-decomposition.js';
import { computeCognitiveSpineHealth, recordModelCall } from '../services/cognitive-spine-health.js';
import { auditFileLineage, trackAmendment } from '../services/asset-evolution-governance.js';
import { reconcileRealitySources, shouldEscalateToChair } from '../services/reality-hierarchy-reconciler.js';
import { decideInteraction, shouldAskFounder } from '../services/founder-cognitive-load-optimizer.js';

test('knowledge-judgment split separates facts from judgments', () => {
  const input = 'The sky is blue. I think it will rain. We are not sure about the storm.';
  const out = splitKnowledgeAndJudgment(input);
  assert(out.facts.includes('The sky is blue.'));
  assert(out.judgments.some((s) => s.includes('rain')));
  assert(out.unknowns.some((s) => s.includes('not sure')));
  assert(out.confidence > 0 && out.confidence <= 1);
});

test('goal decomposition produces ready sub-goals', () => {
  const goal = decomposeGoal({
    id: 'g1',
    title: 'Test goal',
    description: 'd',
    steps: ['a', { title: 'b', depends_on: ['a'] }],
  });
  assert.strictEqual(goal.sub_goals.length, 2);
  assert.strictEqual(goal.ready_sub_goals.length, 1);
  const next = nextReadySubGoal(goal);
  assert.strictEqual(next.title, 'a');
});

test('cognitive-spine health returns healthy consensus', () => {
  const h = computeCognitiveSpineHealth({
    reasoningSteps: [{ consensus: true, propagated_confidence: 0.8 }],
    modelCalls: [{ tier: 'cheap' }],
    confidenceHistory: [0.6, 0.7],
  });
  assert.strictEqual(typeof h.depth, 'number');
  assert.strictEqual(h.healthy, true);
});

test('asset-evolution governance flags deprecated paths', () => {
  const audit = auditFileLineage('public/overlay/lifeos-communication.html', 'docs/products/lifeos/PRODUCT_HOME.md');
  assert.strictEqual(audit.canonical, false);
  assert(audit.deprecated.length > 0);
});

test('reality reconciler flags production/sha divergence', () => {
  const r = reconcileRealitySources({
    production: { sha: 'abc' },
    chairConsensus: { sha: 'def' },
  });
  assert.strictEqual(r.aligned, false);
  assert.strictEqual(r.highest_severity, 'high');
  assert.strictEqual(shouldEscalateToChair(r), true);
});

test('founder cognitive-load optimizer asks for irreversible decisions', () => {
  const d = decideInteraction({ reversibility: 'irreversible_or_money_or_auth', cost_of_error: 100, confidence: 0.9 });
  assert.strictEqual(d.action, 'ask_founder');
  assert.strictEqual(shouldAskFounder({ reversibility: 'reversible_without_data_loss', cost_of_error: 0, confidence: 0.9 }), false);
});
