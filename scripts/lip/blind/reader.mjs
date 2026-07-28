/**
 * SYNOPSIS: Reader v2 — ALL Limitless lessons applied (blind, costs, early exit, post window)
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Reader v2 — ALL Limitless lessons applied (blind, costs, early exit, post window)
 *
 * Lessons baked in:
 * - Identify only (no organize)
 * - Costs on every round-trip
 * - Peak ~1.5–8 min → short time-stop; dump near tip
 * - Secure / core / trailing runner
 * - Enter early (≤ postWindowMins after real post); no naked far-from-post tape
 * - Obscure vs liquid swing buckets
 * - Disarm stale posts
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

const TRANCHE_FRAC = { secure: 0.35, core: 0.65, runner: 0.85 };

export const LESSONS = [
  'costs_on_every_trade',
  'peak_1p5_to_8_min_short_hold',
  'secure_core_trail_tranches',
  'enter_only_near_post_or_tight_tape',
  'no_naked_tape_hours_from_post',
  'disarm_stale_posts',
  'obscure_vs_liquid_swing',
  'scale_out_before_tip',
  'late_entry_kills_edge',
  'tg_labels_over_noisy_reddit',
  'reddit_must_look_pumpish_to_arm',
];

export function createReader(opts = {}) {
  const lookback = opts.lookback ?? 20;
  const volMult = opts.volMult ?? 3.5;
  const retThresh = opts.retThresh ?? 0.02;
  const cash = opts.startingCash ?? 10000;
  // Legacy Segment A opts: mode/usePosts map onto lessons flags
  const legacyTapeOnly = opts.mode === 'tape_only' || opts.usePosts === false;
  const postWindowMins = opts.postWindowMins ?? (legacyTapeOnly ? 30 : 3);
  const maxHoldMins = opts.maxHoldMins ?? (legacyTapeOnly ? 45 : 12);
  const allowTapeOnly =
    opts.allowTapeOnly === true || legacyTapeOnly || opts.mode === 'posts_and_tape';
  const lessonsMode =
    opts.lessonsMode === true || (opts.lessonsMode !== false && !legacyTapeOnly && opts.mode !== 'posts_and_tape');

  const books = new Map();
  /** symbol -> { ts, kind, text } */
  const armed = new Map();
  const open = [];
  const closed = [];
  let equity = cash;
  const cooldownUntil = new Map();

  function book(sym) {
    if (!books.has(sym)) books.set(sym, []);
    return books.get(sym);
  }

  function tryClose(pos, px, ts) {
    const mins = (ts - pos.entry_ts) / 60000;
    if (px > pos.peak) pos.peak = px;

    if (pos.tranche === 'runner') {
      const arm = pos.entry * (1 + pos.swing_est * 0.35);
      if (!pos.trail_armed && pos.peak >= arm) {
        pos.trail_armed = true;
        pos.trail_stop = pos.peak * 0.9;
      }
      if (pos.trail_armed) {
        pos.trail_stop = Math.max(pos.trail_stop, pos.peak * 0.9);
        if (px <= pos.trail_stop) return closePos(pos, px, ts, 'trail');
      }
    } else {
      const target = pos.entry * (1 + pos.swing_est * (TRANCHE_FRAC[pos.tranche] || 0.65));
      if (px >= target) return closePos(pos, px, ts, 'target');
    }

    if (px <= pos.entry * 0.9) return closePos(pos, px, ts, 'stop');
    if (mins >= maxHoldMins) return closePos(pos, px, ts, 'time');
    return false;
  }

  function closePos(pos, px, ts, reason) {
    const gross = (px - pos.entry) / pos.entry;
    const cost = rtCost(pos.obscure);
    const net = gross - cost;
    equity *= 1 + net * pos.size_frac;
    closed.push({
      symbol: pos.symbol,
      tranche: pos.tranche,
      entry: pos.entry,
      exit: px,
      entry_ts: pos.entry_ts,
      exit_ts: ts,
      gross_pnl_pct: Math.round(gross * 10000) / 10000,
      net_pnl_pct: Math.round(net * 10000) / 10000,
      cost_pct: cost,
      reason,
      via_post: pos.via_post,
      post_kind: pos.post_kind || null,
      mins_after_post: pos.mins_after_post ?? null,
    });
    return true;
  }

  function tapeStats(sym) {
    const bars = book(sym);
    if (bars.length < lookback + 2) return null;
    const cur = bars[bars.length - 1];
    const prev = bars.slice(-lookback - 1, -1);
    const avgVol = prev.reduce((s, b) => s + b.volume, 0) / lookback;
    const base = bars[bars.length - 2].close;
    const ret = base > 0 ? (cur.close - base) / base : 0;
    const vr = avgVol > 0 ? cur.volume / avgVol : 0;
    return { ret, vr, close: cur.close };
  }

  function looksPumpish(text) {
    return /\b(pump|moon|signal|binance|buy\s*now|target|group\s*call|100x|50x)\b/i.test(String(text || ''));
  }

  function onEvent(ev) {
    // Lesson: Sapienza/TG labeled posts are ground truth; Reddit is noisy —
    // only arm on TG `post`, or reddit/blog when text is pump-ish (still needs tape).
    if (ev.type === 'post') {
      armed.set(ev.symbol, {
        ts: ev.ts,
        kind: 'post',
        text: ev.text || '',
        source: ev.source || 'telegram',
      });
      return { action: 'arm_post', symbol: ev.symbol, kind: 'post' };
    }
    if (ev.type === 'reddit' || ev.type === 'blog') {
      if (!looksPumpish(ev.text) && !looksPumpish(ev.title)) {
        return { action: 'reddit_ignore_noise', symbol: ev.symbol };
      }
      const existing = armed.get(ev.symbol);
      // Prefer keeping a stronger TG arm; otherwise soft-arm from pumpish reddit
      if (!existing || existing.kind !== 'post') {
        armed.set(ev.symbol, {
          ts: ev.ts,
          kind: ev.type,
          text: ev.text || '',
          source: ev.source || ev.type,
        });
        return { action: 'arm_post', symbol: ev.symbol, kind: ev.type };
      }
      return { action: 'reddit_confirm', symbol: ev.symbol };
    }
    if (ev.type !== 'candle') return { action: 'ignore' };

    const bars = book(ev.symbol);
    bars.push({ close: ev.close, volume: ev.volume, ts: ev.ts });
    if (bars.length > 800) bars.splice(0, bars.length - 800);

    // Disarm stale posts (lesson)
    const arm = armed.get(ev.symbol);
    if (arm && (ev.ts - arm.ts) / 60000 > Math.max(postWindowMins, 8)) {
      armed.delete(ev.symbol);
    }

    for (let i = open.length - 1; i >= 0; i--) {
      if (open[i].symbol !== ev.symbol) continue;
      if (tryClose(open[i], ev.close, ev.ts)) open.splice(i, 1);
    }

    if ((cooldownUntil.get(ev.symbol) || 0) > ev.ts) return { action: 'cooldown' };
    if (open.some((p) => p.symbol === ev.symbol)) return { action: 'already_in' };

    const stats = tapeStats(ev.symbol);
    if (!stats) return { action: 'warmup' };

    const armNow = armed.get(ev.symbol);
    const minsAfterPost = armNow ? (ev.ts - armNow.ts) / 60000 : null;
    const inPostWindow = armNow && minsAfterPost >= 0 && minsAfterPost <= postWindowMins;
    const tapeHot = stats.vr >= volMult && stats.ret >= retThresh;

    let shouldEnter = false;
    let via_post = false;
    if (lessonsMode) {
      // Primary: armed by real post/reddit AND inside early window AND some tape confirmation
      if (inPostWindow && (tapeHot || stats.vr >= 2 || stats.ret >= 0.01)) {
        shouldEnter = true;
        via_post = true;
      } else if (allowTapeOnly && tapeHot && stats.vr >= volMult * 1.5) {
        shouldEnter = true;
      }
    } else if (tapeHot || (armNow && tapeHot)) {
      shouldEnter = true;
      via_post = !!armNow;
    }

    if (!shouldEnter) return { action: 'no_signal' };

    const obscure = via_post || stats.vr >= 4;
    const swing_est = obscure ? Math.max(0.25, Math.min(0.85, 0.35 + stats.ret * 2)) : Math.max(0.06, Math.min(0.2, 0.08 + stats.ret));

    for (const tranche of ['secure', 'core', 'runner']) {
      open.push({
        symbol: ev.symbol,
        tranche,
        entry: ev.close,
        entry_ts: ev.ts,
        peak: ev.close,
        swing_est,
        obscure,
        via_post,
        post_kind: armNow?.kind || null,
        mins_after_post: minsAfterPost,
        size_frac: 0.03,
        trail_armed: false,
        trail_stop: ev.close * 0.9,
      });
    }
    cooldownUntil.set(ev.symbol, ev.ts + 25 * 60000);
    armed.delete(ev.symbol);
    return { action: 'enter', symbol: ev.symbol, via_post, mins_after_post: minsAfterPost };
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
      trades_with_post_arm: closed.filter((c) => c.via_post).length,
      lessons: LESSONS,
      cost_model: { ...COST, obscure_rt_pct: rtCost(true), liquid_rt_pct: rtCost(false) },
      closed,
    };
  }

  return { onEvent, snapshot, LESSONS };
}
