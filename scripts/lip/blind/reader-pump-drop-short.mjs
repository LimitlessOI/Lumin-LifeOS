/**
 * SYNOPSIS: Pure rule: pump is on (public shout) → as soon as price starts dropping → SHORT.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Pure rule: pump is on (public shout) → as soon as price starts dropping → SHORT.
 * Identify/trade public pattern only — never organize a pump.
 */
const COST = {
  taker_fee_one_way: 0.001,
  slip_obscure_one_way: 0.008,
  slip_liquid_one_way: 0.002,
  transfer_drag_per_trade: 0.0005,
};

function rtCost(obscure = true) {
  const slip = obscure ? COST.slip_obscure_one_way : COST.slip_liquid_one_way;
  return 2 * (COST.taker_fee_one_way + slip) + COST.transfer_drag_per_trade;
}

export const PUMP_DROP_LESSONS = [
  'pump_shout_arms_short',
  'first_down_bar_enters_short',
  'no_longs_on_this_path',
  'abort_if_still_mooning_hard',
  'fail_fast_time_stop',
  'costs_on',
];

/**
 * @param {object} opts
 * @param {number} [opts.startingCash]
 * @param {number} [opts.downFrac] close must be this fraction below prior close (0.997 = −0.3%)
 * @param {number} [opts.sizeFrac]
 * @param {number} [opts.holdMins]
 * @param {number} [opts.targetFrac] cover when price down this much from entry
 * @param {number} [opts.stopFrac] cover when price up this much from entry
 * @param {number} [opts.armExpireMins] give up waiting for first drop
 * @param {number} [opts.squeezeAbort] abort arm if price runs this far above shout ref
 * @param {boolean} [opts.shortAtShout] control: short the shout bar immediately (no wait for drop)
 */
export function createPumpDropShortReader(opts = {}) {
  const cash = opts.startingCash ?? 10000;
  const downFrac = opts.downFrac ?? 0.997;
  const sizeFrac = opts.sizeFrac ?? 0.08;
  const holdMins = opts.holdMins ?? 12;
  const targetFrac = opts.targetFrac ?? 0.055;
  const stopFrac = opts.stopFrac ?? 0.06;
  const armExpireMins = opts.armExpireMins ?? 20;
  const squeezeAbort = opts.squeezeAbort ?? 0.12;
  const shortAtShout = opts.shortAtShout ?? false;

  const books = new Map();
  const open = [];
  const closed = [];
  let equity = cash;
  const armed = new Map(); // symbol -> { shoutTs, refPx, eventKey }
  const doneEvents = new Set();
  const cooldownUntil = new Map();

  function book(sym) {
    if (!books.has(sym)) books.set(sym, []);
    return books.get(sym);
  }

  function closePos(pos, px, ts, reason) {
    const move = (px - pos.entry) / pos.entry;
    const gross = -move; // short
    const cost = rtCost(true);
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
      gross_pnl_pct: Math.round(gross * 10000) / 10000,
      net_pnl_pct: Math.round(net * 10000) / 10000,
      cost_pct: cost,
      reason,
      mins_held: Math.round((ts - pos.entry_ts) / 60000),
    });
  }

  function tryClose(pos, px, ts) {
    const mins = (ts - pos.entry_ts) / 60000;
    if (px < pos.trough) pos.trough = px;
    if (px > pos.peak) pos.peak = px;

    if (px <= pos.entry * (1 - targetFrac)) {
      closePos(pos, px, ts, 'target');
      return true;
    }
    if (px >= pos.entry * (1 + stopFrac)) {
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

  function enterShort(sym, px, ts, shoutTs, how) {
    if (open.some((p) => p.symbol === sym)) return { action: 'already_in' };
    if ((cooldownUntil.get(sym) || 0) > ts) return { action: 'cooldown' };
    open.push({
      symbol: sym,
      entry: px,
      entry_ts: ts,
      shout_ts: shoutTs,
      peak: px,
      trough: px,
      size_frac: sizeFrac,
      how,
    });
    cooldownUntil.set(sym, ts + 45 * 60000);
    armed.delete(sym);
    return { action: 'enter_short', how, symbol: sym, px };
  }

  function armPump(sym, shoutTs, refPx) {
    const key = `${sym}|${shoutTs}`;
    if (doneEvents.has(key)) return { action: 'already_armed' };
    doneEvents.add(key);
    if (shortAtShout) {
      return enterShort(sym, refPx, shoutTs, shoutTs, 'short_at_shout');
    }
    armed.set(sym, { shoutTs, refPx, eventKey: key });
    return { action: 'pump_armed', symbol: sym };
  }

  function onEvent(ev) {
    if (ev.type === 'post') {
      const bars = book(ev.symbol);
      const ref =
        bars.length && bars[bars.length - 1].ts >= ev.ts - 60000
          ? bars[bars.length - 1].close
          : ev.price || null;
      // Arm on next candle if no ref yet
      if (ref == null) {
        armed.set(ev.symbol, { shoutTs: ev.ts, refPx: null, eventKey: `${ev.symbol}|${ev.ts}`, pending_ref: true });
        doneEvents.add(`${ev.symbol}|${ev.ts}`);
        return { action: 'pump_armed_wait_bar', symbol: ev.symbol };
      }
      return armPump(ev.symbol, ev.ts, ref);
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

    if (arm.pending_ref || arm.refPx == null) {
      arm.refPx = ev.close;
      arm.pending_ref = false;
      if (shortAtShout) {
        return enterShort(ev.symbol, ev.close, ev.ts, arm.shoutTs, 'short_at_shout');
      }
    }

    if (ev.ts < arm.shoutTs) return { action: 'pre_shout' };

    const mins = (ev.ts - arm.shoutTs) / 60000;
    if (mins > armExpireMins) {
      armed.delete(ev.symbol);
      return { action: 'arm_expired' };
    }

    if (ev.close > arm.refPx * (1 + squeezeAbort)) {
      armed.delete(ev.symbol);
      return { action: 'abort_still_pumping' };
    }

    if (bars.length < 2) return { action: 'waiting_drop' };
    const prev = bars[bars.length - 2];
    const dropping = ev.close < prev.close * downFrac;
    if (!dropping) return { action: 'waiting_drop' };

    return enterShort(ev.symbol, ev.close, ev.ts, arm.shoutTs, 'first_drop');
  }

  function snapshot() {
    const wins = closed.filter((c) => c.net_pnl_pct > 0);
    const avgLag =
      closed.length > 0
        ? closed.reduce((s, c) => s + (c.mins_after_shout || 0), 0) / closed.length
        : null;
    const reasons = {};
    for (const c of closed) reasons[c.reason] = (reasons[c.reason] || 0) + 1;
    return {
      equity: Math.round(equity * 100) / 100,
      starting_cash: cash,
      net_return_pct: Math.round(((equity - cash) / cash) * 10000) / 100,
      closed_trades: closed.length,
      win_rate: closed.length ? Math.round((wins.length / closed.length) * 1000) / 1000 : 0,
      avg_mins_after_shout: avgLag == null ? null : Math.round(avgLag * 10) / 10,
      reasons,
      lessons: PUMP_DROP_LESSONS,
      closed,
    };
  }

  return { onEvent, snapshot, PUMP_DROP_LESSONS };
}
