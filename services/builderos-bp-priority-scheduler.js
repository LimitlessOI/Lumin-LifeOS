/**
 * SYNOPSIS: Continuous supervisor for the canonical BP_PRIORITY runner.
 * @ssot builderos-reboot/BP_PRIORITY.json
 * @ssot docs/products/AUTHORITY_BOUNDARIES.md
 *
 * Invariant: while current Point B is incomplete, a successful scheduler state
 * may not be idle. The runner is a long-lived child process and is restarted if
 * it exits. BUILDEROS_AUTOPILOT=0 is the explicit runtime stop.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createUsefulWorkGuard } from './useful-work-guard.js';
import { isQueueItemIncomplete } from './bp-priority-completion.js';
import { loadPointBTarget } from './point-b-target-lite.js';
import { loadFactoryArcModules } from './factory-arc-loader.js';
import { hasTokenCapacity } from './never-stop-product-factory.js';
import { registerScheduler, updateScheduler } from './scheduler-registry.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP_PATH = path.join(REPO_ROOT, 'builderos-reboot/BP_PRIORITY.json');
const RUNNER_SCRIPT = path.join(REPO_ROOT, 'scripts/bp-priority-never-stop.mjs');
const RECEIPT_PATH = path.join(REPO_ROOT, 'data/builderos-bp-priority-scheduler-receipt.json');

const state = {
  running: false,
  childPid: null,
  child: null,
  bootAt: new Date().toISOString(),
  lastRunAt: null,
  lastExitAt: null,
  lastExitCode: null,
  lastError: null,
  lastSkipReason: null,
  totalStarts: 0,
  stdoutTail: '',
  stderrTail: '',
};

function schedulerEnabled() {
  return process.env.BUILDEROS_AUTOPILOT !== '0';
}

function loadQueue() {
  try {
    return JSON.parse(fs.readFileSync(BP_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function queueHasIncompleteWork() {
  const queue = loadQueue();
  if (!queue) return false;
  const pointBTarget = loadPointBTarget();
  return (queue.items || []).some((item) => isQueueItemIncomplete(item, { pointBTarget }));
}

function writeReceipt(payload) {
  try {
    fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
    fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify({
      schema: 'bp_priority_scheduler_receipt_v2',
      ...payload,
      written_at: new Date().toISOString(),
    }, null, 2)}\n`);
  } catch {
    // Runtime may be read-only; status still remains in memory/registry.
  }
}

function appendTail(existing, chunk, max = 4000) {
  return `${existing}${String(chunk || '')}`.slice(-max);
}

export function getBpPrioritySchedulerState() {
  return {
    running: state.running,
    child_pid: state.childPid,
    boot_at: state.bootAt,
    last_run_at: state.lastRunAt,
    last_exit_at: state.lastExitAt,
    last_exit_code: state.lastExitCode,
    last_error: state.lastError,
    last_skip_reason: state.lastSkipReason,
    total_starts: state.totalStarts,
    stdout_tail: state.stdoutTail,
    stderr_tail: state.stderrTail,
    receipt_path: RECEIPT_PATH,
  };
}

export function getBpPrioritySchedulerStatus() {
  const pointB = loadPointBTarget();
  const incomplete = queueHasIncompleteWork();
  return {
    ok: true,
    scheduler: {
      enabled: schedulerEnabled(),
      mode: 'continuous_child_supervisor',
      running: state.running,
      healthy: schedulerEnabled() && (!incomplete || state.running),
      queue_has_incomplete_work: incomplete,
      point_b_target: pointB || null,
      token_capacity: hasTokenCapacity(),
      state: getBpPrioritySchedulerState(),
      canonical_runner: path.relative(REPO_ROOT, RUNNER_SCRIPT),
      canonical_receipt: path.relative(REPO_ROOT, RECEIPT_PATH),
    },
  };
}

function startContinuousRunner({ logger } = {}) {
  if (!schedulerEnabled()) {
    state.lastSkipReason = 'BUILDEROS_AUTOPILOT_explicitly_disabled';
    return { ok: false, skipped: true, reason: state.lastSkipReason };
  }
  if (state.running && state.child) {
    return { ok: true, skipped: true, reason: 'already_running', pid: state.childPid };
  }
  if (!fs.existsSync(RUNNER_SCRIPT)) {
    state.lastError = 'runner_script_missing';
    return { ok: false, skipped: true, reason: state.lastError };
  }

  const child = spawn(process.execPath, [RUNNER_SCRIPT, '--sleep-ms=60000'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      BUILDEROS_AUTOPILOT: '1',
      BUILDEROS_NEVER_STOP: '1',
      NEVER_STOP_PRODUCTS: process.env.NEVER_STOP_PRODUCTS === '0' ? '0' : '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  state.child = child;
  state.running = true;
  state.childPid = child.pid || null;
  state.lastRunAt = new Date().toISOString();
  state.lastError = null;
  state.lastSkipReason = null;
  state.totalStarts += 1;
  state.stdoutTail = '';
  state.stderrTail = '';

  writeReceipt({
    ok: true,
    status: 'RUNNING',
    pid: state.childPid,
    ran_at: state.lastRunAt,
    point_b: loadPointBTarget()?.label || null,
    invariant: 'POINT_B_INCOMPLETE_IMPLIES_RUNNER_ACTIVE',
  });

  child.stdout?.on('data', (chunk) => {
    state.stdoutTail = appendTail(state.stdoutTail, chunk);
  });
  child.stderr?.on('data', (chunk) => {
    state.stderrTail = appendTail(state.stderrTail, chunk);
  });

  child.on('error', (err) => {
    state.lastError = err.message;
    logger?.warn?.({ err: err.message }, '[BP-PRIORITY-SCHEDULER] continuous runner spawn error');
  });

  child.on('close', (code, signal) => {
    state.running = false;
    state.child = null;
    state.childPid = null;
    state.lastExitAt = new Date().toISOString();
    state.lastExitCode = code;
    const workStillOpen = queueHasIncompleteWork();
    writeReceipt({
      ok: !workStillOpen && code === 0,
      status: workStillOpen ? 'RUNNER_EXITED_WITH_POINT_B_OPEN' : 'RUNNER_EXITED',
      exit_code: code,
      signal: signal || null,
      ran_at: state.lastRunAt,
      exited_at: state.lastExitAt,
      queue_has_incomplete_work: workStillOpen,
      stdout_tail: state.stdoutTail,
      stderr_tail: state.stderrTail,
    });
    if (workStillOpen) {
      logger?.warn?.({ code, signal }, '[BP-PRIORITY-SCHEDULER] runner exited while Point B work remains; supervisor will restart it');
    }
  });

  logger?.info?.({ pid: state.childPid }, '[BP-PRIORITY-SCHEDULER] continuous never-stop runner started');
  return { ok: true, started: true, pid: state.childPid };
}

// Legacy export retained for callers/tests. It now guarantees the canonical
// continuous runner exists rather than launching a one-shot child that can
// silently exit 0 after a failed pre-build gate.
export function runBpPriorityOnce({ logger } = {}) {
  return Promise.resolve(startContinuousRunner({ logger }));
}

const guardedSupervisorTick = createUsefulWorkGuard({
  taskName: 'BP-PRIORITY-CONTINUOUS-SUPERVISOR',
  purpose: 'Keep the canonical BP runner alive while current Point B is incomplete',
  allowInDirectedMode: true,
  prerequisites: async () => {
    if (!schedulerEnabled()) return { ok: false, reason: 'BUILDEROS_AUTOPILOT explicitly disabled' };
    if (!fs.existsSync(RUNNER_SCRIPT)) return { ok: false, reason: 'runner_script_missing' };
    const token = hasTokenCapacity();
    if (!token.ok) return { ok: false, reason: `token_capacity: ${token.reason}` };
    try {
      const { founderStopActive } = await loadFactoryArcModules();
      const stop = founderStopActive();
      if (stop.active) return { ok: false, reason: 'founder_stop_active' };
    } catch {
      return { ok: false, reason: 'factory_staging_unavailable' };
    }
    return { ok: true };
  },
  workCheck: async () => ({
    count: queueHasIncompleteWork() ? 1 : 0,
    description: queueHasIncompleteWork() ? 'Current Point B has incomplete BP work' : 'Current Point B complete',
  }),
  execute: async ({ logger } = {}) => startContinuousRunner({ logger }),
});

export function startBpPriorityScheduler({ logger } = {}) {
  const enabled = schedulerEnabled();
  const supervisorIntervalMs = Number(process.env.BUILDEROS_AUTOPILOT_SUPERVISOR_INTERVAL_MS || 60_000);

  registerScheduler('bp_priority', {
    type: 'continuous_supervisor_default_on',
    env_gate: 'BUILDEROS_AUTOPILOT',
    enabled,
    interval_ms: supervisorIntervalMs,
    started_at: new Date().toISOString(),
  });

  if (!enabled) {
    logger?.warn?.('[BP-PRIORITY-SCHEDULER] explicitly disabled by BUILDEROS_AUTOPILOT=0');
    return null;
  }

  const tick = async () => {
    updateScheduler('bp_priority', { last_tick_started_at: new Date().toISOString() });
    const outcome = await guardedSupervisorTick({ logger });
    if (outcome?.skipped) state.lastSkipReason = outcome.reason || 'skipped';
    updateScheduler('bp_priority', {
      last_tick_completed_at: new Date().toISOString(),
      last_outcome: outcome || null,
      child_pid: state.childPid,
      child_running: state.running,
    });
    return outcome;
  };

  tick().catch((err) => {
    state.lastError = err.message;
    logger?.warn?.({ err: err.message }, '[BP-PRIORITY-SCHEDULER] immediate supervisor tick failed');
  });

  const timer = setInterval(() => {
    tick().catch((err) => {
      state.lastError = err.message;
      logger?.warn?.({ err: err.message }, '[BP-PRIORITY-SCHEDULER] supervisor tick failed');
    });
  }, supervisorIntervalMs);

  updateScheduler('bp_priority', { timer_set: true });
  return timer;
}
