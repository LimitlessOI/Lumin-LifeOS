/**
 * SYNOPSIS: BP_PRIORITY autonomous queue scheduler — useful-work-guard wrapped.
 * @ssot builderos-reboot/BP_PRIORITY.json
 * @ssot docs/products/AUTHORITY_BOUNDARIES.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createUsefulWorkGuard } from './useful-work-guard.js';
import { isQueueItemIncomplete } from './bp-priority-completion.js';
import { loadPointBTarget } from './point-b-target-lite.js';
import { loadFactoryArcModules } from './factory-arc-loader.js';
import {
  countProductWork,
  neverStopProductsEnabled,
  hasTokenCapacity,
  runProductExpansionCycle,
} from './never-stop-product-factory.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP_PATH = path.join(REPO_ROOT, 'builderos-reboot/BP_PRIORITY.json');
const RUNNER_SCRIPT = path.join(REPO_ROOT, 'scripts/bp-priority-never-stop.mjs');
const RECEIPT_PATH = path.join(REPO_ROOT, 'data/builderos-bp-priority-scheduler-receipt.json');

const state = {
  running: false,
  lastRunAt: null,
  lastExitCode: null,
  lastError: null,
  lastSkipReason: null,
  totalRuns: 0,
  bootAt: new Date().toISOString(),
};

function queueHasIncompleteWork() {
  if (!fs.existsSync(BP_PATH)) return false;
  try {
    const queue = JSON.parse(fs.readFileSync(BP_PATH, 'utf8'));
    const items = queue.items || [];
    return items.some((i) => isQueueItemIncomplete(i));
  } catch {
    return false;
  }
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeReceipt(payload) {
  try {
    fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
    fs.writeFileSync(
      RECEIPT_PATH,
      `${JSON.stringify({ schema: 'bp_priority_scheduler_receipt_v1', ...payload, written_at: new Date().toISOString() }, null, 2)}\n`,
    );
  } catch {
    // non-fatal on read-only filesystem
  }
}

export function getBpPrioritySchedulerState() {
  return { ...state, receipt_path: RECEIPT_PATH };
}

export function getBpPrioritySchedulerStatus() {
  const receipt = safeReadJson(RECEIPT_PATH);
  const pointB = loadPointBTarget();
  const incomplete = queueHasIncompleteWork();
  const neverStop = neverStopProductsEnabled();
  const token = hasTokenCapacity();
  const enabled = process.env.BUILDEROS_AUTOPILOT === '1';
  const lastRunAt = state.lastRunAt || receipt?.ran_at || null;
  const lastRunAgeMs = lastRunAt ? Math.max(0, Date.now() - new Date(lastRunAt).getTime()) : null;
  const recentWindowMs = Number(process.env.BUILDEROS_AUTOPILOT_RECENT_WINDOW_MS || 2 * 60 * 60 * 1000);
  const recent = lastRunAgeMs != null && lastRunAgeMs <= recentWindowMs;
  const bootDelayMs = Number(process.env.BUILDEROS_AUTOPILOT_BOOT_DELAY_MS || 2 * 60 * 1000);
  const msSinceBoot = Date.now() - new Date(state.bootAt).getTime();
  const inBootWindow = msSinceBoot < bootDelayMs + 30_000;
  const healthy =
    enabled &&
    !state.running &&
    receipt?.ok === true &&
    recent;

  return {
    ok: true,
    scheduler: {
      enabled,
      running: state.running,
      recent,
      healthy,
      in_boot_window: inBootWindow,
      boot_at: state.bootAt,
      recent_window_ms: recentWindowMs,
      interval_ms: Number(process.env.BUILDEROS_AUTOPILOT_INTERVAL_MS || 30 * 60 * 1000),
      boot_delay_ms: bootDelayMs,
      state: getBpPrioritySchedulerState(),
      receipt,
      queue_has_incomplete_work: incomplete,
      never_stop_products: neverStop,
      token_capacity: token,
      point_b_target: pointB || null,
      last_run_at: lastRunAt,
      last_run_age_ms: lastRunAgeMs,
      last_skip_reason: state.lastSkipReason,
      canonical_runner: path.relative(REPO_ROOT, RUNNER_SCRIPT),
      canonical_receipt: path.relative(REPO_ROOT, RECEIPT_PATH),
    },
  };
}

export function runBpPriorityOnce({ logger } = {}) {
  if (state.running) {
    return Promise.resolve({ ok: false, skipped: true, reason: 'already_running' });
  }
  if (!fs.existsSync(RUNNER_SCRIPT)) {
    return Promise.resolve({ ok: false, skipped: true, reason: 'runner_script_missing', path: RUNNER_SCRIPT });
  }

  state.running = true;
  state.lastRunAt = new Date().toISOString();
  state.lastError = null;
  state.totalRuns += 1;

  const child = spawn(process.execPath, [RUNNER_SCRIPT, '--once'], {
    cwd: REPO_ROOT,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });

  return new Promise((resolve) => {
    child.on('close', (code) => {
      state.running = false;
      state.lastExitCode = code;
      const result = {
        ok: code === 0,
        exit_code: code,
        ran_at: state.lastRunAt,
        stdout_tail: stdout.slice(-3000),
        stderr_tail: stderr.slice(-1000),
      };
      writeReceipt(result);
      if (code === 0) {
        logger?.info?.({ exit_code: code }, '[BP-PRIORITY-SCHEDULER] queue cycle complete');
      } else {
        logger?.warn?.({ exit_code: code, stderr: stderr.slice(-500) }, '[BP-PRIORITY-SCHEDULER] queue cycle defect — fix blocker');
      }
      resolve(result);
    });
    child.on('error', (err) => {
      state.running = false;
      state.lastError = err.message;
      writeReceipt({ ok: false, error: err.message, ran_at: state.lastRunAt });
      logger?.warn?.({ err: err.message }, '[BP-PRIORITY-SCHEDULER] spawn failed');
      resolve({ ok: false, error: err.message });
    });
  });
}

export async function runBpPriorityExpansionOnce({ logger, expansionCycle = runProductExpansionCycle } = {}) {
  if (state.running) {
    return { ok: false, skipped: true, reason: 'already_running' };
  }

  state.running = true;
  state.lastRunAt = new Date().toISOString();
  state.lastError = null;
  state.totalRuns += 1;

  try {
    const result = await expansionCycle({ logger });
    state.lastExitCode = result?.ok === false ? 1 : 0;
    writeReceipt({
      ok: result?.ok !== false,
      expansion: true,
      task_id: result?.task_id,
      detail: result?.detail,
      ran_at: state.lastRunAt,
    });
    return result;
  } catch (err) {
    state.lastExitCode = 1;
    state.lastError = err.message;
    writeReceipt({ ok: false, expansion: true, error: err.message, ran_at: state.lastRunAt });
    logger?.warn?.({ err: err.message }, '[BP-PRIORITY-SCHEDULER] expansion cycle threw');
    return { ok: false, error: err.message };
  } finally {
    state.running = false;
  }
}

export async function evaluateBpPrioritySchedulerPrerequisites() {
  if (process.env.BUILDEROS_AUTOPILOT !== '1') {
    return { ok: false, reason: 'BUILDEROS_AUTOPILOT not enabled' };
  }
  if (state.running) {
    return { ok: false, reason: 'already_running' };
  }
  const token = hasTokenCapacity();
  if (!token.ok && neverStopProductsEnabled()) {
    return { ok: false, reason: `token_capacity: ${token.reason}` };
  }
  try {
    const { founderStopActive } = await loadFactoryArcModules();
    const stop = founderStopActive();
    if (stop.active) {
      return { ok: false, reason: 'founder_stop_active' };
    }
  } catch {
    return { ok: false, reason: 'factory_staging_unavailable' };
  }
  if (!fs.existsSync(RUNNER_SCRIPT)) {
    return { ok: false, reason: 'runner_script_missing' };
  }
  return { ok: true, reason: null };
}

function recordGuardedOutcome(outcome, { logger } = {}) {
  const ranAt = new Date().toISOString();
  state.lastRunAt = ranAt;
  state.lastError = null;
  if (outcome?.reason === 'no_work') {
    state.lastExitCode = 0;
    writeReceipt({
      ok: true,
      skipped: true,
      reason: outcome.reason,
      detail: outcome.detail || 'BP_PRIORITY queue complete',
      ran_at: ranAt,
    });
    logger?.info?.({ reason: outcome.reason }, '[BP-PRIORITY-SCHEDULER] healthy idle — queue complete');
  } else if (outcome?.skipped) {
    state.lastSkipReason = outcome.reason || 'skipped';
    writeReceipt({
      ok: false,
      skipped: true,
      reason: outcome.reason || 'skipped',
      detail: outcome.detail || null,
      ran_at: ranAt,
    });
  }
}

const guardedBpPriorityTick = createUsefulWorkGuard({
  taskName: 'BP-PRIORITY-SCHEDULER',
  purpose: 'Advance Point B mission via foundation pipeline when BP_PRIORITY has incomplete work',
  // Canonical BuilderOS autopilot is an explicit PB-authorized runtime lane.
  // Directed mode should block generic schedulers, not the governed BP queue.
  allowInDirectedMode: true,
  prerequisites: evaluateBpPrioritySchedulerPrerequisites,
  workCheck: async () => {
    const token = hasTokenCapacity();
    if (!token.ok) {
      return { count: 0, description: `token_capacity: ${token.reason}` };
    }
    if (queueHasIncompleteWork()) {
      const target = loadPointBTarget();
      return {
        count: 1,
        description: `Incomplete BP_PRIORITY work toward ${target?.label || 'Point B'}`,
      };
    }
    if (neverStopProductsEnabled()) {
      return countProductWork();
    }
    return { count: 0, description: 'BP_PRIORITY queue complete' };
  },
  execute: async ({ logger } = {}) => {
    if (!queueHasIncompleteWork() && neverStopProductsEnabled()) {
      return runBpPriorityExpansionOnce({ logger });
    }
    return runBpPriorityOnce({ logger });
  },
});

/**
 * Start the scheduler. Requires BUILDEROS_AUTOPILOT=1 on Railway (explicit opt-in).
 */
export function startBpPriorityScheduler({ logger } = {}) {
  if (process.env.BUILDEROS_AUTOPILOT !== '1') {
    logger?.info?.('[BP-PRIORITY-SCHEDULER] disabled (set BUILDEROS_AUTOPILOT=1 on Railway to enable)');
    return null;
  }

  const intervalMs = Number(process.env.BUILDEROS_AUTOPILOT_INTERVAL_MS || 30 * 60 * 1000);
  const bootDelayMs = Number(process.env.BUILDEROS_AUTOPILOT_BOOT_DELAY_MS || 2 * 60 * 1000);

  logger?.info?.({ intervalMs, bootDelayMs }, '[BP-PRIORITY-SCHEDULER] starting — autonomous mission queue active');

  const tick = async () => {
    const outcome = await guardedBpPriorityTick({ logger });
    if (outcome?.skipped) {
      recordGuardedOutcome(outcome, { logger });
    }
  };

  setTimeout(() => {
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[BP-PRIORITY-SCHEDULER] boot tick failed'));
  }, bootDelayMs);

  return setInterval(() => {
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[BP-PRIORITY-SCHEDULER] interval tick failed'));
  }, intervalMs);
}
