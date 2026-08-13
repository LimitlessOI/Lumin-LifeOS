/**
 * SYNOPSIS: One overlay queue, blueprint slices only — the factory may not choose.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBlueprintSlice,
  skipNonBlueprintSlices,
  selectNextStep,
  STEP_STATUS,
} from '../services/product-build-orchestrator.js';
import { holdToExclusiveProduct } from '../services/never-stop-product-factory.js';

test('isBlueprintSlice accepts print ids and refuses invented col001', () => {
  assert.equal(isBlueprintSlice({ id: 'TALOA-S64-CAPREG-REGISTER-001' }, 'universal-overlay'), true);
  assert.equal(isBlueprintSlice({
    id: 'anything',
    source: 'TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md §64',
  }, 'universal-overlay'), true);
  assert.equal(isBlueprintSlice({ id: 'col001-reg-service' }, 'universal-overlay'), false);
  assert.equal(isBlueprintSlice({ id: 'lifeos-s1' }, 'lifeos'), true);
});

test('skipNonBlueprintSlices marks invented overlay steps off_print', () => {
  const queue = {
    product_id: 'universal-overlay',
    steps: [
      { id: 'TALOA-S64-CAPREG-REGISTER-001', status: STEP_STATUS.PENDING },
      { id: 'col001-reg-service', status: STEP_STATUS.BLOCKED },
      { id: 'col001-reg-route', status: STEP_STATUS.PENDING },
    ],
  };
  assert.deepEqual(skipNonBlueprintSlices(queue), ['col001-reg-service', 'col001-reg-route']);
  assert.equal(queue.steps[0].status, STEP_STATUS.PENDING);
  assert.equal(queue.steps[1].status, STEP_STATUS.SKIPPED);
  assert.match(queue.steps[1].skip_reason, /^off_print/);
});

test('selectNextStep will not hand the factory an invented overlay step', () => {
  const queue = {
    product_id: 'universal-overlay',
    steps: [
      { id: 'col001-reg-route', status: STEP_STATUS.PENDING, target_file: 'routes/x.js', depends_on: [] },
      { id: 'TALOA-S64-CAPREG-REGISTER-001', status: STEP_STATUS.PENDING, target_file: 'config/auto-registered-product-modules.json', depends_on: [] },
    ],
  };
  const { step } = selectNextStep(queue);
  assert.equal(step.id, 'TALOA-S64-CAPREG-REGISTER-001');
});

test('holdToExclusiveProduct never falls through to LifeOS', () => {
  const items = [
    { product_id: 'universal-overlay', kind: 'product_build_step', step_id: 'TALOA-S64-CAPREG-REGISTER-001' },
    { product_id: 'lifeos', kind: 'product_build_step', step_id: 'step2' },
  ];
  const held = holdToExclusiveProduct(items, 'universal-overlay', { steps: [] });
  assert.deepEqual(held.map((i) => i.product_id), ['universal-overlay']);
});
