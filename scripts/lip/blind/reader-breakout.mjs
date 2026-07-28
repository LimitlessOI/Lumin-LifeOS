/**
 * SYNOPSIS: Breakout / pre-takeoff reader — lessons from research + P&D experiments.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Breakout / pre-takeoff reader — lessons from research + P&D experiments.
 *
 * BUY when most of these align (daily bars):
 * - Quiet range (coil)
 * - OBV rising while price flat-ish
 * - Close above prior resistance
 * - Volume ≥ 1.5× average
 * - RSI > 50
 * - BTC not in freefall (regime gate)
 *
 * SELL:
 * - Fail break (close back under breakout)
 * - Stop / trail
 * - Time stop
 * - Momentum exhaustion (RSI very high then fade)
 */
const COST = {
  taker_fee_one_way: 0.001,
  slip_one_way: 0.0015,
  transfer_drag: 0.0003,
};

function rtCost() {
  return 2 * (COST.taker_fee_one_way + COST.slip_one_way) + COST.transfer_drag;
}

export const BREAKOUT_LESSONS = [
  'quiet_range_then_expand',
  'obv_rises_before_or_with_price',
  'resistance_close_not_wick',
  'volume_confirms_break',
  'rsi_above_50_momentum',
  'btc_regime_gate_for_alts',
  'sell_failed_break',
  'trail_winners_cut_losers',
  'costs_on_every_trade',
  'not_pd_shout_chase',
];

function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const ag = gains / period;
  const al = losses / period;
  if (al === 0) return 100;
  const rs = ag / al;
  return 100 - 100 / (1 + rs);
}

function obvSeries(bars) {
  const out = [];
  let v = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      out.push(0);
      continue;
    }
    if (bars[i].close > bars[i - 1].close) v += bars[i].volume;
    else if (bars[i].close < bars[i - 1].close) v -= bars[i].volume;
    out.push(v);
  }
  return out;
}

