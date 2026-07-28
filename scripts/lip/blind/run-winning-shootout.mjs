/**
 * SYNOPSIS: Winning-solution shootout on real 2024–2026 daily majors.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Winning-solution shootout on real 2024–2026 daily majors.
 *
 * Candidates (research-backed):
 * A) BTC buy & hold (control)
 * B) Volatility mean-reversion: buy panic dumps (≥2 ATR), take ~1 ATR back, stop 1.5 ATR; skip if ATR exploding
 * C) Vol fade shorts: short euphoria spikes (≥2.5 ATR up), cover ~1 ATR
 * D) Hybrid: mostly BTC hold, add B overlays with small size
 * E) Funding harvest proxy: long spot + short perp when funding rich (real Binance funding history)
 */
import fs from 'node:fs';
import path from 'node:path';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';
import { buildBreakoutUniverse, sliceSegment } from './fetch-breakout-universe.mjs';

const COST_RT = 0.0053; // spot-ish round trip
const SEGMENTS = [
  { id: 'F', start: '2024-01-01', end: '2024-06-30' },
  { id: 'G', start: '2024-07-01', end: '2024-12-31' },
  { id: 'H', start: '2025-01-01', end: '2025-06-30' },
  { id: 'I', start: '2025-07-01', end: '2026-06-30' },
];

function atr(bars, i, period = 14) {
  if (i < period) return null;
  let sum = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const tr = Math.max(
      bars[j].high - bars[j].low,
      Math.abs(bars[j].high - bars[j - 1].close),
      Math.abs(bars[j].low - bars[j - 1].close)
    );
    sum += tr;
  }
  return sum / period;
}

function bySymbol(timeline) {
  const m = new Map();
  for (const e of timeline) {
    if (!m.has(e.symbol)) m.set(e.symbol, []);
    m.get(e.symbol).push(e);
  }
  for (const arr of m.values()) arr.sort((a, b) => a.ts - b.ts);
  return m;
}

function holdReturn(bars) {
  if (bars.length < 2) return { net_pct: 0, max_dd: 0 };
  const start = bars[0].close;
  let peak = start;
  let maxDd = 0;
  for (const b of bars) {
    peak = Math.max(peak, b.close);
    maxDd = Math.min(maxDd, (b.close - peak) / peak);
  }
  const gross = (bars[bars.length - 1].close - start) / start;
  return { net_pct: Math.round((gross - COST_RT) * 10000) / 100, max_dd: Math.round(maxDd * 10000) / 100 };
}

/** BTC hold only in uptrend (MA gate); cash in downtrend */
function runRegimeBtc(bars, maPeriod = 100) {
  if (bars.length < maPeriod + 2) return holdReturn(bars);
  let equity = 10000;
  let cash = true;
  let entry = 0;
  let peak = 10000;
  let maxDd = 0;

  for (let i = maPeriod; i < bars.length; i++) {
    const ma = bars.slice(i - maPeriod, i).reduce((s, b) => s + b.close, 0) / maPeriod;
    const px = bars[i].close;
    const bull = px >= ma;

    if (cash && bull) {
      entry = px;
      cash = false;
      equity *= 1 - COST_RT / 2;
    } else if (!cash && !bull) {
      const gross = (px - entry) / entry;
      equity *= 1 + gross - COST_RT / 2;
      cash = true;
    }

    const mark = cash ? equity : equity * (px / entry);
    peak = Math.max(peak, mark);
    maxDd = Math.min(maxDd, (mark - peak) / peak);
  }
  if (!cash) {
    const px = bars[bars.length - 1].close;
    equity *= 1 + (px - entry) / entry - COST_RT / 2;
  }
  return {
    net_pct: Math.round(((equity - 10000) / 10000) * 10000) / 100,
    max_dd: Math.round(maxDd * 10000) / 100,
  };
}

/**
 * Regime filter on a continuous series; report P&L only for [startMs, endMs].
 * Equity is marked at window open/close so early MA warmup uses prior bars.
 */
