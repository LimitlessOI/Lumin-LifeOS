/**
 * SYNOPSIS: mjs — tests/reasoning-plan.test.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { createReasoningPlan, classifyMission, loadReasoningPlan, reasoningPlanGate, propagateOverallConfidence } from '../factory-staging/factory-core/builder/reasoning-plan.mjs';

test('classifyMission produces Constitutional Decision Engine classification', () => {
  const mission = 'We need to change the constitution and deploy a billing integration that handles customer payment data across all products.';
  const c = classifyMission({ mission });
  assert.strictEqual(c.type, 'C');
  assert.strictEqual(c.affects_constitutional_behavior, true);
  assert.strictEqual(c.affects_money, true);
  assert.strictEqual(c.affects_customer_data, true);
  assert.strictEqual(c.scope, 'system-wide');
  assert.strictEqual(c.reversibility, 'low');
});

test('classifyMission rates a UI copy change as Type A', () => {
  const c = classifyMission({ mission: 'Update the button label color and help text on the onboarding screen.' });
  assert.strictEqual(c.type, 'A');
  assert.strictEqual(c.reversibility, 'high');
  assert.strictEqual(c.affects_security, false);
});

test('createReasoningPlan persists a plan and gate passes', () => {
  const plan = createReasoningPlan({
    mission: 'Should we add a new security lens to the Chair reasoning pipeline?',
    chairContext: { domain: 'build' },
    systemFacts: { strategic_brief: 'brief' },
  });
  assert.ok(plan.id, 'plan has id');
  assert.ok(plan.classification.type, 'plan has classification');
  assert.ok(plan.budget.max_model_calls > 0, 'plan has budget');
  assert.ok(plan.responsibilities.includes('chair'), 'chair responsibility');
  assert.ok(plan.gates.sentry_mandatory, 'security-related mission triggers SENTRY');

  const gate = reasoningPlanGate(plan);
  assert.strictEqual(gate.ok, true);

  const loaded = loadReasoningPlan(plan.id);
  assert.ok(loaded, 'plan persisted');
  assert.strictEqual(loaded.id, plan.id);
});

test('propagateOverallConfidence calculates overall and limiting factor', () => {
  const outputs = [
    { lens_id: 'l1', responsibility: 'chair', parsed: { confidence: 0.9 } },
    { lens_id: 'l2', responsibility: 'security', parsed: { confidence: 0.5 } },
    { lens_id: 'l3', responsibility: 'cfo', parsed: { confidence: 0.8 } },
  ];
  const pc = propagateOverallConfidence(outputs);
  assert.strictEqual(pc.overall < pc.avg, true, 'spread penalty lowers propagated confidence');
  assert.ok(pc.limiting_factor.includes('security/l2'), `limiting factor is security lens: ${pc.limiting_factor}`);
  assert.strictEqual(pc.by_lens.length, 3);
});

test('reasoningPlanGate rejects invalid plan', () => {
  assert.strictEqual(reasoningPlanGate(null).ok, false);
  assert.strictEqual(reasoningPlanGate({}).ok, false);
  assert.strictEqual(reasoningPlanGate({ intent: 'x' }).ok, false);
});
