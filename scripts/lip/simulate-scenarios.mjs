/**
 * SYNOPSIS: Research-calibrated Limitless Protocol scenarios — GROSS vs NET of trading costs
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Research-calibrated Limitless Protocol scenarios — GROSS vs NET of trading costs
 */
import fs from 'node:fs';
import { mulberry32 } from './lib/synthetic.mjs';
import { exitPrice, simulateTrade } from './lib/strategy.mjs';
import { seedAccounts, loadAccounts, ensureLipDataDir } from './lib/accounts.mjs';
import { LIP_DATA } from './lib/paths.mjs';

/** Default cost model (spot taker + slippage). Round-trip subtracted from each trade PnL. */
export const COST_MODEL = {
  taker_fee_one_way: 0.001, // 0.10%
  slip_obscure_one_way: 0.008, // 0.80% thin pump books
  slip_liquid_one_way: 0.0015, // 0.15%
  transfer_drag_per_trade: 0.0005, // amortized withdraw/network / rebalance
};

function roundTripCostPct(isObscure, costs = COST_MODEL) {
  const slip = isObscure ? costs.slip_obscure_one_way : costs.slip_liquid_one_way;
  return 2 * (costs.taker_fee_one_way + slip) + costs.transfer_drag_per_trade;
}

function buildPumpBars(rng, peakRet, entryDelayMins) {
  const bars = [];
  let px = 100;
  for (let i = 0; i < 20; i++) {
    px *= 1 + (rng() - 0.5) * 0.002;
    bars.push({ close: px, volume: 100 + rng() * 50 });
  }
  const pumpStart = bars.length;
  const pumpMins = 8;
  const perMin = Math.pow(1 + peakRet, 1 / pumpMins) - 1;
  for (let i = 0; i < pumpMins; i++) {
    px *= 1 + perMin * (0.85 + rng() * 0.3);
    bars.push({ close: px, volume: 2000 + rng() * 3000 });
  }
  for (let i = 0; i < 20; i++) {
    px *= 1 - (0.04 + rng() * 0.05);
    bars.push({ close: px, volume: 1500 + rng() * 2000 });
  }
  const entryIdx = Math.min(pumpStart + entryDelayMins, pumpStart + pumpMins - 1);
  return { bars, entryIdx, peakRet };
}

function drawPeakRet(rng, mix) {
  if (rng() < mix.obscureShare) return 0.25 + rng() * 0.9;
  return 0.02 + rng() * 0.12;
}

