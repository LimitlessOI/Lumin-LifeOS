/**
 * BP_PRIORITY autonomous queue scheduler.
 * On each tick, spawns bp-priority-never-stop.mjs --once as a child process.
 * Reads builderos-reboot/BP_PRIORITY.json for incomplete missions — runs until
 * queue is clear or founder_stop is active.
 *
 * Enable on Railway: BUILDEROS_AUTOPILOT=1
 * Interval env: BUILDEROS_AUTOPILOT_INTERVAL_MS (default 30 min)
 * Boot delay env: BUILDEROS_AUTOPILOT_BOOT_DELAY_MS (default 2 min)
 *
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP_PATH = path.join(REPO_ROOT, 'builderos-reboot/BP_PRIORITY.json');
const RUNNER_SCRIPT = path.join(REPO_ROOT, 'scripts/bp-priority-never-stop.mjs');
const RECEIPT_PATH = path.join(REPO_ROOT, 'data/builderos-bp-priority-scheduler-receipt.json');

const state = {
  running: false,
  lastRunAt: null,
  lastExitCode: null,
  lastError: null,
  totalRuns: 0,
};

function queueHasIncompleteWork() {
  if (!fs.existsSync(BP_PATH)) return false;
  try {
    const queue = JSON.parse(fs.readFileSync(BP_PATH, 'utf8'));
    const items = queue.items || [];
    return items.some((i) => {
      const v = String(i.verdict || '').toUpperCase();
      return v !== 'TECHNICAL_PASS' && v !== 'PASS';
    });
  } catch {
    return false;
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
    if (!queueHasIncompleteWork()) {
      logger?.info?.('[BP-PRIORITY-SCHEDULER] queue complete — no incomplete missions');
      return;
    }
    logger?.info?.('[BP-PRIORITY-SCHEDULER] incomplete missions found — running foundation pipeline');
    await runBpPriorityOnce({ logger });
  };

  setTimeout(() => {
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[BP-PRIORITY-SCHEDULER] boot tick failed'));
  }, bootDelayMs);

  return setInterval(() => {
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[BP-PRIORITY-SCHEDULER] interval tick failed'));
  }, intervalMs);
}