export function createBreakoutReader(opts = {}) {
  const cash = opts.startingCash ?? 10000;
  const rangeLookback = opts.rangeLookback ?? 20;
  const volMult = opts.volMult ?? 1.5;
  const maxHoldBars = opts.maxHoldBars ?? 40;
  const sizeFrac = opts.sizeFrac ?? 0.08;
  const requireBtcGate = opts.requireBtcGate !== false;
  const trailArm = opts.trailArm ?? 1.08; // arm trail after +8%
  const trailGiveback = opts.trailGiveback ?? 0.08; // give back 8% from peak
  const useTarget = opts.useTarget !== false;
  const targetFrac = opts.targetFrac ?? 1.15;

  const books = new Map(); // symbol -> bars {open,high,low,close,volume,ts}
  const open = [];
  const closed = [];
  let equity = cash;
  const cooldownUntil = new Map();
  const traded = new Set(); // symbol|breakTs one shot per breakout level roughly

  function book(sym) {
    if (!books.has(sym)) books.set(sym, []);
    return books.get(sym);
  }

  function btcOk() {
    if (!requireBtcGate) return true;
    const b = book('BTC');
    if (b.length < 50) return true; // warm
    const closes = b.map((x) => x.close);
    const ma = closes.slice(-50).reduce((s, x) => s + x, 0) / 50;
    return closes[closes.length - 1] >= ma * 0.97; // allow slight dip
  }

  function closePos(pos, bar, reason) {
    const px = bar.close;
    const gross = (px - pos.entry) / pos.entry;
    const cost = rtCost();
    const net = gross - cost;
    equity *= 1 + net * pos.size_frac;
    closed.push({
      symbol: pos.symbol,
      side: 'long',
      entry: pos.entry,
      exit: px,
      entry_ts: pos.entry_ts,
      exit_ts: bar.ts,
      gross_pnl_pct: Math.round(gross * 10000) / 10000,
      net_pnl_pct: Math.round(net * 10000) / 10000,
      cost_pct: cost,
      reason,
      bars_held: pos.bars_held,
      score: pos.score,
    });
    return true;
  }

  function tryClose(pos, bar) {
    pos.bars_held += 1;
    const px = bar.close;
    if (px > pos.peak) pos.peak = px;

    // Failed breakout — out fast
    if (px < pos.break_level * 0.985) return closePos(pos, bar, 'failed_break');

    // Hard stop under range / entry risk
    if (px <= pos.stop) return closePos(pos, bar, 'stop');

    // Trailing stop: arm after +armTrail%, then exit on trailGiveback from peak
    const armAt = pos.trail_arm ?? 1.08;
    const giveback = pos.trail_giveback ?? 0.08;
    if (pos.peak >= pos.entry * armAt) {
      pos.trail_armed = true;
      const trail = pos.peak * (1 - giveback);
      if (px <= trail) return closePos(pos, bar, 'trail');
    }

    // Optional partial-style full exit at stretch target (can disable via opts)
    if (pos.use_target !== false && px >= pos.entry * (pos.target_frac ?? 1.15)) {
      return closePos(pos, bar, 'target');
    }

    const bars = book(pos.symbol);
    const r = rsi(bars.map((b) => b.close));
    if (r != null && r > 78 && px < pos.peak * 0.97) return closePos(pos, bar, 'exhaustion');

    if (pos.bars_held >= maxHoldBars) return closePos(pos, bar, 'time');
    return false;
  }

  function scoreSetup(sym) {
    const bars = book(sym);
    if (bars.length < rangeLookback + 15) return null;
    if (sym !== 'BTC' && !btcOk()) return { skip: 'btc_regime' };

    const window = bars.slice(-rangeLookback - 1, -1); // prior range (exclude current)
    const cur = bars[bars.length - 1];
    const highs = window.map((b) => b.high);
    const lows = window.map((b) => b.low);
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    const mid = (resistance + support) / 2;
    const rangePct = mid > 0 ? (resistance - support) / mid : 1;

    const vols = window.map((b) => b.volume);
    const avgVol = vols.reduce((s, v) => s + v, 0) / vols.length;
    const volOk = avgVol > 0 && cur.volume >= avgVol * volMult;

    const closes = bars.map((b) => b.close);
    const r = rsi(closes);
    const rsiOk = r != null && r > 50 && r < 78;

    const obv = obvSeries(bars);
    const obvNow = obv[obv.length - 1];
    const obvPrev = obv[obv.length - 11] ?? obv[0];
    const obvRising = obvNow > obvPrev;

    // Quiet range: not already in a huge trend in the lookback
    const coiled = rangePct <= 0.28;
    const breakout = cur.close > resistance * 1.002; // close above, not wick-only (we use close)

    // Price was relatively flat vs OBV (accumulation flavor)
    const priceChg10 =
      window.length >= 10
        ? (window[window.length - 1].close - window[window.length - 10].close) / window[window.length - 10].close
        : 0;
    const quietAccum = Math.abs(priceChg10) < 0.12 && obvRising;

    let score = 0;
    const parts = [];
    if (coiled) {
      score += 2;
      parts.push('coil');
    }
    if (obvRising) {
      score += 2;
      parts.push('obv_up');
    }
    if (quietAccum) {
      score += 1;
      parts.push('quiet_accum');
    }
    if (breakout) {
      score += 3;
      parts.push('break');
    }
    if (volOk) {
      score += 2;
      parts.push('vol');
    }
    if (rsiOk) {
      score += 2;
      parts.push('rsi');
    }

    return {
      score,
      parts,
      resistance,
      support,
      rangePct,
      rsi: r,
      volRatio: avgVol > 0 ? cur.volume / avgVol : 0,
      breakout,
      coiled,
      obvRising,
      volOk,
      rsiOk,
      close: cur.close,
      ts: cur.ts,
      stop: Math.max(support, cur.close * 0.92),
    };
  }

  function onEvent(ev) {
    if (ev.type !== 'candle') return { action: 'ignore' };
    const bars = book(ev.symbol);
    bars.push({
      open: ev.open ?? ev.close,
      high: ev.high ?? ev.close,
      low: ev.low ?? ev.close,
      close: ev.close,
      volume: ev.volume,
      ts: ev.ts,
    });
    if (bars.length > 400) bars.splice(0, bars.length - 400);

    for (let i = open.length - 1; i >= 0; i--) {
      if (open[i].symbol !== ev.symbol) continue;
      if (tryClose(open[i], bars[bars.length - 1])) open.splice(i, 1);
    }

    if (open.some((p) => p.symbol === ev.symbol)) return { action: 'already_in' };
    if ((cooldownUntil.get(ev.symbol) || 0) > ev.ts) return { action: 'cooldown' };

    const setup = scoreSetup(ev.symbol);
    if (!setup || setup.skip) return { action: setup?.skip || 'warmup' };

    // Need breakout + enough checklist score
    if (!setup.breakout || setup.score < 9) return { action: 'no_signal', score: setup.score };

    const key = `${ev.symbol}|${Math.floor(setup.resistance * 1e8)}`;
    if (traded.has(key)) return { action: 'level_done' };
    traded.add(key);

    open.push({
      symbol: ev.symbol,
      entry: setup.close,
      entry_ts: setup.ts,
      peak: setup.close,
      break_level: setup.resistance,
      stop: setup.stop,
      bars_held: 0,
      size_frac: sizeFrac,
      score: setup.score,
      parts: setup.parts,
      trail_arm: trailArm,
      trail_giveback: trailGiveback,
      use_target: useTarget,
      target_frac: targetFrac,
    });
    cooldownUntil.set(ev.symbol, setup.ts + 10 * 86400000); // 10d
    return { action: 'buy', symbol: ev.symbol, score: setup.score, parts: setup.parts };
  }

  function snapshot() {
    const wins = closed.filter((c) => c.net_pnl_pct > 0);
    return {
      equity: Math.round(equity * 100) / 100,
      starting_cash: cash,
      net_return_pct: Math.round(((equity - cash) / cash) * 10000) / 100,
      open: open.length,
      closed_trades: closed.length,
      win_rate: closed.length ? Math.round((wins.length / closed.length) * 1000) / 1000 : 0,
      avg_net_pnl_pct:
        closed.length > 0
          ? Math.round((closed.reduce((s, c) => s + c.net_pnl_pct, 0) / closed.length) * 10000) / 100
          : 0,
      lessons: BREAKOUT_LESSONS,
      closed,
    };
  }

  return { onEvent, snapshot, BREAKOUT_LESSONS };
}

/** Buy & hold control on one symbol */
export function buyHoldReturn(bars, startCash = 10000) {
  if (!bars.length) return { net_return_pct: 0 };
  const a = bars[0].close;
  const b = bars[bars.length - 1].close;
  const gross = (b - a) / a;
  const net = gross - rtCost();
  return {
    net_return_pct: Math.round(net * 10000) / 100,
    start: a,
    end: b,
    bars: bars.length,
  };
}
