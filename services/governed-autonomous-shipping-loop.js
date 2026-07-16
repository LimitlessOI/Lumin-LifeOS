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
import { hasTokenCapacity, dailyBuildBudget, recordDailyBuildAttempts, mergeQueueRuntimeStatus, defaultPlannerCallModel, discoverPlanWork, discoverSentryFixWork, runPlanBuildQueue } from './never-stop-product-factory.js';
import { planGovernedBuildQueueRun } from './governed-build-queue-scheduler.js';
import { loadBuildQueue, persistQueue, normalizeQueue, STEP_STATUS } from './product-build-orchestrator.js';
import { createDeploymentService } from './deployment-service.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(REPO_ROOT, 'docs/products');
const STATE_FILE = path.join(REPO_ROOT, 'data/governed-autonomous-ship-state.json');

const state = {
  running: false,
  lastRunAt: null,
  totalRuns: 0,
  cyclesOk: 0,
  cyclesFailed: 0,
  lastShipped: 0,
  tokenHaltSince: null,
  lastCommitSha: null,
  lastCommitError: null,
};

let sharedPool = null;

function setSharedPool(pool) {
  sharedPool = pool;
}

async function loadPersistedState() {
  if (sharedPool) {
    try {
      const { rows } = await sharedPool.query(
        "SELECT state FROM governed_autonomous_ship_state WHERE id = 'singleton'"
      );
      if (rows[0]?.state && typeof rows[0].state === 'object') {
        Object.assign(state, rows[0].state);
        return;
      }
    } catch {
      /* non-fatal — fall through to file */
    }
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const persisted = JSON.parse(raw);
    if (persisted && typeof persisted === 'object') {
      Object.assign(state, persisted);
    }
  } catch {
    /* non-fatal — fresh start */
  }
}

