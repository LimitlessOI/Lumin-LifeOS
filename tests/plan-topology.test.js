/**
 * SYNOPSIS: Proves the topology gates that the two-factory run showed were
 * missing — every cycle found (not just the first), every source step accounted
 * for, dispatch ordered by critical path, and parallelism reported honestly.
 *
 * The specific failure being regression-tested: a blueprint marked
 * `ready_to_execute: true` contained a five-step knot, and the report that
 * described the build silently omitted every step it could not schedule.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findCycles,
  stronglyConnectedComponents,
  scheduleWaves,
  criticalPathDepth,
  parallelismMetrics,
  accountForSteps,
  topologyReport,
  STEP_DISPOSITION,
  BLOCKER_ORIGIN,
} from '../scripts/plan-topology.mjs';
import { compileManufacturingPlan, verifyManufacturingPlan } from '../scripts/manufacturing-plan.mjs';
import { PLAN_DEFECT } from '../config/manufacturing-plan-schema.js';

const chain = (ids) => ids.map((id, i) => ({ id, depends_on: i === 0 ? [] : [ids[i - 1]] }));

test('every cycle is found, not merely the first one', () => {
  const nodes = [
    { id: 'A', depends_on: [] },
    { id: 'B', depends_on: ['C'] },
    { id: 'C', depends_on: ['B'] },
    { id: 'D', depends_on: ['E'] },
    { id: 'E', depends_on: ['F'] },
    { id: 'F', depends_on: ['D'] },
  ];
  const cycles = findCycles(nodes);
  assert.equal(cycles.length, 2, 'two separate knots exist and both must be reported');
  assert.deepEqual(cycles.map((c) => c.length).sort(), [2, 3]);
});

test('a node depending on itself is a cycle', () => {
  assert.deepEqual(findCycles([{ id: 'A', depends_on: ['A'] }]), [['A']]);
});

test('an acyclic graph reports no cycles and every node as its own component', () => {
  const nodes = chain(['A', 'B', 'C']);
  assert.deepEqual(findCycles(nodes), []);
  assert.equal(stronglyConnectedComponents(nodes).length, 3);
});

test('the schedulable part is scheduled even when part of the graph is knotted', () => {
  const nodes = [
    { id: 'A', depends_on: [] },
    { id: 'B', depends_on: [] },
    { id: 'X', depends_on: ['Y'] },
    { id: 'Y', depends_on: ['X'] },
  ];
  const { waves, unschedulable } = scheduleWaves(nodes);
  assert.deepEqual(waves, [['A', 'B']], 'the independent work is still plannable');
  assert.deepEqual(unschedulable, ['X', 'Y'], 'the knot is named, not dropped');
});

test('dispatch order prefers the slice that feeds the longest chain', () => {
  // E is independent and cheap. A starts a four-step chain. A must go first, or
  // the whole build waits on it later.
  const nodes = [...chain(['A', 'B', 'C', 'D']), { id: 'E', depends_on: [] }];
  const depth = criticalPathDepth(nodes);
  assert.equal(depth.get('A'), 3);
  assert.equal(depth.get('E'), 0);
  const { waves } = scheduleWaves(nodes);
  assert.deepEqual(waves[0], ['A', 'E'], 'critical-path work is ordered ahead of cheap independent work');
});

test('parallelism is reported as makespan, so lane count cannot pose as speed', () => {
  const oneWide = chain(['A', 'B', 'C', 'D', 'E']);
  const m = parallelismMetrics(scheduleWaves(oneWide).waves, 2);
  assert.equal(m.max_theoretical_parallelism, 1);
  assert.equal(m.critical_path_floor, 5);
  assert.equal(m.expected_speedup_x, 1, 'a chain gains nothing from a second lane');
  assert.match(m.floor_reason, /More builders cannot help/);

  const wide = ['A', 'B', 'C', 'D'].map((id) => ({ id, depends_on: [] }));
  const w = parallelismMetrics(scheduleWaves(wide).waves, 2);
  assert.equal(w.expected_speedup_x, 2, 'four independent slices across two lanes is a real 2x');
  assert.equal(w.lane_utilization, 1);
});

test('the coverage invariant catches the report that quietly omitted steps', () => {
  const source = ['S1', 'S2', 'S3', 'S4'];
  const omitted = accountForSteps({ sourceStepIds: source, scheduled: ['S1', 'S2'] });
  assert.equal(omitted.complete, false);
  assert.deepEqual(omitted.unaccounted_steps, ['S3', 'S4']);

  const complete = accountForSteps({ sourceStepIds: source, scheduled: ['S1', 'S2'], cyclic: ['S3'], blocked: ['S4'] });
  assert.equal(complete.complete, true);
  assert.equal(complete.counts[STEP_DISPOSITION.CYCLIC], 1);
});

test('a step counted in two dispositions is refused as loudly as a missing one', () => {
  const r = accountForSteps({ sourceStepIds: ['S1'], scheduled: ['S1'], blocked: ['S1'] });
  assert.equal(r.complete, false);
  assert.deepEqual(r.double_counted_steps, [{ step_id: 'S1', dispositions: ['scheduled', 'blocked'] }]);
});

test('a step that is not in the source cannot be accounted for', () => {
  const r = accountForSteps({ sourceStepIds: ['S1'], scheduled: ['S1', 'GHOST'] });
  assert.equal(r.complete, false);
  assert.deepEqual(r.steps_not_in_source, ['GHOST']);
});

test('an undeclared cycle is unlawful; declaring it without a contract is still unlawful', () => {
  const nodes = [
    { id: 'A', depends_on: ['B'] },
    { id: 'B', depends_on: ['A'] },
  ];
  assert.equal(topologyReport(nodes).unlawful_cycles.length, 1);

  const declaredOnly = topologyReport(nodes, { declaredCycles: [{ members: ['A', 'B'] }] });
  assert.equal(declaredOnly.unlawful_cycles.length, 1, 'declaring a cycle is not the same as saying how it terminates');

  const withContract = topologyReport(nodes, {
    declaredCycles: [{ members: ['A', 'B'], iterative_execution_contract: { passes: 2, termination: 'schema settles' } }],
  });
  assert.equal(withContract.unlawful_cycles.length, 0);
});

test('the verifier refuses a plan whose SOURCE graph is cyclic, even when the plan looks tidy', () => {
  const blueprint = {
    blueprint_id: 'BP-CYCLE',
    _meta: { product: 'test', acceptance_cmd: 'node -e "0"' },
    steps: [
      { id: 'S1', file: 'a.js', deps: [] },
      { id: 'S2', file: 'b.js', deps: ['S3'] },
      { id: 'S3', file: 'c.js', deps: ['S2'] },
    ],
  };
  const plan = compileManufacturingPlan(blueprint, { factories: ['factory-1', 'factory-2'] });
  const { defects } = verifyManufacturingPlan(plan, blueprint);
  const ids = defects.map((d) => d.id);
  assert.ok(ids.includes(PLAN_DEFECT.UNDECLARED_DEPENDENCY_CYCLE), 'the knot must be named against the frozen source');

  const cycleDefect = defects.find((d) => d.id === PLAN_DEFECT.UNDECLARED_DEPENDENCY_CYCLE);
  assert.equal(cycleDefect.authority, 'architect', 'breaking a cycle is an architectural decision, never builder work');
  assert.equal(cycleDefect.origin, BLOCKER_ORIGIN.ARCHITECTURE);
});

test('a compiled plan always carries the parallelism metrics and full step accounting', () => {
  const blueprint = {
    blueprint_id: 'BP-OK',
    _meta: { product: 'test', acceptance_cmd: 'node -e "0"' },
    steps: [
      { id: 'S1', file: 'a.js', deps: [] },
      { id: 'S2', file: 'b.js', deps: [] },
      { id: 'S3', file: 'c.js', deps: ['S1'] },
    ],
  };
  const plan = compileManufacturingPlan(blueprint, { factories: ['factory-1', 'factory-2'] });
  assert.equal(typeof plan.parallelism.expected_speedup_x, 'number');
  assert.equal(plan.parallelism.critical_path_floor, 2);
  assert.equal(plan.step_accounting.complete, true);
  assert.equal(plan.step_accounting.source_step_count, 3);

  const { defects } = verifyManufacturingPlan(plan, blueprint);
  const ids = defects.map((d) => d.id);
  assert.ok(!ids.includes(PLAN_DEFECT.SOURCE_COVERAGE_INCOMPLETE));
  assert.ok(!ids.includes(PLAN_DEFECT.UNDECLARED_DEPENDENCY_CYCLE));
});

test('a plan that drops a source step is refused by the coverage gate', () => {
  const blueprint = {
    blueprint_id: 'BP-DROP',
    _meta: { product: 'test', acceptance_cmd: 'node -e "0"' },
    steps: [
      { id: 'S1', file: 'a.js', deps: [] },
      { id: 'S2', file: 'b.js', deps: [] },
    ],
  };
  const plan = compileManufacturingPlan(blueprint, { factories: ['factory-1'] });
  plan.step_accounting = accountForSteps({ sourceStepIds: ['S1', 'S2'], scheduled: ['S1'] });
  const { defects } = verifyManufacturingPlan(plan, blueprint);
  assert.ok(defects.some((d) => d.id === PLAN_DEFECT.SOURCE_COVERAGE_INCOMPLETE));
});
