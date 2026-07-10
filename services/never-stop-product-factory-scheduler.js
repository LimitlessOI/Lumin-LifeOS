/**
 * SYNOPSIS: Railway + local scheduler — never-stop product factory (only halts on token exhaustion).
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

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = path.join(REPO_ROOT, 'data/never-stop-product-factory-receipt.json');

const state = {
  running: false,
  lastRunAt: null,
  lastExitCode: null,
  totalRuns: 0,
  tokenHaltSince: null,
  lastReceipt: null,
};

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
    // Keep in-memory receipt even if disk write fails (ephemeral container / dockerignored data/).
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
  const intervalMs = Number(process.env.NEVER_STOP_INTERVAL_MS || process.env.BUILDEROS_NEVER_STOP_INTERVAL_MS || 5 * 60 * 1000);
  return {
    ok: true,
    never_stop: {
      enabled,
      token_capacity: token,
      running: state.running,
      interval_ms: intervalMs,
      last_run_at: state.lastRunAt,
      total_runs: state.totalRuns,
      token_halt_since: state.tokenHaltSince,
      daily_budget: dailyBuildBudget(),
      receipt_path: path.relative(REPO_ROOT, RECEIPT_PATH),
      // OBSERVABILITY: what the loop is actually deciding each cycle + whether the
      // runtime env it needs to commit/plan is present (booleans only). This is
      // the blind spot — total_runs alone can't explain zero-commit cycles.
      env_present: factoryRuntimeEnvPresence(),
      last_receipt: state.lastReceipt || readLastReceipt(),
      recent_events: readRecentFactoryLog(events),
    },
  };
}

export async function runNeverStopProductFactoryOnce({ logger } = {}) {
  if (state.running) {
    return { ok: false, skipped: true, reason: 'already_running' };
  }
  const token = hasTokenCapacity();
  if (!token.ok) {
    state.tokenHaltSince = state.tokenHaltSince || new Date().toISOString();
    writeReceipt({ ok: false, halted: true, reason: 'token_capacity', detail: token.reason });
    return { ok: false, halted: true, reason: 'token_capacity' };
  }
  // COST GUARDRAIL: refuse to spend once the day's builder-attempt cap is hit.
  const budget = dailyBuildBudget();
  if (!budget.ok) {
    writeReceipt({ ok: false, halted: true, reason: 'daily_budget', detail: budget });
    return { ok: false, halted: true, reason: 'daily_budget', detail: budget };
  }
  state.tokenHaltSince = null;
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
    // MULTIPLE LANES: when 2+ products have actionable build-queue steps, build
    // them in parallel (bounded) instead of one task per tick. Fall back to the
    // single-task expansion cycle when there is only one (or zero) lane of work.
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
    logger?.warn?.({ err: err.message }, '[NEVER-STOP-FACTORY] cycle threw');
    return { ok: false, error: err.message };
  } finally {
    state.running = false;
  }
}

const guardedNeverStopTick = createUsefulWorkGuard({
  taskName: 'NEVER-STOP-PRODUCT-FACTORY',
  purpose: 'Continuous product building — BP queue + SMOS expansion + intake until tokens exhausted',
  allowInDirectedMode: true,
  prerequisites: async () => {
    if (!neverStopProductsEnabled()) {
      return { ok: false, reason: 'BUILDEROS_NEVER_STOP or BUILDEROS_AUTOPILOT not enabled' };
    }
    const token = hasTokenCapacity();
    if (!token.ok) {
      return { ok: false, reason: `token_capacity: ${token.reason}` };
    }
    return { ok: true };
  },
  workCheck: async () => countProductWork(),
  execute: async ({ logger } = {}) => runNeverStopProductFactoryOnce({ logger }),
});

export function startNeverStopProductFactoryScheduler({ logger } = {}) {
  // STEP 5 fence: when the governed factory is the shipping path, the ungoverned
  // autonomous loop must not even start. Code ships through /factory/execute-step.
  if (governedFactoryOnly()) {
    logger?.info?.('[NEVER-STOP-FACTORY] fenced off — GOVERNED_FACTORY_ONLY active; ship via /factory/execute-step');
    return null;
  }
  if (!neverStopProductsEnabled()) {
    logger?.info?.('[NEVER-STOP-FACTORY] disabled — set BUILDEROS_NEVER_STOP=1 or BUILDEROS_AUTOPILOT=1');
    return null;
  }

  const intervalMs = Number(process.env.NEVER_STOP_INTERVAL_MS || process.env.BUILDEROS_NEVER_STOP_INTERVAL_MS || 5 * 60 * 1000);
  const bootDelayMs = Number(process.env.NEVER_STOP_BOOT_DELAY_MS || 60_000);

  logger?.info?.({ intervalMs, bootDelayMs }, '[NEVER-STOP-FACTORY] starting — continuous product building active');

  const tick = async () => {
    const outcome = await guardedNeverStopTick({ logger });
    if (outcome?.reason === 'token_capacity' || outcome?.detail?.includes('token')) {
      logger?.warn?.('[NEVER-STOP-FACTORY] token capacity exhausted — will retry on next tick');
    }
  };

  setTimeout(() => {
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[NEVER-STOP-FACTORY] boot tick failed'));
  }, bootDelayMs);

  return setInterval(() => {
    tick().catch((err) => logger?.warn?.({ err: err.message }, '[NEVER-STOP-FACTORY] interval tick failed'));
  }, intervalMs);
}
