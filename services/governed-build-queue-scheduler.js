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
 * This scheduler now treats each BUILD_QUEUE as the executable blueprint: it revives
 * stale blocked steps, derives expected_exports from the spec for server-code steps
 * that declare none, and preserves dependency order.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { selectShippableSteps, toGovernedShipStep } from '../factory-staging/factory-core/bpb/build-queue-step-adapter.js';
import { reviveStaleBlockedSteps, STEP_STATUS } from './product-build-orchestrator.js';

const SERVER_CODE_DIR_RE = /^(routes|services|middleware|startup)\/|^factory-staging\/factory-core\//;

function isServerCodeTarget(target) {
  const t = String(target || '').replace(/\\/g, '/');
  return SERVER_CODE_DIR_RE.test(t) && /\.(mjs|cjs|js|ts)$/.test(t);
}

function parseModuleExports(text) {
  const names = [];
  const match = text.match(/module\.exports\s*=\s*\{/s);
  if (match) {
    let depth = 1;
    let i = match.index + match[0].length;
    for (; i < text.length; i += 1) {
      if (text[i] === '{') depth += 1;
      else if (text[i] === '}') { depth -= 1; if (depth === 0) break; }
    }
    const inner = text.slice(match.index + match[0].length, i);
    const keyRe = /([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g;
    let m;
    while ((m = keyRe.exec(inner)) !== null) names.push(m[1]);
    const shorthandRe = /(?:^|[,;])\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*(?=[,;]|$)/g;
    while ((m = shorthandRe.exec(inner)) !== null) names.push(m[1]);
  }
  return [...new Set(names)];
}

function parseESMExports(text) {
  const names = [];
  const re = /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(text)) !== null) names.push(m[1]);
  const namedRe = /export\s*\{([^}]*)\}/g;
  while ((m = namedRe.exec(text)) !== null) {
    const inner = m[1];
    const idRe = /([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let idm;
    while ((idm = idRe.exec(inner)) !== null) names.push(idm[1]);
  }
  return [...new Set(names)];
}

function deriveExpectedExportsFromSpec(step) {
  const spec = String(step?.spec || '');
  if (!spec) return [];
  const moduleExports = parseModuleExports(spec);
  if (moduleExports.length) return moduleExports;
  return parseESMExports(spec);
}

function hasDeclarableExpectation(step) {
  if (Array.isArray(step?.expected_exports) && step.expected_exports.length > 0) return true;
  if (Array.isArray(step?.file_contains) && step.file_contains.length > 0) return true;
  if (step?.route && (typeof step.route === 'string' || step.route.path)) return true;
  if (step?.assertion_spec && typeof step.assertion_spec === 'object' && Object.keys(step.assertion_spec).length > 0) return true;
  return false;
}

function clearFutureLastAttemptAt(queue, now = Date.now()) {
  if (!queue || !Array.isArray(queue.steps)) return;
  for (const step of queue.steps) {
    if (step.status === STEP_STATUS.DONE) continue;
    if (step.status === STEP_STATUS.SKIPPED) continue;
    if (step.last_attempt_at) {
      const ts = Date.parse(step.last_attempt_at);
      if (Number.isFinite(ts) && ts > now) {
        delete step.last_attempt_at;
      }
    }
  }
}

function inferQueueExpectations(queue) {
  if (!queue || !Array.isArray(queue.steps)) return;
  for (const step of queue.steps) {
    if (step.status === STEP_STATUS.DONE) continue;
    if (step.status === STEP_STATUS.SKIPPED) continue;
    if (step.founder_gated) continue;
    if (!isServerCodeTarget(step.target_file)) continue;
    if (hasDeclarableExpectation(step)) continue;
    const derived = deriveExpectedExportsFromSpec(step);
    if (derived.length > 0) {
      step.expected_exports = derived;
    }
  }
}

function prepareQueueForPlanning(queue, { now = Date.now() } = {}) {
  if (!queue || !Array.isArray(queue.steps)) return;
  clearFutureLastAttemptAt(queue, now);
  reviveStaleBlockedSteps(queue, { now });
  inferQueueExpectations(queue);
}

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
    prepareQueueForPlanning(queue);
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