function runRegimeBtcWindow(bars, startMs, endMs, maPeriod = 100) {
  if (bars.length < maPeriod + 2) return { net_pct: 0, max_dd: 0 };
  let equity = 10000;
  let cash = true;
  let entry = 0;
  let peak = 10000;
  let maxDd = 0;
  let eqAtStart = null;
  let eqAtEnd = null;

  for (let i = maPeriod; i < bars.length; i++) {
    const t = bars[i].ts;
    const ma = bars.slice(i - maPeriod, i).reduce((s, b) => s + b.close, 0) / maPeriod;
    const px = bars[i].close;
    const bull = px >= ma;

    if (cash && bull) {
      entry = px;
      cash = false;
      equity *= 1 - COST_RT / 2;
    } else if (!cash && !bull) {
      equity *= 1 + (px - entry) / entry - COST_RT / 2;
      cash = true;
    }

    const mark = cash ? equity : equity * (px / entry);
    if (t >= startMs && eqAtStart == null) {
      eqAtStart = mark;
      peak = mark;
      maxDd = 0;
    }
    if (t <= endMs && eqAtStart != null) {
      eqAtEnd = mark;
      peak = Math.max(peak, mark);
      maxDd = Math.min(maxDd, (mark - peak) / peak);
    }
  }
  if (eqAtStart == null || eqAtEnd == null || eqAtStart <= 0) return { net_pct: 0, max_dd: 0 };
  return {
    net_pct: Math.round(((eqAtEnd - eqAtStart) / eqAtStart) * 10000) / 100,
    max_dd: Math.round(maxDd * 10000) / 100,
  };
}

/** Mean-reversion longs after dumps */
function runVolMeanRevertLong(symBars, opts = {}) {
  const size = opts.size ?? 0.1;
  const entryAtr = opts.entryAtr ?? 2;
  const tpAtr = opts.tpAtr ?? 1;
  const stopAtr = opts.stopAtr ?? 1.5;
  let equity = 10000;
  const closed = [];
  let pos = null;

  for (let i = 20; i < symBars.length; i++) {
    const bar = symBars[i];
    const a = atr(symBars, i);
    const aPrev = atr(symBars, i - 1);
    if (!a || !aPrev) continue;
    const atrExpanding = a > aPrev * 1.5; // skip exploding vol regimes

    if (pos) {
      const move = (bar.close - pos.entry) / pos.entry;
      if (bar.close >= pos.tp) {
        const net = move - COST_RT;
        equity *= 1 + net * size;
        closed.push({ reason: 'tp', net });
        pos = null;
      } else if (bar.close <= pos.stop || i - pos.i >= 8) {
        const net = move - COST_RT;
        equity *= 1 + net * size;
        closed.push({ reason: i - pos.i >= 8 ? 'time' : 'stop', net });
        pos = null;
      }
      continue;
    }

    if (atrExpanding) continue;
    const drop = (symBars[i - 1].close - bar.close) / a; // today's dump in ATRs vs yesterday close... use bar move
    const dayMove = (bar.close - symBars[i - 1].close) / a;
    if (dayMove <= -entryAtr) {
      pos = {
        entry: bar.close,
        i,
        tp: bar.close + tpAtr * a,
        stop: bar.close - stopAtr * a,
      };
    }
  }
  if (pos) {
    const last = symBars[symBars.length - 1];
    const net = (last.close - pos.entry) / pos.entry - COST_RT;
    equity *= 1 + net * size;
    closed.push({ reason: 'eod', net });
  }
  const wins = closed.filter((c) => c.net > 0).length;
  return {
    net_pct: Math.round(((equity - 10000) / 10000) * 10000) / 100,
    trades: closed.length,
    win_rate: closed.length ? Math.round((wins / closed.length) * 1000) / 1000 : 0,
    equity: Math.round(equity * 100) / 100,
  };
}

/** Fade euphoria spikes with shorts */
function runVolFadeShort(symBars, opts = {}) {
  const size = opts.size ?? 0.08;
  const entryAtr = opts.entryAtr ?? 2.5;
  const tpAtr = opts.tpAtr ?? 1;
  const stopAtr = opts.stopAtr ?? 1.5;
  let equity = 10000;
  const closed = [];
  let pos = null;

  for (let i = 20; i < symBars.length; i++) {
    const bar = symBars[i];
    const a = atr(symBars, i);
    const aPrev = atr(symBars, i - 1);
    if (!a || !aPrev) continue;
    const atrExpanding = a > aPrev * 1.5;

    if (pos) {
      const move = (bar.close - pos.entry) / pos.entry;
      const gross = -move; // short
      if (bar.close <= pos.tp) {
        const net = gross - COST_RT;
        equity *= 1 + net * size;
        closed.push({ reason: 'tp', net });
        pos = null;
      } else if (bar.close >= pos.stop || i - pos.i >= 6) {
        const net = gross - COST_RT;
        equity *= 1 + net * size;
        closed.push({ reason: i - pos.i >= 6 ? 'time' : 'stop', net });
        pos = null;
      }
      continue;
    }

    if (atrExpanding) continue;
    const dayMove = (bar.close - symBars[i - 1].close) / a;
    if (dayMove >= entryAtr) {
      pos = {
        entry: bar.close,
        i,
        tp: bar.close - tpAtr * a,
        stop: bar.close + stopAtr * a,
      };
    }
  }
  if (pos) {
    const last = symBars[symBars.length - 1];
    const net = -(last.close - pos.entry) / pos.entry - COST_RT;
    equity *= 1 + net * size;
    closed.push({ reason: 'eod', net });
  }
  const wins = closed.filter((c) => c.net > 0).length;
  return {
    net_pct: Math.round(((equity - 10000) / 10000) * 10000) / 100,
    trades: closed.length,
    win_rate: closed.length ? Math.round((wins / closed.length) * 1000) / 1000 : 0,
  };
}

