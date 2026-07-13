/**
 * SYNOPSIS: Railway never-stop product factory scheduler.
 * Runs ONLY on the Railway process (boot-domains). Laptop is not the builder.
 * Halts ticks ONLY when: FOUNDER_STOP / PAUSE_AUTONOMY, token keys gone, or daily budget.
 * Interval never cancels itself — when stop lifts or budget resets, building resumes.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUsefulWorkGuard } from './useful-work-guard.js';
import {
  countProductWork,
  neverStopProductsEnabled,
  hasTokenCapacity,
  runProductExpansionCycle,
  runProductExpansionLanes,
  discoverBuildQueueWork,
  dailyBuildBudget,
  recordDailyBuildAttempts,
  readRecentFactoryLog,
  factoryRuntimeEnvPresence,
} from './never-stop-product-factory.js';
import { governedFactoryOnly } from './governed-factory-guard.js';
import { getGovernedAutonomousShipStatus } from './governed-autonomous-shipping-loop.js';
import { founderStopActive } from '../factory-staging/factory-core/arc/gate-enforcement.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = path.join(REPO_ROOT, 'data/never-stop-product-factory-receipt.json');

const state = {
  running: false,
  lastRunAt: null,
  lastExitCode: null,
  totalRuns: 0,
  tokenHaltSince: null,
  founderHaltSince: null,
  lastReceipt: null,
  lastSkipReason: null,
};

/** Hard stop reasons Adam controls (or budget). Everything else must keep trying. */
export function neverStopHardHaltReason() {
  if (process.env.PAUSE_AUTONOMY === '1') {
    return { halt: true, reason: 'PAUSE_AUTONOMY', detail: 'Adam pause flag' };
  }
  const stop = founderStopActive();
  if (stop.active) {
    return { halt: true, reason: 'FOUNDER_STOP', detail: stop.path || 'FOUNDER_STOP.json' };
  }
  const token = hasTokenCapacity();
  if (!token.ok) {
    return { halt: true, reason: 'token_capacity', detail: token.reason };
  }
  const budget = dailyBuildBudget();
  if (!budget.ok) {
    return { halt: true, reason: 'daily_budget', detail: budget };
  }
  return { halt: false };
}

function writeReceipt(payload) {
  const receipt = {
    schema: 'never_stop_product_factory_receipt_v1',
    ...payload,
    written_at: new Date().toISOString(),
  };
  state.lastReceipt = receipt;
  try {
    fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
    fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
  } catch (err) {
    console.warn(`[NEVER-STOP-FACTORY] receipt write failed: ${err?.message || err}`);
  }
}

export function getNeverStopProductFactoryState() {
  return { ...state, receipt_path: RECEIPT_PATH };
}

