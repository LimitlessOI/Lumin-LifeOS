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
  prepareOverlayManufacturingQueue,
  enrollNextOverlayPrintSlice,
  overlayPrintStillOpen,
  runNextStep,
  assertOverlayQueuePrintLaw,
  PRINT_INVENTION_FORBIDDEN,
  STEP_STATUS,
  loadBuildQueue,
  listForbiddenLiveQueueFiles,
  assertNoSecondLiveQueueOnDisk,
  assertNoNewBuildQueueInCommit,
  NEW_QUEUE_FORBIDDEN,
} from '../services/product-build-orchestrator.js';
import { holdToExclusiveProduct, discoverSentryFixWork, discoverPlanWork } from '../services/never-stop-product-factory.js';
import { planBuildQueue } from '../services/build-queue-planner.js';
import { evaluateFilePlacement } from '../scripts/lib/file-placement-gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('isBlueprintSlice accepts print ids and refuses invented col001', () => {
  assert.equal(isBlueprintSlice({ id: 'TALOA-S64-CAPREG-REGISTER-001' }, 'universal-overlay'), true);
  assert.equal(isBlueprintSlice({
    id: 'anything',
    source: 'TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md §64',
  }, 'universal-overlay'), false);
  assert.equal(isBlueprintSlice({ id: 'register-taloa-s64-capability' }, 'universal-overlay'), false);
  assert.equal(isBlueprintSlice({ id: 'col001-reg-service' }, 'universal-overlay'), false);
  assert.equal(isBlueprintSlice({ id: 'lifeos-s1' }, 'lifeos'), false);
  assert.equal(isBlueprintSlice({
    id: 'COLLECTIBLES-V1-ADAPTER-INTERFACE-001',
    product_id: 'collectibles',
    source: 'docs/products/collectibles/MASTER_BLUEPRINT.md — V1',
  }, 'universal-overlay'), true);
  assert.equal(isBlueprintSlice({
    id: 'COLLECTIBLES-V1-ADAPTER-INTERFACE-001',
    product_id: 'collectibles',
  }, 'universal-overlay'), false);
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
  assert.equal(fs.existsSync(path.join(ROOT, 'docs/products/collectibles/BUILD_QUEUE.json')), false);
  assert.throws(() => loadBuildQueue('collectibles'), /SECOND_QUEUE_FORBIDDEN/);
});

test('one queue may carry Collectibles BP slices without a second queue file', () => {
  const overlay = loadBuildQueue('universal-overlay');
  const collectibles = (overlay.steps || []).filter((s) => s.product_id === 'collectibles');
  assert.ok(collectibles.length >= 1, 'Collectibles slices enrolled in the one queue');
  for (const s of collectibles) {
    assert.equal(isBlueprintSlice(s, 'universal-overlay'), true, s.id);
  }
});

test('one queue multi-factory: selectNextStep prefers overlay; selectShippableSteps still exposes Collectibles', async () => {
  const { selectShippableSteps } = await import('../factory-staging/factory-core/bpb/build-queue-step-adapter.js');
  const queue = {
    product_id: 'universal-overlay',
    steps: [
      {
        id: 'TALOA-S64-ANDROID-BODY-001',
        status: STEP_STATUS.PENDING,
        target_file: 'services/taloa/android-body-adapter.js',
        depends_on: [],
      },
      {
        id: 'COLLECTIBLES-V1-TWIN-SERVICE-001',
        product_id: 'collectibles',
        status: STEP_STATUS.PENDING,
        target_file: 'services/collectibles/twin-service.js',
        source: 'docs/products/collectibles/MASTER_BLUEPRINT.md — V1',
        depends_on: [],
      },
    ],
  };
  assert.equal(overlayPrintStillOpen(queue), true);
  const { step } = selectNextStep(queue);
  assert.equal(step.id, 'TALOA-S64-ANDROID-BODY-001');
  const shippable = selectShippableSteps(queue);
  assert.deepEqual(shippable.map((s) => s.id), [
    'TALOA-S64-ANDROID-BODY-001',
    'COLLECTIBLES-V1-TWIN-SERVICE-001',
  ]);
});

test('invented register scripts are not print slices even with blueprint source', () => {
  const queue = {
    product_id: 'universal-overlay',
    steps: [
      {
        id: 'register-taloa-s64-capability',
        status: STEP_STATUS.PENDING,
        source: 'TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md §64',
        target_file: 'scripts/registerTaloaS64Capability.mjs',
        depends_on: [],
      },
      {
        id: 'TALOA-S64-ANDROID-BODY-001',
        status: STEP_STATUS.PENDING,
        target_file: 'services/taloa/android-body-adapter.js',
        depends_on: [],
      },
    ],
  };
  skipNonBlueprintSlices(queue);
  assert.equal(queue.steps[0].status, STEP_STATUS.SKIPPED);
  const { step } = selectNextStep(queue);
  assert.equal(step.id, 'TALOA-S64-ANDROID-BODY-001');
});

test('enrollNextOverlayPrintSlice adds the sealed Android Body adapter', () => {
  const queue = { product_id: 'universal-overlay', steps: [] };
  const id = enrollNextOverlayPrintSlice(queue);
  assert.equal(id, 'TALOA-S64-ANDROID-BODY-001');
  assert.equal(queue.steps[0].target_file, 'services/taloa/android-body-adapter.js');
});