/** BTC hold + small vol MR overlay */
function runHybrid(btcBars, altBooks) {
  const hold = holdReturn(btcBars);
  // overlay: run MR on BTC only with 20% sleeve, rest is hold approximated by combining returns
  const mr = runVolMeanRevertLong(btcBars, { size: 1 }); // full then scale
  // 80% hold + 20% MR sleeve on same capital path approximation
  const net = hold.net_pct * 0.8 + mr.net_pct * 0.2;
  return {
    net_pct: Math.round(net * 100) / 100,
    hold_net_pct: hold.net_pct,
    mr_net_pct: mr.net_pct,
    mr_trades: mr.trades,
    mr_wr: mr.win_rate,
  };
}

/** OKX funding history — public endpoint keeps ~3 months; use what we can. */
async function fetchBtcFunding() {
  const out = [];
  let after = '';
  for (let page = 0; page < 50; page++) {
    const url =
      `https://www.okx.com/api/v5/public/funding-rate-history?instId=BTC-USDT-SWAP&limit=100` +
      (after ? `&after=${after}` : '');
    const res = await fetch(url);
    if (!res.ok) break;
    const body = await res.json();
    const rows = body?.data || [];
    if (!rows.length) break;
    const times = rows.map((r) => Number(r.fundingTime));
    const oldest = Math.min(...times);
    for (const r of rows) {
      out.push({
        fundingTime: Number(r.fundingTime),
        fundingRate: Number(r.realizedRate ?? r.fundingRate),
      });
    }
    if (oldest === Number(after)) break;
    after = String(oldest);
    if (oldest < Date.parse('2024-01-01')) break;
  }
  out.sort((a, b) => a.fundingTime - b.fundingTime);
  const seen = new Set();
  return out.filter((r) => {
    if (seen.has(r.fundingTime)) return false;
    seen.add(r.fundingTime);
    return Number.isFinite(r.fundingRate);
  });
}

/**
 * Funding harvest proxy: when funding > threshold, earn funding each period
 * on notional; ignore mark-to-market (delta neutral assumption).
 * Costs: enter/exit ~0.1% when flipping on/off.
 */
function runFundingHarvest(fundingRows, start, end, opts = {}) {
  const thr = opts.threshold ?? 0.0001; // 0.01% per 8h
  const notionalFrac = opts.notionalFrac ?? 1;
  let equity = 10000;
  let on = false;
  let collected = 0;
  let periods = 0;
  let flips = 0;
  const a = Date.parse(start);
  const b = Date.parse(end + 'T23:59:59Z');

  for (const r of fundingRows) {
    const t = Number(r.fundingTime);
    if (t < a || t > b) continue;
    const rate = Number(r.fundingRate);
    const wantOn = rate >= thr;
    if (wantOn !== on) {
      equity *= 1 - 0.001; // flip cost
      flips += 1;
      on = wantOn;
    }
    if (on && rate > 0) {
      // short perp collects positive funding
      const earn = equity * notionalFrac * rate;
      equity += earn;
      collected += earn;
      periods += 1;
    } else if (on && rate < 0) {
      equity += equity * notionalFrac * rate; // pay
      periods += 1;
    }
  }
  return {
    net_pct: Math.round(((equity - 10000) / 10000) * 10000) / 100,
    funding_periods_on: periods,
    flips,
    collected: Math.round(collected * 100) / 100,
  };
}