function readLastReceipt() {
  try {
    return JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function getNeverStopProductFactoryStatus({ events = 25 } = {}) {
  const token = hasTokenCapacity();
  const enabled = neverStopProductsEnabled();
  const hardHalt = neverStopHardHaltReason();
  const intervalMs = Number(process.env.NEVER_STOP_INTERVAL_MS || process.env.BUILDEROS_NEVER_STOP_INTERVAL_MS || 5 * 60 * 1000);
  return {
    ok: true,
    never_stop: {
      enabled,
      runtime: 'railway_boot_domains',
      laptop_is_not_builder: true,
      halt_only_when: ['FOUNDER_STOP', 'PAUSE_AUTONOMY', 'token_capacity', 'daily_budget'],
      hard_halt: hardHalt,
      token_capacity: token,
      running: state.running,
      interval_ms: intervalMs,
      last_run_at: state.lastRunAt,
      total_runs: state.totalRuns,
      token_halt_since: state.tokenHaltSince,
      founder_halt_since: state.founderHaltSince,
      last_skip_reason: state.lastSkipReason,
      daily_budget: dailyBuildBudget(),
      receipt_path: path.relative(REPO_ROOT, RECEIPT_PATH),
      env_present: factoryRuntimeEnvPresence(),
      last_receipt: state.lastReceipt || readLastReceipt(),
      recent_events: readRecentFactoryLog(events),
      governed_status: getGovernedAutonomousShipStatus().governed_autonomous_ship,
    },
  };
}

export async function runNeverStopProductFactoryOnce({ logger } = {}) {
  if (state.running) {
    return { ok: false, skipped: true, reason: 'already_running' };
  }

  const hardHalt = neverStopHardHaltReason();
  if (hardHalt.halt) {
    if (hardHalt.reason === 'FOUNDER_STOP' || hardHalt.reason === 'PAUSE_AUTONOMY') {
      state.founderHaltSince = state.founderHaltSince || new Date().toISOString();
    }
    if (hardHalt.reason === 'token_capacity') {
      state.tokenHaltSince = state.tokenHaltSince || new Date().toISOString();
    }
    state.lastSkipReason = hardHalt.reason;
    writeReceipt({ ok: false, halted: true, reason: hardHalt.reason, detail: hardHalt.detail });
    return { ok: false, halted: true, reason: hardHalt.reason, detail: hardHalt.detail };
  }

  state.tokenHaltSince = null;
  state.founderHaltSince = null;
  state.lastSkipReason = null;
  state.running = true;
  state.lastRunAt = new Date().toISOString();
  writeReceipt({
    ok: true,
    running: true,
    phase: 'started',
    ran_at: state.lastRunAt,
    detail: 'cycle_in_progress',
  });
  try {
    let buildLaneCount = 0;
    try { buildLaneCount = discoverBuildQueueWork().length; } catch { buildLaneCount = 0; }
    const result = buildLaneCount > 1
      ? await runProductExpansionLanes({ logger })
      : await runProductExpansionCycle({ logger });
    const attempts = Array.isArray(result?.results) ? result.results.length : (result?.halted ? 0 : 1);
    recordDailyBuildAttempts(attempts);
    state.lastExitCode = result.ok ? 0 : 1;
    state.totalRuns += 1;
    writeReceipt({ ok: result.ok !== false, ...result, attempts, budget: dailyBuildBudget(), ran_at: state.lastRunAt });
    return result;
  } catch (err) {
    state.lastExitCode = 1;
    state.totalRuns += 1;
    writeReceipt({ ok: false, error: err.message, ran_at: state.lastRunAt });
    logger?.warn?.({ err: err.message }, '[NEVER-STOP-FACTORY] cycle threw — will retry next tick');
    return { ok: false, error: err.message };
  } finally {
    state.running = false;
  }
}

const guardedNeverStopTick = createUsefulWorkGuard({
  taskName: 'NEVER-STOP-PRODUCT-FACTORY',
  purpose: 'Continuous product building on Railway until FOUNDER_STOP or token/budget halt',
  allowInDirectedMode: true,
  prerequisites: async () => {
    if (!neverStopProductsEnabled()) {
      return { ok: false, reason: 'BUILDEROS_NEVER_STOP or BUILDEROS_AUTOPILOT not enabled' };
    }
    const hardHalt = neverStopHardHaltReason();
    if (hardHalt.halt) {
      return { ok: false, reason: `${hardHalt.reason}: ${typeof hardHalt.detail === 'string' ? hardHalt.detail : JSON.stringify(hardHalt.detail)}` };
    }
    return { ok: true };
  },
  workCheck: async () => countProductWork(),
  execute: async ({ logger } = {}) => runNeverStopProductFactoryOnce({ logger }),
});

export function startNeverStopProductFactoryScheduler({ logger } = {}) {
  if (governedFactoryOnly()) {
    logger?.info?.('[NEVER-STOP-FACTORY] fenced off — GOVERNED_FACTORY_ONLY active; ship via /factory/execute-step');
    return null;
  }
  if (!neverStopProductsEnabled()) {
    logger?.info?.('[NEVER-STOP-FACTORY] disabled — set BUILDEROS_NEVER_STOP=1 or BUILDEROS_AUTOPILOT=1 on Railway');
    return null;
  }

  const intervalMs = Number(process.env.NEVER_STOP_INTERVAL_MS || process.env.BUILDEROS_NEVER_STOP_INTERVAL_MS || 5 * 60 * 1000);
  const bootDelayMs = Number(process.env.NEVER_STOP_BOOT_DELAY_MS || 60_000);

  logger?.info?.(
    { intervalMs, bootDelayMs, halt_only: ['FOUNDER_STOP', 'PAUSE_AUTONOMY', 'token_capacity', 'daily_budget'] },
    '[NEVER-STOP-FACTORY] starting on Railway — laptop is not the builder; interval never self-cancels',
  );

  const tick = async () => {
    const outcome = await guardedNeverStopTick({ logger });
    if (outcome?.skipped) {
      state.lastSkipReason = outcome.reason || outcome.detail || 'skipped';
    }
    if (outcome?.reason === 'token_capacity' || String(outcome?.detail || '').includes('token_capacity')) {
      logger?.warn?.('[NEVER-STOP-FACTORY] token capacity exhausted — interval stays alive; retries when keys return');
    }
    if (outcome?.reason === 'FOUNDER_STOP' || String(outcome?.detail || '').includes('FOUNDER_STOP')) {
      logger?.warn?.('[NEVER-STOP-FACTORY] FOUNDER_STOP active — remove builderos-reboot/FOUNDER_STOP.json to resume');
    }
  };

  setTimeout(() => {
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[NEVER-STOP-FACTORY] boot tick failed'));
  }, bootDelayMs);

  // Interval never cleared here — only process death / redeploy stops the timer.
  return setInterval(() => {
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[NEVER-STOP-FACTORY] interval tick failed'));
  }, intervalMs);
}