test('open native print slice does not block enrolling factory-1 JS print', () => {
  const queue = {
    product_id: 'universal-overlay',
    steps: [
      {
        id: 'TALOA-S64-ANDROID-BODY-001',
        status: STEP_STATUS.DONE,
        target_file: 'services/taloa/android-body-adapter.js',
      },
      {
        id: 'TALOA-S64-ANDROID-BODY-WIRE-001',
        status: STEP_STATUS.DONE,
        target_file: 'services/general-browser-agent-runtime.js',
      },
      {
        id: 'TALOA-S64-MACOS-PERCEPTION-001',
        status: STEP_STATUS.PENDING,
        target_file: 'native/macos-overlay/SemanticPerception.swift',
      },
    ],
  };
  const id = enrollNextOverlayPrintSlice(queue);
  assert.equal(id, 'TALOA-S64-AUTH-ENVELOPE-001');
  assert.ok(queue.steps.some((s) => s.id === 'TALOA-S64-AUTH-ENVELOPE-001'));
});

test('prepareOverlayManufacturingQueue skips invented register scripts and enrolls the next print slice', () => {
  const queue = {
    product_id: 'universal-overlay',
    steps: [{
      id: 'register-taloa-s64-capability',
      status: STEP_STATUS.PENDING,
      source: 'TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md §64',
      target_file: 'scripts/registerTaloaS64Capability.mjs',
    }],
  };
  const { skipped, enrolled } = prepareOverlayManufacturingQueue(queue);
  assert.deepEqual(skipped, ['register-taloa-s64-capability']);
  assert.equal(enrolled, 'TALOA-S64-ANDROID-BODY-001');
  assert.equal(queue.steps[0].status, STEP_STATUS.SKIPPED);
});

test('runNextStep records duration_ms and tokens_used on every slice', async () => {
  const queue = {
    product_id: 'universal-overlay',
    steps: [{
      id: 'TALOA-S64-ANDROID-BODY-001',
      status: STEP_STATUS.PENDING,
      target_file: 'services/taloa/android-body-adapter.js',
      depends_on: [],
    }],
  };
  const result = await runNextStep(queue, {
    buildFn: async () => ({ ok: true, commit_sha: 'abc1234deadbeef', usage: { total_tokens: 42, estimated_usd: 0.01 } }),
    artifactProofFn: async () => ({ ok: true }),
    deployProofFn: async () => ({ ok: true }),
  });
  assert.equal(result.ok, true);
  assert.equal(typeof queue.steps[0].duration_ms, 'number');
  assert.ok(queue.steps[0].duration_ms >= 0);
  assert.equal(queue.steps[0].tokens_used, 42);
});

test('assertOverlayQueuePrintLaw throws PRINT_INVENTION_FORBIDDEN on invented open steps', () => {
  assert.throws(
    () => assertOverlayQueuePrintLaw({
      product_id: 'universal-overlay',
      steps: [{ id: 'invented-register-script', status: STEP_STATUS.PENDING }],
    }),
    new RegExp(PRINT_INVENTION_FORBIDDEN),
  );
});

test('planBuildQueue never calls the model for overlay — enrolls the sealed print slice', async () => {
  let called = 0;
  const planned = await planBuildQueue({
    productId: 'universal-overlay',
    homeText: '- [ ] invent a register script for capability registry',
    existingQueue: { product_id: 'universal-overlay', steps: [] },
    callModel: async () => {
      called += 1;
      return '{"steps":[{"id":"register-taloa-s64-capability","target_file":"scripts/x.mjs","task":"invented"}]}';
    },
  });
  assert.equal(called, 0);
  assert.equal(planned.source, 'sealed_overlay_print');
  assert.equal(planned.added[0], 'TALOA-S64-ANDROID-BODY-001');
  assert.ok(planned.queue.steps.some((s) => s.id === 'TALOA-S64-ANDROID-BODY-001'));
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

test('discoverPlanWork never mints a queue for a product that does not have one', () => {
  const items = discoverPlanWork();
  assert.ok(Array.isArray(items));
  assert.ok(!items.some((i) => /no BUILD_QUEUE yet/.test(i.detail || '')));
  assert.ok(!items.some((i) => i.kind === 'plan_build_queue'), 'overlay print is sealed — the model may not replan it');
});

test('assertNoNewBuildQueueInCommit refuses a new lifeos queue even if overlay is also in the batch', () => {
  const tracked = new Set(['docs/products/universal-overlay/BUILD_QUEUE.json']);
  assert.throws(
    () => assertNoNewBuildQueueInCommit([
      { path: 'docs/products/lifeos/BUILD_QUEUE.json', content: '{}' },
    ], { trackedSet: tracked }),
    /NEW_QUEUE_FORBIDDEN/,
  );
  assert.doesNotThrow(() => assertNoNewBuildQueueInCommit([
    { path: 'docs/products/universal-overlay/BUILD_QUEUE.json', content: '{}' },
  ], { trackedSet: tracked }));
});

test('file-placement gate refuses minting a second BUILD_QUEUE.json', () => {
  const tracked = new Set(['docs/products/universal-overlay/BUILD_QUEUE.json']);
  const blocked = evaluateFilePlacement([
    { path: 'docs/products/salesos/BUILD_QUEUE.json', content: '{"schema":"product_build_queue_v1"}' },
  ], undefined, { trackedSet: tracked });
  assert.equal(blocked.ok, false);
  assert.ok(blocked.findings.some((f) => f.kind === NEW_QUEUE_FORBIDDEN));

  const overlayUpdate = evaluateFilePlacement([
    { path: 'docs/products/universal-overlay/BUILD_QUEUE.json', content: '{"schema":"product_build_queue_v1"}' },
  ], undefined, { trackedSet: tracked });
  assert.equal(overlayUpdate.ok, true);
});
