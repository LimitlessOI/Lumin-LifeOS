/**
 * SYNOPSIS: Supervises the Costello infrastructure guardian in a separate Node
 * child process so Railway/network stalls can never freeze Abbott's HTTP event
 * loop. Restarts crashed/stale workers, reads only their durable /tmp status,
 * and exposes non-secret supervisor state to the independent watchdog.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WORKER_PATH = path.join(ROOT, 'scripts/costello-infrastructure-guardian-worker.mjs');
const STATUS_FILE = process.env.COSTELLO_GUARDIAN_STATUS_FILE || '/tmp/costello-infrastructure-guardian-status.json';
const RESTART_DELAY_MS = Number(process.env.COSTELLO_GUARDIAN_WORKER_RESTART_MS || 5_000);
const STALE_MS = Number(process.env.COSTELLO_GUARDIAN_WORKER_STALE_MS || 3 * 60 * 1000);
const CHECK_MS = Math.min(Number(process.env.COSTELLO_GUARDIAN_SUPERVISOR_CHECK_MS || 30_000), Math.max(5_000, STALE_MS / 2));

let child = null;
let timer = null;
let restartTimer = null;
let stopping = false;
let state = {
  schema: 'costello_infrastructure_guardian_supervisor_v1',
  armed: false,
  child_pid: null,
  starts: 0,
  exits: 0,
  restarts: 0,
  last_start_at: null,
  last_exit_at: null,
  last_exit_code: null,
  last_exit_signal: null,
  last_error: null,
};

function readWorkerStatus() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    const atMs = Date.parse(parsed?.at || '');
    return {
      ...parsed,
      status_file: STATUS_FILE,
      status_age_ms: Number.isFinite(atMs) ? Math.max(0, Date.now() - atMs) : null,
      stale: !Number.isFinite(atMs) || Date.now() - atMs > STALE_MS,
    };
  } catch (error) {
    return {
      status_file: STATUS_FILE,
      worker_alive: false,
      stale: true,
      read_error: String(error?.message || error),
    };
  }
}

function scheduleRestart(logger, reason) {
  if (stopping || restartTimer) return;
  state.restarts += 1;
  state.last_error = reason || state.last_error;
  restartTimer = setTimeout(() => {
    restartTimer = null;
    spawnWorker(logger);
  }, RESTART_DELAY_MS);
  restartTimer.unref?.();
}

function spawnWorker(logger = console) {
  if (stopping || child) return child;
  try {
    child = spawn(process.execPath, [WORKER_PATH], {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, COSTELLO_GUARDIAN_STATUS_FILE: STATUS_FILE },
    });
    state.armed = true;
    state.starts += 1;
    state.child_pid = child.pid || null;
    state.last_start_at = new Date().toISOString();
    state.last_error = null;

    child.once('error', (error) => {
      state.last_error = `spawn_error:${String(error?.message || error)}`;
      logger?.error?.({ err: error?.message }, '[COSTELLO-GUARDIAN-SUPERVISOR] worker spawn error');
    });

    child.once('exit', (code, signal) => {
      state.exits += 1;
      state.last_exit_at = new Date().toISOString();
      state.last_exit_code = code;
      state.last_exit_signal = signal || null;
      state.child_pid = null;
      child = null;
      if (!stopping) scheduleRestart(logger, `worker_exit:${code ?? 'null'}:${signal || 'none'}`);
    });
    logger?.info?.({ pid: child.pid }, '[COSTELLO-GUARDIAN-SUPERVISOR] worker started');
    return child;
  } catch (error) {
    state.last_error = `spawn_threw:${String(error?.message || error)}`;
    logger?.error?.({ err: error?.message }, '[COSTELLO-GUARDIAN-SUPERVISOR] worker spawn threw');
    scheduleRestart(logger, state.last_error);
    return null;
  }
}

function checkWorker(logger = console) {
  if (stopping) return;
  const worker = readWorkerStatus();
  if (!child) {
    scheduleRestart(logger, 'worker_missing');
    return;
  }
  if (worker.stale) {
    state.last_error = `worker_status_stale:${worker.status_age_ms ?? 'unknown'}`;
    logger?.warn?.({ pid: child.pid, age_ms: worker.status_age_ms }, '[COSTELLO-GUARDIAN-SUPERVISOR] restarting stale worker');
    try { child.kill('SIGKILL'); } catch {}
  }
}

export function startCostelloInfrastructureGuardianSupervisor({ logger = console } = {}) {
  if (timer) return { already_armed: true, status: getCostelloInfrastructureGuardianSupervisorStatus() };
  stopping = false;
  spawnWorker(logger);
  timer = setInterval(() => checkWorker(logger), CHECK_MS);
  timer.unref?.();
  return { already_armed: false, status: getCostelloInfrastructureGuardianSupervisorStatus() };
}

export function stopCostelloInfrastructureGuardianSupervisor() {
  stopping = true;
  if (timer) clearInterval(timer);
  if (restartTimer) clearTimeout(restartTimer);
  timer = null;
  restartTimer = null;
  if (child) {
    try { child.kill('SIGTERM'); } catch {}
  }
  child = null;
  state = { ...state, armed: false, child_pid: null };
}

export function getCostelloInfrastructureGuardianSupervisorStatus() {
  return {
    ...state,
    armed: Boolean(timer),
    child_pid: child?.pid || state.child_pid || null,
    worker_path: WORKER_PATH,
    stale_after_ms: STALE_MS,
    check_interval_ms: CHECK_MS,
    worker: readWorkerStatus(),
  };
}

export default {
  startCostelloInfrastructureGuardianSupervisor,
  stopCostelloInfrastructureGuardianSupervisor,
  getCostelloInfrastructureGuardianSupervisorStatus,
};
