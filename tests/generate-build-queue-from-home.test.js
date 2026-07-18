/**
 * SYNOPSIS: Fixture tests for Spec/intention → queue generator (Wave 0 item 15).
 * Deterministic mode only — no API keys.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  guessTargetFileFromBullet,
  founderGatedPlaceholderPath,
  deterministicQueueFromBacklog,
  assertSafeQueueWrite,
  generateBuildQueueFromHome,
  parseArgs,
  productPaths,
} from '../scripts/generate-build-queue-from-home.mjs';
import { validatePlannedQueue, extractBacklog } from '../services/build-queue-planner.js';

const HOME = `
# Fixture Product
## Current State
Shipped nothing yet.
## Build Plan
- Add A/B subject-line testing in services/email-templates.js
- Ensure the preview-expiry sweep runs nightly
- Client-facing customization panel (colors/services/photos)
## Change Receipts
- 2026-01-01 shipped X
`;

async function withTempProduct(homeText, existingQueue, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bq-from-home-'));
  const productId = 'fixture-product';
  const dir = path.join(root, 'docs/products', productId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'PRODUCT_HOME.md'), homeText);
  if (existingQueue) {
    fs.writeFileSync(
      path.join(dir, 'BUILD_QUEUE.json'),
      `${JSON.stringify(existingQueue, null, 2)}\n`,
    );
  }
  try {
    return await fn({ root, productId, dir });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('guessTargetFileFromBullet extracts real paths only', () => {
  assert.equal(
    guessTargetFileFromBullet('Add A/B in services/email-templates.js tonight'),
    'services/email-templates.js',
  );
  assert.equal(
    guessTargetFileFromBullet('Wire routes/marketing-calendar-routes.js'),
    'routes/marketing-calendar-routes.js',
  );
  assert.equal(guessTargetFileFromBullet('Ensure the preview-expiry sweep runs nightly'), null);
  assert.equal(guessTargetFileFromBullet('edit /etc/passwd somehow'), null);
});

test('deterministicQueueFromBacklog: path bullets pending; pathless skipped; UI design_review_flagged', () => {
  const backlog = extractBacklog(HOME);
  const res = deterministicQueueFromBacklog({
    productId: 'fixture-product',
    backlog,
  });
  assert.ok(res);
  assert.equal(res.source, 'deterministic');
  assert.equal(validatePlannedQueue(res.queue).ok, true);
  assert.equal(res.queue.planner_mode, 'deterministic');

  const withPath = res.queue.steps.find((s) => /email-templates/.test(s.target_file));
  assert.ok(withPath);
  assert.equal(withPath.target_file, 'services/email-templates.js');
  assert.equal(withPath.status, 'pending');
  assert.equal(withPath.founder_gated, false);

  // Pathless bullets must not become FOUNDER_GATED_INTENTION.md theater.
  assert.equal(
    res.queue.steps.some((s) => /preview-expiry/.test(s.task)),
    false,
  );
  assert.equal(
    res.queue.steps.some((s) => /FOUNDER_GATED_INTENTION/.test(s.target_file || '')),
    false,
  );

  const ui = res.queue.steps.find((s) => /customization panel/i.test(s.task));
  assert.ok(ui);
  assert.equal(ui.target_file, 'public/overlay/customize.html');
  assert.equal(ui.design_review_flagged, true);
  assert.equal(ui.status, 'pending');
  assert.equal(ui.founder_gated, false);
});

test('deterministicQueueFromBacklog fails closed on empty backlog', () => {
  assert.equal(
    deterministicQueueFromBacklog({ productId: 'p', backlog: [] }),
    null,
  );
});

test('assertSafeQueueWrite blocks dropping or demoting done steps', () => {
  const existing = {
    schema: 'product_build_queue_v1',
    product_id: 'p',
    steps: [
      { id: 'a', status: 'done', target_file: 'services/a.js', task: 'a' },
      { id: 'b', status: 'pending', target_file: 'services/b.js', task: 'b' },
    ],
  };
  const drop = {
    schema: 'product_build_queue_v1',
    product_id: 'p',
    steps: [{ id: 'b', status: 'pending', target_file: 'services/b.js', task: 'b' }],
  };
  assert.equal(assertSafeQueueWrite(existing, drop).ok, false);
  assert.ok(assertSafeQueueWrite(existing, drop).errors.some((e) => /drop done step a/.test(e)));

  const demote = {
    schema: 'product_build_queue_v1',
    product_id: 'p',
    steps: [
      { id: 'a', status: 'pending', target_file: 'services/a.js', task: 'a' },
      { id: 'b', status: 'pending', target_file: 'services/b.js', task: 'b' },
    ],
  };
  assert.equal(assertSafeQueueWrite(existing, demote).ok, false);

  const keep = {
    schema: 'product_build_queue_v1',
    product_id: 'p',
    steps: [
      { id: 'a', status: 'done', target_file: 'services/a.js', task: 'a' },
      { id: 'b', status: 'pending', target_file: 'services/b.js', task: 'b' },
      { id: 'c', status: 'pending', target_file: 'services/c.js', task: 'c' },
    ],
  };
  assert.equal(assertSafeQueueWrite(existing, keep).ok, true);
});

test('generateBuildQueueFromHome dry-run validates without writing', async () => {
  await withTempProduct(HOME, null, async ({ root, productId }) => {
    const { queuePath } = productPaths(productId, root);
    const res = await generateBuildQueueFromHome({
      productId,
      root,
      deterministic: true,
      dryRun: true,
    });
    assert.equal(res.ok, true);
    assert.equal(res.wrote, false);
    assert.equal(res.detail, 'validated_dry_run');
    assert.equal(fs.existsSync(queuePath), false);
    assert.equal(validatePlannedQueue(res.queue).ok, true);
  });
});

test('generateBuildQueueFromHome writes BUILD_QUEUE.json and preserves done steps', async () => {
  const existing = {
    schema: 'product_build_queue_v1',
    product_id: 'fixture-product',
    verify_script: 'scripts/noop.mjs',
    steps: [
      {
        id: 'already-done',
        status: 'done',
        target_file: 'services/email-templates.js',
        task: 'Add A/B subject-line testing in services/email-templates.js',
        depends_on: [],
        attempts: 1,
      },
    ],
  };
  await withTempProduct(HOME, existing, async ({ root, productId }) => {
    const res = await generateBuildQueueFromHome({
      productId,
      root,
      deterministic: true,
      write: true,
    });
    assert.equal(res.ok, true);
    assert.equal(res.wrote, true);
    const onDisk = JSON.parse(fs.readFileSync(res.queuePath, 'utf8'));
    assert.equal(onDisk.schema, 'product_build_queue_v1');
    assert.equal(onDisk.verify_script, 'scripts/noop.mjs');
    const done = onDisk.steps.find((s) => s.id === 'already-done');
    assert.equal(done.status, 'done');
    assert.ok(onDisk.steps.length > 1, 'appended new intention steps');
    // done file must not be re-queued as a new pending step
    const redo = onDisk.steps.filter(
      (s) => s.target_file === 'services/email-templates.js' && s.status !== 'done',
    );
    assert.equal(redo.length, 0);
  });
});

test('generateBuildQueueFromHome fails closed: no backlog', async () => {
  await withTempProduct('# Title\n## Current State\n- just status\n', null, async ({ root, productId }) => {
    const res = await generateBuildQueueFromHome({
      productId,
      root,
      deterministic: true,
      dryRun: true,
    });
    assert.equal(res.ok, false);
    assert.equal(res.detail, 'no_backlog');
  });
});

test('generateBuildQueueFromHome preserves unrelated done steps on append', async () => {
  const existing = {
    schema: 'product_build_queue_v1',
    product_id: 'fixture-product',
    steps: [
      {
        id: 'ghost-done',
        status: 'done',
        target_file: 'services/ghost.js',
        task: 'ghost',
        depends_on: [],
      },
    ],
  };
  const badNext = {
    schema: 'product_build_queue_v1',
    product_id: 'fixture-product',
    steps: [
      {
        id: 'new',
        status: 'pending',
        target_file: 'services/new.js',
        task: 'new work',
        depends_on: [],
      },
    ],
  };
  assert.equal(assertSafeQueueWrite(existing, badNext).ok, false);

  await withTempProduct(HOME, existing, async ({ root, productId }) => {
    const res = await generateBuildQueueFromHome({
      productId,
      root,
      deterministic: true,
      write: true,
    });
    assert.equal(res.ok, true);
    assert.ok(res.queue.steps.some((s) => s.id === 'ghost-done' && s.status === 'done'));
  });
});

test('parseArgs reads product + flags', () => {
  assert.deepEqual(parseArgs(['--product=lifeos', '--dry-run']).product, 'lifeos');
  assert.equal(parseArgs(['--product=lifeos', '--dry-run']).dryRun, true);
  assert.equal(parseArgs(['--product', 'site-builder']).product, 'site-builder');
  assert.equal(parseArgs(['--with-model']).withModel, true);
  assert.equal(parseArgs(['--with-model']).deterministic, false);
});