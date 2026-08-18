/**
 * SYNOPSIS: Continuous supervisor for canonical BP dispatch, including handoff-ready blueprints.
 * @ssot builderos-reboot/BP_PRIORITY.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isQueueItemIncomplete } from './bp-priority-completion.js';
import { loadPointBTarget } from './point-b-target-lite.js';
import { registerScheduler, updateScheduler } from './scheduler-registry.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP_PATH = path.join(REPO_ROOT, 'builderos-reboot/BP_PRIORITY.json');
const RUNNER_SCRIPT = path.join(REPO_ROOT, 'scripts/bp-priority-dispatch.mjs');
const RECEIPT_PATH = path.join(REPO_ROOT, 'data/builderos-bp-priority-scheduler-receipt.json');

const state = {
  running: false,
  child: null,
  childPid: null,
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

function schedulerEnabled() { return process.env.BUILDEROS_AUTOPILOT !== '0'; }
function readQueue() { try { return JSON.parse(fs.readFileSync(BP_PATH, 'utf8')); } catch { return null; } }
function queueHasIncompleteWork() {
  const queue = readQueue();
  if (!queue) return false;
  const pointBTarget = loadPointBTarget();
  return (queue.items || []).some((item) => isQueueItemIncomplete(item, { pointBTarget }));
}
function writeReceipt(payload) {
  try {
    fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
    fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify({ schema: 'bp_priority_scheduler_receipt_v3', ...payload, written_at: new Date().toISOString() }, null, 2)}\n`);
  } catch {}
}
function appendTail(existing, chunk, max = 5000) { return `${existing}${String(chunk || '')}`.slice(-max); }

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
  const incomplete = queueHasIncompleteWork();
  return {
    ok: true,
    scheduler: {
      enabled: schedulerEnabled(),
      mode: 'continuous_handoff_dispatch_supervisor',
      running: state.running,
      healthy: schedulerEnabled() && (!incomplete || state.running),
      queue_has_incomplete_work: incomplete,
      point_b_target: loadPointBTarget() || null,
      state: getBpPrioritySchedulerState(),
      canonical_runner: path.relative(REPO_ROOT, RUNNER_SCRIPT),
      canonical_receipt: path.relative(REPO_ROOT, RECEIPT_PATH),
    },
  };
}

function ensureRunner({ logger } = {}) {
  if (!schedulerEnabled()) {
    state.lastSkipReason = 'BUILDEROS_AUTOPILOT_explicitly_disabled';
    return { ok: false, skipped: true, reason: state.lastSkipReason };
  }
  if (state.running && state.child) return { ok: true, skipped: true, reason: 'already_running', pid: state.childPid };
  if (!fs.existsSync(RUNNER_SCRIPT)) {
    state.lastError = 'bp_dispatcher_missing';
    writeReceipt({ ok: false, status: 'DISPATCHER_MISSING' });
    return { ok: false, skipped: true, reason: state.lastError };
  }

  const child = spawn(process.execPath, [RUNNER_SCRIPT, '--sleep-ms=60000'], {
    cwd: REPO_ROOT,
    env: { ...process.env, BUILDEROS_AUTOPILOT: '1', BUILDEROS_NEVER_STOP: '1' },
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
  writeReceipt({ ok: true, status: 'RUNNING', pid: state.childPid, ran_at: state.lastRunAt, point_b: loadPointBTarget()?.label || null });

  child.stdout?.on('data', (chunk) => { state.stdoutTail = appendTail(state.stdoutTail, chunk); });
  child.stderr?.on('data', (chunk) => { state.stderrTail = appendTail(state.stderrTail, chunk); });
  child.on('error', (err) => { state.lastError = err.message; logger?.warn?.({ err: err.message }, '[BP-PRIORITY] dispatcher spawn error'); });
  child.on('close', (code, signal) => {
    state.running = false;
    state.child = null;
    state.childPid = null;
    state.lastExitAt = new Date().toISOString();
    state.lastExitCode = code;
    const workOpen = queueHasIncompleteWork();
    writeReceipt({ ok: !workOpen && code === 0, status: workOpen ? 'DISPATCHER_EXITED_WITH_POINT_B_OPEN' : 'DISPATCHER_EXITED', exit_code: code, signal: signal || null, stdout_tail: state.stdoutTail, stderr_tail: state.stderrTail });
    if (workOpen) logger?.warn?.({ code, signal }, '[BP-PRIORITY] dispatcher exited while Point B is open; supervisor will restart');
  });
  return { ok: true, started: true, pid: state.childPid };
}

export function runBpPriorityOnce({ logger } = {}) { return Promise.resolve(ensureRunner({ logger })); }

export function startBpPriorityScheduler({ logger } = {}) {
  const enabled = schedulerEnabled();
  const intervalMs = Number(process.env.BUILDEROS_AUTOPILOT_SUPERVISOR_INTERVAL_MS || 60_000);
  registerScheduler('bp_priority', { type: 'continuous_handoff_dispatch_supervisor', env_gate: 'BUILDEROS_AUTOPILOT', enabled, interval_ms: intervalMs, started_at: new Date().toISOString() });
  if (!enabled) { logger?.warn?.('[BP-PRIORITY] explicitly disabled by BUILDEROS_AUTOPILOT=0'); return null; }
  const tick = () => {
    const started = new Date().toISOString();
    updateScheduler('bp_priority', { last_tick_started_at: started });
    const outcome = ensureRunner({ logger });
    updateScheduler('bp_priority', { last_tick_completed_at: new Date().toISOString(), last_outcome: outcome, child_pid: state.childPid, child_running: state.running });
    return outcome;
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  updateScheduler('bp_priority', { timer_set: true });
  return timer;
}
