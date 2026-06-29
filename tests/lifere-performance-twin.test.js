/**
 * SYNOPSIS: LifeRE Performance Twin unit tests.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeConversionRates,
  findBottleneck,
  activitiesToGoal,
  skillDeltaImpact,
} from '../services/lifere-performance-twin.js';

test('findBottleneck detects weakest stage with volume', () => {
  const funnel = {
    conversations: 100,
    calls: 40,
    appointments_set: 10,
    appointments_held: 8,
    signed_clients: 2,
    closings: 1,
  };
  const rates = computeConversionRates(funnel);
  const b = findBottleneck(rates, funnel);
  assert.ok(b.stage);
  assert.ok(b.rate <= 0.4);
});

test('activitiesToGoal returns conversation count', () => {
  const rates = computeConversionRates({
    conversations: 50,
    calls: 30,
    appointments_set: 10,
    appointments_held: 8,
    signed_clients: 4,
    closings: 2,
  });
  const goal = activitiesToGoal({ rates, goalGci: 30000, avgCommission: 8500 });
  assert.ok(goal.conversations_needed > 0);
  assert.equal(goal.goal_gci, 30000);
});

test('skillDeltaImpact saves conversations when rate improves', () => {
  const r = skillDeltaImpact({ baselineRate: 0.08, improvedRate: 0.12, goalGci: 30000 });
  assert.ok(r.conversations_saved >= 0);
});
