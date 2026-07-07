/**
 * SYNOPSIS: STEP 5f proof — the governed BUILD_QUEUE scheduler that gathers
 * shippable steps across products and converts them for runGovernedShippingQueue
 * (Chair ruling LIFERE_COUNCIL_1783453971120 item 3). Proves: cross-product
 * gathering; provable steps convert while non-provable steps are surfaced as gaps
 * (never shipped); per-product cap; missing queue handled; runnable flag. Also runs
 * over the REAL product BUILD_QUEUEs as a live census, and an END-TO-END check that
 * the planned ship_steps are accepted by the real governed runner (stub dispatch).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planGovernedBuildQueueRun, productsWithQueues } from '../../services/governed-build-queue-scheduler.js';
import { runGovernedShippingQueue } from '../../services/governed-shipping-runner.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const results = [];
const assert = (name, cond, detail = {}) => {
  results.push({ name, pass: Boolean(cond) });
  console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : JSON.stringify(detail));
};

const fakeQueues = {
  alpha: { product_id: 'alpha', steps: [
    { id: 'a1', status: 'done', target_file: 'services/a1.js' },
    { id: 'a2', status: 'pending', target_file: 'services/a2.js', expected_exports: ['a2fn'] },
    { id: 'a3', status: 'pending', target_file: 'services/a3.js' }, // server-code, no declaration => gap
  ] },
  beta: { product_id: 'beta', steps: [
    { id: 'b1', status: 'pending', target_file: 'docs/products/beta/NOTE.md', task: 'notes' }, // non-server-code, provable
  ] },
};

const plan = planGovernedBuildQueueRun({ products: ['alpha', 'beta', 'gamma'], readQueue: (id) => fakeQueues[id] || null });
assert('gathers across products', plan.by_product.length === 3);
assert('provable step converts, non-provable surfaced as gap',
  plan.by_product[0].ship_steps.length === 1 && plan.by_product[0].ship_steps[0].step_id === 'a2'
  && plan.by_product[0].gaps.length === 1 && plan.by_product[0].gaps[0].id === 'a3', { p0: plan.by_product[0] });
assert('non-server-code step is shippable', plan.by_product[1].ship_steps.length === 1 && plan.by_product[1].ship_steps[0].step_id === 'b1');
assert('missing queue handled', plan.by_product[2].reason === 'no_queue');
assert('totals + runnable flag', plan.total_shippable === 2 && plan.total_gaps === 1 && plan.runnable === true, { plan: { s: plan.total_shippable, g: plan.total_gaps } });

const capped = planGovernedBuildQueueRun({ products: ['alpha'], readQueue: (id) => fakeQueues[id], maxStepsPerProduct: 0 });
assert('per-product cap honoured', capped.total_shippable === 0 && capped.runnable === false);

assert('productsWithQueues filters injected list', JSON.stringify(productsWithQueues(() => ['x', '', 'y'])) === JSON.stringify(['x', 'y']));

// END-TO-END: planned ship_steps are accepted by the real governed runner.
const stubDispatch = async () => ({ httpStatus: 200, body: { sentry: { implementation_status: 'PASS' }, codegen: { model_tier: 'cerebras_llama' } } });
const e2e = await runGovernedShippingQueue({ steps: plan.by_product[0].ship_steps, mission_id: 'alpha', blueprint_id: 'alpha', dispatch: stubDispatch });
assert('E2E: planned steps ship through real runner', e2e.ok === true && e2e.complete === true && e2e.shipped.length === 1 && e2e.shipped[0].assertion_provenance === 'bpb', { e2e });

// LIVE census over real queues
console.log('\n=== LIVE SCHEDULER CENSUS ===');
const listQueues = () => fs.readdirSync(path.join(REPO_ROOT, 'docs/products'))
  .filter((d) => fs.existsSync(path.join(REPO_ROOT, 'docs/products', d, 'BUILD_QUEUE.json')));
const readQueue = (id) => { try { return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'docs/products', id, 'BUILD_QUEUE.json'), 'utf8')); } catch { return null; } };
const livePlan = planGovernedBuildQueueRun({ products: productsWithQueues(listQueues), readQueue });
for (const p of livePlan.by_product) {
  console.log(`  ${p.product_id}: ${p.ship_steps.length} shippable now, ${p.gaps.length} gaps`);
}
console.log(`  TOTAL: ${livePlan.total_shippable} shippable, ${livePlan.total_gaps} gaps, runnable=${livePlan.runnable}`);

const failed = results.filter((r) => !r.pass);
console.log(`\nGOVERNED-BUILD-QUEUE-SCHEDULER-PROOF: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
