/**
 * SYNOPSIS: Success-trail reader v4 — lessons from Segment C blind.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Success-trail reader v4 — lessons from Segment C blind.
 *
 * C taught us:
 * - 27/30 trades were FAR from real events (noise) → raise vol bar hard
 * - Near-event entries (≤60m before shout) averaged ~+5.8% net
 * - Holding 25m flat bleeds fees → fail-fast if not working
 * - Same symbol re-entered 8–9× → one shot per symbol / long cooldown
 * - Volume must still be accelerating, not just elevated once
 */
const COST = {
  taker_fee_one_way: 0.001,
  slip_obscure_one_way: 0.008,
  slip_liquid_one_way: 0.002,
  transfer_drag_per_trade: 0.0005,
};

function rtCost(obscure) {
  const slip = obscure ? COST.slip_obscure_one_way : COST.slip_liquid_one_way;
  return 2 * (COST.taker_fee_one_way + slip) + COST.transfer_drag_per_trade;
}

export const TRAIL_LESSONS = [
  'c_false_wakes_dominated_losses',
  'require_extreme_volume_not_mild',
  'require_volume_still_accelerating',
  'one_shot_per_symbol_long_cooldown',
  'fail_fast_if_not_working_by_8m',
  'abort_if_red_by_minute_2',
  'do_not_chase_after_shout',
  'near_event_trail_was_the_edge',
  'costs_on_every_trade',
];

