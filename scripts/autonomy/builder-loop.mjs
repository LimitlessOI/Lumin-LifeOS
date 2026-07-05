/**
 * SYNOPSIS: scripts/autonomy/builder-loop.mjs — "never idle" continuous-run control for the builder supervisor.
 *
 * Pure decision function so the supervisor's main loop is testable. Given the
 * current queue depth, accumulated spend and cycle counters, it decides whether
 * to process the next batch, idle-and-poll for new priorities, or stop. This is
 * what lets the builder keep building our priorities until the wallet cap is hit
 * (or continuous mode is off), instead of exiting after a single pass.
 *
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */

/**
 * @returns {{ action: 'process'|'idle'|'stop', reason: string }}
 *  - process: pending work exists and no cap hit — run the next batch.
 *  - idle:    queue empty but continuous mode on — sleep, then re-poll.
 *  - stop:    a terminal condition (budget cap, cycle cap, idle cap, or a
 *             one-shot run with an empty queue).
 */
export function loopControl({
  pendingCount = 0,
  continuous = false,
  spentUsd = 0,
  maxRunUsd = 0,
  cycle = 1,
  maxCycles = 0,
  idleCycles = 0,
  maxIdleCycles = 0,
} = {}) {
  // Wallet guardrail always wins — never start more work past the cap.
  if (maxRunUsd > 0 && spentUsd >= maxRunUsd) {
    return { action: 'stop', reason: 'budget_cap' };
  }

  if (pendingCount > 0) {
    if (maxCycles > 0 && cycle > maxCycles) {
      return { action: 'stop', reason: 'cycle_cap' };
    }
    return { action: 'process', reason: 'pending_work' };
  }

  // Queue empty.
  if (!continuous) {
    return { action: 'stop', reason: 'queue_empty' };
  }
  if (maxIdleCycles > 0 && idleCycles >= maxIdleCycles) {
    return { action: 'stop', reason: 'idle_cap' };
  }
  return { action: 'idle', reason: 'queue_empty_continuous' };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
