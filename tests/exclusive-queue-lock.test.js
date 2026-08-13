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
  loadBuildQueue,
  listForbiddenLiveQueueFiles,
  assertNoSecondLiveQueueOnDisk,
} from '../services/product-build-orchestrator.js';
import { holdToExclusiveProduct, discoverSentryFixWork } from '../services/never-stop-product-factory.js';
import { planBuildQueue } from '../services/build-queue-planner.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

test('loadBuildQueue(lifeos) throws SECOND_QUEUE_FORBIDDEN — the live file is gone', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'docs/products/lifeos/BUILD_QUEUE.json')), false);
  assert.throws(() => loadBuildQueue('lifeos'), /SECOND_QUEUE_FORBIDDEN/);
  assert.throws(() => loadBuildQueue('builderos'), /SECOND_QUEUE_FORBIDDEN/);
  assert.throws(
    () => loadBuildQueue(path.join(ROOT, 'docs/history/product-build-queues/lifeos/BUILD_QUEUE.json')),
    /SECOND_QUEUE_FORBIDDEN/,
  );
});

test('the only live product queue on disk is overlay', () => {
  assert.deepEqual(listForbiddenLiveQueueFiles(), []);
  assert.doesNotThrow(() => assertNoSecondLiveQueueOnDisk());
  const overlay = loadBuildQueue('universal-overlay');
  assert.equal(overlay.product_id, 'universal-overlay');
});

test('planBuildQueue refuses every product except overlay', async () => {
  await assert.rejects(
    () => planBuildQueue({ productId: 'lifeos', homeText: '- [ ] fake', callModel: async () => '{}' }),
    /SECOND_QUEUE_FORBIDDEN/,
  );
});

test('discoverSentryFixWork never enrolls a second product queue', () => {
  const items = discoverSentryFixWork();
  assert.ok(Array.isArray(items));
  assert.ok(!items.some((i) => i.product_id && i.product_id !== 'universal-overlay'));
});
