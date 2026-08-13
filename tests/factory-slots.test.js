/**
 * SYNOPSIS: Factory-N is a switch — register, enable, idle — without recoding identity.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BUILTIN_SLOT_COUNT,
  factoryIdAt,
  nextFactoryId,
  registeredFactoryIds,
  laneTemplateFor,
  dispatchingFactoryIds,
  applyEnableLane,
  applyIdleLane,
  registerNextSlot,
  ensureFactoryRegistered,
} from '../config/factory-slots.js';
import { knownFactoryIds, dispatchingFactories, isKnownFactory } from '../config/factory-registry.js';
import { launchAgentLabel } from '../scripts/run-factory-lane.mjs';
import { allocate } from '../scripts/factory-allocation.mjs';
import { compileManufacturingPlan } from '../scripts/manufacturing-plan.mjs';
import { ownerFor } from '../config/lane-assignment.js';

test('three slots are registered without recoding FACTORIES', () => {
  assert.equal(BUILTIN_SLOT_COUNT, 3);
  assert.deepEqual(registeredFactoryIds().slice(0, 3), ['factory-1', 'factory-2', 'factory-3']);
  assert.ok(knownFactoryIds().includes('factory-3'));
  assert.equal(isKnownFactory('factory-3'), true);
  assert.equal(nextFactoryId(), 'factory-4');
});

test('idle factory-3 does not steal native or backend files', () => {
  const assignment = {
    lanes: [
      { factory_id: 'factory-1', owns: ['services/', 'routes/'] },
      { factory_id: 'factory-2', owns: ['native/macos-overlay/'] },
      { factory_id: 'factory-3', owns: [] },
    ],
  };
  assert.equal(ownerFor('services/taloa/overlay-host-service.js', assignment), 'factory-1');
  assert.equal(ownerFor('native/macos-overlay/ContainerView.swift', assignment), 'factory-2');
  assert.equal(ownerFor('public/overlay/lifeos-app.html', assignment), 'factory-1');
  assert.deepEqual(dispatchingFactoryIds(assignment), ['factory-1', 'factory-2']);
});

test('enabling factory-3 is a lane-assignment switch onto public/overlay', () => {
  const before = {
    lanes: [
      { factory_id: 'factory-1', owns: ['services/', 'routes/'] },
      { factory_id: 'factory-2', owns: ['native/macos-overlay/'] },
    ],
  };
  const enabled = applyEnableLane(before, 'factory-3');
  assert.deepEqual(laneTemplateFor('factory-3'), ['public/overlay/']);
  assert.equal(ownerFor('public/overlay/lifeos-app.html', enabled), 'factory-3');
  assert.equal(ownerFor('native/macos-overlay/ContainerView.swift', enabled), 'factory-2');
  assert.equal(ownerFor('routes/taloa-overlay-host-routes.js', enabled), 'factory-1');
  assert.ok(dispatchingFactoryIds(enabled).includes('factory-3'));

  const idled = applyIdleLane(enabled, 'factory-3');
  assert.equal(ownerFor('public/overlay/lifeos-app.html', idled), 'factory-1');
  assert.equal(dispatchingFactoryIds(idled).includes('factory-3'), false);
});

test('cannot idle factory-1', () => {
  assert.throws(() => applyIdleLane({ lanes: [] }, 'factory-1'), /cannot_idle_primary_factory/);
});

test('register-next grows factory-4 without editing the registry array', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-slots-'));
  const filePath = path.join(dir, 'FACTORY_SLOT_STATE.json');
  fs.writeFileSync(filePath, JSON.stringify({ registered_count: 3 }) + '\n');
  const added = registerNextSlot({ filePath, now: () => '2026-08-12T00:00:00.000Z' });
  assert.equal(added.factory_id, 'factory-4');
  assert.equal(added.registered_count, 4);
  assert.equal(ensureFactoryRegistered('factory-4', { filePath }).action, 'already_registered');
  assert.throws(() => ensureFactoryRegistered('factory-6', { filePath }), /factory_slots_must_grow_in_order/);
});

test('LaunchAgent label is parameterized so factory-3 does not recode the plist', () => {
  assert.equal(launchAgentLabel('factory-2'), 'com.lumin.factory-2-lane');
  assert.equal(launchAgentLabel('factory-3'), 'com.lumin.factory-3-lane');
});

test('allocate default does not hand slices to an idle factory-3', () => {
  const dispatching = dispatchingFactories().map((f) => f.factory_id);
  assert.ok(dispatching.includes('factory-1'));
  assert.equal(dispatching.includes('factory-3'), false);

  const assignment = {
    lanes: [
      { factory_id: 'factory-1', owns: ['services/', 'routes/'] },
      { factory_id: 'factory-2', owns: ['native/macos-overlay/'] },
    ],
  };
  const blueprint = {
    blueprint_id: 'BP-SLOT',
    _meta: { product: 'p' },
    steps: [
      { id: 'S1', file: 'services/alpha.js', deps: [] },
      { id: 'S2', file: 'native/macos-overlay/ContainerView.swift', deps: [] },
    ],
  };
  const plan = compileManufacturingPlan(blueprint, { factories: ['factory-1', 'factory-2', 'factory-3'] });
  const result = allocate(plan, {
    factories: ['factory-1', 'factory-2'],
    ownerFor: (file) => ownerFor(file, assignment),
    healthProofs: {
      'factory-1': { verdict: 'HEALTHY' },
      'factory-2': { verdict: 'HEALTHY' },
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.assignments.some((a) => (a.factory_ids || []).includes('factory-3')), false);
});

test('factoryIdAt is the only identity constructor', () => {
  assert.equal(factoryIdAt(1), 'factory-1');
  assert.equal(factoryIdAt(3), 'factory-3');
  assert.throws(() => factoryIdAt(0), /invalid_factory_slot/);
});
