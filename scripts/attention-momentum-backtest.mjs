#!/usr/bin/env node
/**
 * Attention / flow backtest on real historical OHLCV.
 *
 * - P&L from price + fees + slippage only (no biased random wins).
 * - **Formula**: tunable signal + exit parameters (CLI or `--formula-json`).
 * - **Walk-forward** (`--walk-forward`): grid-search `volThreshold` × `atrMult` on
 *   each train window, freeze winner, measure on the next test window — reports
 *   aggregated **out-of-sample** metrics (meaningful learning / no peeking).
 * - Optional **online** nudge (`volAdjust`) when not using `--no-online-learn`.
 * - **Many accounts**: `--bots 100 --per-bot 5` (each fetches shared symbols once). Optional
 *   `--learn-scale` strengthens adaptation; report compares **first vs second half** of each
 *   account’s closed trades (avg R) to see if behavior improved over the window.
 *
 * Usage:
 *   node scripts/attention-momentum-backtest.mjs
 *   node scripts/attention-momentum-backtest.mjs --bots 100 --per-bot 5 --learn-scale 2
 *   node scripts/attention-momentum-backtest.mjs --walk-forward --train-bars 350 --test-bars 150 --step-bars 150
 *   node scripts/attention-momentum-backtest.mjs --formula-json ./my-formula.json --no-online-learn
 *   node scripts/attention-momentum-backtest.mjs --optimize-in-sample --optimize-trials 20000 --optimize-mode portfolio
 *   (Optimizer: **in-sample only** — validate with `--walk-forward`.)
 *   **Simulated leverage** (`--sim-leverage`, `simLeverage` in formula): scales round-trip P&amp;L vs equity
 *   (margin-style amplification). Labeled in trade rows — not spot unlevered performance.
 *   `--optimize-in-sample --optimize-allow-leverage` searches formula × leverage to hit `--optimize-target-mult`.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(SCRIPT_PATH);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'logs', 'attention-backtest-trades.jsonl');
const WALK_FORWARD_OUT = path.join(ROOT, 'logs', 'attention-walk-forward.jsonl');
const FORMULA_OPTIM_OUT = path.join(ROOT, 'logs', 'attention-formula-in-sample-best.json');

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleRandomFormula(rng) {
  const u = () => rng();
  const smaFast = 6 + Math.floor(u() * 28);
  let smaSlow = smaFast + 10 + Math.floor(u() * 55);
  smaSlow = Math.min(smaSlow, 100);
  const m1 = 0.3 + u() * 0.5;
  let m2 = m1 + 0.04 + u() * 0.28;
  m2 = Math.min(0.96, m2);
  return {
    volThreshold: 0.85 + u() * 1.65,
    atrMult: 1.2 + u() * 4.2,
    smaFast,
    smaSlow,
    volLookback: 6 + Math.floor(u() * 44),
    atrLen: 5 + Math.floor(u() * 24),
    moveFrac1: m1,
    moveFrac2: m2,
    partialFrac1: 0.1 + u() * 0.55,
    partialFrac2: 0.2 + u() * 0.65,
    stopAtrMult: 0.45 + u() * 2.2,
    trailAtrMult: 0.2 + u() * 0.75,
    impulseLowRatio: 1.0002 + u() * 0.025,
    impulseLookback: 2 + Math.floor(u() * 12),
    regimeLookback: 12 + Math.floor(u() * 48),
    regimeBull: 0.008 + u() * 0.07,
    regimeBear: -0.09 + u() * 0.06,
    smaSlowEps: 0.99 + u() * 0.018,
  };
}

function evaluatePortfolioMult(baseOpts, barBySym, symList, formula) {
  let start = 0;
  let end = 0;
  let trades = 0;
  const runOpts = { ...baseOpts, formula, noOnlineLearn: true };
  if (baseOpts.optimizeZeroFee) {
    runOpts.feeBps = 0;
    runOpts.slipBps = 0;
  }
  const learner = createLearner(false);
  for (const sym of symList) {
    const bars = barBySym.get(sym);
    if (!bars?.length) continue;
    start += baseOpts.initialPerBot;
    const { finalCash, trades: tr } = runBotOnBarsSlice(runOpts, bars, 0, sym, learner);
    end += finalCash;
    trades += tr.length;
  }
  if (start <= 0) return { mult: 0, trades: 0 };
  return { mult: end / start, trades, endCash: end };
}

function evaluateSingleMult(baseOpts, bars, symbol, formula) {
  const runOpts = { ...baseOpts, formula, noOnlineLearn: true };
  if (baseOpts.optimizeZeroFee) {
    runOpts.feeBps = 0;
    runOpts.slipBps = 0;
  }
  const learner = createLearner(false);
  const { finalCash, trades } = runBotOnBarsSlice(runOpts, bars, 0, symbol, learner);
  return { mult: finalCash / baseOpts.initialPerBot, trades: trades.length, endCash: finalCash };
}

const LEVERAGE_GRID = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64];

function pickRandomLeverage(rng, allow) {
  if (!allow) return 1;
  const g = LEVERAGE_GRID;
  return g[Math.floor(rng() * g.length)];
}

/** Smallest integer simLeverage ≥1 such that portfolio/single mult ≥ target (linear scan; robust if path is profitable). */
function minLeverageForTarget(baseOpts, barBySym, symList, formula, targetMult, maxLev = 400) {
  for (let lev = 1; lev <= maxLev; lev++) {
    const f = { ...formula, simLeverage: lev };
    const res =
      baseOpts.optimizeMode === 'single'
        ? evaluateSingleMult(baseOpts, barBySym.get(symList[0]), symList[0], f)
        : evaluatePortfolioMult(baseOpts, barBySym, symList, f);
    if (res.mult >= targetMult) return { lev, ...res };
  }
  return null;
}

