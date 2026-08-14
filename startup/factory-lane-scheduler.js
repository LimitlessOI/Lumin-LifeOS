/**
 * SYNOPSIS: In-process ship loop for a secondary factory_id (e.g. Collectibles'
 * factory-3), running inside the same paid Railway service instead of a local
 * LaunchAgent tied to a laptop's uptime. Calls runGovernedAutonomousShipOnce
 * directly -- the same function POST /factory/ship-queue-and-commit calls --
 * so it shares the same global ship lock (BUILD_QUEUE.json is one file;
 * concurrent writers without it would clobber each other's updates) and the
 * same GitHub-API commit path, with no local git worktree required.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { runGovernedAutonomousShipOnce } from '../services/governed-autonomous-shipping-loop.js';

const activeFactoryIds = new Set();

const IDLE_REASONS = new Set(['already_running', 'no_shippable_steps', 'fence_off', 'token_capacity', 'daily_budget']);

/**
 * @param {{ logger?: object, factoryId: string, activeDelayMs?: number, idleDelayMs?: number }} opts
 */
export function startFactoryLaneInProcess({ logger, factoryId, activeDelayMs, idleDelayMs } = {}) {
  if (!factoryId) throw new Error('factoryId required');
  // Relies on setSharedPool() already having run -- callers must start this
  // after startGovernedAutonomousShippingLoop(), never before or standalone.
  if (activeFactoryIds.has(factoryId)) {
    logger?.warn?.(`[FACTORY-LANE-INPROCESS] ${factoryId} already started in this process — skipping duplicate start`);
    return null;
  }
  activeFactoryIds.add(factoryId);

  // Same "go-go-go" philosophy as the primary governed loop: chain the next
  // cycle almost immediately when there was real work, back off only when
  // there was genuinely nothing to do or the shared lock was busy.
  const active = Number(activeDelayMs || process.env.FACTORY_LANE_ACTIVE_DELAY_MS || 1_500);
  const idle = Number(idleDelayMs || process.env.FACTORY_LANE_IDLE_DELAY_MS || 30_000);

  const tick = async () => {
    let next = active;
    try {
      const result = await runGovernedAutonomousShipOnce({ logger, maxStepsPerProduct: 1, factoryId });
      logger?.info?.({ factory_id: factoryId, ...result }, '[FACTORY-LANE-INPROCESS] tick');
      if (result && result.skipped && IDLE_REASONS.has(result.reason)) next = idle;
    } catch (err) {
      logger?.warn?.({ factory_id: factoryId, err: err.message }, '[FACTORY-LANE-INPROCESS] tick failed');
      next = idle;
    }
    setTimeout(tick, next);
  };

  logger?.info?.(`[FACTORY-LANE-INPROCESS] starting for ${factoryId} (active=${active}ms, idle=${idle}ms)`);
  tick();
  return { factory_id: factoryId, active_delay_ms: active, idle_delay_ms: idle };
}

/**
 * Reads a comma-separated FACTORY_LANE_INPROCESS_IDS env var and starts one
 * loop per id. Off by default -- nothing runs unless explicitly enabled.
 */
export function startConfiguredFactoryLanesInProcess({ logger } = {}) {
  const raw = process.env.FACTORY_LANE_INPROCESS_IDS || '';
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.map((factoryId) => startFactoryLaneInProcess({ logger, factoryId }));
}
