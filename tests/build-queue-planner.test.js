/**
 * SYNOPSIS: js — tests/build-queue-planner.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractBacklog,
  backlogSignature,
  shouldFounderGate,
  normalizePlannedStep,
  validatePlannedQueue,
  planBuildQueue,
} from '../services/build-queue-planner.js';

const HOME = `
# Some Product
## Current State
Shipped a bunch of stuff.
## Build Plan
- Add A/B subject-line testing to the email templates
- Ensure the preview-expiry sweep runs nightly
- ✅ Logo studio (done)
- Client-facing customization panel (colors/services/photos)
## Change Receipts
- 2026-01-01 shipped X
`;

test('extractBacklog pulls only real backlog bullets, skips done + other sections', () => {
  const items = extractBacklog(HOME);
  assert.ok(items.includes('Add A/B subject-line testing to the email templates'));
  assert.ok(items.includes('Ensure the preview-expiry sweep runs nightly'));
  assert.ok(items.includes('Client-facing customization panel (colors/services/photos)'));
  assert.ok(!items.some((i) => /done/i.test(i)), 'done items excluded');
  assert.ok(!items.some((i) => /shipped X/i.test(i)), 'change-receipt bullets excluded (not under backlog heading)');
});

test('extractBacklog returns [] with no backlog heading (never fabricates)', () => {
  assert.deepEqual(extractBacklog('# Title\n## Current State\n- just status'), []);
  assert.deepEqual(extractBacklog(''), []);
});

test('shouldFounderGate flags UI/brand surfaces, not backend files', () => {
  assert.equal(shouldFounderGate({ target_file: 'public/overlay/customize.html', task: 'panel' }), true);
  assert.equal(shouldFounderGate({ target_file: 'services/email.js', task: 'add A/B subject testing' }), false);
});

test('normalizePlannedStep coerces to pending single-file step; nulls on missing fields', () => {
  const s = normalizePlannedStep({ task: 'Add A/B subject testing', target_file: 'services/email.js', spec: 'DoD' }, 'p', 0);
  assert.equal(s.status, 'pending');
  assert.equal(s.attempts, 0);
  assert.deepEqual(s.depends_on, []);
  assert.equal(s.founder_gated, false);
  assert.equal(normalizePlannedStep({ task: 'no file' }, 'p', 0), null);
  assert.equal(normalizePlannedStep({ target_file: 'x' }, 'p', 0), null);
  // UI step auto-gated + gated status
  const ui = normalizePlannedStep({ task: 'Build customization panel', target_file: 'public/overlay/x.html' }, 'p', 1);
  assert.equal(ui.founder_gated, true);
  assert.equal(ui.status, 'founder_gated');
});

test('validatePlannedQueue enforces schema, ids, deps', () => {
  assert.equal(validatePlannedQueue({ schema: 'x' }).ok, false);
  const good = {
    schema: 'product_build_queue_v1',
    product_id: 'p',
    steps: [{ id: 'a', target_file: 'f', task: 't', depends_on: [] }],
  };
  assert.equal(validatePlannedQueue(good).ok, true);
  const badDep = {
    schema: 'product_build_queue_v1',
    product_id: 'p',
    steps: [{ id: 'a', target_file: 'f', task: 't', depends_on: ['ghost'] }],
  };
  assert.equal(validatePlannedQueue(badDep).ok, false);
});

test('planBuildQueue turns backlog into a validated queue via injected model', async () => {
  const callModel = async () => JSON.stringify({
    steps: [
      { id: 'ab-subject', target_file: 'services/site-builder-email-templates.js', task: 'Add A/B subject-line testing', spec: 'two variants tracked' },
      { id: 'expiry-sweep', target_file: 'scripts/preview-expiry-cron.mjs', task: 'Nightly preview-expiry sweep', spec: 'cron removes expired' },
      { id: 'customize', target_file: 'public/overlay/customize.html', task: 'Client-facing customization panel', spec: 'colors/services/photos' },
    ],
  });
  const res = await planBuildQueue({ productId: 'site-builder', homeText: HOME, callModel, verifyScript: 'scripts/verify.mjs' });
  assert.ok(res);
  assert.equal(res.queue.schema, 'product_build_queue_v1');
  assert.equal(res.queue.verify_script, 'scripts/verify.mjs');
  assert.equal(res.added.length, 3);
  // UI step auto-gated
  const ui = res.queue.steps.find((s) => s.id === 'customize');
  assert.equal(ui.founder_gated, true);
  assert.equal(validatePlannedQueue(res.queue).ok, true);
});

test('backlogSignature is stable, order-independent, and changes with new work', () => {
  const a = backlogSignature(['Build A', 'Build B']);
  assert.equal(a, backlogSignature(['build b', ' Build A ']), 'order + case + whitespace independent');
  assert.notEqual(a, backlogSignature(['Build A', 'Build B', 'Build C']), 'new documented item changes signature');
  assert.equal(backlogSignature([]), backlogSignature(undefined));
});

test('planBuildQueue stamps the backlog_signature onto the queue (self-extend marker)', async () => {
  const callModel = async () => JSON.stringify({
    steps: [{ id: 'expiry-sweep', target_file: 'scripts/preview-expiry-cron.mjs', task: 'Nightly preview-expiry sweep', spec: 'cron' }],
  });
  const res = await planBuildQueue({ productId: 'site-builder', homeText: HOME, callModel });
  assert.equal(res.queue.backlog_signature, backlogSignature(extractBacklog(HOME)));
});

test('planBuildQueue de-duplicates against existing queue steps', async () => {
  const existingQueue = {
    schema: 'product_build_queue_v1',
    product_id: 'site-builder',
    steps: [{ id: 'ab-subject', target_file: 'services/site-builder-email-templates.js', task: 'Add A/B subject-line testing', status: 'done', depends_on: [], attempts: 1 }],
  };
  const callModel = async () => JSON.stringify({
    steps: [
      { id: 'ab-subject', target_file: 'services/site-builder-email-templates.js', task: 'Add A/B subject-line testing', spec: 'dup' },
      { id: 'expiry-sweep', target_file: 'scripts/preview-expiry-cron.mjs', task: 'Nightly preview-expiry sweep', spec: 'new' },
    ],
  });
  const res = await planBuildQueue({ productId: 'site-builder', homeText: HOME, existingQueue, callModel });
  assert.equal(res.added.length, 1, 'only the genuinely new step is added');
  assert.equal(res.added[0].id, 'expiry-sweep');
  assert.equal(res.queue.steps.length, 2);
});

test('planBuildQueue fails closed: no backlog, no model, or empty/garbage output -> null', async () => {
  assert.equal(await planBuildQueue({ productId: 'p', homeText: '# t\nno backlog', callModel: async () => '{"steps":[]}' }), null);
  assert.equal(await planBuildQueue({ productId: 'p', homeText: HOME, callModel: undefined }), null);
  assert.equal(await planBuildQueue({ productId: 'p', homeText: HOME, callModel: async () => 'not json' }), null);
  assert.equal(await planBuildQueue({ productId: 'p', homeText: HOME, callModel: async () => { throw new Error('boom'); } }), null);
  // model returns steps with no usable file -> null
  assert.equal(await planBuildQueue({ productId: 'p', homeText: HOME, callModel: async () => JSON.stringify({ steps: [{ task: 'x' }] }) }), null);
});
