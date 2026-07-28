/**
 * SYNOPSIS: Lessons v3 — hard answers baked in:
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Lessons v3 — hard answers baked in:
 * - Too late on the way up? → DO NOT BUY. Ever.
 * - Public shout = usually the top or distribution → SHORT the dump.
 * - Enter short on first down minute (not yell-bar; E showed yell-bar can lose).
 * - No rare longs. Short-only path.
 */
const COST = {
  taker_fee_one_way: 0.001,
  slip_obscure_one_way: 0.008,
  slip_liquid_one_way: 0.002,
  transfer_drag_per_trade: 0.0005,
};

function rtCost() {
  return 2 * (COST.taker_fee_one_way + COST.slip_obscure_one_way) + COST.transfer_drag_per_trade;
}

export const LESSONS_V3 = [
  { id: 1, rule: 'never_buy_if_late', detail: 'At/after public shout with price already up → no long.' },
  { id: 2, rule: 'no_buy_on_way_up_after_shout', detail: 'Public shout is too late for the long; longs lose ~7–14%.' },
  { id: 3, rule: 'just_short_the_dump', detail: 'Arm at shout; short first down 1m bar.' },
  { id: 4, rule: 'wait_first_drop_not_yell_bar', detail: 'Short-at-shout mixed (E red); first-drop was 5/5 green.' },
  { id: 5, rule: 'wider_stop_if_already_ran_hard', detail: 'If +15% in 30m before shout, use 8% stop vs 6%.' },
  { id: 6, rule: 'abort_if_still_mooning', detail: 'If +12% more after shout before a drop, skip — do not chase short into squeeze.' },
  { id: 7, rule: 'fail_fast_time_stop', detail: 'Cover by ~12 minutes; tip dump is fast.' },
  { id: 8, rule: 'costs_on', detail: '~1.85% obscure round-trip every trade.' },
  { id: 9, rule: 'one_shot_per_event', detail: 'No revenge re-entries.' },
  { id: 10, rule: 'identify_only', detail: 'Never organize a pump — trade public pattern only.' },
];

