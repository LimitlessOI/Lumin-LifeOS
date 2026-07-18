/**
 * SYNOPSIS: STEP 5e proof — the BUILD_QUEUE -> governed ship-queue adapter, the
 * layer that lets the legacy loop's throughput source (per-product BUILD_QUEUE.json)
 * ship through the governed pipe (Chair ruling LIFERE_COUNCIL_1783453971120).
 * Proves: sandbox boundary derivation; declared expectation -> assertion_spec;
 * the planning gate (server-code step with no declaration is NOT provable and does
 * NOT convert); a provable step converts to a valid author_then_write ship step;
 * shippable selection honours status/founder_gated/depends_on. Also runs the
 * adapter over the REAL marketingos + site-builder BUILD_QUEUEs as a live census.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sandboxBoundaryForTarget,
  assertionSpecFromBuildQueueStep,
  assessBuildQueueStepProvability,
  toGovernedShipStep,
  selectShippableSteps,
} from '../../factory-staging/factory-core/bpb/build-queue-step-adapter.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const results = [];
const assert = (name, cond, detail = {}) => {
  results.push({ name, pass: Boolean(cond) });
  console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : JSON.stringify(detail));
};

assert('sandbox boundary = top-level dir', sandboxBoundaryForTarget('services/x.js') === 'services/**');
assert('sandbox boundary falls back to exact path for root file', sandboxBoundaryForTarget('server.js') === 'server.js');

const declaredSpec = assertionSpecFromBuildQueueStep({ expected_exports: ['fooHandler'], route: { path: '/x', method: 'GET' } });
assert('declared expected_exports + route -> assertion_spec', declaredSpec.expected_exports[0] === 'fooHandler' && declaredSpec.route.path === '/x', { declaredSpec });

// planning gate: server-code, no declaration => NOT provable, does NOT convert
const bare = { id: 's1', target_file: 'services/mystery.js', task: 'do a thing', spec: 'prose only' };
const bareAssess = assessBuildQueueStepProvability(bare);
assert('server-code w/o declaration => not provable (planning gate)', bareAssess.provable === false && bareAssess.coverage === 'gap', { bareAssess });
const bareConv = toGovernedShipStep(bare);
assert('non-provable step does NOT convert', bareConv.ok === false && /planner must add/.test(bareConv.reason), { bareConv });

// provable server-code step converts to a valid author_then_write ship step
const good = { id: 's2', target_file: 'services/widget.js', task: 'build widget', spec: 'exports buildWidget', expected_exports: ['buildWidget'] };
const goodConv = toGovernedShipStep(good, { product_id: 'lifeos' });
assert('provable step converts to author_then_write', goodConv.ok === true
  && goodConv.step.action_type === 'author_then_write'
  && goodConv.step.target_file === 'services/widget.js'
  && goodConv.step.sandbox_boundary === 'services/**'
  && goodConv.step.assertion_spec.expected_exports.includes('buildWidget')
  && goodConv.step.product_id === 'lifeos', { goodConv });

// non-server-code step is provable without declaration (no proof required)
const doc = { id: 's3', target_file: 'docs/products/x/NOTES.md', task: 'write notes', spec: 'notes' };
assert('non-server-code needs no declaration', assessBuildQueueStepProvability(doc).provable === true);

// shippable selection: skip done/blocked/human_hold, honour depends_on; design_review_flagged ships
const shippable = selectShippableSteps({
  steps: [
    { id: 'a', status: 'done', target_file: 'services/a.js' },
    { id: 'b', status: 'pending', design_review_flagged: true, target_file: 'services/b.js' },
    { id: 'c', status: 'pending', depends_on: ['a'], target_file: 'services/c.js' },
    { id: 'd', status: 'pending', depends_on: ['z'], target_file: 'services/d.js' },
    { id: 'e', status: 'blocked', target_file: 'services/e.js' },
    { id: 'h', status: 'founder_gated', human_hold: true, target_file: 'docs/h.md' },
  ],
});
assert('selectShippableSteps honours status/gate/deps', shippable.length === 2 && shippable.map((s) => s.id).sort().join(',') === 'b,c', { shippable: shippable.map((s) => s.id) });

// LIVE census over real BUILD_QUEUEs
console.log('\n=== LIVE BUILD_QUEUE ADAPTER CENSUS ===');
for (const rel of ['docs/products/marketingos/BUILD_QUEUE.json', 'docs/products/site-builder/BUILD_QUEUE.json']) {
  let q;
  try { q = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8')); } catch { console.log(`  (skip ${rel}: unreadable)`); continue; }
  const steps = Array.isArray(q.steps) ? q.steps : [];
  const shippableSteps = selectShippableSteps(q);
  let provable = 0; const gaps = [];
  for (const s of shippableSteps) {
    const a = assessBuildQueueStepProvability(s);
    if (a.provable) provable += 1; else gaps.push(s.id);
  }
  console.log(`  ${q.product_id}: ${steps.length} steps, ${shippableSteps.length} shippable now, ${provable} provable, ${gaps.length} gaps${gaps.length ? ' -> ' + gaps.join(',') : ''}`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\nBUILD-QUEUE-ADAPTER-PROOF: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);