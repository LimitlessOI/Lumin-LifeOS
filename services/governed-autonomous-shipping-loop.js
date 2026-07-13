/**
 * SYNOPSIS: STEP 5g — the governed AUTONOMOUS shipping loop. When the STEP 5a
 * fence (GOVERNED_FACTORY_ONLY) is ON, the legacy never-stop loop fences itself
 * off, so WITHOUT this loop the system would ship nothing at all. This loop
 * preserves autonomous throughput THROUGH the governed pipe: it plans the
 * shippable BUILD_QUEUE steps across every product (planGovernedBuildQueueRun —
 * proven), ships each product's steps via the already-proven live surface
 * POST /factory/ship-queue (self-HTTP, so it reuses the exact
 * BPB→Builder→SENTRY→TSOS→Historian dispatch + codegen the route wires, with NO
 * duplicated dispatch wiring), then marks the shipped BUILD_QUEUE steps done and
 * commits the shipped files to GitHub so builds survive redeploy.
 * Same token + daily-budget guardrails as never-stop; only ships steps that are
 * provable (the STEP 5e planning gate surfaces the rest as gaps, never shipped).
 * The loop sources work from BUILD_QUEUE.json, which is the executable blueprint
 * per product, and orders products by the founder-owned PRODUCT_BUILD_PRIORITY.json.
 * It only halts for token/budget exhaustion or SENTRY/governance failure.
 *
 * CONDUCTOR-GLUE: pure orchestration of SENTRY-proven primitives
 * (governed-build-queue-scheduler + governed-shipping-runner) and existing
 * queue/guard helpers. It is the factory's own bootstrap rail — the loop that
 * lets the system ship product work cannot itself be shipped by that loop.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUsefulWorkGuard } from './useful-work-guard.js';
import { governedFactoryOnly } from './governed-factory-guard.js';
import { hasTokenCapacity, dailyBuildBudget, recordDailyBuildAttempts } from './never-stop-product-factory.js';
import { planGovernedBuildQueueRun } from './governed-build-queue-scheduler.js';
import { loadBuildQueue, persistQueue, STEP_STATUS } from './product-build-orchestrator.js';
import { createDeploymentService } from './deployment-service.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(REPO_ROOT, 'docs/products');

const state = {
  running: false,
  lastRunAt: null,
  totalRuns: 0,
  lastShipped: 0,
  tokenHaltSince: null,
  lastCommitSha: null,
  lastCommitError: null,
};

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

export function governedAutonomousShippingEnabled() {
  const v = String(
    process.env.GOVERNED_AUTONOMOUS_SHIP
    || process.env.BUILDEROS_NEVER_STOP
    || process.env.BUILDEROS_AUTOPILOT
    || '',
  ).trim().toLowerCase();
  return TRUTHY.has(v);
}

function loadProductPriorityOrder() {
  try {
    const raw = fs.readFileSync(path.join(PRODUCTS_DIR, 'PRODUCT_BUILD_PRIORITY.json'), 'utf8');
    const parsed = JSON.parse(raw);
    const priority = Array.isArray(parsed?.priority) ? parsed.priority : [];
    const order = new Map();
    for (let i = 0; i < priority.length; i += 1) order.set(priority[i], i);
    return order;
  } catch { return new Map(); }
}

export function listProductsWithQueues() {
  try {
    const order = loadProductPriorityOrder();
    const ids = fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((id) => fs.existsSync(path.join(PRODUCTS_DIR, id, 'BUILD_QUEUE.json')));
    return ids.sort((a, b) => {
      const oa = order.get(a);
      const ob = order.get(b);
      if (oa !== undefined && ob !== undefined) return oa - ob;
      if (oa !== undefined) return -1;
      if (ob !== undefined) return 1;
      return a.localeCompare(b);
    });
  } catch {
    return [];
  }
}

function httpBase() {
  return (process.env.SITE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 8080}`).replace(/\/$/, '');
}

function commandKey() {
  return process.env.COMMAND_CENTER_KEY
    || process.env.COMMAND_KEY
    || process.env.COMMAND_CENTER_API_KEY
    || process.env.LIFEOS_TOKEN
    || '';
}

async function shipViaGovernedQueue({ product_id, ship_steps }) {
  const res = await fetch(`${httpBase()}/factory/ship-queue`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': commandKey() },
    body: JSON.stringify({
      mission_id: `GOVERNED-AUTONOMOUS-${product_id}`,
      blueprint_id: `governed-autonomous-${product_id}`,
      steps: ship_steps,
      skip_intake_gate: true,
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function markShippedStepsDone(product_id, shippedStepIds, commit_sha) {
  if (!shippedStepIds.length) return;
  const queue = loadBuildQueue(product_id);
  if (!queue || !Array.isArray(queue.steps)) return;
  const done = new Set(shippedStepIds);
  let changed = false;
  const now = new Date().toISOString();
  for (const step of queue.steps) {
    if (done.has(step.id)) {
      if (step.status !== STEP_STATUS.DONE) {
        step.status = STEP_STATUS.DONE;
        step.shipped_via = 'governed_ship_queue';
        step.shipped_at = now;
        changed = true;
      }
      if (commit_sha && step.commit_sha !== commit_sha) {
        step.commit_sha = commit_sha;
        changed = true;
      }
    }
  }
  if (changed) persistQueue(queue);
}

function queuePathForProduct(productId) {
  return path.join(PRODUCTS_DIR, productId, 'BUILD_QUEUE.json');
}

const { commitManyToGitHub } = createDeploymentService({
  pool: { query: async () => ({ rows: [] }) },
  systemMetrics: null,
  broadcastToAll: () => {},
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_REPO: process.env.GITHUB_REPO,
  GITHUB_DEPLOY_BRANCH: process.env.GITHUB_DEPLOY_BRANCH || 'main',
});

async function commitShippedFiles(product_id, shippedStepIds, ship_steps, logger) {
  if (!shippedStepIds.length || !Array.isArray(ship_steps)) return null;
  const shipped = new Set(shippedStepIds);
  const steps = ship_steps.filter((s) => shipped.has(s.step_id));
  const fileEntries = [];
  const queuePath = queuePathForProduct(product_id);
  if (fs.existsSync(queuePath)) {
    fileEntries.push({ path: path.relative(REPO_ROOT, queuePath).replace(/\\/g, '/'), content: fs.readFileSync(queuePath, 'utf8') });
  }
  for (const step of steps) {
    const target = step.target_file;
    if (!target) continue;
    const abs = path.isAbsolute(target) ? target : path.join(REPO_ROOT, target);
    if (fs.existsSync(abs)) {
      fileEntries.push({ path: target.replace(/\\/g, '/'), content: fs.readFileSync(abs, 'utf8') });
    }
  }
  if (fileEntries.length === 0) return null;
  const message = `GOVERNED-AUTONOMOUS-SHIP: ${product_id} ${shippedStepIds.join(', ')}`;
  const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';
  try {
    const result = await commitManyToGitHub(fileEntries, message, branch);
    if (result?.ok && result.sha) {
      state.lastCommitSha = result.sha;
      state.lastCommitError = null;
      logger?.info?.(`[GOVERNED-AUTONOMOUS-SHIP] committed ${fileEntries.length} files for ${product_id}: ${result.sha.slice(0, 7)}`);
      return result.sha;
    }
    state.lastCommitError = result?.error || 'commit returned !ok';
    logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] commit for ${product_id} returned !ok: ${state.lastCommitError}`);
    return null;
  } catch (err) {
    state.lastCommitError = String(err?.message || err);
    logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] commit for ${product_id} failed: ${state.lastCommitError}`);
    return null;
  }
}

export async function runGovernedAutonomousShipOnce({ logger, maxStepsPerProduct = 1, shipFn = shipViaGovernedQueue } = {}) {
  if (state.running) return { ok: false, skipped: true, reason: 'already_running' };
  if (!governedFactoryOnly()) return { ok: false, skipped: true, reason: 'fence_off' };

  const token = hasTokenCapacity();
  if (!token.ok) {
    state.tokenHaltSince = state.tokenHaltSince || new Date().toISOString();
    return { ok: false, halted: true, reason: 'token_capacity', detail: token.reason };
  }
  const budget = dailyBuildBudget();
  if (!budget.ok) return { ok: false, halted: true, reason: 'daily_budget', detail: budget };

  state.tokenHaltSince = null;
  state.running = true;
  state.lastRunAt = new Date().toISOString();
  state.totalRuns += 1;
  try {
    const products = listProductsWithQueues();
    const plan = planGovernedBuildQueueRun({
      products,
      readQueue: (id) => loadBuildQueue(id),
      maxStepsPerProduct,
    });
    if (!plan.runnable) {
      return { ok: true, shipped: 0, reason: 'no_shippable_steps', gaps: plan.total_gaps };
    }
    let shipped = 0;
    const perProduct = [];
    for (const entry of plan.by_product) {
      if (!Array.isArray(entry.ship_steps) || entry.ship_steps.length === 0) continue;
      const { status, body } = await shipFn(entry);
      const ok = status === 200 && body && body.ok === true;
      const shippedIds = ok && Array.isArray(body.shipped)
        ? body.shipped.map((s) => s.step_id).filter(Boolean)
        : [];
      if (shippedIds.length) {
        markShippedStepsDone(entry.product_id, shippedIds);
        const commitSha = await commitShippedFiles(entry.product_id, shippedIds, entry.ship_steps, logger);
        if (commitSha) markShippedStepsDone(entry.product_id, shippedIds, commitSha);
      }
      shipped += shippedIds.length;
      perProduct.push({
        product_id: entry.product_id,
        status,
        ok,
        shipped: shippedIds.length,
        error: ok ? undefined : (body && body.error),
      });
    }
    recordDailyBuildAttempts(shipped);
    state.lastShipped = shipped;
    return { ok: true, shipped, products: perProduct, gaps: plan.total_gaps };
  } catch (err) {
    logger?.warn?.({ err: err.message }, '[GOVERNED-AUTONOMOUS-SHIP] tick threw');
    return { ok: false, error: err.message };
  } finally {
    state.running = false;
  }
}

export function getGovernedAutonomousShipStatus() {
  return {
    ok: true,
    governed_autonomous_ship: {
      ...state,
      fence_on: governedFactoryOnly(),
      enabled: governedAutonomousShippingEnabled(),
      products_with_queues: listProductsWithQueues().length,
    },
  };
}

export function startGovernedAutonomousShippingLoop({ logger } = {}) {
  // Mirror image of the never-stop fence: this loop OWNS throughput only when
  // the fence is ON. When the fence is OFF, the legacy never-stop loop is the
  // active shipper and this loop stays idle so the two never double-ship.
  if (!governedFactoryOnly()) {
    logger?.info?.('[GOVERNED-AUTONOMOUS-SHIP] idle — GOVERNED_FACTORY_ONLY not active (legacy never-stop owns throughput)');
    return null;
  }
  if (!governedAutonomousShippingEnabled()) {
    logger?.info?.('[GOVERNED-AUTONOMOUS-SHIP] disabled — set GOVERNED_AUTONOMOUS_SHIP=1 (or BUILDEROS_NEVER_STOP/AUTOPILOT)');
    return null;
  }

  const intervalMs = Number(
    process.env.GOVERNED_AUTONOMOUS_SHIP_INTERVAL_MS
    || process.env.NEVER_STOP_INTERVAL_MS
    || process.env.BUILDEROS_NEVER_STOP_INTERVAL_MS
    || 5 * 60 * 1000,
  );
  const bootDelayMs = Number(process.env.NEVER_STOP_BOOT_DELAY_MS || 60_000);

  const guardedTick = createUsefulWorkGuard({
    taskName: 'GOVERNED-AUTONOMOUS-SHIP',
    purpose: 'Continuous product building THROUGH the governed pipe when GOVERNED_FACTORY_ONLY is on',
    allowInDirectedMode: true,
    prerequisites: async () => {
      if (!governedFactoryOnly()) return { ok: false, reason: 'GOVERNED_FACTORY_ONLY not active' };
      if (!governedAutonomousShippingEnabled()) return { ok: false, reason: 'GOVERNED_AUTONOMOUS_SHIP not enabled' };
      const token = hasTokenCapacity();
      if (!token.ok) return { ok: false, reason: `token_capacity: ${token.reason}` };
      return { ok: true };
    },
    workCheck: async () => {
      const products = listProductsWithQueues();
      const plan = planGovernedBuildQueueRun({
        products,
        readQueue: (id) => loadBuildQueue(id),
        maxStepsPerProduct: 1,
      });
      const activeProducts = plan.by_product.filter((p) => p.ship_steps.length > 0).length;
      return {
        count: plan.total_shippable,
        description: `${plan.total_shippable} shippable step(s) across ${activeProducts} product(s) (priority: ${products.slice(0, 3).join(', ')})`,
      };
    },
    execute: async () => runGovernedAutonomousShipOnce({ logger }),
    logger,
  });

  logger?.info?.({ intervalMs }, '[GOVERNED-AUTONOMOUS-SHIP] starting — governed throughput active');

  setTimeout(() => {
    guardedTick().catch((err) => logger?.warn?.({ err: err.message }, '[GOVERNED-AUTONOMOUS-SHIP] boot tick failed'));
  }, bootDelayMs);

  return setInterval(() => {
    guardedTick().catch((err) => logger?.warn?.({ err: err.message }, '[GOVERNED-AUTONOMOUS-SHIP] interval tick failed'));
  }, intervalMs);
}

export default startGovernedAutonomousShippingLoop;
