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
import fs from 'node:fs';
import { selectShippableSteps, toGovernedShipStep, deriveExpectedExportsFromSpec, parseRouteDeclaration } from '../factory-staging/factory-core/bpb/build-queue-step-adapter.js';
import { resolveRepoPath } from '../factory-staging/factory-core/repo-paths.js';
import { reviveStaleBlockedSteps, STEP_STATUS } from './product-build-orchestrator.js';

const SERVER_CODE_DIR_RE = /^(routes|services|middleware|startup)\/|^factory-staging\/factory-core\//;
const AUTO_REGISTER_TARGET = 'config/auto-registered-product-modules.json';

function isHumanHold(step) {
  if (!step || typeof step !== 'object') return false;
  return step.human_hold === true
    || step.pause_for_founder === true
    || step.gate === 'human_hold'
    || step.gate === 'pause_for_founder';
}

function isServerCodeTarget(target) {
  const t = String(target || '').replace(/\\/g, '/');
  return SERVER_CODE_DIR_RE.test(t) && /\.(mjs|cjs|js|ts)$/.test(t);
}

function inferRouteFromSpec(step) {
  const spec = String(step?.spec || '');
  if (!spec) return null;
  // Search for explicit "METHOD /path" tokens in the spec prose.
  const routeRe = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S*)/gi;
  let m;
  while ((m = routeRe.exec(spec)) !== null) {
    const route = parseRouteDeclaration(`${m[1].toUpperCase()} ${m[2]}`);
    if (route) return route;
  }
  return null;
}

function inferRouteFromFile(target) {
  const t = String(target || '').replace(/\\/g, '/');
  if (!t.startsWith('routes/')) return null;
  const p = resolveRepoPath(t);
  let content;
  try {
    content = fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
  const re = /(?:app|router)\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`](\/[^'"`]*)['"`]/i;
  const m = content.match(re);
  if (!m) return null;
  return parseRouteDeclaration(`${m[1].toUpperCase()} ${m[2]}`);
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
    if (isHumanHold(step)) continue;
    if (!isServerCodeTarget(step.target_file)) continue;

    // Derive expected exports if not declared. We do this even when a route is
    // already declared, because route + exports are complementary proofs.
    if (!Array.isArray(step.expected_exports) || step.expected_exports.length === 0) {
      const derived = deriveExpectedExportsFromSpec(step);
      if (derived.length > 0) {
        step.expected_exports = derived;
      }
    }

    // SENTRY behavior proof needs concrete assertions. If the blueprint states
    // expected exports but no behavior_assertions (or a stale static_export_scan
    // placeholder left by an earlier scheduler version), materialize an
    // exports_smoke assertion so the builder gets precise missing-export
    // feedback instead of a generic "missing_behavior_proof" failure.
    if (Array.isArray(step.expected_exports) && step.expected_exports.length > 0) {
      const needsBehaviorAssertion =
        !Array.isArray(step.behavior_assertions) ||
        step.behavior_assertions.length === 0 ||
        step.behavior_assertions.some((a) => a?.type === 'static_export_scan');
      if (needsBehaviorAssertion) {
        step.behavior_assertions = [
          {
            type: 'exports_smoke',
            path: step.target_file,
            exports: step.expected_exports,
            assertion_id: `expected_exports:${step.target_file}`,
          },
        ];
      }
    }

    // For route modules, derive a probe route from the spec prose or from the
    // existing route file so SENTRY can module_mounts prove it live.
    if (step.target_file?.startsWith('routes/') && !step.route) {
      const route = inferRouteFromSpec(step) || inferRouteFromFile(step.target_file);
      if (route) step.route = route;
    }
  }
}

function mergeAutoRegisterSteps(by_product) {
  const autoSteps = [];
  for (const { ship_steps } of by_product) {
    if (!Array.isArray(ship_steps)) continue;
    for (const step of ship_steps) {
      if (step?.target_file === AUTO_REGISTER_TARGET && step?.action_type === 'write_file_exact' && step?.exact_inputs?.exact_content != null) {
        autoSteps.push(step);
      }
    }
  }
  if (autoSteps.length === 0) return;

  let current = { modules: [] };
  try {
    const raw = fs.readFileSync(resolveRepoPath(AUTO_REGISTER_TARGET), 'utf8');
    current = JSON.parse(raw);
  } catch { /* current config may be absent or malformed; start empty */ }
  if (!Array.isArray(current.modules)) current.modules = [];

  const seen = new Set(current.modules.map((m) => m.path));
  for (const step of autoSteps) {
    let incoming = { modules: [] };
    try {
      incoming = JSON.parse(String(step.exact_inputs.exact_content));
    } catch { /* ignore malformed incoming */ }
    if (!Array.isArray(incoming.modules)) incoming.modules = [];
    for (const m of incoming.modules) {
      if (m && m.path && !seen.has(m.path)) {
        current.modules.push(m);
        seen.add(m.path);
      }
    }
  }

  const mergedContent = `${JSON.stringify(current, null, 2)}\n`;
  for (const step of autoSteps) {
    step.exact_inputs = { exact_content: mergedContent };
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
    const shippable = selectShippableSteps(queue);
    const ship_steps = [];
    const gaps = [];
    for (const step of shippable) {
      const converted = toGovernedShipStep(step, { product_id, queue });
      if (converted.ok) {
        ship_steps.push(converted.step);
        if (ship_steps.length >= maxStepsPerProduct) break;
      } else {
        gaps.push({ id: step.id, target_file: step.target_file, reason: converted.reason });
      }
    }
    total_shippable += ship_steps.length;
    total_gaps += gaps.length;
    by_product.push({ product_id, ship_steps, gaps });
  }

  // Pre-merge all auto-register config steps into one exact_content. Each product
  // then writes the same full config, so concurrent ticks do not overwrite each
  // other's new entries.
  mergeAutoRegisterSteps(by_product);

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