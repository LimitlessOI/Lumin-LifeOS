/**
 * SYNOPSIS: Solve reader — aim for consistent money on labeled P&D tape.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Solve reader — aim for consistent money on labeled P&D tape.
 *
 * Hard lessons baked in:
 * - Long at/after shout usually loses (buy the top)
 * - Median path: +12% BEFORE shout, −6% AFTER → fade the dump
 * - At shout time we CAN see the last 30m of tape (no future cheat)
 * - Decision at shout:
 *     already ran up → SHORT (fade)
 *     still flat + volume nuke → tiny LONG with m2 abort (rare)
 *     otherwise → SHORT default (distribution)
 * - Fail-fast, costs on, one shot per symbol per event
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

export const SOLVE_LESSONS = [
  'fade_dump_after_shout_is_edge',
  'long_announce_is_usually_top',
  'use_pre_shout_tape_at_decision_time',
  'already_ran_means_short_not_long',
  'rare_flat_plus_nuke_may_long_seconds',
  'wait_for_dump_confirm_avoid_tip_squeeze',
  'wider_stop_when_pre_run_extreme',
  'fail_fast_and_time_stop',
  'one_shot_per_symbol',
  'costs_on_every_trade',
];

export function createSolveReader(opts = {}) {
  const cash = opts.startingCash ?? 10000;
  const lookback = opts.lookback ?? 60;
  const ranThresh = opts.ranThresh ?? 0.04; // +4% in 30m → fade
  const flatThresh = opts.flatThresh ?? 0.02; // <2% → maybe long
  const volNuke = opts.volNuke ?? 30;
  const shortHoldMins = opts.shortHoldMins ?? 12;
  const longHoldMins = opts.longHoldMins ?? 6;
  const shortSize = opts.shortSize ?? 0.06;
  const longSize = opts.longSize ?? 0.03;

  const books = new Map();
  const open = [];
  const closed = [];
  let equity = cash;
  const done = new Set();
  const shoutMeta = new Map();
  const symbolCooldownUntil = new Map();
  const pendingShort = new Map(); // symbol -> { shoutTs, regime, armed_ts }

  function book(sym) {
    if (!books.has(sym)) books.set(sym, []);
    return books.get(sym);
  }

  function tapeAtShout(sym) {
    const bars = book(sym);
    if (bars.length < lookback + 2) return null;
    const cur = bars[bars.length - 1];
    const baseline = bars.slice(-lookback - 5, -5);
    const recent5 = bars.slice(-5);
    const avgBase = baseline.reduce((s, b) => s + b.volume, 0) / (baseline.length || 1);
    const avg5 = recent5.reduce((s, b) => s + b.volume, 0) / (recent5.length || 1);
    const volMult = avgBase > 0 ? avg5 / avgBase : 0;
    const p30 = bars[bars.length - 31] || bars[0];
    const p10 = bars[bars.length - 11] || bars[0];
    const p5 = bars[bars.length - 6] || bars[0];
    const ret30 = p30.close > 0 ? (cur.close - p30.close) / p30.close : 0;
    const ret10 = p10.close > 0 ? (cur.close - p10.close) / p10.close : 0;
    const ret5 = p5.close > 0 ? (cur.close - p5.close) / p5.close : 0;
    return { close: cur.close, ts: cur.ts, volMult, ret30, ret10, ret5 };
  }

  function closePos(pos, px, ts, reason) {
    const move = (px - pos.entry) / pos.entry;
    const gross = pos.side === 'short' ? -move : move;
    const cost = rtCost(true);
    const net = gross - cost;
    equity *= 1 + net * pos.size_frac;
    closed.push({
      symbol: pos.symbol,
      side: pos.side,
      regime: pos.regime,
      entry: pos.entry,
      exit: px,
      entry_ts: pos.entry_ts,
      exit_ts: ts,
      gross_pnl_pct: Math.round(gross * 10000) / 10000,
      net_pnl_pct: Math.round(net * 10000) / 10000,
      cost_pct: cost,
      reason,
      mins_held: Math.round((ts - pos.entry_ts) / 60000),
      ret30_at_entry: pos.ret30_at_entry,
      vol_at_entry: pos.vol_at_entry,
    });
    return true;
  }

  function tryClose(pos, px, ts) {
    const mins = (ts - pos.entry_ts) / 60000;
    if (px > pos.peak) pos.peak = px;
    if (px < pos.trough) pos.trough = px;

    if (pos.side === 'long') {
      if (mins >= 2 && px < pos.entry * 0.985) return closePos(pos, px, ts, 'm2_abort');
      if (px >= pos.entry * 1.06) return closePos(pos, px, ts, 'long_target');
      if (pos.peak >= pos.entry * 1.03 && px <= pos.peak * 0.94) return closePos(pos, px, ts, 'long_trail');
      if (px <= pos.entry * 0.93) return closePos(pos, px, ts, 'long_stop');
      if (mins >= longHoldMins) return closePos(pos, px, ts, 'long_time');
      return false;
    }

    const profitPx = pos.entry * 0.945;
    if (px <= profitPx) return closePos(pos, px, ts, 'short_target');
    if (pos.trough <= pos.entry * 0.975) {
      const cover = pos.trough * 1.03;
      if (px >= cover) return closePos(pos, px, ts, 'short_trail');
    }
    // E lesson: wider stop — tip often squeezes one more minute
    const stopMult = pos.wide_stop ? 1.08 : 1.055;
    if (px >= pos.entry * stopMult) return closePos(pos, px, ts, 'short_stop');
    if (mins >= shortHoldMins) return closePos(pos, px, ts, 'short_time');
    return false;
  }

  function openTrade(sym, side, regime, st, size, extra = {}) {
    open.push({
      symbol: sym,
      side,
      regime,
      entry: st.close,
      entry_ts: st.ts,
      peak: st.close,
      trough: st.close,
      size_frac: size,
      ret30_at_entry: st.ret30,
      vol_at_entry: st.volMult,
      wide_stop: !!extra.wide_stop,
    });
    symbolCooldownUntil.set(sym, st.ts + 45 * 60000);
  }

  function decideAtShout(sym, shoutTs) {
    const key = `${sym}|${shoutTs}`;
    if (done.has(key)) return { action: 'already_decided' };
    if ((symbolCooldownUntil.get(sym) || 0) > shoutTs) {
      done.add(key);
      return { action: 'symbol_cooldown' };
    }
    if (open.some((p) => p.symbol === sym)) {
      done.add(key);
      return { action: 'already_in' };
    }
    done.add(key);

    const st = tapeAtShout(sym);
    if (!st) return { action: 'no_tape' };

    // Rare continuation long
    if (Math.abs(st.ret30) < flatThresh && st.volMult >= volNuke && st.ret5 >= 0.005) {
      openTrade(sym, 'long', 'flat_nuke_long', st, longSize);
      return { action: 'enter_long', regime: 'flat_nuke_long', ret30: st.ret30, vol: st.volMult };
    }

    // Fade path: wait for dump confirmation (E lesson — avoid tip squeeze)
    const regime = st.ret30 >= ranThresh || st.ret10 >= ranThresh * 0.75 ? 'already_ran_fade' : 'default_fade';
    pendingShort.set(sym, {
      shoutTs,
      regime,
      armed_ts: st.ts,
      ret30: st.ret30,
      wide_stop: st.ret30 >= 0.15,
      entry_ref: st.close,
    });
    return { action: 'fade_armed_wait_confirm', regime, ret30: st.ret30 };
  }

  function maybeConfirmShort(sym, ev) {
    const pend = pendingShort.get(sym);
    if (!pend) return null;
    const bars = book(sym);
    if (bars.length < 2) return null;
    const cur = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    const mins = (ev.ts - pend.armed_ts) / 60000;
    const downBar = cur.close < prev.close * 0.997;
    const waited = mins >= 2;
    if (!downBar && !waited) return { action: 'waiting_dump_confirm' };
    if (mins > 8) {
      pendingShort.delete(sym);
      return { action: 'fade_expired' };
    }
    // If squeezed further up a lot while waiting, skip (don't chase short into moon)
    if (cur.close > pend.entry_ref * 1.1) {
      pendingShort.delete(sym);
      return { action: 'fade_abort_squeeze' };
    }
    pendingShort.delete(sym);
    const st = {
      close: cur.close,
      ts: cur.ts,
      ret30: pend.ret30,
      volMult: 0,
    };
    openTrade(sym, 'short', pend.regime + '_confirmed', st, shortSize, { wide_stop: pend.wide_stop });
    return { action: 'enter_short', regime: pend.regime + '_confirmed', waited_mins: Math.round(mins) };
  }

  function onEvent(ev) {
    if (ev.type === 'post') {
      shoutMeta.set(ev.symbol, { ts: ev.ts, decided: false });
      // Decide on next candle so we have shout-minute bar; if candle already present same ts, decide now
      const bars = book(ev.symbol);
      if (bars.length && bars[bars.length - 1].ts >= ev.ts - 60000) {
        shoutMeta.get(ev.symbol).decided = true;
        return decideAtShout(ev.symbol, ev.ts);
      }
      return { action: 'shout_armed', symbol: ev.symbol };
    }

    if (ev.type !== 'candle') return { action: 'ignore' };

    const bars = book(ev.symbol);
    bars.push({ close: ev.close, volume: ev.volume, ts: ev.ts });
    if (bars.length > 2500) bars.splice(0, bars.length - 2500);

    for (let i = open.length - 1; i >= 0; i--) {
      if (open[i].symbol !== ev.symbol) continue;
      if (tryClose(open[i], ev.close, ev.ts)) open.splice(i, 1);
    }

    const confirmed = maybeConfirmShort(ev.symbol, ev);
    if (confirmed && confirmed.action === 'enter_short') return confirmed;

    const meta = shoutMeta.get(ev.symbol);
    if (meta && !meta.decided && ev.ts >= meta.ts) {
      meta.decided = true;
      return decideAtShout(ev.symbol, meta.ts);
    }

    if (confirmed) return confirmed;
    return { action: 'scan' };
  }

  function snapshot() {
    const wins = closed.filter((c) => c.net_pnl_pct > 0);
    const shorts = closed.filter((c) => c.side === 'short');
    const longs = closed.filter((c) => c.side === 'long');
    const avg = (arr) => (arr.length ? arr.reduce((s, c) => s + c.net_pnl_pct, 0) / arr.length : null);
    return {
      equity: Math.round(equity * 100) / 100,
      starting_cash: cash,
      net_return_pct: Math.round(((equity - cash) / cash) * 10000) / 100,
      open: open.length,
      closed_trades: closed.length,
      win_rate: closed.length ? Math.round((wins.length / closed.length) * 1000) / 1000 : 0,
      short_trades: shorts.length,
      long_trades: longs.length,
      short_win_rate: shorts.length ? Math.round((shorts.filter((c) => c.net_pnl_pct > 0).length / shorts.length) * 1000) / 1000 : null,
      long_win_rate: longs.length ? Math.round((longs.filter((c) => c.net_pnl_pct > 0).length / longs.length) * 1000) / 1000 : null,
      short_avg_net: shorts.length ? Math.round(avg(shorts) * 10000) / 10000 : null,
      long_avg_net: longs.length ? Math.round(avg(longs) * 10000) / 10000 : null,
      lessons: SOLVE_LESSONS,
      closed,
    };
  }

  return { onEvent, snapshot, SOLVE_LESSONS };
}