function runInSampleOptimize(opts, barBySym, symList) {
  const rng = mulberry32(opts.seed >>> 0);
  const trials = Math.max(100, opts.optimizeTrials | 0);
  const target = opts.optimizeTargetMult > 0 ? opts.optimizeTargetMult : 4;
  const minTrades = Math.max(6, opts.optimizeMinTrades | 0);
  let best = null;
  let firstHitTarget = null;

  if (opts.optimizeLeverageScanOnly) {
    const baseF = { ...opts.formula, simLeverage: 1 };
    const minLev = minLeverageForTarget(opts, barBySym, symList, baseF, target);
    const r1 =
      opts.optimizeMode === 'single'
        ? evaluateSingleMult(opts, barBySym.get(symList[0]), symList[0], baseF)
        : evaluatePortfolioMult(opts, barBySym, symList, baseF);
    if (minLev) {
      best = {
        formula: { ...baseF, simLeverage: minLev.lev },
        mult: minLev.mult,
        trades: minLev.trades,
        endCash: minLev.endCash,
        trial: 'leverage-scan',
        minLeverageUsed: minLev.lev,
      };
    }
    return {
      best,
      firstHitTarget: best?.mult >= target ? best : null,
      unleveredMult: r1.mult,
      target,
      trials: 0,
      minTrades,
      mode: opts.optimizeMode,
      allowLeverage: true,
      minLevScan: minLev,
    };
  }

  for (let t = 0; t < trials; t++) {
    const f = sampleRandomFormula(rng);
    const lev = pickRandomLeverage(rng, opts.optimizeAllowLeverage);
    f.simLeverage = lev;
    let res;
    if (opts.optimizeMode === 'single') {
      const sym = symList[0];
      const bars = barBySym.get(sym);
      if (!bars) break;
      res = evaluateSingleMult(opts, bars, sym, f);
    } else {
      res = evaluatePortfolioMult(opts, barBySym, symList, f);
    }
    if (res.trades < minTrades) continue;
    if (best == null || res.mult > best.mult) best = { formula: { ...f }, ...res, trial: t };
    if (firstHitTarget == null && res.mult >= target) {
      firstHitTarget = { formula: { ...f }, ...res, trial: t };
    }
  }
  let minLevScan = null;
  if (opts.optimizeMinLeverageForTarget && best?.formula && target > 1) {
    const baseF = { ...best.formula, simLeverage: 1 };
    minLevScan = minLeverageForTarget(opts, barBySym, symList, baseF, target);
    if (minLevScan) {
      best = {
        formula: { ...baseF, simLeverage: minLevScan.lev },
        mult: minLevScan.mult,
        trades: minLevScan.trades,
        endCash: minLevScan.endCash,
        trial: 'formula-random-then-min-leverage',
        minLeverageUsed: minLevScan.lev,
      };
    }
  }
  return {
    best,
    firstHitTarget,
    minLevScan,
    target,
    trials,
    minTrades,
    mode: opts.optimizeMode,
    allowLeverage: opts.optimizeAllowLeverage,
  };
}

/**
 * Default formula: in-sample tuned (4 symbols, fees on). Unlevered ~+9% on Kraken ~120d snapshot.
 * `simLeverage`: margin-style P&amp;L multiplier on closed trades (see `--sim-leverage`).
 */
const DEFAULT_FORMULA = {
  volThreshold: 1.594,
  atrMult: 1.319,
  smaFast: 6,
  smaSlow: 49,
  volLookback: 24,
  atrLen: 28,
  moveFrac1: 0.72,
  moveFrac2: 0.96,
  partialFrac1: 0.631,
  partialFrac2: 0.451,
  stopAtrMult: 2.573,
  trailAtrMult: 0.854,
  impulseLowRatio: 1.024,
  impulseLookback: 8,
  regimeLookback: 17,
  regimeBull: 0.0537,
  regimeBear: -0.0647,
  smaSlowEps: 0.9905,
  /** >1 amplifies each closed round-trip vs account equity (simulated margin). */
  simLeverage: 1,
};

function defaultGridVol() {
  return [1.4, 1.65, 1.9, 2.15];
}
function defaultGridAtr() {
  return [2, 2.5, 3, 3.5];
}

function parseNumList(s) {
  return s.split(',').map((x) => Number(x.trim()));
}