function runScenario(opts) {
  const rng = mulberry32(opts.seed);
  const months = opts.months ?? 6;
  const costs = opts.costs ?? COST_MODEL;
  const applyCosts = opts.applyCosts !== false;

  let fleetGross = (opts.accounts || []).map((a) => ({ ...a, balance_usd: a.seed_usd }));
  let fleetNet = (opts.accounts || []).map((a) => ({ ...a, balance_usd: a.seed_usd }));
  const start = fleetGross.reduce((s, a) => s + a.balance_usd, 0);
  const trades = [];
  let cursor = 0;
  const nEvents = Math.round(opts.eventsPerMonth * months);
  let costSum = 0;

  for (let e = 0; e < nEvents; e++) {
    const isFalse = rng() < (opts.falsePositiveRate ?? 0);
    let bars;
    let entryIdx;
    let peakRet;
    let isObscure = true;
    if (isFalse) {
      bars = [];
      let px = 100;
      for (let i = 0; i < 15; i++) {
        px *= i < 3 ? 1.04 : 0.92;
        bars.push({ close: px, volume: 800 });
      }
      entryIdx = 2;
      peakRet = 0.12;
      isObscure = true;
    } else {
      isObscure = rng() < (opts.obscureShare ?? 0.7);
      peakRet = isObscure ? 0.25 + rng() * 0.9 : 0.02 + rng() * 0.12;
      ({ bars, entryIdx } = buildPumpBars(rng, peakRet, opts.entryDelayMins));
    }

    const entry = bars[entryIdx].close;
    const swingEst = Math.max(0.08, peakRet * (0.7 + rng() * 0.4));
    const rtCost = roundTripCostPct(isObscure, costs);

    for (let n = 0; n < 6; n++) {
      const acc = fleetGross[cursor % fleetGross.length];
      cursor += 1;
      const target = exitPrice(entry, swingEst, acc.tranche);
      const mode = acc.tranche === 'runner' ? 'trail' : 'fixed';
      const sim = simulateTrade(bars, entryIdx, entry, target, {
        mode,
        swingEst,
        stopFloor: 0.88,
        maxBars: 40,
        trailArmFrac: 0.35,
        trailGiveback: 0.12,
      });
      const gross = sim.pnl_pct;
      const net = applyCosts ? gross - rtCost : gross;
      costSum += rtCost;

      const gi = fleetGross.findIndex((a) => a.id === acc.id);
      const ni = fleetNet.findIndex((a) => a.id === acc.id);
      fleetGross[gi] = {
        ...fleetGross[gi],
        balance_usd: Math.round(fleetGross[gi].balance_usd * (1 + gross) * 100) / 100,
      };
      fleetNet[ni] = {
        ...fleetNet[ni],
        balance_usd: Math.round(fleetNet[ni].balance_usd * (1 + net) * 100) / 100,
      };
      trades.push({
        tranche: acc.tranche,
        gross_pnl_pct: gross,
        net_pnl_pct: net,
        round_trip_cost_pct: rtCost,
        reason: sim.reason,
        false: isFalse,
        obscure: isObscure,
      });
    }
  }

  const endGross = fleetGross.reduce((s, a) => s + a.balance_usd, 0);
  const endNet = fleetNet.reduce((s, a) => s + a.balance_usd, 0);
  const retG = (endGross - start) / start;
  const retN = (endNet - start) / start;
  const winsNet = trades.filter((t) => t.net_pnl_pct > 0).length;
  const avgCost = trades.length ? costSum / trades.length : 0;

  return {
    label: opts.label,
    months,
    events: nEvents,
    events_per_month: opts.eventsPerMonth,
    entry_delay_mins: opts.entryDelayMins,
    false_positive_rate: opts.falsePositiveRate,
    start_equity: Math.round(start * 100) / 100,
    gross: {
      end_equity: Math.round(endGross * 100) / 100,
      total_return_pct: Math.round(retG * 10000) / 100,
      approx_monthly_pct: Math.round(((1 + retG) ** (1 / months) - 1) * 10000) / 100,
    },
    net_after_costs: {
      end_equity: Math.round(endNet * 100) / 100,
      total_return_pct: Math.round(retN * 10000) / 100,
      approx_monthly_pct: Math.round(((1 + retN) ** (1 / months) - 1) * 10000) / 100,
      win_rate: trades.length ? Math.round((winsNet / trades.length) * 1000) / 1000 : 0,
      avg_round_trip_cost_pct: Math.round(avgCost * 10000) / 100,
    },
    trades: trades.length,
  };
}

function main() {
  ensureLipDataDir();
  const doc = loadAccounts() || seedAccounts({ count: 100, force: true });
  const accounts = doc.accounts;

  const defs = [
    { label: 'optimistic_early_15pm', seed: 11, eventsPerMonth: 15, entryDelayMins: 1, falsePositiveRate: 0.1, obscureShare: 0.75 },
    { label: 'base_early_12pm', seed: 22, eventsPerMonth: 12, entryDelayMins: 2, falsePositiveRate: 0.2, obscureShare: 0.65 },
    { label: 'stretch_20pm_early', seed: 33, eventsPerMonth: 20, entryDelayMins: 1, falsePositiveRate: 0.15, obscureShare: 0.7 },
    { label: 'late_entry_danger_4min', seed: 44, eventsPerMonth: 15, entryDelayMins: 4, falsePositiveRate: 0.25, obscureShare: 0.6 },
    { label: 'pessimistic_late_noisy', seed: 55, eventsPerMonth: 8, entryDelayMins: 5, falsePositiveRate: 0.4, obscureShare: 0.5 },
    { label: 'liquid_only_small_pumps', seed: 66, eventsPerMonth: 15, entryDelayMins: 2, falsePositiveRate: 0.2, obscureShare: 0.1 },
  ];

  const scenarios = defs.map((d) =>
    runScenario({
      ...d,
      accounts,
      months: 6,
      costs: COST_MODEL,
      applyCosts: true,
    })
  );

  const report = {
    at: new Date().toISOString(),
    strategy: 'limitless_protocol_net_of_costs',
    accounts: accounts.length,
    cost_model: {
      ...COST_MODEL,
      obscure_round_trip_pct: roundTripCostPct(true),
      liquid_round_trip_pct: roundTripCostPct(false),
      explanation:
        'Per trade: 2×(taker fee + slippage) + small transfer drag. Obscure pumps = fat slippage.',
    },
    scenarios,
    honesty: 'Net figures still omit exchange outages, failed fills, and worse-than-modeled thin-book slippage.',
  };

  fs.writeFileSync(`${LIP_DATA}/scenario-returns-net.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main();
