/**
 * SYNOPSIS: STEP 5f — the governed BUILD_QUEUE scheduler. Gathers the shippable
 * steps across every product's docs/products/<id>/BUILD_QUEUE.json (the throughput
 * source the legacy never-stop loop used) and converts each into a governed
 * ship-queue step, so the whole backlog can ship THROUGH the governed pipe
 * (/factory/ship-queue -> BPB → Builder → SENTRY → TSOS → Historian) instead of the
 * legacy ungoverned /build. Chair ruling, live council receipt
 * LIFERE_COUNCIL_1783453971120 (item 3): build this scheduler + prove one live
 * autonomous ship BEFORE flipping GOVERNED_FACTORY_ONLY=1.
 *
 * PURE PLANNER. The queue reader is injected (readQueue) so this stays testable and
 * factory-clean; the caller (a route/loop) does I/O + hands the produced ship_steps
 * to runGovernedShippingQueue, then marks the BUILD_QUEUE steps done. Non-provable
 * steps are surfaced as gaps (never shipped) — the STEP 5e planning gate.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { selectShippableSteps, toGovernedShipStep } from '../factory-staging/factory-core/bpb/build-queue-step-adapter.js';

/**
 * Plan a governed run across products.
 * @param {object} opts
 * @param {string[]} opts.products              product ids to consider (in order)
 * @param {Function} opts.readQueue             (product_id) -> parsed BUILD_QUEUE.json | null
 * @param {number}  [opts.maxStepsPerProduct]   cap per product (throughput/cost guard)
 * @returns {{ by_product: Array, total_shippable:number, total_gaps:number, runnable:boolean }}
 */
export function planGovernedBuildQueueRun({ products, readQueue, maxStepsPerProduct = Infinity }) {
  if (!Array.isArray(products)) throw new Error('planGovernedBuildQueueRun requires products[]');
  if (typeof readQueue !== 'function') throw new Error('planGovernedBuildQueueRun requires an injected readQueue fn');

  const by_product = [];
  let total_shippable = 0;
  let total_gaps = 0;

  for (const product_id of products) {
    let queue;
    try { queue = readQueue(product_id); } catch { queue = null; }
    if (!queue) {
      by_product.push({ product_id, ship_steps: [], gaps: [], reason: 'no_queue' });
      continue;
    }
    const shippable = selectShippableSteps(queue).slice(0, maxStepsPerProduct);
    const ship_steps = [];
    const gaps = [];
    for (const step of shippable) {
      const converted = toGovernedShipStep(step, { product_id });
      if (converted.ok) ship_steps.push(converted.step);
      else gaps.push({ id: step.id, target_file: step.target_file, reason: converted.reason });
    }
    total_shippable += ship_steps.length;
    total_gaps += gaps.length;
    by_product.push({ product_id, ship_steps, gaps });
  }

  return { by_product, total_shippable, total_gaps, runnable: total_shippable > 0 };
}

/**
 * Discover product ids that own a BUILD_QUEUE. The lister is injected (listQueues)
 * so the module stays pure; the caller globs docs/products/<id>/BUILD_QUEUE.json.
 */
export function productsWithQueues(listQueues) {
  const ids = typeof listQueues === 'function' ? listQueues() : [];
  return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string' && x.trim()) : [];
}
