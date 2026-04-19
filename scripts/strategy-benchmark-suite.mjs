#!/usr/bin/env node
/**
 * Multi-strategy benchmark on shared OHLCV (same fee/slip, next-bar open, causal rules).
 *
 * **You cannot maximize raw return and “reliability” with one magic number** — they trade off.
 * This script surfaces:
 * - `reliabilityScore` = mult / (1 + avgDD)  (return per unit drawdown)
 * - **Pareto frontier**: strategies no one else beats on *both* mult and DD
 * - **Risk-budget path**: best mult among strategies under `--max-avg-dd`
 * - **Walk-forward** (`--wf-folds K`): median / worst fold portfolio mult (stability over time)
 *
 * Not investment advice.
 *
 * Usage:
 *   node scripts/strategy-benchmark-suite.mjs
 *   node scripts/strategy-benchmark-suite.mjs --wf-folds 4 --max-avg-dd 0.25
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadBarsForSymbol,
  loadBarsCsv,
  runBotOnBarsSlice,
  DEFAULT_FORMULA,
  effectiveWarmBars,
  createLearner,
  applyCosts,
  sma,
} from './attention-momentum-backtest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'logs', 'strategy-benchmark-suite.json');

function parseArgs(argv) {
  const o = {
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
    days: 500,
    interval: '4h',
    capital: 500,
    feeBps: 10,
    slipBps: 5,
    warm: 120,
    csv: null,
    wfFolds: 0,
    maxAvgDd: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--symbols') o.symbols = argv[++i].split(',').map((s) => s.trim().toUpperCase());
    else if (a === '--days') o.days = Number(argv[++i]);
    else if (a === '--csv') o.csv = argv[++i];
    else if (a === '--capital') o.capital = Number(argv[++i]);
    else if (a === '--fee-bps') o.feeBps = Number(argv[++i]);
    else if (a === '--slip-bps') o.slipBps = Number(argv[++i]);
    else if (a === '--wf-folds') o.wfFolds = Math.max(0, Number(argv[++i]));
    else if (a === '--max-avg-dd') o.maxAvgDd = Number(argv[++i]);
  }
  return o;
}

function maxDrawdownSeries(equity) {
  if (!equity.length) return 0;
  let peak = equity[0];
  let maxDd = 0;
  for (const e of equity) {
    peak = Math.max(peak, e);
    if (peak > 0) maxDd = Math.max(maxDd, (peak - e) / peak);
  }
  return maxDd;
}

function maxDdFromTradeEquity(trades, initial) {
  let eq = initial;
  let peak = initial;
  let maxDd = 0;
  for (const t of trades) {
    eq += t.pnlUsd;
    peak = Math.max(peak, eq);
    if (peak > 0) maxDd = Math.max(maxDd, (peak - eq) / peak);
  }
  return maxDd;
}

function rsi(closes, i, period) {
  if (i < period) return null;
  let gain = 0;
  let loss = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const ch = closes[j] - closes[j - 1];
    if (ch >= 0) gain += ch;
    else loss -= ch;
  }
  const ag = gain / period;
  const al = loss / period;
  if (al === 0) return 100;
  return 100 - 100 / (1 + ag / al);
}

function donchianHigh(bars, i, n) {
  if (i < n) return null;
  let h = -Infinity;
  for (let j = i - n; j < i; j++) h = Math.max(h, bars[j].h);
  return h;
}

function donchianLow(bars, i, n) {
  if (i < n) return null;
  let lo = Infinity;
  for (let j = i - n; j < i; j++) lo = Math.min(lo, bars[j].l);
  return lo;
}

function markEq(cash, qty, px) {
  return cash + qty * px;
}

function runLongFlat(bars, baseOpts, warm, onBar) {
  const { feeBps, slipBps, initialPerBot } = baseOpts;
  let cash = initialPerBot;
  let qty = 0;
  const equity = [];
  let tradeEvents = 0;
  const closes = bars.map((b) => b.c);

  for (let i = warm; i < bars.length - 1; i++) {
    const mpx = bars[i].c;
    equity.push(markEq(cash, qty, mpx));
    const action = onBar(bars, closes, i, qty > 0) || 'hold';
    if (action === 'buy' && qty <= 0) {
      const next = i + 1;
      const fill = applyCosts(bars[next].o, feeBps, slipBps, true);
      const spend = cash * 0.98;
      const q = spend / fill;
      const minOrder = Math.max(0.2, initialPerBot * 0.02);
      if (q * fill < minOrder) continue;
      cash -= q * fill;
      qty = q;
      tradeEvents++;
    } else if (action === 'sell' && qty > 0) {
      const next = i + 1;
      const fill = applyCosts(bars[next].o, feeBps, slipBps, false);
      cash += qty * fill;
      qty = 0;
      tradeEvents++;
    }
  }
  const last = bars[bars.length - 1];
  const lf = applyCosts(last.c, feeBps, slipBps, false);
  const finalCash = cash + qty * lf;
  return {
    finalCash,
    tradeEvents,
    maxDd: maxDrawdownSeries(equity),
  };
}

const STRATEGIES = [
  {
    id: 'buy_hold',
    label: 'Buy & hold (enter once after warm)',
    run(bars, o, warm) {
      let armed = true;
      return runLongFlat(bars, o, warm, () => {
        if (armed) {
          armed = false;
          return 'buy';
        }
        return 'hold';
      });
    },
  },
  {
    id: 'sma_12_48',
    label: 'SMA cross 12/48 long-only',
    run(bars, o, warm) {
      const closes = bars.map((b) => b.c);
      return runLongFlat(bars, o, warm, (_, __, i, holding) => {
        const a = 12;
        const b = 48;
        const sf = sma(closes, i, a);
        const ss = sma(closes, i, b);
        const sf1 = sma(closes, i - 1, a);
        const ss1 = sma(closes, i - 1, b);
        if (sf == null || ss == null || sf1 == null || ss1 == null) return 'hold';
        const up = sf > ss;
        const up1 = sf1 > ss1;
        if (up && !up1 && !holding) return 'buy';
        if (!up && up1 && holding) return 'sell';
        return 'hold';
      });
    },
  },
  {
    id: 'sma_24_72',
    label: 'SMA cross 24/72 long-only',
    run(bars, o, warm) {
      const closes = bars.map((b) => b.c);
      return runLongFlat(bars, o, warm, (_, __, i, holding) => {
        const a = 24;
        const b = 72;
        const sf = sma(closes, i, a);
        const ss = sma(closes, i, b);
        const sf1 = sma(closes, i - 1, a);
        const ss1 = sma(closes, i - 1, b);
        if (sf == null || ss == null || sf1 == null || ss1 == null) return 'hold';
        const up = sf > ss;
        const up1 = sf1 > ss1;
        if (up && !up1 && !holding) return 'buy';
        if (!up && up1 && holding) return 'sell';
        return 'hold';
      });
    },
  },
  {
    id: 'donchian_20_10',
    label: 'Donchian break 20 high / exit below 10 low',
    run(bars, o, warm) {
      const closes = bars.map((b) => b.c);
      return runLongFlat(bars, o, warm, (bars2, _, i, holding) => {
        const hi = donchianHigh(bars2, i, 20);
        const lo = donchianLow(bars2, i, 10);
        if (hi == null || lo == null) return 'hold';
        const c = closes[i];
        if (!holding && c > hi) return 'buy';
        if (holding && c < lo) return 'sell';
        return 'hold';
      });
    },
  },
  {
    id: 'rsi_14_mr',
    label: 'RSI(14) mean reversion long <34 exit >52',
    run(bars, o, warm) {
      const closes = bars.map((b) => b.c);
      return runLongFlat(bars, o, warm, (_, __, i, holding) => {
        const r = rsi(closes, i, 14);
        if (r == null) return 'hold';
        if (!holding && r < 34) return 'buy';
        if (holding && r > 52) return 'sell';
        return 'hold';
      });
    },
  },
  {
    id: 'momentum_roc',
    label: 'ROC(6)>0 & close>SMA20 long, exit ROC<0',
    run(bars, o, warm) {
      const closes = bars.map((b) => b.c);
      return runLongFlat(bars, o, warm, (_, __, i, holding) => {
        if (i < 7) return 'hold';
        const roc = (closes[i] - closes[i - 6]) / Math.max(closes[i - 6], 1e-12);
        const s20 = sma(closes, i, 20);
        if (s20 == null) return 'hold';
        if (!holding && roc > 0 && closes[i] > s20) return 'buy';
        if (holding && roc < 0) return 'sell';
        return 'hold';
      });
    },
  },
];

function runAttention(bars, symbol, o, warm) {
  const learner = createLearner(false);
  const opts = {
    formula: { ...DEFAULT_FORMULA, simLeverage: 1 },
    feeBps: o.feeBps,
    slipBps: o.slipBps,
    initialPerBot: o.initialPerBot,
    warmBars: warm,
    botVolStep: 0,
  };
  const { finalCash, trades } = runBotOnBarsSlice(opts, bars, 0, symbol, learner);
  const maxDd = maxDdFromTradeEquity(trades, o.initialPerBot);
  return { finalCash, tradeEvents: trades.length, maxDd };
}

function portfolioRow(id, label, runStrategy, barBySym, cfg, warm) {
  let totalStart = 0;
  let totalEnd = 0;
  const dds = [];
  let events = 0;
  const baseOpts = {
    feeBps: cfg.feeBps,
    slipBps: cfg.slipBps,
    initialPerBot: cfg.capital,
  };
  for (const sym of cfg.symbols) {
    const bars = barBySym.get(sym);
    if (!bars || bars.length < warm + 10) continue;
    const r = runStrategy(bars, baseOpts, warm);
    totalStart += cfg.capital;
    totalEnd += r.finalCash;
    dds.push(r.maxDd);
    events += r.tradeEvents;
  }
  const mult = totalStart > 0 ? totalEnd / totalStart : 0;
  const avgDd = dds.length ? dds.reduce((a, b) => a + b, 0) / dds.length : 0;
  const score = mult / (1 + avgDd);
  return {
    id,
    label,
    portfolioMult: mult,
    avgMaxDrawdown: avgDd,
    reliabilityScore: score,
    tradeEvents: events,
  };
}

function sliceWalkForwardBars(bars, warm, kFolds) {
  const inner = bars.length - warm;
  if (inner < kFolds * 25) return null;
  const foldLen = Math.floor(inner / kFolds);
  const folds = [];
  for (let j = 0; j < kFolds; j++) {
    const startFull = warm + j * foldLen;
    const endFull = j === kFolds - 1 ? bars.length : warm + (j + 1) * foldLen;
    const sliceStart = Math.max(0, startFull - warm);
    folds.push(bars.slice(sliceStart, endFull));
  }
  return folds;
}

function walkForwardRow(id, label, runStrategy, barBySym, cfg, warm, kFolds) {
  const foldMults = [];
  for (const sym of cfg.symbols) {
    const bars = barBySym.get(sym);
    const folds = bars ? sliceWalkForwardBars(bars, warm, kFolds) : null;
    if (!folds) continue;
    for (const sub of folds) {
      if (sub.length < warm + 15) continue;
      let totalStart = 0;
      let totalEnd = 0;
      const r = runStrategy(sub, { feeBps: cfg.feeBps, slipBps: cfg.slipBps, initialPerBot: cfg.capital }, warm);
      totalStart += cfg.capital;
      totalEnd += r.finalCash;
      foldMults.push(totalEnd / totalStart);
    }
  }
  if (!foldMults.length) return null;
  const sorted = [...foldMults].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const pos = foldMults.filter((m) => m >= 1).length / foldMults.length;
  return { id, label, wfFolds: foldMults.length, medianFoldMult: median, worstFoldMult: worst, bestFoldMult: best, pctFoldsNonLoss: pos };
}

/** A is dominated if some B has ≥ mult, ≤ DD, and strictly better on at least one. */
function paretoOptimal(rows) {
  const ids = new Set();
  for (const a of rows) {
    let dominated = false;
    for (const b of rows) {
      if (b.id === a.id) continue;
      const geMult = b.portfolioMult >= a.portfolioMult;
      const leDd = b.avgMaxDrawdown <= a.avgMaxDrawdown;
      const strict = b.portfolioMult > a.portfolioMult || b.avgMaxDrawdown < a.avgMaxDrawdown;
      if (geMult && leDd && strict) {
        dominated = true;
        break;
      }
    }
    if (!dominated) ids.add(a.id);
  }
  return ids;
}