async function persistState() {
  if (sharedPool) {
    try {
      await sharedPool.query(
        `INSERT INTO governed_autonomous_ship_state (id, state, updated_at)
         VALUES ('singleton', $1, now())
         ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
        [JSON.stringify(state)]
      );
    } catch {
      /* non-fatal — fall through to file */
    }
  }
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    /* non-fatal */
  }
  try {
    writeDaemonArtifacts();
  } catch {
    /* non-fatal */
  }
}

function writeDaemonArtifacts() {
  const dataDir = path.join(REPO_ROOT, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const daemonState = {
    cyclesOk: state.cyclesOk,
    cyclesFailed: state.cyclesFailed,
    lastRunAt: state.lastRunAt,
    totalRuns: state.totalRuns,
    lastShipped: state.lastShipped,
    lastCommitSha: state.lastCommitSha,
    lastCommitError: state.lastCommitError,
  };
  fs.writeFileSync(
    path.join(dataDir, 'builder-daemon-state.json'),
    JSON.stringify(daemonState, null, 2)
  );
  const lastCycle = state.cyclesFailed > 0 && state.lastCommitError ? 'cycle_failed' : 'cycle_ok';
  const logLine = JSON.stringify({
    ts: new Date().toISOString(),
    event: lastCycle,
    totalRuns: state.totalRuns,
    lastShipped: state.lastShipped,
  }) + '\n';
  fs.appendFileSync(path.join(dataDir, 'builder-daemon-log.jsonl'), logLine);
}

await loadPersistedState();

// Shared queue cache populated by workCheck and consumed by execute so both
// phases use the same merged remote/local BUILD_QUEUE view.
let sharedQueueCache = {};

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

export function governedAutonomousShippingEnabled() {
  // 2026-07-15 tip emergency: GOVERNED ships while public tip Application-not-found,
  // flooding Railway deploys. Hard-off until founder explicitly resumes autonomy.
  if (!TRUTHY.has(String(process.env.FOUNDER_RESUME_AUTONOMY || '').trim().toLowerCase())) {
    return false;
  }
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
  // Internal loop calls must hit the same Railway container so the response
  // returns synchronously and SENTRY re-probes the local server after a reload.
  // A public SITE_BASE_URL would load-balance to a peer and the calling loop
  // would lose the shipping outcome.
  return `http://127.0.0.1:${process.env.PORT || 8080}`;
}

function commandKey() {
  return process.env.COMMAND_CENTER_KEY
    || process.env.COMMAND_KEY
    || process.env.COMMAND_CENTER_API_KEY
    || process.env.LIFEOS_TOKEN
    || '';
}

async function shipViaGovernedQueue({ product_id, ship_steps }) {
  try {
    const res = await fetch(`${httpBase()}/factory/ship-queue`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-command-key': commandKey() },
      body: JSON.stringify({
        mission_id: `GOVERNED-AUTONOMOUS-${product_id}`,
        blueprint_id: `governed-autonomous-${product_id}`,
        steps: ship_steps,
        skip_intake_gate: true,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } catch (err) {
    return { status: 504, body: { ok: false, error: `ship_timeout:${err.message || err}` } };
  }
}

function deriveFailureReason(body) {
  if (!body) return 'governed_ship_failed';
  // runGovernedShippingQueue nests the dispatch body under `body.body`.
  const inner = body.body || body;
  const evidenceDetail = inner.evidence?.error || inner.evidence?.reason;
  const suffix = evidenceDetail ? `: ${String(evidenceDetail).slice(0, 200)}` : '';
  if (inner.gap_type) return `${inner.gap_type}${suffix}`;

  // SENTRY details are the most actionable feedback for the codegen retry prompt.
  if (inner.sentry) {
    const reasons = [];
    const reviewBlocking = inner.sentry.review?.blocking_findings || inner.sentry.blocking_findings;
    if (Array.isArray(reviewBlocking) && reviewBlocking.length) reasons.push(...reviewBlocking.slice(0, 5));
    const contractFailures = inner.sentry.contract?.failures;
    if (Array.isArray(contractFailures) && contractFailures.length) {
      reasons.push(...contractFailures.slice(0, 5).map((f) => `${f.test_id}: ${f.reason}`));
    }
    const behaviorProof = inner.sentry.verify?.behavior_proof || inner.sentry.behavior_proof;
    const behaviorResults = behaviorProof?.results;
    if (Array.isArray(behaviorResults) && behaviorResults.length) {
      for (const r of behaviorResults.slice(0, 5)) {
        if (r.ok) continue;
        const detail = r.reason || r.error
          || (typeof r.substring === 'string' ? `missing_substring:${r.substring}` : '')
          || (typeof r.observed_status === 'number' ? `observed_status:${r.observed_status}, expected:[${(r.expected_status || []).join(',')}]` : '')
          || (typeof r.observed_rows === 'number' ? `observed_rows:${r.observed_rows}, expected_min:${r.expected_min_rows}` : '')
          || (Array.isArray(r.missing) ? `missing:${r.missing.join(',')}` : '');
        const label = r.assertion_id || r.type || 'behavior_assertion';
        if (detail) reasons.push(`${label}: ${detail}`);
      }
    }
    if (Array.isArray(behaviorProof?.findings) && behaviorProof.findings.length) {
      for (const f of behaviorProof.findings.slice(0, 3)) {
        if (f && !reasons.some((r) => r.includes(String(f)))) reasons.push(String(f));
      }
    }
    const verifyFindings = inner.sentry.verify?.blocking_findings || inner.sentry.verify?.findings;
    if (Array.isArray(verifyFindings) && verifyFindings.length) {
      reasons.push(...verifyFindings.slice(0, 5).map((f) => (typeof f === 'string' ? f : `${f.check || f.id}: ${f.message || f.reason || JSON.stringify(f)}`)));
    }
    if (reasons.length) return `SENTRY_FAILED: ${reasons.join('; ').slice(0, 500)}`;
    if (inner.sentry.implementation_status) return `SENTRY_FAILED: ${inner.sentry.implementation_status}`;
  }

  if (inner.status) return String(inner.status);
  if (inner.error) return String(inner.error);
  if (inner.reason) return String(inner.reason);
  if (body.halted) return body.reason || 'governed_halted';
  if (body.blocked) return body.reason || 'governed_blocked';
  if (body.crashed) return body.error || 'governed_crashed';
  return 'governed_ship_failed';
}

function isPowerOfTwo(n) {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

async function markFailedStep(queue, stepId, body, productId, logger) {
  if (!queue || !Array.isArray(queue.steps)) return;
  const step = queue.steps.find((s) => s.id === stepId || s.step_id === stepId);
  if (!step) return;
  const previousError = step.last_error || null;
  step.attempts = (typeof step.attempts === 'number' ? step.attempts : 0) + 1;
  step.last_attempt_at = new Date().toISOString();
  step.last_error = deriveFailureReason(body);
  step.status = STEP_STATUS.BLOCKED;
  step.commit_sha = null;
  step.built_sha = null;
  step.proof = null;
  persistQueue(queue);
  // Avoid pushing a GitHub commit + deploy for every identical repeat failure.
  // Only commit when the error changes, on the first failure, or at exponential
  // backoff intervals so the loop stays loud without drowning the deploy queue.
  const shouldCommit = step.last_error !== previousError || step.attempts <= 2 || isPowerOfTwo(step.attempts);
  if (!shouldCommit) {
    logger?.info?.({ product_id: productId, step_id: stepId, attempts: step.attempts, last_error: step.last_error }, '[GOVERNED-AUTONOMOUS-SHIP] repeated failure; skipping queue status commit');
    return;
  }
  try {
    await commitQueueStatus(productId, [stepId], queue, 'failed', logger);
  } catch (err) {
    logger?.warn?.({ product_id: productId, step_id: stepId, error: err.message }, '[GOVERNED-AUTONOMOUS-SHIP] failed queue status commit failed');
  }
}

function markShippedStepsDone(queueOrProductId, shippedStepIds, commit_sha) {
  if (!shippedStepIds.length) return;
  const queue = typeof queueOrProductId === 'string'
    ? loadBuildQueue(queueOrProductId)
    : queueOrProductId;
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
      if (step.last_error != null) {
        step.last_error = null;
        changed = true;
      }
      if (step.last_attempt_at != null) {
        step.last_attempt_at = null;
        changed = true;
      }
      if (step.attempts !== 0) {
        step.attempts = 0;
        changed = true;
      }
      if (step.blocker_class != null) {
        step.blocker_class = null;
        changed = true;
      }
      if (step.claim_level != null) {
        step.claim_level = null;
        changed = true;
      }
      if (step.park_until != null) {
        step.park_until = null;
        changed = true;
      }
      if (step.revive_count != null && step.revive_count !== 0) {
        step.revive_count = 0;
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

async function fetchRemoteBuildQueue(productId) {
  const localPath = queuePathForProduct(productId);
  const relPath = path.relative(REPO_ROOT, localPath).replace(/\\/g, '/');
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';
  if (!token || !repo) return loadBuildQueue(productId);
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) return loadBuildQueue(productId);
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${relPath}?ref=${branch}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && typeof data.content === 'string') {
        const text = Buffer.from(data.content, 'base64').toString('utf8');
        const raw = JSON.parse(text);
        return normalizeQueue(raw, localPath);
      }
    }
  } catch (err) {
    // Remote unavailable — fall back to local queue; local is the durable source
    // of truth for runtime fields and the loop will keep working.
  }
  return loadBuildQueue(productId);
}

async function commitQueueStatus(product_id, stepIds, queue, commitSha, logger) {
  const { _sourcePath, ...clean } = queue;
  const queuePath = queue._sourcePath || queuePathForProduct(product_id);
  const relPath = path.relative(REPO_ROOT, queuePath).replace(/\\/g, '/');
  const content = `${JSON.stringify(clean, null, 2)}\n`;
  const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';
  const failed = commitSha === 'failed';
  const statusTag = failed ? 'FAILED' : 'QUEUE';
  const shaTag = failed ? '0000000' : commitSha.slice(0, 7);
  try {
    const result = await commitManyToGitHub([{ path: relPath, content }], `GOVERNED-AUTONOMOUS-${statusTag}: ${product_id} ${stepIds.join(', ')} ${shaTag}`, branch);
    if (result?.ok && result.sha) {
      logger?.info?.(`[GOVERNED-AUTONOMOUS-QUEUE] ${product_id} BUILD_QUEUE.json updated with ${shaTag}`);
    } else {
      logger?.warn?.(`[GOVERNED-AUTONOMOUS-QUEUE] ${product_id} commit returned !ok: ${result?.error || 'unknown'}`);
    }
  } catch (err) {
    logger?.warn?.(`[GOVERNED-AUTONOMOUS-QUEUE] ${product_id} commit failed: ${err.message}`);
  }
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
      await persistState();
      logger?.info?.(`[GOVERNED-AUTONOMOUS-SHIP] committed ${fileEntries.length} files for ${product_id}: ${result.sha.slice(0, 7)}`);
      return result.sha;
    }
    state.lastCommitError = result?.error || 'commit returned !ok';
    await persistState();
    logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] commit for ${product_id} returned !ok: ${state.lastCommitError}`);
    return null;
  } catch (err) {
    state.lastCommitError = String(err?.message || err);
    await persistState();
    logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] commit for ${product_id} failed: ${state.lastCommitError}`);
    return null;
  }
}

function snapshotQueues(queueCache) {
  const snapshots = {};
  for (const [pid, queue] of Object.entries(queueCache)) {
    if (!queue || !Array.isArray(queue.steps)) continue;
    try {
      snapshots[pid] = JSON.stringify(queue.steps);
    } catch {
      /* ignore unserializable */
    }
  }
  return snapshots;
}

function changedProductIds(queueCache, snapshots) {
  const changed = [];
  for (const [pid, queue] of Object.entries(queueCache)) {
    if (!queue || !Array.isArray(queue.steps)) continue;
    try {
      if (JSON.stringify(queue.steps) !== snapshots[pid]) changed.push(pid);
    } catch {
      /* ignore */
    }
  }
  return changed;
}

async function commitQueueRuntimeChanges(queueCache, snapshots, tag, logger, skip = new Set()) {
  const changed = changedProductIds(queueCache, snapshots).filter((pid) => !skip.has(pid));
  if (!changed.length) return skip;
  for (const pid of changed) {
    const queue = queueCache[pid];
    if (!queue) continue;
    try {
      await commitQueueStatus(pid, ['queue'], queue, tag, logger);
      skip.add(pid);
    } catch (err) {
      logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] queue runtime sync for ${pid} failed: ${err.message}`);
    }
  }
  return skip;
}

async function planQueueIfNeeded({ products, queueCache, logger, maxPlanAttempts = 1 }) {
  const callModel = defaultPlannerCallModel();
  if (!callModel || typeof callModel !== 'function') {
    logger?.warn?.('[GOVERNED-AUTONOMOUS-SHIP] no planner callModel available');
    return 0;
  }
  let tasks = [];
  try {
    tasks = [...discoverPlanWork(), ...discoverSentryFixWork()]
      .filter((t) => t && t.kind === 'plan_build_queue')
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  } catch (err) {
    logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] discover planning work threw: ${err.message}`);
    return 0;
  }
  if (!tasks.length) return 0;

  let planned = 0;
  for (let attempt = 0; attempt < maxPlanAttempts; attempt += 1) {
    let attemptPlanned = 0;
    for (const task of tasks) {
      try {
        const result = await runPlanBuildQueue(task, { callModel, logger });
        if (result?.ok) {
          attemptPlanned += result.added || 0;
          logger?.info?.(`[GOVERNED-AUTONOMOUS-SHIP] planned ${result.added || 0} step(s) for ${result.product_id}`);
          try {
            const local = loadBuildQueue(task.product_id);
            const remote = await fetchRemoteBuildQueue(task.product_id);
            queueCache[task.product_id] = mergeQueueRuntimeStatus(remote, local);
          } catch (err) {
            logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] could not reload queue for ${task.product_id}: ${err.message}`);
          }
        } else {
          logger?.info?.(`[GOVERNED-AUTONOMOUS-SHIP] plan for ${task.product_id}: ${result?.detail || 'no_queue'}`);
        }
      } catch (err) {
        logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] plan task ${task.product_id} threw: ${err.message}`);
      }
    }
    planned += attemptPlanned;
    if (!attemptPlanned) break;
  }
  return planned;
}