function parseArgs(argv) {
  const formula = { ...DEFAULT_FORMULA };
  let simLeverageCli = null;
  const o = {
    days: 500,
    bots: 4,
    seed: 42,
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
    interval: '4h',
    csv: null,
    out: DEFAULT_OUT,
    walkForwardOut: WALK_FORWARD_OUT,
    initialPerBot: 500,
    feeBps: 10,
    slipBps: 5,
    warmBars: 120,
    formula,
    walkForward: false,
    trainBars: 400,
    testBars: 200,
    stepBars: 200,
    gridVol: null,
    gridAtr: null,
    minTradesTrain: 4,
    noOnlineLearn: false,
    formulaJson: null,
    /** Added to vol threshold per bot index (0 = identical path on same symbol). */
    botVolStep: 0,
    /** Multiplier on online volAdjust step size (1 = default). */
    learnScale: 1,
    /** If null, summaries only when bots > 25. */
    verboseBots: null,
    minTradesLearnCompare: 8,
    optimizeInSample: false,
    optimizeTrials: 12000,
    /** Ending equity / starting equity (4.0 = +300% gain on combined capital). */
    optimizeTargetMult: 4,
    optimizeMode: 'portfolio',
    optimizeMinTrades: 24,
    /** If true, optimizer uses 0 fee/slip (gross only — not live-realistic). */
    optimizeZeroFee: false,
    optimizeAllowLeverage: false,
    optimizeMinLeverageForTarget: false,
    optimizeLeverageScanOnly: false,
    simLeverage: 1,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--days') o.days = Number(argv[++i]);
    else if (a === '--bots') o.bots = Math.max(1, Number(argv[++i]));
    else if (a === '--seed') o.seed = Number(argv[++i]);
    else if (a === '--symbols') o.symbols = argv[++i].split(',').map((s) => s.trim().toUpperCase());
    else if (a === '--interval') o.interval = argv[++i];
    else if (a === '--csv') o.csv = argv[++i];
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--walk-forward-out') o.walkForwardOut = argv[++i];
    else if (a === '--per-bot') o.initialPerBot = Number(argv[++i]);
    else if (a === '--fee-bps') o.feeBps = Number(argv[++i]);
    else if (a === '--slip-bps') o.slipBps = Number(argv[++i]);
    else if (a === '--warm-bars') o.warmBars = Number(argv[++i]);
    else if (a === '--walk-forward') o.walkForward = true;
    else if (a === '--train-bars') o.trainBars = Number(argv[++i]);
    else if (a === '--test-bars') o.testBars = Number(argv[++i]);
    else if (a === '--step-bars') o.stepBars = Number(argv[++i]);
    else if (a === '--grid-vol') o.gridVol = parseNumList(argv[++i]);
    else if (a === '--grid-atr') o.gridAtr = parseNumList(argv[++i]);
    else if (a === '--min-trades-train') o.minTradesTrain = Number(argv[++i]);
    else if (a === '--no-online-learn') o.noOnlineLearn = true;
    else if (a === '--bot-vol-step') o.botVolStep = Number(argv[++i]);
    else if (a === '--learn-scale') o.learnScale = Number(argv[++i]);
    else if (a === '--verbose-bots') o.verboseBots = true;
    else if (a === '--summary-only') o.verboseBots = false;
    else if (a === '--min-trades-learn-compare') o.minTradesLearnCompare = Number(argv[++i]);
    else if (a === '--optimize-in-sample') o.optimizeInSample = true;
    else if (a === '--optimize-trials') o.optimizeTrials = Number(argv[++i]);
    else if (a === '--optimize-target-mult') o.optimizeTargetMult = Number(argv[++i]);
    else if (a === '--optimize-mode') o.optimizeMode = argv[++i];
    else if (a === '--optimize-min-trades') o.optimizeMinTrades = Number(argv[++i]);
    else if (a === '--optimize-zero-fee') o.optimizeZeroFee = true;
    else if (a === '--optimize-allow-leverage') o.optimizeAllowLeverage = true;
    else if (a === '--optimize-min-leverage-for-target') o.optimizeMinLeverageForTarget = true;
    else if (a === '--optimize-leverage-scan-only') o.optimizeLeverageScanOnly = true;
    else if (a === '--sim-leverage') {
      o.simLeverage = Math.max(1, Number(argv[++i]));
      simLeverageCli = o.simLeverage;
    }
    else if (a === '--formula-json') o.formulaJson = argv[++i];
    else if (a === '--vol-threshold') formula.volThreshold = Number(argv[++i]);
    else if (a === '--atr-mult') formula.atrMult = Number(argv[++i]);
    else if (a === '--sma-fast') formula.smaFast = Number(argv[++i]);
    else if (a === '--sma-slow') formula.smaSlow = Number(argv[++i]);
    else if (a === '--vol-lookback') formula.volLookback = Number(argv[++i]);
    else if (a === '--atr-len') formula.atrLen = Number(argv[++i]);
    else if (a === '--move-1') formula.moveFrac1 = Number(argv[++i]);
    else if (a === '--move-2') formula.moveFrac2 = Number(argv[++i]);
    else if (a === '--partial-1') formula.partialFrac1 = Number(argv[++i]);
    else if (a === '--partial-2') formula.partialFrac2 = Number(argv[++i]);
    else if (a === '--stop-atr') formula.stopAtrMult = Number(argv[++i]);
    else if (a === '--trail-atr') formula.trailAtrMult = Number(argv[++i]);
    else if (a === '--impulse-low') formula.impulseLowRatio = Number(argv[++i]);
    else if (a === '--impulse-lookback') formula.impulseLookback = Number(argv[++i]);
    else if (a === '--regime-lookback') formula.regimeLookback = Number(argv[++i]);
    else if (a === '--regime-bull') formula.regimeBull = Number(argv[++i]);
    else if (a === '--regime-bear') formula.regimeBear = Number(argv[++i]);
  }
  if (o.formulaJson) {
    const j = JSON.parse(fs.readFileSync(o.formulaJson, 'utf8'));
    Object.assign(o.formula, j);
  }
  formula.simLeverage = Math.max(1, Number(simLeverageCli ?? formula.simLeverage ?? o.simLeverage ?? 1));
  o.formula = formula;
  return o;
}

function expandBotSymbols(opts) {
  const syms = [];
  for (let i = 0; i < opts.bots; i++) syms.push(opts.symbols[i % opts.symbols.length]);
  return syms;
}

function effectiveWarmBars(f, fallback) {
  return Math.max(fallback, f.smaSlow + 5, f.volLookback + 5, f.atrLen + 5, f.impulseLookback + 5);
}

function createLearner(enabled, learnScale = 1) {
  const sc = Number.isFinite(learnScale) && learnScale > 0 ? learnScale : 1;
  if (!enabled) {
    return {
      byRegime: Object.create(null),
      recentR: [],
      volAdjust: 0,
      record() {},
    };
  }
  return {
    byRegime: Object.create(null),
    recentR: [],
    volAdjust: 0,
    record(trade) {
      const r = trade.regime || 'unknown';
      if (!this.byRegime[r]) this.byRegime[r] = { n: 0, wins: 0, pnl: 0 };
      this.byRegime[r].n++;
      this.byRegime[r].pnl += trade.pnlUsd;
      if (trade.pnlUsd > 0) this.byRegime[r].wins++;
      this.recentR.push(trade.rMultiple);
      if (this.recentR.length > 30) this.recentR.shift();
      if (this.recentR.length >= 15) {
        const avg = this.recentR.reduce((a, b) => a + b, 0) / this.recentR.length;
        if (avg < -0.05) this.volAdjust = Math.min(0.5, this.volAdjust + 0.03 * sc);
        else if (avg > 0.15) this.volAdjust = Math.max(-0.25, this.volAdjust - 0.02 * sc);
      }
    },
  };
}

function foldMetrics(trades) {
  if (!trades.length) {
    return {
      n: 0,
      sumR: 0,
      avgR: 0,
      totalPnl: 0,
      winRate: 0,
      profitFactor: 0,
    };
  }
  const sumR = trades.reduce((s, t) => s + t.rMultiple, 0);
  const totalPnl = trades.reduce((s, t) => s + t.pnlUsd, 0);
  const wins = trades.filter((t) => t.pnlUsd > 0).length;
  const grossWin = trades.filter((t) => t.pnlUsd > 0).reduce((s, t) => s + t.pnlUsd, 0);
  const grossLoss = trades.filter((t) => t.pnlUsd < 0).reduce((s, t) => s + Math.abs(t.pnlUsd), 0);
  const profitFactor = grossLoss > 1e-9 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;
  return {
    n: trades.length,
    sumR,
    avgR: sumR / trades.length,
    totalPnl,
    winRate: wins / trades.length,
    profitFactor,
  };
}