async function main() {
  const cfg = parseArgs(process.argv);
  const barBySym = new Map();

  if (cfg.csv) {
    const bars = loadBarsCsv(cfg.csv);
    for (const s of cfg.symbols) barBySym.set(s, bars);
  } else {
    for (const sym of cfg.symbols) {
      process.stdout.write(`Fetching ${sym} … `);
      const bars = await loadBarsForSymbol(sym, cfg.interval, cfg.days);
      console.log(`${bars.length} bars`);
      barBySym.set(sym, bars);
    }
  }

  const warm = Math.max(cfg.warm, effectiveWarmBars(DEFAULT_FORMULA, cfg.warm));

  const rows = [];
  for (const st of STRATEGIES) {
    rows.push(portfolioRow(st.id, st.label, st.run, barBySym, cfg, warm));
  }
  {
    const id = 'attention_momentum';
    const label = 'Attention-momentum (DEFAULT_FORMULA, simLeverage=1)';
    let totalStart = 0;
    let totalEnd = 0;
    const dds = [];
    let events = 0;
    const baseOpts = { feeBps: cfg.feeBps, slipBps: cfg.slipBps, initialPerBot: cfg.capital };
    for (const sym of cfg.symbols) {
      const bars = barBySym.get(sym);
      if (!bars || bars.length < warm + 10) continue;
      const r = runAttention(bars, sym, baseOpts, warm);
      totalStart += cfg.capital;
      totalEnd += r.finalCash;
      dds.push(r.maxDd);
      events += r.tradeEvents;
    }
    const mult = totalStart > 0 ? totalEnd / totalStart : 0;
    const avgDd = dds.length ? dds.reduce((a, b) => a + b, 0) / dds.length : 0;
    rows.push({
      id,
      label,
      portfolioMult: mult,
      avgMaxDrawdown: avgDd,
      reliabilityScore: mult / (1 + avgDd),
      tradeEvents: events,
    });
  }

  const pareto = paretoOptimal(rows);
  rows.forEach((r) => {
    r.paretoOptimal = pareto.has(r.id);
  });

  rows.sort((a, b) => b.reliabilityScore - a.reliabilityScore);

  let underCap = [];
  if (cfg.maxAvgDd != null && Number.isFinite(cfg.maxAvgDd)) {
    underCap = rows.filter((r) => r.avgMaxDrawdown <= cfg.maxAvgDd + 1e-9);
    underCap.sort((a, b) => b.portfolioMult - a.portfolioMult);
  }

  let wfRows = [];
  if (cfg.wfFolds >= 2) {
    for (const st of STRATEGIES) {
      const w = walkForwardRow(st.id, st.label, st.run, barBySym, cfg, warm, cfg.wfFolds);
      if (w) wfRows.push(w);
    }
    const wfAtt = [];
    for (const sym of cfg.symbols) {
      const bars = barBySym.get(sym);
      const folds = bars ? sliceWalkForwardBars(bars, warm, cfg.wfFolds) : null;
      if (!folds) continue;
      for (const sub of folds) {
        if (sub.length < warm + 15) continue;
        const r = runAttention(sub, sym, { feeBps: cfg.feeBps, slipBps: cfg.slipBps, initialPerBot: cfg.capital }, warm);
        wfAtt.push(r.finalCash / cfg.capital);
      }
    }
    if (wfAtt.length) {
      const sorted = [...wfAtt].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      wfRows.push({
        id: 'attention_momentum',
        label: 'Attention-momentum',
        wfFolds: wfAtt.length,
        medianFoldMult: median,
        worstFoldMult: sorted[0],
        bestFoldMult: sorted[sorted.length - 1],
        pctFoldsNonLoss: wfAtt.filter((m) => m >= 1).length / wfAtt.length,
      });
    }
    wfRows.sort((a, b) => b.medianFoldMult - a.medianFoldMult);
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        ts: Date.now(),
        symbols: cfg.symbols,
        capitalPerSymbol: cfg.capital,
        warmBars: warm,
        rankedBy: 'portfolioMult / (1 + avgMaxDrawdown)',
        maxAvgDdCap: cfg.maxAvgDd,
        wfFolds: cfg.wfFolds,
        rows,
        paretoOptimalIds: [...pareto],
        bestUnderDdCap: underCap[0] || null,
        walkForward: wfRows,
      },
      null,
      2,
    ),
  );

  console.log('\n=== Full sample (one continuous window) ===\n');
  console.log('reliabilityScore = portfolioMult / (1 + avgMaxDrawdown)\n');
  console.log('| Rank | Strategy | Mult | AvgDD | Score | Pareto | Trades |');
  console.log('|------|----------|------|-------|-------|--------|--------|');
  rows.forEach((r, i) => {
    console.log(
      `| ${i + 1} | ${r.id} | ${r.portfolioMult.toFixed(4)} | ${r.avgMaxDrawdown.toFixed(4)} | ${r.reliabilityScore.toFixed(4)} | ${r.paretoOptimal ? 'yes' : ''} | ${r.tradeEvents} |`,
    );
  });

  console.log('\n=== Pareto frontier (no other strategy is strictly better on BOTH mult and avgDD) ===');
  const p = rows.filter((r) => r.paretoOptimal);
  for (const r of p.sort((a, b) => b.portfolioMult - a.portfolioMult)) {
    console.log(`  ${r.id}: mult=${r.portfolioMult.toFixed(4)} avgDD=${r.avgMaxDrawdown.toFixed(4)}`);
  }

  if (cfg.maxAvgDd != null && Number.isFinite(cfg.maxAvgDd)) {
    console.log(`\n=== Best return under avgDD ≤ ${cfg.maxAvgDd} ===`);
    if (underCap.length) {
      const b = underCap[0];
      console.log(`  ${b.id} → mult=${b.portfolioMult.toFixed(4)} avgDD=${b.avgMaxDrawdown.toFixed(4)}`);
    } else console.log('  (none meet cap — raise --max-avg-dd or accept more drawdown)');
  }

  if (wfRows.length) {
    console.log(`\n=== Walk-forward (${cfg.wfFolds} folds per symbol, median mult across fold-runs) ===`);
    console.log('| Strategy | #fold-runs | Median mult | Worst fold | % folds ≥1x |');
    console.log('|----------|------------|-------------|------------|-------------|');
    for (const w of wfRows) {
      console.log(
        `| ${w.id} | ${w.wfFolds} | ${w.medianFoldMult.toFixed(4)} | ${w.worstFoldMult.toFixed(4)} | ${(w.pctFoldsNonLoss * 100).toFixed(0)}% |`,
      );
    }
  }

  console.log(`
=== Paths to higher returns (reliability = survives time + risk caps) ===
1. **Longer history** — use --csv with years of bars; short Kraken windows are noisy.
2. **Walk-forward** — run with --wf-folds 4 (or 6). Prefer strategies with high *median* fold mult and *worst* fold not catastrophic.
3. **Risk budget** — set --max-avg-dd 0.20 then read “best under cap”; trade raw return for smaller DD.
4. **Pareto set** — pick from the frontier: higher mult usually means higher DD unless you move to a different idea.
5. **Leverage last** — in attention-momentum-backtest, simLeverage scales PnL *after* you trust the unlevered path + WF stats.

JSON: ${OUT_JSON}
`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