export async function runGovernedAutonomousShipOnce({ logger, maxStepsPerProduct = 1, shipFn = shipViaGovernedQueue, queueCache: inputQueueCache } = {}) {
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
  let cycleOk = false;
  let cycleError = null;
  await persistState();
  try {
    const products = listProductsWithQueues();
    let queueCache = inputQueueCache || {};

    // If no pre-merged cache was supplied, fetch remote BUILD_QUEUE and merge
    // runtime fields so the loop never re-ships already-completed steps.
    if (!Object.keys(queueCache).length) {
      for (const pid of products) {
        try {
          const local = loadBuildQueue(pid);
          const remote = await fetchRemoteBuildQueue(pid);
          queueCache[pid] = mergeQueueRuntimeStatus(remote, local);
        } catch (err) {
          logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] could not load queue for ${pid}: ${err.message}`);
        }
      }
    }

    const queueSnapshots = snapshotQueues(queueCache);
    let queueCommitted = new Set();

    let plan = planGovernedBuildQueueRun({
      products,
      readQueue: (id) => queueCache[id],
      maxStepsPerProduct,
    });
    // Founder-priority products must be allowed to re-plan every tick even when
    // lower-priority products have runnable steps, otherwise the loop never
    // creates new work for the top of PRODUCT_BUILD_PRIORITY and starves LifeOS.
    const planned = await planQueueIfNeeded({ products, queueCache, logger });
    if (planned || !plan.runnable) {
      plan = planGovernedBuildQueueRun({
        products,
        readQueue: (id) => queueCache[id],
        maxStepsPerProduct,
      });
    }
    if (!plan.runnable) {
      queueCommitted = await commitQueueRuntimeChanges(queueCache, queueSnapshots, 'queue', logger, queueCommitted);
      return { ok: true, shipped: 0, reason: 'no_shippable_steps', gaps: plan.total_gaps };
    }
    let shipped = 0;
    const perProduct = [];
    for (const entry of plan.by_product) {
      if (!Array.isArray(entry.ship_steps) || entry.ship_steps.length === 0) continue;
      const queue = queueCache[entry.product_id];
      const { status, body } = await shipFn(entry);
      const ok = status === 200 && body && body.ok === true;
      const shippedIds = ok && Array.isArray(body.shipped)
        ? body.shipped.map((s) => s.step_id).filter(Boolean)
        : [];
      if (shippedIds.length && queue) {
        const commitSha = await commitShippedFiles(entry.product_id, shippedIds, entry.ship_steps, logger);
        if (commitSha) {
          markShippedStepsDone(queue, shippedIds, commitSha);
          await commitQueueStatus(entry.product_id, shippedIds, queue, commitSha, logger);
          queueCommitted.add(entry.product_id);
        } else {
          logger?.warn?.({ product_id: entry.product_id, shipped_ids: shippedIds }, '[GOVERNED-AUTONOMOUS-SHIP] factory shipped locally but GitHub commit failed; leaving steps retryable');
          for (const rawStep of entry.ship_steps || []) {
            const stepId = rawStep?.step_id || rawStep?.id;
            if (stepId) await markFailedStep(queue, stepId, { body: { error: 'github_commit_failed_after_local_ship' } }, entry.product_id, logger);
          }
        }
      } else if (queue) {
        for (const rawStep of entry.ship_steps || []) {
          const stepId = rawStep?.step_id || rawStep?.id;
          if (stepId) await markFailedStep(queue, stepId, body, entry.product_id, logger);
        }
      }
      shipped += shippedIds.length;
      perProduct.push({
        product_id: entry.product_id,
        status,
        ok,
        shipped: shippedIds.length,
        error: ok ? undefined : deriveFailureReason(body),
      });
    }
    queueCommitted = await commitQueueRuntimeChanges(queueCache, queueSnapshots, 'queue', logger, queueCommitted);
    recordDailyBuildAttempts(shipped);
    state.lastShipped = shipped;
    cycleOk = true;
    await persistState();
    return { ok: true, shipped, products: perProduct, gaps: plan.total_gaps };
  } catch (err) {
    cycleOk = false;
    cycleError = err.message;
    logger?.warn?.({ err: err.message }, '[GOVERNED-AUTONOMOUS-SHIP] tick threw');
    return { ok: false, error: err.message };
  } finally {
    state.running = false;
    if (cycleOk) {
      state.cyclesOk += 1;
    } else {
      state.cyclesFailed += 1;
      state.lastCommitError = cycleError || state.lastCommitError;
    }
    await persistState();
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

export function getGovernedBuildQueueGaps() {
  try {
    const products = listProductsWithQueues();
    const plan = planGovernedBuildQueueRun({
      products,
      readQueue: (id) => loadBuildQueue(id),
      maxStepsPerProduct: 1,
    });
    return {
      ok: true,
      count: plan.total_gaps || 0,
      shippable: plan.total_shippable || 0,
      runnable: plan.runnable,
      by_product: plan.by_product.map((p) => ({
        product_id: p.product_id,
        gap_count: (p.gaps || []).length,
        shippable_count: (p.ship_steps || []).length,
        total_steps: p.total_steps || 0,
      })),
    };
  } catch (err) {
    return { ok: false, error: err.message, count: null };
  }
}

export function startGovernedAutonomousShippingLoop({ logger, pool } = {}) {
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

  setSharedPool(pool);
  loadPersistedState().then(async () => {
    // If a previous container was killed mid-tick, the persisted `running`
    // flag would be left true. Reset it on boot so the new container can run.
    if (state.running) {
      state.running = false;
      await persistState().catch(() => {});
    }
  }).catch(() => {});

  const intervalMs = Number(
    process.env.GOVERNED_AUTONOMOUS_SHIP_INTERVAL_MS
    || process.env.NEVER_STOP_INTERVAL_MS
    || process.env.BUILDEROS_NEVER_STOP_INTERVAL_MS
    || 5 * 60 * 1000,
  );
  const bootDelayMs = Number(
    process.env.GOVERNED_AUTONOMOUS_SHIP_BOOT_DELAY_MS
    || process.env.NEVER_STOP_BOOT_DELAY_MS
    || 15_000,
  );

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
      const cache = {};
      await Promise.all(products.map(async (pid) => {
        try {
          const local = loadBuildQueue(pid);
          const remote = await fetchRemoteBuildQueue(pid);
          cache[pid] = mergeQueueRuntimeStatus(remote, local);
        } catch (err) {
          logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] workCheck could not load queue for ${pid}: ${err.message}`);
        }
      }));
      sharedQueueCache = cache;
      const plan = planGovernedBuildQueueRun({
        products,
        readQueue: (id) => cache[id],
        maxStepsPerProduct: 1,
      });
      const activeProducts = plan.by_product.filter((p) => p.ship_steps.length > 0).length;
      const productsWithGaps = plan.by_product.filter((p) => p.gaps.length > 0).length;
      let planTasks = 0;
      try {
        planTasks = [...discoverPlanWork(), ...discoverSentryFixWork()].filter((t) => t && t.kind === 'plan_build_queue').length;
      } catch (err) {
        logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] workCheck planning discovery threw: ${err.message}`);
      }
      return {
        count: plan.total_shippable + plan.total_gaps + planTasks,
        description: `${plan.total_shippable} shippable + ${plan.total_gaps} gap + ${planTasks} plan task(s) across ${activeProducts} active product(s) (priority: ${products.slice(0, 3).join(', ')})`,
      };
    },
    execute: async () => runGovernedAutonomousShipOnce({ logger, queueCache: sharedQueueCache }),
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