export function createSuccessTrailReader(opts = {}) {
  const cash = opts.startingCash ?? 10000;
  const lookback = opts.lookback ?? 60;
  // C lesson: 8× was way too loose (real events ~100×). Default 40×.
  const volWakeMult = opts.volWakeMult ?? 40;
  const drift15 = opts.drift15 ?? 0.03;
  const drift5 = opts.drift5 ?? 0.012;
  const alreadyRanSkip = opts.alreadyRanSkip ?? 0.12;
  const maxHoldMins = opts.maxHoldMins ?? 18;
  const failFastMins = opts.failFastMins ?? 8;
  const failFastMinGain = opts.failFastMinGain ?? 0.015;
  const sizeFrac = opts.sizeFrac ?? 0.05;
  const cooldownMs = opts.cooldownMs ?? 12 * 3600 * 1000; // 12h one-shot

  const books = new Map();
  const open = [];
  const closed = [];
  let equity = cash;
  const cooldownUntil = new Map();
  const shoutSeen = new Map();
  const tradedSymbols = new Set(); // hard one-shot per symbol in this run

  function book(sym) {
    if (!books.has(sym)) books.set(sym, []);
    return books.get(sym);
  }

  function stats(sym) {
    const bars = book(sym);
    if (bars.length < lookback + 8) return null;
    const cur = bars[bars.length - 1];
    const baseline = bars.slice(-lookback - 8, -8);
    const recent5 = bars.slice(-5);
    const prev5 = bars.slice(-10, -5);
    const last3 = bars.slice(-3);
    const prev3 = bars.slice(-6, -3);

    const avgBase = baseline.reduce((s, b) => s + b.volume, 0) / baseline.length;
    const avg5 = recent5.reduce((s, b) => s + b.volume, 0) / recent5.length;
    const avgPrev5 = prev5.reduce((s, b) => s + b.volume, 0) / prev5.length;
    const avg3 = last3.reduce((s, b) => s + b.volume, 0) / last3.length;
    const avgPrev3 = prev3.reduce((s, b) => s + b.volume, 0) / prev3.length;

    const volMult = avgBase > 0 ? avg5 / avgBase : 0;
    const volAccel = avgPrev5 > 0 ? avg5 / avgPrev5 : 0;
    const volAccel3 = avgPrev3 > 0 ? avg3 / avgPrev3 : 0;

    const p15 = bars[bars.length - 16] || bars[0];
    const p5 = bars[bars.length - 6] || bars[0];
    const p30 = bars[bars.length - 31] || bars[0];
    const ret15 = p15.close > 0 ? (cur.close - p15.close) / p15.close : 0;
    const ret5 = p5.close > 0 ? (cur.close - p5.close) / p5.close : 0;
    const ret30 = p30.close > 0 ? (cur.close - p30.close) / p30.close : 0;
    return { close: cur.close, ts: cur.ts, volMult, volAccel, volAccel3, ret15, ret5, ret30 };
  }

  function closePos(pos, px, ts, reason) {
    const gross = (px - pos.entry) / pos.entry;
    const cost = rtCost(pos.obscure);
    const net = gross - cost;
    equity *= 1 + net * pos.size_frac;
    closed.push({
      symbol: pos.symbol,
      entry: pos.entry,
      exit: px,
      entry_ts: pos.entry_ts,
      exit_ts: ts,
      gross_pnl_pct: Math.round(gross * 10000) / 10000,
      net_pnl_pct: Math.round(net * 10000) / 10000,
      cost_pct: cost,
      reason,
      signal: pos.signal,
      mins_held: Math.round((ts - pos.entry_ts) / 60000),
      saw_shout: !!pos.saw_shout,
      entry_vol_mult: pos.entry_vol_mult ?? null,
    });
    return true;
  }

  function tryClose(pos, px, ts) {
    const mins = (ts - pos.entry_ts) / 60000;
    if (px > pos.peak) pos.peak = px;

    if (mins >= 2 && px < pos.entry * 0.985) {
      return closePos(pos, px, ts, 'm2_abort');
    }

    // C lesson: don't bleed for 25m flat — fail fast
    if (mins >= failFastMins && px < pos.entry * (1 + failFastMinGain)) {
      return closePos(pos, px, ts, 'fail_fast');
    }

    if (pos.saw_shout) {
      const sinceShout = (ts - pos.shout_ts) / 60000;
      if (px >= pos.entry * 1.015) return closePos(pos, px, ts, 'shout_take');
      if (sinceShout >= 2) return closePos(pos, px, ts, 'shout_exit');
    }

    if (pos.peak >= pos.entry * 1.04) {
      if (px <= pos.peak * 0.93) return closePos(pos, px, ts, 'trail');
    }

    if (px >= pos.entry * 1.07) return closePos(pos, px, ts, 'target');
    if (px <= pos.entry * 0.92) return closePos(pos, px, ts, 'stop');
    if (mins >= maxHoldMins) return closePos(pos, px, ts, 'time');
    return false;
  }

  function enter(sym, st, signal) {
    open.push({
      symbol: sym,
      entry: st.close,
      entry_ts: st.ts,
      peak: st.close,
      obscure: true,
      size_frac: sizeFrac,
      signal,
      saw_shout: false,
      shout_ts: null,
      entry_vol_mult: st.volMult,
    });
    cooldownUntil.set(sym, st.ts + cooldownMs);
    tradedSymbols.add(sym);
  }

  function onEvent(ev) {
    if (ev.type === 'post') {
      shoutSeen.set(ev.symbol, ev.ts);
      for (const pos of open) {
        if (pos.symbol === ev.symbol) {
          pos.saw_shout = true;
          pos.shout_ts = ev.ts;
        }
      }
      return { action: 'shout_seen', symbol: ev.symbol };
    }
    if (ev.type !== 'candle') return { action: 'ignore' };

    const bars = book(ev.symbol);
    bars.push({ close: ev.close, volume: ev.volume, ts: ev.ts });
    if (bars.length > 2000) bars.splice(0, bars.length - 2000);

    for (let i = open.length - 1; i >= 0; i--) {
      if (open[i].symbol !== ev.symbol) continue;
      if (tryClose(open[i], ev.close, ev.ts)) open.splice(i, 1);
    }

    if (tradedSymbols.has(ev.symbol)) return { action: 'one_shot_done' };
    if ((cooldownUntil.get(ev.symbol) || 0) > ev.ts) return { action: 'cooldown' };
    if (open.some((p) => p.symbol === ev.symbol)) return { action: 'already_in' };

    const st = stats(ev.symbol);
    if (!st) return { action: 'warmup' };

    const shoutTs = shoutSeen.get(ev.symbol);
    if (shoutTs && ev.ts >= shoutTs) return { action: 'skip_after_shout' };
    if (st.ret30 >= alreadyRanSkip) return { action: 'skip_already_ran' };

    // Success trail v4: extreme vol + still accelerating + price drift
    const trail =
      st.volMult >= volWakeMult &&
      st.volAccel >= 1.4 &&
      st.volAccel3 >= 1.2 &&
      st.ret15 >= drift15 &&
      st.ret5 >= drift5 &&
      st.ret30 < alreadyRanSkip;

    if (trail) {
      enter(ev.symbol, st, 'success_trail_v4');
      return {
        action: 'enter',
        symbol: ev.symbol,
        signal: 'success_trail_v4',
        volMult: Math.round(st.volMult * 10) / 10,
        volAccel: Math.round(st.volAccel * 100) / 100,
        ret15: Math.round(st.ret15 * 1000) / 1000,
      };
    }

    return { action: 'no_signal' };
  }

  function snapshot() {
    const wins = closed.filter((c) => c.net_pnl_pct > 0).length;
    return {
      equity: Math.round(equity * 100) / 100,
      starting_cash: cash,
      net_return_pct: Math.round(((equity - cash) / cash) * 10000) / 100,
      open: open.length,
      closed_trades: closed.length,
      win_rate: closed.length ? Math.round((wins / closed.length) * 1000) / 1000 : 0,
      avg_net_pnl_pct:
        closed.length > 0
          ? Math.round((closed.reduce((s, c) => s + c.net_pnl_pct, 0) / closed.length) * 10000) / 100
          : 0,
      symbols_traded: tradedSymbols.size,
      shouts_seen: shoutSeen.size,
      lessons: TRAIL_LESSONS,
      closed,
    };
  }

  return { onEvent, snapshot, TRAIL_LESSONS };
}