/** First vs second half of closed trades by exit time (per-account learning proxy). */
function earlyVsLateMetrics(trades, minTotal) {
  const n = trades.length;
  if (n < minTotal) return null;
  const sorted = [...trades].sort((a, b) => a.exitTime - b.exitTime);
  const mid = Math.floor(n / 2);
  const first = sorted.slice(0, mid);
  const second = sorted.slice(mid);
  if (first.length < 2 || second.length < 2) return null;
  return {
    first: foldMetrics(first),
    second: foldMetrics(second),
    deltaAvgR: foldMetrics(second).avgR - foldMetrics(first).avgR,
  };
}

function aggregateLearningReport(learnerDigest, tradesByBotId, online, minTrades) {
  if (!online) {
    return {
      skipped: true,
      reason: 'Online learning disabled (--no-online-learn). Re-run without it to measure adaptation.',
    };
  }
  let eligible = 0;
  let improved = 0;
  let worse = 0;
  let flat = 0;
  let sumDelta = 0;
  let sumVolAdj = 0;
  for (const d of learnerDigest) {
    sumVolAdj += d.volAdjust;
    const tr = tradesByBotId.get(d.botId);
    if (!tr) continue;
    const ev = earlyVsLateMetrics(tr, minTrades);
    if (!ev) continue;
    eligible++;
    sumDelta += ev.deltaAvgR;
    if (ev.deltaAvgR > 0.02) improved++;
    else if (ev.deltaAvgR < -0.02) worse++;
    else flat++;
  }
  return {
    skipped: false,
    accountsEligible: eligible,
    accountsImprovedAvgR: improved,
    accountsWorseAvgR: worse,
    accountsFlat: flat,
    meanDeltaAvgR: eligible ? sumDelta / eligible : 0,
    meanFinalVolAdjust: learnerDigest.length ? sumVolAdj / learnerDigest.length : 0,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBinanceKlines(symbol, interval, startMs, endMs) {
  const url = new URL('https://api.binance.com/api/v3/klines');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('startTime', String(startMs));
  url.searchParams.set('endTime', String(endMs));
  url.searchParams.set('limit', '1000');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance ${res.status}: ${await res.text()}`);
  return res.json();
}

function klineRowToBar(row) {
  return {
    t: row[0],
    o: Number(row[1]),
    h: Number(row[2]),
    l: Number(row[3]),
    c: Number(row[4]),
    v: Number(row[5]),
  };
}

const KRAKEN_PAIR = {
  BTCUSDT: 'XXBTZUSD',
  ETHUSDT: 'XETHZUSD',
  SOLUSDT: 'SOLUSD',
  BNBUSDT: 'BNBUSD',
};

function intervalToKrakenMinutes(interval) {
  if (interval === '1h') return 60;
  if (interval === '4h') return 240;
  if (interval === '1d') return 1440;
  return 240;
}

async function loadBarsBinance(symbol, interval, daysBack) {
  const end = Date.now();
  const approxMsPerBar =
    interval === '1h' ? 3600000 : interval === '4h' ? 14400000 : interval === '1d' ? 86400000 : 14400000;
  const needBars = Math.ceil((daysBack * 86400000) / approxMsPerBar) + 200;
  let start = end - daysBack * 86400000;
  const all = [];
  let guard = 0;
  while (all.length < needBars && guard < 80) {
    guard++;
    const chunk = await fetchBinanceKlines(symbol, interval, start, end);
    if (!chunk.length) break;
    for (const row of chunk) all.push(klineRowToBar(row));
    const lastT = chunk[chunk.length - 1][0];
    start = lastT + 1;
    await sleep(120);
  }
  all.sort((a, b) => a.t - b.t);
  const dedup = [];
  let prev = -1;
  for (const b of all) {
    if (b.t !== prev) dedup.push(b);
    prev = b.t;
  }
  return dedup;
}

async function loadBarsKraken(symbol, interval, daysBack) {
  const pair = KRAKEN_PAIR[symbol];
  if (!pair) throw new Error(`No Kraken pair mapping for ${symbol}; add to KRAKEN_PAIR or use --csv`);
  const intervalMin = intervalToKrakenMinutes(interval);
  const endSec = Math.floor(Date.now() / 1000);
  const startSec = endSec - daysBack * 86400;
  const allMap = new Map();
  let since = startSec;
  let guard = 0;
  while (guard++ < 150) {
    const url = new URL('https://api.kraken.com/0/public/OHLC');
    url.searchParams.set('pair', pair);
    url.searchParams.set('interval', String(intervalMin));
    url.searchParams.set('since', String(since));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Kraken ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.error?.length) throw new Error(data.error.join(', '));
    const key = Object.keys(data.result).find((k) => k !== 'last');
    const rows = data.result[key];
    if (!rows?.length) break;
    for (const r of rows) {
      const ts = r[0] * 1000;
      allMap.set(ts, {
        t: ts,
        o: Number(r[1]),
        h: Number(r[2]),
        l: Number(r[3]),
        c: Number(r[4]),
        v: Number(r[6]),
      });
    }
    const newest = rows[rows.length - 1][0];
    if (newest >= endSec - intervalMin * 60) break;
    since = newest + intervalMin * 60;
    await sleep(150);
  }
  return [...allMap.keys()]
    .sort((a, b) => a - b)
    .map((k) => allMap.get(k));
}

async function loadBarsForSymbol(symbol, interval, daysBack) {
  try {
    return await loadBarsBinance(symbol, interval, daysBack);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('451') || msg.includes('restricted')) {
      console.warn(`  (Binance unavailable; using Kraken ${KRAKEN_PAIR[symbol] || '?'} )`);
      return loadBarsKraken(symbol, interval, daysBack);
    }
    throw e;
  }
}

function loadBarsCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const bars = [];
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i].trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/[,\t]/);
    if (parts.length < 6) continue;
    if (i === 0 && /open|high/i.test(line)) continue;
    const t = Number(parts[0]);
    bars.push({
      t,
      o: Number(parts[1]),
      h: Number(parts[2]),
      l: Number(parts[3]),
      c: Number(parts[4]),
      v: Number(parts[5]),
    });
  }
  return bars.sort((a, b) => a.t - b.t);
}

function sma(arr, i, len) {
  if (i < len - 1) return null;
  let s = 0;
  for (let j = i - len + 1; j <= i; j++) s += arr[j];
  return s / len;
}

function atr(bars, i, len) {
  if (i < 1 || i < len) return null;
  let s = 0;
  for (let j = i - len + 1; j <= i; j++) {
    const tr = Math.max(
      bars[j].h - bars[j].l,
      Math.abs(bars[j].h - bars[j - 1].c),
      Math.abs(bars[j].l - bars[j - 1].c),
    );
    s += tr;
  }
  return s / len;
}

function volumeAvg(bars, i, len) {
  if (i < len - 1) return null;
  let s = 0;
  for (let j = i - len + 1; j <= i; j++) s += bars[j].v;
  return s / len;
}

function regimeAt(bars, i, f) {
  const lb = f.regimeLookback;
  if (i < lb + 1) return 'unknown';
  const a = bars[i - lb].o;
  const b = bars[i - 1].c;
  const r = (b - a) / a;
  if (r > f.regimeBull) return 'bull';
  if (r < f.regimeBear) return 'bear';
  return 'chop';
}

function applyCosts(price, feeBps, slipBps, buy) {
  const adj = buy ? 1 + (feeBps + slipBps) / 10000 : 1 - (feeBps + slipBps) / 10000;
  return price * adj;
}

/**
 * Run backtest on bars[offset..] with length `length` (slice of full history).
 * Indicators use bars from index 0 for warmup inside the slice.
 */
function runBotOnBarsSlice(opts, bars, botId, symbol, learner) {
  const f = opts.formula;
  const { feeBps, slipBps, initialPerBot } = opts;
  const lev = Math.max(1, Number(f.simLeverage ?? opts.simLeverage ?? 1));
  const minOrderUsd = Math.max(0.2, initialPerBot * 0.02);
  const warm = effectiveWarmBars(f, opts.warmBars);

  let cash = initialPerBot;
  let qty = 0;
  let entryPx = 0;
  let entryBarIdx = 0;
  let leg = 0;
  let t1 = 0;
  let t2 = 0;
  let trail = 0;
  let highWM = 0;
  let stopPx = 0;
  let regimeAtEntry = 'unknown';
  let qtyAtEntry = 0;
  let accumFills = [];
  const trades = [];
  const closes = bars.map((b) => b.c);
  const Lf = f.smaFast;
  const Ls = f.smaSlow;
  const Lv = f.volLookback;
  const La = f.atrLen;
  const ilb = f.impulseLookback;

  const smaF = (i) => sma(closes, i, Lf);
  const smaS = (i) => sma(closes, i, Ls);
  const volAvg = (i) => volumeAvg(bars, i, Lv);

  const riskPerUnit = () => Math.max(entryPx - stopPx, entryPx * 0.01);

  const closeRoundTrip = (i, b, primaryReason, partialFills) => {
    const totalPnlUnlev = partialFills.reduce((s, x) => s + x.pnlUsd, 0);
    cash += totalPnlUnlev * (lev - 1);
    const totalPnl = totalPnlUnlev * lev;
    const riskUsd = qtyAtEntry * riskPerUnit();
    const rMultiple = riskUsd > 0 ? totalPnl / riskUsd : 0;
    const row = {
      botId,
      symbol,
      entryBar: entryBarIdx,
      exitBar: i,
      exitTime: b.t,
      primaryReason,
      pnlUsd: totalPnl,
      pnlUsdUnlevered: totalPnlUnlev,
      rMultiple,
      simLeverage: lev,
      regimeAtEntry,
      partialFills,
      formulaSnapshot: {
        volThreshold: f.volThreshold,
        atrMult: f.atrMult,
        moveFrac1: f.moveFrac1,
        moveFrac2: f.moveFrac2,
        simLeverage: lev,
      },
    };
    trades.push(row);
    learner.record({ ...row, regime: regimeAtEntry });
    accumFills = [];
    qtyAtEntry = 0;
  };

  for (let i = warm; i < bars.length - 2; i++) {
    const regime = regimeAt(bars, i, f);
    const step = opts.botVolStep ?? 0;
    const effVolTh = f.volThreshold + learner.volAdjust + botId * step;

    if (qty <= 0) {
      const c = bars[i].c;
      const v = bars[i].v;
      const va = volAvg(i);
      const sf = smaF(i);
      const ss = smaS(i);
      const a = atr(bars, i, La);
      if (va == null || sf == null || ss == null || a == null) continue;

      const volRatio = v / va;
      const mom = c > sf && c >= ss * f.smaSlowEps;
      const impulse =
        c / bars[i].l > f.impulseLowRatio || (i >= ilb && c > bars[i - ilb].c);

      if (volRatio >= effVolTh && mom && impulse) {
        const entryBar = i + 1;
        const px = bars[entryBar].o;
        const fill = applyCosts(px, feeBps, slipBps, true);
        const spend = cash * 0.98;
        const q = spend / fill;
        if (q * fill < minOrderUsd) continue;
        cash -= q * fill;
        qty = q;
        qtyAtEntry = q;
        entryPx = fill;
        entryBarIdx = entryBar;
        regimeAtEntry = regimeAt(bars, i, f);
        accumFills = [];
        leg = 0;
        const atrNow = atr(bars, i, La);
        const move = f.atrMult * atrNow;
        t1 = entryPx + f.moveFrac1 * move;
        t2 = entryPx + f.moveFrac2 * move;
        stopPx = entryPx - f.stopAtrMult * atrNow;
        highWM = entryPx;
      }
    } else {
      const b = bars[i];
      highWM = Math.max(highWM, b.h);
      const a = atr(bars, i, La) ?? atr(bars, i - 1, La) ?? 0;
      trail = highWM - f.trailAtrMult * a;

      const sellFrac = (fraction, reason) => {
        if (qty <= 0 || fraction <= 0) return;
        const qSell = qty * fraction;
        const fill = applyCosts(b.c, feeBps, slipBps, false);
        cash += qSell * fill;
        qty -= qSell;
        if (qty < 1e-12) qty = 0;
        accumFills.push({ reason, pnlUsd: qSell * (fill - entryPx), qty: qSell, bar: i });
        leg += 1;
      };

      if (b.l <= stopPx && qty > 0) {
        const fill = applyCosts(stopPx, feeBps, slipBps, false);
        const q = qty;
        cash += q * fill;
        accumFills.push({ reason: 'stop', pnlUsd: q * (fill - entryPx), qty: q, bar: i });
        qty = 0;
        closeRoundTrip(i, b, 'stop', accumFills.slice());
        continue;
      }

      while (qty > 0 && leg < 1 && b.h >= t1) sellFrac(f.partialFrac1, 'partial_moveFrac1');
      while (qty > 0 && leg < 2 && b.h >= t2) sellFrac(f.partialFrac2, 'partial_moveFrac2');

      if (qty > 0 && leg >= 2) {
        if (b.c < trail) sellFrac(1, 'trail_exit');
        else if (smaF(i) != null && b.c < smaF(i)) sellFrac(1, 'trend_exit_sma_fast');
      }

      if (qty <= 0 && accumFills.length) {
        const primary = accumFills[accumFills.length - 1].reason;
        closeRoundTrip(i, b, primary, accumFills.slice());
      }
    }
  }

  if (qty > 0) {
    const last = bars[bars.length - 1];
    const fill = applyCosts(last.c, feeBps, slipBps, false);
    const q = qty;
    accumFills.push({ reason: 'eod_close', pnlUsd: q * (fill - entryPx), qty: q, bar: bars.length - 1 });
    cash += q * fill;
    qty = 0;
    closeRoundTrip(bars.length - 1, last, 'eod_close', accumFills.slice());
  }

  return { finalCash: cash, trades };
}

function sliceForSegment(fullBars, segStart, segEnd, warm) {
  const a = Math.max(0, segStart - warm);
  const b = Math.min(segEnd, fullBars.length);
  return fullBars.slice(a, b);
}

function runWalkForwardOnSeries(opts, fullBars, symbol, botId) {
  const fBase = { ...opts.formula };
  const warm = effectiveWarmBars(fBase, opts.warmBars);
  const T = opts.trainBars;
  const S = opts.testBars;
  const step = opts.stepBars;
  const gridV = opts.gridVol || defaultGridVol();
  const gridA = opts.gridAtr || defaultGridAtr();
  const minN = opts.minTradesTrain;

  const folds = [];
  let testPnlSum = 0;
  let testRSum = 0;
  let testN = 0;
  let positiveFolds = 0;
  let foldId = 0;

  for (let B = T; B + S <= fullBars.length; B += step) {
    const trainBars = fullBars.slice(0, B);
    const testSlice = sliceForSegment(fullBars, B, B + S, warm);
    if (testSlice.length < warm + 10) break;

    let best = null;
    for (const volT of gridV) {
      for (const atrM of gridA) {
        const learnerT = createLearner(false);
        const runOpts = {
          ...opts,
          formula: { ...fBase, volThreshold: volT, atrMult: atrM },
          warmBars: opts.warmBars,
        };
        const { trades: trT } = runBotOnBarsSlice(runOpts, trainBars, botId, symbol, learnerT);
        const mT = foldMetrics(trT);
        if (mT.n < minN) continue;
        const score = mT.sumR;
        if (best == null || score > best.score || (score === best.score && mT.totalPnl > best.metrics.totalPnl)) {
          best = { volT, atrM, score, metrics: mT, trades: trT.length };
        }
      }
    }

    if (!best) {
      folds.push({
        fold: foldId++,
        symbol,
        trainStart: 0,
        trainEnd: B,
        testStart: B,
        testEnd: B + S,
        skipped: true,
        reason: `no grid point had >= ${minN} trades on train`,
      });
      continue;
    }

    const learnerTest = createLearner(false);
    const testOpts = {
      ...opts,
      formula: { ...fBase, volThreshold: best.volT, atrMult: best.atrM },
      warmBars: opts.warmBars,
    };
    const { finalCash, trades: trE } = runBotOnBarsSlice(testOpts, testSlice, botId, symbol, learnerTest);
    const mE = foldMetrics(trE);
    const pnl = finalCash - opts.initialPerBot;

    testPnlSum += pnl;
    testRSum += mE.avgR * mE.n;
    testN += mE.n;
    if (pnl > 0) positiveFolds++;

    folds.push({
      fold: foldId++,
      symbol,
      trainStart: 0,
      trainEnd: B,
      testStart: B,
      testEnd: B + S,
      picked: { volThreshold: best.volT, atrMult: best.atrM },
      train: best.metrics,
      test: { ...mE, pnlUsd: pnl, finalCash },
      skipped: false,
    });
  }

  return {
    folds,
    aggregate: {
      foldsRun: folds.filter((x) => !x.skipped).length,
      foldsPositive: positiveFolds,
      sumTestPnlUsd: testPnlSum,
      avgTestPnlPerFold: folds.filter((f) => !f.skipped).length
        ? testPnlSum / folds.filter((f) => !f.skipped).length
        : 0,
      avgRPerTradeOOS: testN ? testRSum / testN : 0,
      totalOOSTrades: testN,
    },
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  if (opts.csv && opts.bots > 1) {
    console.warn('CSV mode uses one series; forcing --bots 1');
    opts.bots = 1;
  }

  const botSymbols = expandBotSymbols(opts);
  const barBySym = new Map();

  if (opts.csv) {
    const bars = loadBarsCsv(opts.csv);
    const name = path.basename(opts.csv, '.csv');
    for (const s of new Set(botSymbols)) barBySym.set(s, bars);
    if (!barBySym.size) barBySym.set(name, bars);
  } else {
    const uniq = [...new Set(botSymbols)];
    for (const sym of uniq) {
      process.stdout.write(`Fetching ${sym} … `);
      const bars = await loadBarsForSymbol(sym, opts.interval, opts.days);
      if (bars.length >= 2) {
        const spanDays = (bars[bars.length - 1].t - bars[0].t) / 86400000;
        if (spanDays < opts.days * 0.85) {
          console.warn(
            `  Warning: only ~${spanDays.toFixed(0)}d of requested ${opts.days}d loaded (API cap). Use --csv for a longer window.`,
          );
        }
      }
      console.log(`${bars.length} bars`);
      barBySym.set(sym, bars);
    }
  }

  const showAllBots = opts.verboseBots === true || (opts.verboseBots == null && opts.bots <= 25);

  if (opts.optimizeInSample) {
    const symList =
      opts.optimizeMode === 'single' ? [opts.symbols[0]] : [...new Set(opts.symbols)];
    for (const s of symList) {
      if (!barBySym.has(s)) {
        console.error(`Optimize: missing bars for ${s}. Use --bots >= symbol count or --symbols.`);
        process.exit(1);
      }
    }
    console.log('\n=== IN-SAMPLE OPTIMIZER (validate with --walk-forward) ===');
    console.log(
      `Mode=${opts.optimizeMode} symbols=${symList.join(',')} trials=${opts.optimizeTrials} minTrades=${opts.optimizeMinTrades} targetMult=${opts.optimizeTargetMult} zeroFee=${opts.optimizeZeroFee} allowLev=${opts.optimizeAllowLeverage} levScanOnly=${opts.optimizeLeverageScanOnly} minLevForTarget=${opts.optimizeMinLeverageForTarget}`,
    );
    const out = runInSampleOptimize(opts, barBySym, symList);
    fs.mkdirSync(path.dirname(FORMULA_OPTIM_OUT), { recursive: true });
    if (out.unleveredMult != null) {
      console.log(`Unlevered portfolio mult (simLeverage=1): ${out.unleveredMult.toFixed(4)}`);
    }
    if (!out.best) {
      console.log(
        'No result: try --optimize-min-leverage-for-target with random trials, or --optimize-leverage-scan-only (needs positive unlevered edge to ever reach target).',
      );
      process.exit(1);
    }
    fs.writeFileSync(
      FORMULA_OPTIM_OUT,
      JSON.stringify(
        {
          ts: Date.now(),
          warning: 'IN_SAMPLE_ONLY_SIM_LEVERAGE_IS_NOT_SPOT',
          targetMult: out.target,
          mult: out.best.mult,
          trades: out.best.trades,
          simLeverage: out.best.formula?.simLeverage,
          formula: out.best.formula,
        },
        null,
        2,
      ),
    );
    console.log(`Best mult=${out.best.mult.toFixed(4)} (target ${out.target} ⇒ +300% gain when mult≥4)`);
    if (out.best.minLeverageUsed != null) {
      console.log(`Minimum simLeverage to hit target (this window): ${out.best.minLeverageUsed}x`);
    }
    console.log(`Total closed trades=${out.best.trades} endCash≈$${out.best.endCash?.toFixed(2)}`);
    console.log('Best formula JSON:\n', JSON.stringify(out.best.formula, null, 2));
    console.log(`\nWritten: ${FORMULA_OPTIM_OUT}`);
    if (out.firstHitTarget && out.firstHitTarget.trial !== out.best.trial) {
      console.log('Note: first random trial that hit target differs from final best row — check JSON.');
    }
    if (out.best.mult < out.target) {
      console.log(
        `\nTarget mult not reached — raise simLeverage, add --optimize-allow-leverage / --optimize-leverage-scan-only, or extend --csv history.`,
      );
    }
    return;
  }

  console.log('Attention-momentum backtest (real OHLCV, explicit formula)');
  console.log(
    JSON.stringify(
      {
        ...opts,
        formula: opts.formula,
        botSymbolsPreview: botSymbols.slice(0, 6).concat(botSymbols.length > 6 ? ['…'] : []),
        botSymbolsTotal: botSymbols.length,
      },
      null,
      2,
    ),
  );
  if (opts.bots > 1 && opts.botVolStep === 0) {
    console.log(
      '(Note: --bot-vol-step 0 → same symbol uses identical signals; early/late stats duplicate across those bots. Use --bot-vol-step 0.002 for slight per-account threshold spread.)',
    );
  }

  if (opts.walkForward) {
    fs.mkdirSync(path.dirname(opts.walkForwardOut), { recursive: true });
    const wfFd = fs.openSync(opts.walkForwardOut, 'a');
    let allAgg = [];

    for (let b = 0; b < opts.bots; b++) {
      const symbol = botSymbols[b];
      const fullBars = barBySym.get(symbol);
      if (!fullBars) {
        console.warn(`Walk-forward skip bot ${b}: no bars for ${symbol}`);
        continue;
      }
      const need = opts.trainBars + opts.testBars + effectiveWarmBars(opts.formula, opts.warmBars) + 20;
      if (fullBars.length < need) {
        console.warn(`Walk-forward skip ${symbol}: need ${need} bars, have ${fullBars.length}`);
        continue;
      }
      const wf = runWalkForwardOnSeries(opts, fullBars, symbol, b);
      allAgg.push({ symbol, ...wf.aggregate });
      console.log(`\n=== Walk-forward ${symbol} ===`);
      for (const row of wf.folds) {
        fs.writeSync(wfFd, JSON.stringify({ ...row, ts: Date.now(), seed: opts.seed }) + '\n');
        if (row.skipped) console.log(`  fold ${row.fold}: skipped (${row.reason})`);
        else {
          console.log(
            `  fold ${row.fold}: train n=${row.train.n} sumR=${row.train.sumR.toFixed(2)} | picked vol=${row.picked.volThreshold} atr=${row.picked.atrMult} | OOS n=${row.test.n} pnl=$${row.test.pnlUsd.toFixed(2)} avgR=${row.test.avgR.toFixed(3)}`,
          );
        }
      }
      console.log('  --- OOS aggregate ---', wf.aggregate);
    }
    fs.closeSync(wfFd);
    console.log(`\nWalk-forward log: ${opts.walkForwardOut}`);
    if (allAgg.length) {
      const tPnl = allAgg.reduce((s, x) => s + x.sumTestPnlUsd, 0);
      console.log('Combined OOS sumTestPnlUsd (all series):', tPnl.toFixed(2));
    }
    return;
  }

  let grandTrades = [];
  const summaries = [];
  const learnerDigest = [];
  const tradesByBotId = new Map();
  const online = !opts.noOnlineLearn;

  for (let b = 0; b < opts.bots; b++) {
    const learner = createLearner(online, opts.learnScale);
    const symbol = botSymbols[b];
    const bars = barBySym.get(symbol);
    const warm = effectiveWarmBars(opts.formula, opts.warmBars);
    if (!bars || bars.length < warm + 50) {
      console.warn(`Skip bot ${b}: insufficient bars for ${symbol}`);
      continue;
    }
    const { finalCash, trades } = runBotOnBarsSlice(opts, bars, b, symbol, learner);
    const pnl = finalCash - opts.initialPerBot;
    summaries.push({ botId: b, symbol, initial: opts.initialPerBot, finalCash, pnlUsd: pnl, trades: trades.length });
    grandTrades = grandTrades.concat(trades);
    tradesByBotId.set(b, trades);
    learnerDigest.push({
      botId: b,
      symbol,
      byRegime: learner.byRegime,
      volAdjust: learner.volAdjust,
      metrics: foldMetrics(trades),
    });
  }

  const learnRep = aggregateLearningReport(
    learnerDigest,
    tradesByBotId,
    online,
    opts.minTradesLearnCompare,
  );

  const fd = fs.openSync(opts.out, 'a');
  for (const t of grandTrades) {
    fs.writeSync(
      fd,
      JSON.stringify({ ...t, ts: Date.now(), seed: opts.seed, botsRun: opts.bots }) + '\n',
    );
  }
  fs.closeSync(fd);

  console.log('\n--- Per bot ---');
  if (showAllBots) {
    for (const s of summaries) {
      console.log(
        `bot ${s.botId} ${s.symbol}: $${s.initial.toFixed(2)} → $${s.finalCash.toFixed(2)} (${s.pnlUsd >= 0 ? '+' : ''}${s.pnlUsd.toFixed(2)}) trades=${s.trades}`,
      );
    }
  } else {
    const win = summaries.filter((s) => s.pnlUsd > 0).length;
    const sumT = summaries.reduce((a, s) => a + s.trades, 0);
    console.log(
      `Summary: ${summaries.length} accounts, ${win} profitable, ${sumT} total closed trades (use --verbose-bots for each line)`,
    );
    for (const s of summaries.slice(0, 3)) {
      console.log(
        `  sample bot ${s.botId} ${s.symbol}: $${s.initial.toFixed(2)} → $${s.finalCash.toFixed(2)} (${s.pnlUsd >= 0 ? '+' : ''}${s.pnlUsd.toFixed(2)}) trades=${s.trades}`,
      );
    }
  }
  const totalPnl = summaries.reduce((a, s) => a + s.pnlUsd, 0);
  const totalStart = summaries.reduce((a, s) => a + s.initial, 0);
  console.log(
    `\nTotal P&L (all bots): ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)} on $${totalStart.toFixed(2)} starting capital`,
  );

  console.log('\n=== Learning (online volAdjust + early vs late trade halves) ===');
  if (learnRep.skipped) console.log(' ', learnRep.reason);
  else {
    console.log(
      `  Accounts with enough trades for before/after (>= ${opts.minTradesLearnCompare}): ${learnRep.accountsEligible} / ${summaries.length}`,
    );
    console.log(
      `  Of those: improved avgR (late vs early, >0.02): ${learnRep.accountsImprovedAvgR} | worse: ${learnRep.accountsWorseAvgR} | ~flat: ${learnRep.accountsFlat}`,
    );
    console.log(
      `  Mean ΔavgR (late − early) across eligible accounts: ${learnRep.meanDeltaAvgR.toFixed(4)} R/trade`,
    );
    console.log(`  Mean final volAdjust (after last trade): ${learnRep.meanFinalVolAdjust.toFixed(4)}`);
    if (opts.botVolStep === 0) {
      const seen = new Set();
      const bySym = [];
      for (const s of summaries) {
        if (seen.has(s.symbol)) continue;
        seen.add(s.symbol);
        const tr = tradesByBotId.get(s.botId);
        const ev = tr ? earlyVsLateMetrics(tr, opts.minTradesLearnCompare) : null;
        const adj = learnerDigest.find((d) => d.botId === s.botId);
        bySym.push({
          symbol: s.symbol,
          deltaAvgR: ev?.deltaAvgR ?? null,
          volAdjust: adj?.volAdjust ?? 0,
          n: tr?.length ?? 0,
        });
      }
      console.log('  Deduped by symbol (identical path when --bot-vol-step 0):');
      for (const row of bySym) {
        console.log(
          `    ${row.symbol}: n=${row.n} ΔavgR(late−early)=${row.deltaAvgR == null ? 'n/a' : row.deltaAvgR.toFixed(4)} volAdjust=${row.volAdjust.toFixed(3)}`,
        );
      }
    }
  }

  if (showAllBots) {
    console.log('\nPer-bot metrics + regimes (sample):');
    for (const L of learnerDigest.slice(0, Math.min(8, learnerDigest.length))) {
      console.log(
        `  bot ${L.botId} ${L.symbol}: volAdjust=${L.volAdjust.toFixed(3)} metrics=${JSON.stringify(L.metrics)}`,
      );
    }
    if (learnerDigest.length > 8) console.log(`  … ${learnerDigest.length - 8} more`);
  }
  console.log(`\nTrade journal appended: ${opts.out}`);
}

export {
  loadBarsForSymbol,
  loadBarsCsv,
  runBotOnBarsSlice,
  DEFAULT_FORMULA,
  effectiveWarmBars,
  createLearner,
  applyCosts,
  sma,
};

if (isMainModule) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