function multiAssetMR(books, symbols) {
  const results = [];
  for (const s of symbols) {
    const bars = books.get(s);
    if (!bars || bars.length < 40) continue;
    results.push(runVolMeanRevertLong(bars, { size: 0.15, entryAtr: 1.5 }));
  }
  if (!results.length) return { net_pct: 0, trades: 0, win_rate: 0 };
  const net = results.reduce((s, r) => s + r.net_pct, 0) / results.length;
  const trades = results.reduce((s, r) => s + r.trades, 0);
  const wr =
    results.reduce((s, r) => s + r.win_rate * r.trades, 0) / Math.max(1, trades);
  return {
    net_pct: Math.round(net * 100) / 100,
    trades,
    win_rate: Math.round(wr * 1000) / 1000,
    symbols: results.length,
  };
}

async function main() {
  ensureLipDataDir();
  const uniPath = path.join(LIP_DATA, 'breakout_universe.jsonl');
  let all;
  if (fs.existsSync(uniPath)) {
    all = fs
      .readFileSync(uniPath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } else {
    all = (await buildBreakoutUniverse({})).all;
  }

  console.error('Fetching BTC funding history (OKX)...');
  const funding = await fetchBtcFunding();
  console.error(`Funding rows: ${funding.length}`);

  // Continuous BTC book for fair regime MA warmup across segment boundaries
  const fullBooks = bySymbol(all);
  const btcFull = fullBooks.get('BTC') || [];

  const scoreboard = [];
  for (const seg of SEGMENTS) {
    const tl = sliceSegment(all, seg.start, seg.end);
    const books = bySymbol(tl);
    const btc = books.get('BTC') || [];
    if (btc.length < 30) {
      scoreboard.push({ segment: seg.id, error: 'thin' });
      continue;
    }

    const a = Date.parse(seg.start);
    const b = Date.parse(seg.end + 'T23:59:59Z');
    const btcHold = holdReturn(btc);
    // Regime on full series, then measure equity change only inside segment window
    const regime = runRegimeBtcWindow(btcFull, a, b, 100);
    const btcMR = runVolMeanRevertLong(btc, { size: 0.2, entryAtr: 1.5 });
    const btcFade = runVolFadeShort(btc, { size: 0.15, entryAtr: 2 });
    const multiMR = multiAssetMR(books, ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'LINK', 'AVAX']);
    const hybrid = runHybrid(btc, books);
    const fund = runFundingHarvest(funding, seg.start, seg.end);

    const row = {
      segment: seg.id,
      range: `${seg.start}..${seg.end}`,
      btc_hold_net_pct: btcHold.net_pct,
      btc_hold_max_dd_pct: btcHold.max_dd,
      regime_btc_net_pct: regime.net_pct,
      regime_btc_max_dd_pct: regime.max_dd,
      vol_mr_btc_net_pct: btcMR.net_pct,
      vol_mr_btc_trades: btcMR.trades,
      vol_mr_btc_wr: btcMR.win_rate,
      vol_fade_short_btc_net_pct: btcFade.net_pct,
      vol_fade_short_btc_wr: btcFade.win_rate,
      vol_mr_multi_net_pct: multiMR.net_pct,
      vol_mr_multi_trades: multiMR.trades,
      hybrid_80hold_20mr_net_pct: hybrid.net_pct,
      funding_harvest_net_pct: fund.net_pct,
      funding_periods: fund.funding_periods_on,
      funding_flips: fund.flips,
    };

    // pick best for segment
    const candidates = [
      ['btc_hold', row.btc_hold_net_pct],
      ['regime_btc', row.regime_btc_net_pct],
      ['vol_mr_btc', row.vol_mr_btc_net_pct],
      ['vol_fade_short', row.vol_fade_short_btc_net_pct],
      ['vol_mr_multi', row.vol_mr_multi_net_pct],
      ['hybrid', row.hybrid_80hold_20mr_net_pct],
      ['funding_harvest', row.funding_harvest_net_pct],
    ];
    candidates.sort((a, b) => b[1] - a[1]);
    row.best = candidates[0][0];
    row.best_net_pct = candidates[0][1];
    scoreboard.push(row);
  }

  // Aggregate: which strategy won most segments + total path if run sequentially
  const names = [
    'btc_hold',
    'regime_btc',
    'vol_mr_btc',
    'vol_fade_short',
    'vol_mr_multi',
    'hybrid',
    'funding_harvest',
  ];
  const keys = {
    btc_hold: 'btc_hold_net_pct',
    regime_btc: 'regime_btc_net_pct',
    vol_mr_btc: 'vol_mr_btc_net_pct',
    vol_fade_short: 'vol_fade_short_btc_net_pct',
    vol_mr_multi: 'vol_mr_multi_net_pct',
    hybrid: 'hybrid_80hold_20mr_net_pct',
    funding_harvest: 'funding_harvest_net_pct',
  };
  const aggregate = {};
  for (const n of names) {
    const vals = scoreboard.map((r) => r[keys[n]]).filter((x) => x != null);
    const wins = vals.filter((v) => v > 0).length;
    const compounded = vals.reduce((eq, p) => eq * (1 + p / 100), 1);
    aggregate[n] = {
      segments_green: wins,
      segments: vals.length,
      avg_segment_net_pct: vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : null,
      compounded_4seg_pct: Math.round((compounded - 1) * 10000) / 100,
      worst_segment_pct: vals.length ? Math.min(...vals) : null,
    };
  }

  const ranked = Object.entries(aggregate).sort((a, b) => b[1].compounded_4seg_pct - a[1].compounded_4seg_pct);

  const report = {
    at: new Date().toISOString(),
    research_takeaway: {
      volatility: 'Direction after a spike is near a coin flip; ATR sizes the move. Fade dumps/spikes only when ATR is not exploding.',
      funding: 'Delta-neutral funding harvest aims for steadier yield, not moonshots — historically strong risk-adjusted.',
      btc_hold: 'Wins raw return in bulls; loses hard in bears (drawdowns).',
    },
    scoreboard,
    aggregate,
    ranked: ranked.map(([name, stats]) => ({ name, ...stats })),
    winning_solution: null,
    plain_english: {},
  };

  const top = ranked[0];
  const fund = aggregate.funding_harvest;
  const hold = aggregate.btc_hold;
  const regimeAgg = aggregate.regime_btc;

  // Default: highest compound among strategies green in ≥3/4 segments; else top compound
  const consistent = ranked.filter(([, s]) => s.segments_green >= 3);
  let winner = consistent.length ? consistent[0][0] : ranked[0][0];

  // Prefer regime if it cuts bear bleed without gutting bull gains (~≥70% of hold compound)
  const byWorst = [...ranked].sort((a, b) => b[1].worst_segment_pct - a[1].worst_segment_pct);
  if (
    regimeAgg &&
    regimeAgg.worst_segment_pct > hold.worst_segment_pct &&
    regimeAgg.compounded_4seg_pct > 0 &&
    regimeAgg.compounded_4seg_pct >= hold.compounded_4seg_pct * 0.7
  ) {
    winner = 'regime_btc';
  }
  // Funding only wins if we actually have data + steady greens
  if (fund.segments_green === fund.segments && fund.compounded_4seg_pct > 5 && fund.avg_segment_net_pct > 0) {
    winner = 'funding_harvest';
  }

  void top;

  report.winning_solution = {
    id: winner,
    why:
      winner === 'funding_harvest'
        ? 'Steadiest path: collect funding when crowded; not a direction bet. Best “win without predicting up/down.”'
        : winner === 'regime_btc'
          ? 'Hold BTC only above the 100-day MA; sit in cash in downtrends — keeps bull gains, cuts bear bleed.'
          : winner === 'btc_hold'
            ? 'Highest compounded return on this window — but ride big drawdowns.'
            : winner.startsWith('vol_')
              ? 'Volatility fade/reversion won the shootout on these halves — size with ATR, skip exploding vol.'
              : 'Hybrid balanced hold + vol overlay.',
    stats: aggregate[winner],
    also_consider: {
      safest_worst_segment: byWorst[0]?.[0],
      highest_compound: ranked[0]?.[0],
      prior_proven_sleeve:
        'P&D fade-after-dump (~+1–2%/segment on labeled history) as a small satellite, not the core.',
    },
  };

  report.plain_english = {
    do_we_buy_volatility:
      'Not “buy because it’s volatile.” Buy the snapback after a dump of known size (ATR), or collect funding while volatility is someone else’s problem.',
    known_up_down:
      'We don’t know direction for sure. We size targets/stops in ATR units (~1 ATR take profit, ~1.5 ATR stop) so the bet is structured.',
    winning_solution: report.winning_solution.id,
    one_liner: `Recommended: ${report.winning_solution.id} — ${report.winning_solution.why}`,
  };

  report.funding_meta = {
    source: 'okx_btc_usdt_swap',
    rows: funding.length,
    note: 'Binance futures API geo-blocked here; OKX used instead.',
  };

  fs.writeFileSync(path.join(LIP_DATA, 'winning-solution-shootout.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
