/**
 * SYNOPSIS: Both-sides reader — money on the way UP and the way DOWN.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Both-sides reader — money on the way UP and the way DOWN.
 *
 * Success trails:
 *   UP   = volume wake + price drift BEFORE the public shout → long → sell at shout / tip
 *   DOWN = public shout (usually late) → short first drop
 *
 * Failure trails (avoid):
 *   UP fail  = buy at/after shout when already ran
 *   DOWN fail = short into a still-mooning squeeze; spray false vol wakes days away
 */
const COST = {
  taker_fee_one_way: 0.001,
  slip_obscure_one_way: 0.008,
  transfer_drag_per_trade: 0.0005,
};

function rtCost() {
  return 2 * (COST.taker_fee_one_way + COST.slip_obscure_one_way) + COST.transfer_drag_per_trade;
}

export const BOTH_SIDES_LESSONS = [
  'up_money_is_before_public_shout',
  'down_money_is_after_shout_on_first_drop',
  'never_buy_late_on_way_up',
  'trail_needs_extreme_accelerating_volume',
  'sell_long_into_shout_or_first_crack',
  'abort_long_red_by_m2',
  'abort_short_if_still_mooning',
  'one_shot_per_side_per_symbol_window',
  'costs_on',
];

export function createBothSidesReader(opts = {}) {
  const cash = opts.startingCash ?? 10000;
  // UP path
  const volWake = opts.volWake ?? 40;
  const drift15 = opts.drift15 ?? 0.03;
  const drift5 = opts.drift5 ?? 0.01;
  const alreadyRanSkip = opts.alreadyRanSkip ?? 0.12;
  const longSize = opts.longSize ?? 0.05;
  const longHoldMins = opts.longHoldMins ?? 20;
  // early-info mode: if true, also arm long when shout is ≤ earlyMins away AND trail present
  // (simulates VIP/early channel — labeled KNOW ceiling, not public scan)
  const earlyInfoMode = opts.earlyInfoMode ?? false;
  const earlyMins = opts.earlyMins ?? 12;
  // DOWN path
  const shortSize = opts.shortSize ?? 0.08;
  const shortHoldMins = opts.shortHoldMins ?? 12;
  const downFrac = opts.downFrac ?? 0.997;
  const squeezeAbort = opts.squeezeAbort ?? 0.12;
  const lateRan = opts.lateRan ?? 0.02;

  const books = new Map();
  const open = [];
  const closed = [];
  let equity = cash;
  const shoutTimes = new Map(); // symbol -> [ts...]
  const pendingShort = new Map();
  const longCooldown = new Map();
  const shortCooldown = new Map();
  const longDoneSym = new Set();
  const shortDoneKey = new Set();

  function book(sym) {
    if (!books.has(sym)) books.set(sym, []);
    return books.get(sym);
  }

  function tape(sym) {
    const bars = book(sym);
    if (bars.length < 70) return null;
    const cur = bars[bars.length - 1];
    const baseline = bars.slice(-68, -8);
    const recent5 = bars.slice(-5);
    const prev5 = bars.slice(-10, -5);
    const avgBase = baseline.reduce((s, b) => s + b.volume, 0) / baseline.length;
    const avg5 = recent5.reduce((s, b) => s + b.volume, 0) / recent5.length;
    const avgPrev5 = prev5.reduce((s, b) => s + b.volume, 0) / prev5.length;
    const volMult = avgBase > 0 ? avg5 / avgBase : 0;
    const volAccel = avgPrev5 > 0 ? avg5 / avgPrev5 : 0;
    const p15 = bars[bars.length - 16] || bars[0];
    const p5 = bars[bars.length - 6] || bars[0];
    const p30 = bars[bars.length - 31] || bars[0];
    return {
      close: cur.close,
      ts: cur.ts,
      volMult,
      volAccel,
      ret15: p15.close > 0 ? (cur.close - p15.close) / p15.close : 0,
      ret5: p5.close > 0 ? (cur.close - p5.close) / p5.close : 0,
      ret30: p30.close > 0 ? (cur.close - p30.close) / p30.close : 0,
    };
  }

  function minsToNextShout(sym, ts) {
    const list = shoutTimes.get(sym) || [];
    let best = null;
    for (const s of list) {
      const m = (s - ts) / 60000;
      if (m >= 0 && (best == null || m < best)) best = m;
    }
    return best;
  }

  function closePos(pos, px, ts, reason) {
    const move = (px - pos.entry) / pos.entry;
    const gross = pos.side === 'short' ? -move : move;
    const cost = rtCost();
    const net = gross - cost;
    equity *= 1 + net * pos.size_frac;
    closed.push({
      symbol: pos.symbol,
      side: pos.side,
      path: pos.path,
      entry: pos.entry,
      exit: px,
      entry_ts: pos.entry_ts,
      exit_ts: ts,
      size_frac: pos.size_frac,
      gross_pnl_pct: Math.round(gross * 10000) / 10000,
      net_pnl_pct: Math.round(net * 10000) / 10000,
      reason,
      mins_held: Math.round((ts - pos.entry_ts) / 60000),
    });
  }

  function tryClose(pos, px, ts, shoutHit) {
    const mins = (ts - pos.entry_ts) / 60000;
    if (px > pos.peak) pos.peak = px;
    if (px < pos.trough) pos.trough = px;

    if (pos.side === 'long') {
      // Success: sell into the public shout
      if (shoutHit) {
        closePos(pos, px, ts, 'sell_into_shout');
        return true;
      }
      if (mins >= 2 && px < pos.entry * 0.985) {
        closePos(pos, px, ts, 'long_m2_abort');
        return true;
      }
      if (px >= pos.entry * 1.08) {
        closePos(pos, px, ts, 'long_target');
        return true;
      }
      if (pos.peak >= pos.entry * 1.04 && px <= pos.peak * 0.96) {
        closePos(pos, px, ts, 'long_trail');
        return true;
      }
      if (px <= pos.entry * 0.94) {
        closePos(pos, px, ts, 'long_stop');
        return true;
      }
      if (mins >= 8 && px < pos.entry * 1.015) {
        closePos(pos, px, ts, 'long_failfast');
        return true;
      }
      if (mins >= longHoldMins) {
        closePos(pos, px, ts, 'long_time');
        return true;
      }
      return false;
    }

    // short
    if (px <= pos.entry * 0.945) {
      closePos(pos, px, ts, 'short_target');
      return true;
    }
    const stop = pos.wide_stop ? 1.08 : 1.06;
    if (px >= pos.entry * stop) {
      closePos(pos, px, ts, 'short_stop');
      return true;
    }
    if (pos.trough <= pos.entry * 0.97 && px >= pos.trough * 1.025) {
      closePos(pos, px, ts, 'short_trail');
      return true;
    }
    if (mins >= shortHoldMins) {
      closePos(pos, px, ts, 'short_time');
      return true;
    }
    return false;
  }

  function tryOpenLong(sym, st, path) {
    if (open.some((p) => p.symbol === sym)) return null;
    if (longDoneSym.has(sym)) return null;
    if ((longCooldown.get(sym) || 0) > st.ts) return null;
    // Failure trail: never buy if already ran hard
    if (st.ret30 >= alreadyRanSkip) return { action: 'skip_long_already_ran' };
    open.push({
      symbol: sym,
      side: 'long',
      path,
      entry: st.close,
      entry_ts: st.ts,
      peak: st.close,
      trough: st.close,
      size_frac: longSize,
    });
    longDoneSym.add(sym);
    longCooldown.set(sym, st.ts + 6 * 3600 * 1000);
    return { action: 'enter_long', path, vol: st.volMult, ret15: st.ret15 };
  }

  function trailOk(st) {
    return (
      st.volMult >= volWake &&
      st.volAccel >= 1.25 &&
      st.ret15 >= drift15 &&
      st.ret5 >= drift5 &&
      st.ret30 < alreadyRanSkip
    );
  }

  function armShort(sym, shoutTs, st) {
    const key = `${sym}|${shoutTs}`;
    if (shortDoneKey.has(key)) return { action: 'short_already' };
    shortDoneKey.add(key);
    // If we are long, tryClose will sell into shout first
    pendingShort.set(sym, {
      shoutTs,
      refPx: st?.close ?? null,
      ret30: st?.ret30 ?? 0,
      wide_stop: (st?.ret30 ?? 0) >= 0.15,
      late: (st?.ret30 ?? 0) >= lateRan || st == null,
    });
    return {
      action: 'short_armed',
      late_for_long: (st?.ret30 ?? 0) >= lateRan,
      // FAILURE: we explicitly refuse late long
      would_buy_late: false,
    };
  }

  function maybeConfirmShort(sym, ev) {
    const pend = pendingShort.get(sym);
    if (!pend) return null;
    if (open.some((p) => p.symbol === sym)) return { action: 'wait_flat' };
    if ((shortCooldown.get(sym) || 0) > ev.ts) {
      pendingShort.delete(sym);
      return { action: 'short_cooldown' };
    }
    const bars = book(sym);
    if (bars.length < 2) return null;
    const cur = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    const mins = (ev.ts - pend.shoutTs) / 60000;
    if (mins > 20) {
      pendingShort.delete(sym);
      return { action: 'short_expired' };
    }
    if (pend.refPx != null && cur.close > pend.refPx * (1 + squeezeAbort)) {
      pendingShort.delete(sym);
      return { action: 'abort_short_moon' };
    }
    if (!(cur.close < prev.close * downFrac)) return { action: 'waiting_drop' };
    pendingShort.delete(sym);
    open.push({
      symbol: sym,
      side: 'short',
      path: 'down_first_drop',
      entry: cur.close,
      entry_ts: cur.ts,
      peak: cur.close,
      trough: cur.close,
      size_frac: shortSize,
      wide_stop: pend.wide_stop,
      shout_ts: pend.shoutTs,
    });
    shortCooldown.set(sym, ev.ts + 45 * 60000);
    return { action: 'enter_short', path: 'down_first_drop' };
  }

  function preloadShouts(timeline) {
    for (const ev of timeline) {
      if (ev.type !== 'post') continue;
      if (!shoutTimes.has(ev.symbol)) shoutTimes.set(ev.symbol, []);
      shoutTimes.get(ev.symbol).push(ev.ts);
    }
  }

  function onEvent(ev) {
    if (ev.type === 'post') {
      if (!shoutTimes.has(ev.symbol)) shoutTimes.set(ev.symbol, []);
      // may already be preloaded for early-info mode
      if (!shoutTimes.get(ev.symbol).includes(ev.ts)) shoutTimes.get(ev.symbol).push(ev.ts);

      const st = tape(ev.symbol);
      // Close any long into the shout (UP success exit)
      for (let i = open.length - 1; i >= 0; i--) {
        if (open[i].symbol === ev.symbol && open[i].side === 'long') {
          tryClose(open[i], st?.close ?? open[i].entry, ev.ts, true);
          open.splice(i, 1);
        }
      }
      return armShort(ev.symbol, ev.ts, st);
    }

    if (ev.type !== 'candle') return { action: 'ignore' };

    const bars = book(ev.symbol);
    bars.push({ close: ev.close, volume: ev.volume, ts: ev.ts });
    if (bars.length > 3000) bars.splice(0, bars.length - 3000);

    const shoutHit = (shoutTimes.get(ev.symbol) || []).some((t) => Math.abs(t - ev.ts) < 60000);

    for (let i = open.length - 1; i >= 0; i--) {
      if (open[i].symbol !== ev.symbol) continue;
      if (tryClose(open[i], ev.close, ev.ts, shoutHit && open[i].side === 'long')) open.splice(i, 1);
    }

    const shortRes = maybeConfirmShort(ev.symbol, ev);
    if (shortRes?.action === 'enter_short') return shortRes;

    // UP path: trail before shout
    const st = tape(ev.symbol);
    if (!st) return shortRes || { action: 'scan' };
    if (open.some((p) => p.symbol === ev.symbol)) return shortRes || { action: 'in_pos' };

    const toShout = minsToNextShout(ev.symbol, ev.ts);
    // Don't open long if shout already passed recently without us selling (short path owns it)
    if (toShout === 0) return shortRes || { action: 'at_shout' };

    if (trailOk(st)) {
      // Public trail: only if shout not yet happened (toShout null OR > 0)
      // If we can see future shout in feeder data via shoutTimes that were already posted — only past shouts are known.
      // For true blind UP: enter on trail anytime no shout seen yet for this symbol in last 2h.
      const recentShout = (shoutTimes.get(ev.symbol) || []).some((t) => ev.ts - t >= 0 && ev.ts - t < 2 * 3600 * 1000);
      if (!recentShout) {
        // earlyInfoMode: only take trail if a shout is coming within earlyMins
        // (uses future labels — ceiling study). Public mode takes any strict trail.
        if (earlyInfoMode) {
          if (toShout != null && toShout > 0 && toShout <= earlyMins) {
            const r = tryOpenLong(ev.symbol, st, 'up_early_info_trail');
            if (r?.action === 'enter_long') return r;
          }
        } else {
          const r = tryOpenLong(ev.symbol, st, 'up_public_trail');
          if (r?.action === 'enter_long') return r;
        }
      }
    }

    return shortRes || { action: 'scan' };
  }

  function snapshot() {
    const wins = closed.filter((c) => c.net_pnl_pct > 0);
    const longs = closed.filter((c) => c.side === 'long');
    const shorts = closed.filter((c) => c.side === 'short');
    const sum = (arr) => arr.reduce((s, c) => s + c.net_pnl_pct, 0);
    const avg = (arr) => (arr.length ? sum(arr) / arr.length : null);
    const reasons = {};
    const paths = {};
    for (const c of closed) {
      reasons[c.reason] = (reasons[c.reason] || 0) + 1;
      paths[c.path] = (paths[c.path] || 0) + 1;
    }
    // Approximate contribution by path
    let eq = cash;
    const pathPnl = { up: 0, down: 0 };
    for (const c of closed) {
      const before = eq;
      eq *= 1 + c.net_pnl_pct * c.size_frac;
      const delta = eq - before;
      if (c.side === 'long') pathPnl.up += delta;
      else pathPnl.down += delta;
    }
    return {
      equity: Math.round(equity * 100) / 100,
      starting_cash: cash,
      net_return_pct: Math.round(((equity - cash) / cash) * 10000) / 100,
      closed_trades: closed.length,
      win_rate: closed.length ? Math.round((wins.length / closed.length) * 1000) / 1000 : 0,
      long_trades: longs.length,
      short_trades: shorts.length,
      long_wr: longs.length ? Math.round((longs.filter((c) => c.net_pnl_pct > 0).length / longs.length) * 1000) / 1000 : null,
      short_wr: shorts.length ? Math.round((shorts.filter((c) => c.net_pnl_pct > 0).length / shorts.length) * 1000) / 1000 : null,
      long_avg_net: longs.length ? Math.round(avg(longs) * 10000) / 10000 : null,
      short_avg_net: shorts.length ? Math.round(avg(shorts) * 10000) / 10000 : null,
      approx_up_pnl_usd: Math.round(pathPnl.up * 100) / 100,
      approx_down_pnl_usd: Math.round(pathPnl.down * 100) / 100,
      reasons,
      paths,
      lessons: BOTH_SIDES_LESSONS,
      closed,
    };
  }

  return { onEvent, snapshot, preloadShouts, BOTH_SIDES_LESSONS };
}
