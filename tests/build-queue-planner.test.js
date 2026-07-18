/**
 * SYNOPSIS: js — tests/build-queue-planner.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractBacklog,
  extractPhaseSpecs,
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

test('extractBacklog skips [x] checked items and harvests [ ] + Next lines', () => {
  const text = `# P
## Build Plan
- [x] Already shipped router
- [ ] Wire new memory retrieve route
## Agent Handoff Notes
*Next:** Prove tip deploy serves founder-memory inject
| Field | Value |
| *Next** | Run acceptance for LifeRE alpha |
`;
  const items = extractBacklog(text);
  assert.ok(items.some((i) => /Wire new memory retrieve route/i.test(i)));
  assert.ok(items.some((i) => /Prove tip deploy/i.test(i)));
  assert.ok(items.some((i) => /LifeRE alpha/i.test(i)));
  assert.ok(!items.some((i) => /Already shipped router/i.test(i)));
});

test('extractBacklog returns [] with no backlog heading (never fabricates)', () => {
  assert.deepEqual(extractBacklog('# Title\n## Current State\n- just status'), []);
  assert.deepEqual(extractBacklog(''), []);
});

test('loadProductCorpus + extractCorpusBacklog reads conversations', async () => {
  const { loadProductCorpus, extractCorpusBacklog } = await import('../services/build-queue-planner.js');
  const corpus = loadProductCorpus('ideavault');
  assert.ok(corpus.sources.some((s) => s.label === 'product_home'));
  assert.ok(corpus.sources.some((s) => s.label === 'conversation'), 'ideavault has conversations/');
  const { items } = extractCorpusBacklog('ideavault');
  assert.ok(items.length >= 1, 'corpus yields at least one documented item');
});

test('shouldFounderGate / shouldFlagDesignReview flags UI/brand surfaces, not backend files', async () => {
  const { shouldFounderGate, shouldFlagDesignReview } = await import('../services/build-queue-planner.js');
  assert.equal(shouldFlagDesignReview({ target_file: 'public/overlay/customize.html', task: 'panel' }), true);
  assert.equal(shouldFounderGate({ target_file: 'public/overlay/customize.html', task: 'panel' }), true);
  assert.equal(shouldFlagDesignReview({ target_file: 'services/email.js', task: 'add A/B subject testing' }), false);
});

test('normalizePlannedStep coerces to pending single-file step; nulls on missing fields', () => {
  const s = normalizePlannedStep({ task: 'Add A/B subject testing', target_file: 'services/email.js', spec: 'DoD' }, 'p', 0);
  assert.equal(s.status, 'pending');
  assert.equal(s.attempts, 0);
  assert.deepEqual(s.depends_on, []);
  assert.equal(s.founder_gated, false);
  assert.equal(normalizePlannedStep({ task: 'no file' }, 'p', 0), null);
  assert.equal(normalizePlannedStep({ target_file: 'x' }, 'p', 0), null);
  const ui = normalizePlannedStep({ task: 'Build customization panel', target_file: 'public/overlay/x.html' }, 'p', 1);
  assert.equal(ui.design_review_flagged, true);
  assert.equal(ui.status, 'pending');
  assert.equal(ui.founder_gated, false);
  const hold = normalizePlannedStep({ task: 'Need Adam', target_file: 'docs/x.md', human_hold: true }, 'p', 2);
  assert.equal(hold.human_hold, true);
  assert.equal(hold.status, 'founder_gated');
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
  const res = await planBuildQueue({ productId: 'no-such-product-xyz', homeText: HOME, callModel, verifyScript: 'scripts/verify.mjs' });
  assert.ok(res);
  assert.equal(res.queue.schema, 'product_build_queue_v1');
  assert.equal(res.queue.verify_script, 'scripts/verify.mjs');
  assert.equal(res.added.length, 3);
  // UI step flagged for optional design review — still ships
  const ui = res.queue.steps.find((s) => s.id === 'customize');
  assert.equal(ui.design_review_flagged, true);
  assert.equal(ui.status, 'pending');
  assert.equal(ui.founder_gated, false);
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
  // Use a non-existent product id so corpus falls back to the injected homeText.
  const res = await planBuildQueue({ productId: 'no-such-product-xyz', homeText: HOME, callModel });
  assert.equal(res.queue.backlog_signature, backlogSignature([...extractBacklog(HOME), '__done_count:0__']));
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
  const res = await planBuildQueue({ productId: 'no-such-product-xyz', homeText: HOME, existingQueue, callModel });
  assert.equal(res.added.length, 1, 'only the genuinely new step is added');
  assert.equal(res.added[0].id, 'expiry-sweep');
  assert.equal(res.queue.steps.length, 2);
});

const PHASED_HOME = `
# MarketingOS
## 5. A-to-Z Phased Build Plan
### Phase 0 — Manual Revenue Sprint
Manual outreach by the founder to land first customers. No code.
### Phase 1 — Founder Story Session MVP
Record a founder session and produce a content pack.
- Cloudflare R2 (audio upload) — UNVERIFIED pending Railway env vars
### Phase 2 — Social Content Calendar
Build a content-atom library, a brand-voice fingerprint, and a 30-day calendar.
Compose with the Phase 1 tables via owner_id.
### Phase 3 — Video Clip Workflow
BLOCKED dependency: FFmpeg on Railway must be VERIFIED before video processing.
### Phase 8 — Funnel + Campaign Engine
One coaching session becomes a complete campaign package: landing page copy, a 5-email nurture sequence, and a PDF lead magnet outline.
## 6. Technical Spec
Not a phase.
`;

test('extractPhaseSpecs keeps only buildable phases; skips manual/done/unverified/blocked', () => {
  const specs = extractPhaseSpecs(PHASED_HOME);
  const titles = specs.map((s) => s.split(':')[0]);
  assert.ok(titles.some((t) => /Phase 2 — Social Content Calendar/.test(t)), 'buildable Phase 2 kept');
  assert.ok(titles.some((t) => /Phase 8 — Funnel/.test(t)), 'buildable Phase 8 kept');
  assert.ok(!titles.some((t) => /Phase 0/.test(t)), 'manual sprint skipped');
  assert.ok(!titles.some((t) => /Phase 1/.test(t)), 'phase with UNVERIFIED infra skipped');
  assert.ok(!titles.some((t) => /Phase 3/.test(t)), 'BLOCKED phase skipped');
  // rich body captured (decomposable by the planner)
  const p2 = specs.find((s) => /Phase 2/.test(s));
  assert.ok(/brand-voice/i.test(p2) && /calendar/i.test(p2), 'phase body text carried into the item');
});

test('extractBacklog folds phase specs in alongside bullet backlog', () => {
  const items = extractBacklog(PHASED_HOME);
  assert.ok(items.some((i) => /Phase 2 — Social Content Calendar/.test(i)), 'phase surfaces as backlog');
  // a product with ONLY a phased plan (no bullet backlog heading) is now enrollable
  assert.ok(items.length >= 2);
});

test('planBuildQueue never re-queues an already-DONE file, even on a new task', async () => {
  const existingQueue = {
    schema: 'product_build_queue_v1',
    product_id: 'marketingos',
    steps: [{ id: 'p2-routes', target_file: 'routes/marketing-calendar-routes.js', task: 'calendar API', status: 'done', depends_on: [], attempts: 1 }],
  };
  const callModel = async () => JSON.stringify({
    steps: [
      { id: 'redo-routes', target_file: 'routes/marketing-calendar-routes.js', task: 'improve calendar API', spec: 'x' },
      { id: 'new-svc', target_file: 'services/marketing-funnel.js', task: 'campaign package builder', spec: 'y' },
    ],
  });
  const res = await planBuildQueue({ productId: 'marketingos', homeText: PHASED_HOME, existingQueue, callModel });
  assert.equal(res.added.length, 1, 'the done file is not rebuilt');
  assert.equal(res.added[0].target_file, 'services/marketing-funnel.js');
});

test('planBuildQueue fails closed: no backlog, no model, or empty/garbage output -> null', async () => {
  assert.equal(await planBuildQueue({ productId: 'p', homeText: '# t\nno backlog', callModel: async () => '{"steps":[]}' }), null);
  assert.equal(await planBuildQueue({ productId: 'p', homeText: HOME, callModel: undefined }), null);
  assert.equal(await planBuildQueue({ productId: 'p', homeText: HOME, callModel: async () => 'not json' }), null);
  assert.equal(await planBuildQueue({ productId: 'p', homeText: HOME, callModel: async () => { throw new Error('boom'); } }), null);
  // model returns steps with no usable file -> null
  assert.equal(await planBuildQueue({ productId: 'p', homeText: HOME, callModel: async () => JSON.stringify({ steps: [{ task: 'x' }] }) }), null);
});

test('planBuildQueue plans from extraBacklog even when the product home has no backlog (SENTRY self-fix)', async () => {
  let seenPrompt = '';
  const callModel = async (_model, prompt) => {
    seenPrompt = prompt;
    return JSON.stringify({
      steps: [{ id: 'fix-goals-404', target_file: 'startup/register-runtime-routes.js', task: 'Mount finance goals read route in founder_builder profile', spec: 'so dashboard loadGoals stops 404ing' }],
    });
  };
  const res = await planBuildQueue({
    productId: 'lifeos',
    homeText: '# LifeOS\n## Current State\nno backlog section here',
    extraBacklog: ['SENTRY no_js_errors: dashboard loadGoals 404 — Proposed fix: mount the finance goals route in the founder_builder profile'],
    callModel,
  });
  assert.ok(res, 'plans a queue purely from the SENTRY finding');
  assert.equal(res.added.length, 1);
  assert.equal(res.added[0].target_file, 'startup/register-runtime-routes.js');
  // solution-mandatory: the finding+fix reaches the planner prompt so the build has a concrete action
  assert.ok(/no_js_errors/.test(seenPrompt) && /Proposed fix/.test(seenPrompt));
});

test('planBuildQueue salvages a truncated plan (model hit its output cap mid-array)', async () => {
  // Two complete step objects then a cut-off third + no closing brackets — the
  // exact shape a maxOutputTokens cap produces. The complete steps must survive.
  const truncated = '{"steps":[{"id":"a","target_file":"services/a.js","task":"do a","spec":"a done"},{"id":"b","target_file":"services/b.js","task":"do b","spec":"b done"},{"id":"c","target_file":"services/c.js","ta';
  const res = await planBuildQueue({
    productId: 'lifeos',
    homeText: '# t\n## Backlog\n- something to build here',
    callModel: async () => truncated,
  });
  assert.ok(res, 'recovers a queue from the complete objects instead of dropping the whole plan');
  assert.equal(res.added.length, 2, 'both complete steps kept, the partial one dropped');
  assert.deepEqual(res.added.map((s) => s.target_file), ['services/a.js', 'services/b.js']);
});

test('planBuildQueue de-duplicates extraBacklog against the documented backlog', async () => {
  let backlogCount = null;
  const callModel = async (_model, prompt) => {
    backlogCount = (prompt.match(/Add A\/B subject-line testing to the email templates/g) || []).length;
    return JSON.stringify({ steps: [{ id: 's', target_file: 'services/x.js', task: 't', spec: 's' }] });
  };
  await planBuildQueue({
    productId: 'p',
    homeText: HOME,
    // same text as a documented bullet -> must not appear twice in the prompt
    extraBacklog: ['Add A/B subject-line testing to the email templates'],
    callModel,
  });
  assert.equal(backlogCount, 1, 'duplicate backlog line is de-duplicated');
});