export function createLessonsV3Reader(opts = {}) {
  const cash = opts.startingCash ?? 10000;
  const sizeFrac = opts.sizeFrac ?? 0.08;
  const downFrac = opts.downFrac ?? 0.997;
  const holdMins = opts.holdMins ?? 12;
  const targetFrac = opts.targetFrac ?? 0.055;
  const stopFracBase = opts.stopFrac ?? 0.06;
  const stopFracWide = opts.stopFracWide ?? 0.08;
  const armExpireMins = opts.armExpireMins ?? 20;
  const squeezeAbort = opts.squeezeAbort ?? 0.12;
  const lateRanThresh = opts.lateRanThresh ?? 0.02; // +2% in 30m = already late for longs
  const hardRanThresh = opts.hardRanThresh ?? 0.15;

  const books = new Map();
  const open = [];
  const closed = [];
  let equity = cash;
  const armed = new Map();
  const done = new Set();
  const cooldownUntil = new Map();
  const stats = {
    skipped_would_have_been_late_long: 0,
    shorts_entered: 0,
    arms_expired: 0,
    abort_moon: 0,
  };

  function book(sym) {
    if (!books.has(sym)) books.set(sym, []);
    return books.get(sym);
  }

  function tapeNow(sym) {
    const bars = book(sym);
    if (bars.length < 35) return null;
    const cur = bars[bars.length - 1];
    const p30 = bars[bars.length - 31] || bars[0];
    const ret30 = p30.close > 0 ? (cur.close - p30.close) / p30.close : 0;
    return { close: cur.close, ts: cur.ts, ret30, late_for_long: ret30 >= lateRanThresh };
  }

  function closePos(pos, px, ts, reason) {
    const move = (px - pos.entry) / pos.entry;
    const gross = -move;
    const cost = rtCost();
    const net = gross - cost;
    equity *= 1 + net * pos.size_frac;
    closed.push({
      symbol: pos.symbol,
      side: 'short',
      entry: pos.entry,
      exit: px,
      entry_ts: pos.entry_ts,
      exit_ts: ts,
      shout_ts: pos.shout_ts,
      mins_after_shout: Math.round((pos.entry_ts - pos.shout_ts) / 60000),
      ret30_at_shout: pos.ret30_at_shout,
      late_for_long_at_shout: pos.late_for_long_at_shout,
      gross_pnl_pct: Math.round(gross * 10000) / 10000,
      net_pnl_pct: Math.round(net * 10000) / 10000,
      reason,
      mins_held: Math.round((ts - pos.entry_ts) / 60000),
    });
  }

  function tryClose(pos, px, ts) {
    const mins = (ts - pos.entry_ts) / 60000;
    if (px < pos.trough) pos.trough = px;
    if (px > pos.peak) pos.peak = px;
    const stop = pos.wide_stop ? stopFracWide : stopFracBase;
    if (px <= pos.entry * (1 - targetFrac)) {
      closePos(pos, px, ts, 'target');
      return true;
    }
    if (px >= pos.entry * (1 + stop)) {
      closePos(pos, px, ts, 'stop');
      return true;
    }
    if (pos.trough <= pos.entry * 0.97 && px >= pos.trough * 1.025) {
      closePos(pos, px, ts, 'trail');
      return true;
    }
    if (mins >= holdMins) {
      closePos(pos, px, ts, 'time');
      return true;
    }
    return false;
  }

  function enterShort(sym, px, ts, arm) {
    if (open.some((p) => p.symbol === sym)) return { action: 'already_in' };
    if ((cooldownUntil.get(sym) || 0) > ts) return { action: 'cooldown' };
    open.push({
      symbol: sym,
      entry: px,
      entry_ts: ts,
      shout_ts: arm.shoutTs,
      peak: px,
      trough: px,
      size_frac: sizeFrac,
      ret30_at_shout: arm.ret30,
      late_for_long_at_shout: arm.late_for_long,
      wide_stop: arm.ret30 >= hardRanThresh,
    });
    cooldownUntil.set(sym, ts + 45 * 60000);
    armed.delete(sym);
    stats.shorts_entered += 1;
    return {
      action: 'enter_short',
      late_for_long_at_shout: arm.late_for_long,
      ret30: arm.ret30,
    };
  }

  function armAtShout(sym, shoutTs) {
    const key = `${sym}|${shoutTs}`;
    if (done.has(key)) return { action: 'already' };
    done.add(key);
    const st = tapeNow(sym);
    const ret30 = st?.ret30 ?? 0;
    const late = st?.late_for_long ?? true; // no tape → treat as late; never long
    if (late) stats.skipped_would_have_been_late_long += 1;
    // LESSON: never open a long here. Only arm short.
    armed.set(sym, {
      shoutTs,
      refPx: st?.close ?? null,
      ret30,
      late_for_long: late,
      pending_ref: !st,
    });
    return {
      action: 'armed_short_only',
      late_for_long: late,
      ret30: Math.round(ret30 * 10000) / 10000,
      would_buy_up: false,
    };
  }

  function onEvent(ev) {
    if (ev.type === 'post') {
      const bars = book(ev.symbol);
      if (bars.length && bars[bars.length - 1].ts >= ev.ts - 60000) {
        return armAtShout(ev.symbol, ev.ts);
      }
      armed.set(ev.symbol, {
        shoutTs: ev.ts,
        refPx: null,
        ret30: 0,
        late_for_long: true,
        pending_ref: true,
      });
      done.add(`${ev.symbol}|${ev.ts}`);
      return { action: 'armed_wait_bar' };
    }

    if (ev.type !== 'candle') return { action: 'ignore' };

    const bars = book(ev.symbol);
    bars.push({ close: ev.close, volume: ev.volume, ts: ev.ts });
    if (bars.length > 2500) bars.splice(0, bars.length - 2500);

    for (let i = open.length - 1; i >= 0; i--) {
      if (open[i].symbol !== ev.symbol) continue;
      if (tryClose(open[i], ev.close, ev.ts)) open.splice(i, 1);
    }

    const arm = armed.get(ev.symbol);
    if (!arm) return { action: 'scan' };

    if (arm.pending_ref) {
      const st = tapeNow(ev.symbol);
      arm.refPx = ev.close;
      arm.ret30 = st?.ret30 ?? 0;
      arm.late_for_long = st?.late_for_long ?? true;
      arm.pending_ref = false;
      if (arm.late_for_long) stats.skipped_would_have_been_late_long += 1;
    }

    if (ev.ts < arm.shoutTs) return { action: 'pre_shout' };

    const mins = (ev.ts - arm.shoutTs) / 60000;
    if (mins > armExpireMins) {
      armed.delete(ev.symbol);
      stats.arms_expired += 1;
      return { action: 'arm_expired' };
    }

    if (arm.refPx != null && ev.close > arm.refPx * (1 + squeezeAbort)) {
      armed.delete(ev.symbol);
      stats.abort_moon += 1;
      return { action: 'abort_still_pumping' };
    }

    if (bars.length < 2) return { action: 'waiting_drop' };
    const prev = bars[bars.length - 2];
    if (!(ev.close < prev.close * downFrac)) return { action: 'waiting_drop' };

    return enterShort(ev.symbol, ev.close, ev.ts, arm);
  }

  function snapshot() {
    const wins = closed.filter((c) => c.net_pnl_pct > 0);
    const lateFlags = closed.filter((c) => c.late_for_long_at_shout);
    const reasons = {};
    for (const c of closed) reasons[c.reason] = (reasons[c.reason] || 0) + 1;
    return {
      equity: Math.round(equity * 100) / 100,
      starting_cash: cash,
      net_return_pct: Math.round(((equity - cash) / cash) * 10000) / 100,
      closed_trades: closed.length,
      win_rate: closed.length ? Math.round((wins.length / closed.length) * 1000) / 1000 : 0,
      long_trades: 0,
      short_trades: closed.length,
      pct_shorts_where_long_would_be_late: closed.length
        ? Math.round((lateFlags.length / closed.length) * 1000) / 1000
        : null,
      reasons,
      stats,
      lessons: LESSONS_V3,
      closed,
    };
  }

  return { onEvent, snapshot, LESSONS_V3 };
}
