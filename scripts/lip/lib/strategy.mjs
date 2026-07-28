/**
 * SYNOPSIS: Limitless Protocol entries / scale-out + trailing runners
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Limitless Protocol entries / scale-out + trailing runners
 */

/** Exit fractions of estimated typical swing by tranche (fixed targets) */
export const TRANCHE_EXIT_FRAC = {
  secure: 0.35,
  core: 0.65,
  runner: 0.85,
};

/** Runner: after price rises this fraction of swingEst, arm trailing stop */
export const TRAIL_ARM_FRAC = 0.4;
/** Trail distance as fraction of peak-so-far (e.g. 0.12 = give back 12% from peak) */
export const TRAIL_GIVEBACK = 0.12;

/**
 * Compute fixed exit price from entry and estimated typical swing.
 */
export function exitPrice(entry, swingEst, tranche = 'core') {
  const frac = TRANCHE_EXIT_FRAC[tranche] ?? TRANCHE_EXIT_FRAC.core;
  return entry * (1 + swingEst * frac);
}

/**
 * Simulate one trade.
 * - secure/core: fixed target from swingEst (+ hard stop / time)
 * - runner: optional trailing stop once armed (Adam: capture upside on some, trail some up)
 *
 * @returns {{ pnl_pct: number, exit: number, bars_held: number, reason: string }}
 */
export function simulateTrade(bars, entryIdx, entryPrice, targetPrice, opts = {}) {
  const stopFloor = opts.stopFloor ?? 0.92;
  const maxBars = opts.maxBars ?? 48;
  const mode = opts.mode ?? 'fixed';
  const swingEst = opts.swingEst ?? 0.4;
  const trailArmFrac = opts.trailArmFrac ?? TRAIL_ARM_FRAC;
  const trailGiveback = opts.trailGiveback ?? TRAIL_GIVEBACK;
  const hardStop = entryPrice * stopFloor;

  let peak = entryPrice;
  let trailArmed = false;
  let trailStop = hardStop;

  for (let j = entryIdx + 1; j < Math.min(bars.length, entryIdx + 1 + maxBars); j++) {
    const px = bars[j].close;
    if (px > peak) peak = px;

    if (mode === 'trail') {
      const armLevel = entryPrice * (1 + swingEst * trailArmFrac);
      if (!trailArmed && peak >= armLevel) {
        trailArmed = true;
        trailStop = peak * (1 - trailGiveback);
      }
      if (trailArmed) {
        trailStop = Math.max(trailStop, peak * (1 - trailGiveback));
        if (px <= trailStop) {
          return {
            pnl_pct: (px - entryPrice) / entryPrice,
            exit: px,
            bars_held: j - entryIdx,
            reason: 'trail',
          };
        }
      }
      if (px <= hardStop) {
        return {
          pnl_pct: (px - entryPrice) / entryPrice,
          exit: px,
          bars_held: j - entryIdx,
          reason: 'stop',
        };
      }
      continue;
    }

    if (px >= targetPrice) {
      return {
        pnl_pct: (targetPrice - entryPrice) / entryPrice,
        exit: targetPrice,
        bars_held: j - entryIdx,
        reason: 'target',
      };
    }
    if (px <= hardStop) {
      return {
        pnl_pct: (px - entryPrice) / entryPrice,
        exit: px,
        bars_held: j - entryIdx,
        reason: 'stop',
      };
    }
  }
  const last = bars[Math.min(bars.length - 1, entryIdx + maxBars)];
  return {
    pnl_pct: (last.close - entryPrice) / entryPrice,
    exit: last.close,
    bars_held: Math.min(maxBars, bars.length - 1 - entryIdx),
    reason: 'time',
  };
}

/**
 * Apply trade PnL to account balance; harvest if over 2000.
 */
export function applyPnlToAccount(account, pnlPct) {
  const next = { ...account };
  next.balance_usd = Math.round(next.balance_usd * (1 + pnlPct) * 100) / 100;
  if (next.balance_usd > next.seed_usd) next.house_money = true;
  let harvested = 0;
  if (next.balance_usd > 2000) {
    const band = 300 + Math.random() * 1700;
    harvested = Math.round((next.balance_usd - band) * 100) / 100;
    next.balance_usd = Math.round(band * 100) / 100;
  }
  return { account: next, harvested };
}
