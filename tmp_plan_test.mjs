/**
 * SYNOPSIS: mjs — tmp_plan_test.mjs.
 */
import { planGovernedBuildQueueRun } from './services/governed-build-queue-scheduler.js';
import { loadBuildQueue } from './services/product-build-orchestrator.js';
import { listProductsWithQueues } from './services/governed-autonomous-shipping-loop.js';

const products = listProductsWithQueues();
const plan = planGovernedBuildQueueRun({ products, readQueue: (id) => loadBuildQueue(id), maxStepsPerProduct: 1 });
console.log('total', plan.total_shippable, 'gaps', plan.total_gaps, 'runnable', plan.runnable);
for (const p of plan.by_product) {
  if (p.ship_steps.length || p.gaps.length) {
    console.log(p.product_id, 'ship', p.ship_steps.length, 'gaps', p.gaps.length);
    for (const s of p.ship_steps) {
      console.log('  ship', s.step_id, s.target_file, 'expected_exports', s.expected_exports, 'last_error', (s.last_error || '').slice(0, 80));
    }
    for (const g of p.gaps) {
      console.log('  gap', g.id, g.target_file, g.reason);
    }
  }
}
