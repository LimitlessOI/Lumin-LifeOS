/**
 * SYNOPSIS: Walk-forward Limitless Protocol backtest (synthetic + CoinGecko history)
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Walk-forward Limitless Protocol backtest (synthetic + CoinGecko history)
 *
 * Honesty: reports measured returns. Adam prior sims cited ~700%/mo and ~200%/6mo —
 * we try to approach those under synthetic pump regimes; real tape usually lower.
 */
import fs from 'node:fs';
import { seedAccounts, loadAccounts, ensureLipDataDir } from './lib/accounts.mjs';
import { detectEvents } from './lib/detector.mjs';
import { exitPrice, simulateTrade, applyPnlToAccount } from './lib/strategy.mjs';
import { generateSyntheticPumps } from './lib/synthetic.mjs';
import { BACKTEST_PATH } from './lib/paths.mjs';

function runOnBars(bars, accounts, label) {
  const events = detectEvents(bars, {
    lookback: 24,
    volMult: 3.2,
    retThresh: 0.05,
    horizon: 36,
    fallbackSwing: 0.45,
  });

  const fleet = accounts.map((a) => ({ ...a }));
  const startEquity = fleet.reduce((s, a) => s + a.balance_usd, 0);
  const trades = [];
  let treasury = 0;
  let cursor = 0;

  for (const ev of events) {
    const batch = [];
    for (let n = 0; n < 8; n++) {
      batch.push(fleet[cursor % fleet.length]);
      cursor += 1;
    }

    for (const acc of batch) {
      const target = exitPrice(ev.entry, ev.swing_est, acc.tranche);
      const mode = acc.tranche === 'runner' ? 'trail' : 'fixed';
      const sim = simulateTrade(bars, ev.index, ev.entry, target, {
        stopFloor: 0.9,
        maxBars: 36,
        mode,
        swingEst: ev.swing_est,
      });
      const idx = fleet.findIndex((a) => a.id === acc.id);
      const applied = applyPnlToAccount(fleet[idx], sim.pnl_pct);
      fleet[idx] = applied.account;
      treasury += applied.harvested;
      trades.push({
        account_id: acc.id,
        tranche: acc.tranche,
        entry_idx: ev.index,
        pnl_pct: Math.round(sim.pnl_pct * 10000) / 10000,
        reason: sim.reason,
        peak_ret_after: Math.round(ev.peak_ret * 10000) / 10000,
      });
    }
  }

  const endEquity = fleet.reduce((s, a) => s + a.balance_usd, 0) + treasury;
  const totalRet = startEquity > 0 ? (endEquity - startEquity) / startEquity : 0;
  // CoinGecko market_chart often returns ~1 point/day; synthetic is hourly.
  const medianDt =
    bars.length > 2 ? Math.abs((bars[Math.min(50, bars.length - 1)].t || 0) - (bars[0].t || 0)) / Math.min(50, bars.length - 1) : 3600000;
  const hoursPerBar = medianDt > 12 * 3600000 ? 24 : 1;
  const days = (bars.length * hoursPerBar) / 24;
  const months = Math.max(days / 30, 0.01);
  const monthlyApprox = (1 + totalRet) ** (1 / months) - 1;
  const wins = trades.filter((t) => t.pnl_pct > 0).length;

  return {
    label,
    bars: bars.length,
    days: Math.round(days),
    events: events.length,
    trades: trades.length,
    win_rate: trades.length ? Math.round((wins / trades.length) * 1000) / 1000 : 0,
    start_equity: Math.round(startEquity * 100) / 100,
    end_equity: Math.round(endEquity * 100) / 100,
    treasury_harvested: Math.round(treasury * 100) / 100,
    total_return_pct: Math.round(totalRet * 10000) / 100,
    approx_monthly_return_pct: Math.round(monthlyApprox * 10000) / 100,
    vs_adam_cited: {
      monthly_700_pct: monthlyApprox >= 7,
      six_month_200_pct: days >= 150 && totalRet >= 2,
    },
  };
}

async function fetchCgHistory(coinId, days = 180) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Lumin-LIP-paper/1.0' },
  });
  if (!res.ok) throw new Error(`CG ${res.status}`);
  const data = await res.json();
  const prices = data.prices || [];
  const volumes = data.total_volumes || [];
  return prices.map((p, i) => ({
    t: p[0],
    close: p[1],
    volume: volumes[i] ? volumes[i][1] : 0,
  }));
}

async function main() {
  ensureLipDataDir();
  let fleetDoc = loadAccounts();
  if (!fleetDoc) fleetDoc = seedAccounts({ count: 100 });
  const accounts = fleetDoc.accounts;

  const resultAgg = runOnBars(
    generateSyntheticPumps({ days: 180, pumpCount: 55, seed: 7 }),
    accounts,
    'synthetic_aggressive_6mo'
  );
  const resultMild = runOnBars(
    generateSyntheticPumps({ days: 180, pumpCount: 25, seed: 99 }),
    accounts,
    'synthetic_mild_6mo'
  );

  const resultStretch = runOnBars(
    generateSyntheticPumps({ days: 180, pumpCount: 90, seed: 3 }),
    accounts,
    'synthetic_stretch_toward_200pct_6mo'
  );

  const realResults = [];
  for (const coin of ['bitcoin', 'dogecoin', 'shiba-inu', 'pepe']) {
    try {
      const bars = await fetchCgHistory(coin, 180);
      if (bars.length > 50) realResults.push(runOnBars(bars, accounts, `coingecko_${coin}_6mo`));
      await new Promise((r) => setTimeout(r, 1300));
    } catch (e) {
      realResults.push({ label: `coingecko_${coin}_6mo`, error: String(e.message || e) });
    }
  }

  const report = {
    at: new Date().toISOString(),
    strategy_id: 'limitless_protocol',
    accounts: accounts.length,
    adam_cited_targets: { monthly_pct: 700, six_month_pct: 200 },
    results: [resultAgg, resultMild, resultStretch, ...realResults],
    honesty:
      'Synthetic regimes can print high compounded % when pumps are frequent and detection is early. Real CG majors/memes usually will not hit 700%/mo. ~200%/6mo is a stretch target on a pump-rich universe — only claim if measured.',
  };

  fs.writeFileSync(BACKTEST_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err.message || err) }));
  process.exit(1);
});
