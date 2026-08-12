/**
 * SYNOPSIS: Lane ownership is the dispatch rule, not a receipt on disk.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownerFor, stepBelongsToFactory, queueForThisFactory } from '../config/lane-assignment.js';
import { allocate, normalizeFactories } from '../scripts/factory-allocation.mjs';
import { compileManufacturingPlan } from '../scripts/manufacturing-plan.mjs';
import { planGovernedBuildQueueRun } from '../services/governed-build-queue-scheduler.js';

const assignment = {
  lanes: [
    { factory_id: 'factory-1', owns: ['services/', 'routes/', 'db/migrations/'] },
    { factory_id: 'factory-2', owns: ['native/macos-overlay/'] },
  ],
};

test('ownerFor splits backend vs native overlay', () => {
  assert.equal(ownerFor('services/taloa/overlay-host-service.js', assignment), 'factory-1');
  assert.equal(ownerFor('db/migrations/20240101000001_create_task_store_table.sql', assignment), 'factory-1');
  assert.equal(ownerFor('native/macos-overlay/ContainerView.swift', assignment), 'factory-2');
  assert.equal(ownerFor('docs/products/universal-overlay/BUILD_QUEUE.json', assignment), 'factory-1');
});

test('normalizeFactories accepts the string ids the planner actually passes', () => {
  const got = normalizeFactories(['factory-1', 'factory-2']);
  assert.deepEqual(got.map((f) => f.factory_id), ['factory-1', 'factory-2']);
});

test('allocate with ownerFor never collides two factories on one file', () => {
  const blueprint = {
    blueprint_id: 'BP-LANE',
    _meta: { product: 'p' },
    steps: [
      { id: 'S1', file: 'services/alpha.js', deps: [] },
      { id: 'S2', file: 'native/macos-overlay/ContainerView.swift', deps: [] },
    ],
  };
  const plan = compileManufacturingPlan(blueprint, { factories: ['factory-1', 'factory-2'] });
  const result = allocate(plan, {
    factories: ['factory-1', 'factory-2'],
    ownerFor: (file) => ownerFor(file, assignment),
    healthProofs: {
      'factory-1': { verdict: 'HEALTHY' },
      'factory-2': { verdict: 'HEALTHY' },
    },
  });
  assert.equal(result.ok, true);
  const bySlice = Object.fromEntries(result.assignments.map((a) => [a.slice_id, a.factory_ids]));
  const s1 = plan.slices.find((s) => s.steps?.[0] === 'S1' || s.slice_id.includes('001'));
  const s2 = plan.slices.find((s) => s.steps?.[0] === 'S2' || s.target_files?.[0]?.includes('native'));
  assert.ok(s1 && s2);
  assert.deepEqual(bySlice[s1.slice_id], ['factory-1']);
  assert.deepEqual(bySlice[s2.slice_id], ['factory-2']);
  assert.ok(result.assignments.every((a) => a.basis === 'lane_assignment'));
});

test('shipping planner skips steps owned by the other factory', () => {
  const queue = {
    product_id: 'universal-overlay',
    steps: [
      {
        id: 'BE',
        status: 'pending',
        target_file: 'services/taloa/overlay-host-service.js',
        task: 'backend',
        spec: 'export function createOverlayHostService() {}',
        expected_exports: ['createOverlayHostService'],
        depends_on: [],
        founder_gated: false,
        blueprint_id: 'BP-X',
        blueprint_step_id: 'BE',
        mission_id: 'M',
      },
      {
        id: 'NAT',
        status: 'pending',
        target_file: 'native/macos-overlay/ContainerView.swift',
        task: 'native',
        spec: 'preload chair',
        depends_on: [],
        founder_gated: false,
        blueprint_id: 'BP-X',
        blueprint_step_id: 'NAT',
        mission_id: 'M',
      },
    ],
  };
  const plan = planGovernedBuildQueueRun({
    products: ['universal-overlay'],
    readQueue: () => queue,
    factoryId: 'factory-1',
    ownerFor: (file) => ownerFor(file, assignment),
  });
  const ids = plan.by_product[0].ship_steps.map((s) => s.step_id || s.id);
  assert.ok(ids.includes('BE') || plan.by_product[0].ship_steps.some((s) => String(s.target_file || '').includes('services/')));
  assert.equal(
    plan.by_product[0].ship_steps.some((s) => String(s.target_file || s.file || '').includes('native/')),
    false,
  );
  assert.equal(stepBelongsToFactory({ target_file: 'native/macos-overlay/ContainerView.swift' }, 'factory-2', assignment), true);
});

test('empty assignment still routes native to factory-2 via FALLBACK_LANES', () => {
  assert.equal(ownerFor('native/macos-overlay/ContainerView.swift', { lanes: [] }), 'factory-2');
  assert.equal(ownerFor('services/taloa/overlay-host-service.js', { lanes: [] }), 'factory-1');
});

test('queueForThisFactory hides other-lane pending so factory-1 can still pick later backend steps', () => {
  const visible = queueForThisFactory(
    {
      steps: [
        { id: 'NAT', status: 'pending', target_file: 'native/macos-overlay/ContainerView.swift' },
        { id: 'BE', status: 'pending', target_file: 'services/taloa/x.js' },
      ],
    },
    'factory-1',
    assignment,
  );
  assert.deepEqual(visible.steps.map((s) => s.id), ['BE']);
});
