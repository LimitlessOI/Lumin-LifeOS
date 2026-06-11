/**
 * Factory autopilot recovery owner — scheduled invoker (smoke detector → fire extinguisher).
 * Spawns `factory:autopilot` when recovery candidates or failed missions exist.
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE_PATH = path.join(REPO_ROOT, 'builderos-reboot/MISSION_QUEUE.json');
const AUTOPILOT_SCRIPT = path.join(REPO_ROOT, 'builderos-reboot/scripts/autopilot-runner.mjs');
const RECEIPT_PATH = path.join(REPO_ROOT, 'builderos-reboot/FACTORY_AUTOPILOT_CRON_RECEIPT.json');

const state = {
  running: false,
  lastRunAt: null,
  lastExitCode: null,
  lastError: null,
};

function queueHasRecoveryWork() {
  if (!fs.existsSync(QUEUE_PATH)) return false;
  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  return (queue.missions || []).some(
    (m) =>
      m.status === 'mission_failed' ||
      m.status === 'recovery_required' ||
      m.status === 'recovery_in_progress' ||
      m.recovery_required === true,
  );
}

function writeReceipt(payload) {
  try {
    fs.writeFileSync(
      RECEIPT_PATH,
      `${JSON.stringify({ schema: 'factory_autopilot_cron_receipt_v1', ...payload }, null, 2)}\n`,
    );
  } catch (err) {
    // non-fatal on read-only filesystem
    state.lastError = err.message;
  }
}

export function getFactoryAutopilotSchedulerState() {
  return { ...state, receipt_path: RECEIPT_PATH };
}

export function runFactoryAutopilotOnce({ logger } = {}) {
  if (state.running) {
    return { ok: false, skipped: true, reason: 'already_running' };
  }
  if (!fs.existsSync(AUTOPILOT_SCRIPT)) {
    return { ok: false, skipped: true, reason: 'autopilot_script_missing' };
  }

  state.running = true;
  state.lastRunAt = new Date().toISOString();
  state.lastError = null;

  const child = spawn(process.execPath, [AUTOPILOT_SCRIPT], {
    cwd: REPO_ROOT,
    env: process.env,
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
        stdout_tail: stdout.slice(-2000),
        stderr_tail: stderr.slice(-800),
      };
      writeReceipt(result);
      logger?.info?.({ exit_code: code }, '[FACTORY-AUTOPILOT] cron tick complete');
      resolve(result);
    });
    child.on('error', (err) => {
      state.running = false;
      state.lastError = err.message;
      writeReceipt({ ok: false, error: err.message, ran_at: state.lastRunAt });
      resolve({ ok: false, error: err.message });
    });
  });
}

/**
 * Start interval when FACTORY_RECOVERY_OWNER_ENABLED=1 (default off — explicit opt-in on Railway).
 */
export function startFactoryAutopilotScheduler({ logger } = {}) {
  if (process.env.FACTORY_RECOVERY_OWNER_ENABLED !== '1') {
    logger?.info?.('[FACTORY-AUTOPILOT] scheduler disabled (set FACTORY_RECOVERY_OWNER_ENABLED=1)');
    return null;
  }

  const intervalMs = Number(process.env.FACTORY_AUTOPILOT_CRON_MS || 300000);
  logger?.info?.({ intervalMs }, '[FACTORY-AUTOPILOT] scheduler starting');

  const tick = async () => {
    if (!queueHasRecoveryWork()) return;
    logger?.info?.('[FACTORY-AUTOPILOT] recovery work detected — invoking autopilot owner');
    await runFactoryAutopilotOnce({ logger });
  };

  // First tick after boot delay
  const bootDelayMs = Number(process.env.FACTORY_AUTOPILOT_BOOT_DELAY_MS || 60000);
  setTimeout(() => {
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[FACTORY-AUTOPILOT] boot tick failed'));
  }, bootDelayMs);

  return setInterval(() => {
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[FACTORY-AUTOPILOT] interval tick failed'));
  }, intervalMs);
}
