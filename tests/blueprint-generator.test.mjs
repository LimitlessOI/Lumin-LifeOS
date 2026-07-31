/**
 * SYNOPSIS: mjs — tests/blueprint-generator.test.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { generateBlueprint, reviewBlueprint, loadBlueprint } from '../factory-staging/factory-core/builder/blueprint-generator.mjs';
import { createReasoningPlan } from '../factory-staging/factory-core/builder/reasoning-plan.mjs';

test('generateBlueprint produces a full blueprint from a reasoning plan and chair synthesis', () => {
  const plan = createReasoningPlan({
    mission: 'Should we build a new competition-tracking lens that reasons through product priorities across all products?',
    chairContext: { domain: 'build' },
    systemFacts: { strategic_brief: 'brief' },
  });
  const synthesis = {
    chair_position: 'Build the lens after a SENTRY-mandated prototype phase.',
    tradeoffs: ['cost', 'scope'],
    named_disagreements: [{ lens_id: 'competition', issue: 'scope' }],
    why_this_wins: ' aligned with founder intent',
    propagated_confidence: 0.71,
    limiting_factor: 'Security lens at 0.42 because auth scope is undefined',
    unknowns: ['auth scope'],
    assumptions: ['founder wants this'],
    risks: ['burn budget'],
    evidence_needed: ['auth scope doc'],
    next_action: 'ship prototype',
  };
  const bp = generateBlueprint({ reasoningPlan: plan, chairSynthesis: synthesis });

  assert.ok(bp.id, 'blueprint has id');
  assert.strictEqual(bp.schema, 'builderos_blueprint_v1');
  assert.ok(bp.purpose.full_statement, 'purpose present');
  assert.ok(bp.architecture.components.length > 0, 'architecture components present');
  assert.ok(bp.acceptance_criteria.length > 0, 'acceptance criteria present');
  assert.strictEqual(bp.sentry_plan.mandatory, plan.gates.sentry_mandatory);
  assert.strictEqual(bp.reality_metrics.propagated_confidence, 0.71);
  assert.strictEqual(bp.reality_metrics.limiting_factor, 'Security lens at 0.42 because auth scope is undefined');
  assert.ok(loadBlueprint(bp.id), 'blueprint persisted');
});

test('reviewBlueprint passes a valid blueprint and rejects incomplete ones', () => {
  const plan = createReasoningPlan({ mission: 'Should we simplify onboarding?', chairContext: { domain: 'build' } });
  const bp = generateBlueprint({ reasoningPlan: plan, chairSynthesis: { propagated_confidence: 0.8, limiting_factor: 'none' } });
  const review = reviewBlueprint(bp);
  assert.strictEqual(review.ok, true);
  assert.deepStrictEqual(review.reasons, []);

  const bad = reviewBlueprint({});
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.reasons.length > 0);
});

test('reviewBlueprint rejects Type C blueprints missing founder approval', () => {
  const bp = {
    purpose: { full_statement: 'x' },
    acceptance_criteria: ['a'],
    implementation_order: ['b'],
    sentry_plan: { mandatory: true },
    classification: { type: 'C' },
    gates: { founder_approval_required: false },
    reality_metrics: { propagated_confidence: 0.9 },
  };
  const review = reviewBlueprint(bp);
  assert.strictEqual(review.ok, false);
  assert.ok(review.reasons.includes('type_c_requires_founder_approval'));
});
