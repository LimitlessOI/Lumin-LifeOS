/**
 * SYNOPSIS: Study real blind timelines: what preceded ups vs downs around Sapienza TG labels.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Study real blind timelines: what preceded ups vs downs around Sapienza TG labels.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIP_DATA } from '../lib/paths.mjs';

function loadTimeline(file) {
  const p = path.join(LIP_DATA, file);
  return fs
    .readFileSync(p, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function median(arr) {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

function pctile(arr, p) {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const i = Math.min(a.length - 1, Math.max(0, Math.floor((p / 100) * (a.length - 1))));
  return a[i];
}

function round(n, d = 4) {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * For one symbol around eventTs, build 1m series and relative metrics.
 */
function studyEvent(candlesBySym, symbol, eventTs, opts = {}) {
  const pre = opts.preMins ?? 60;
  const post = opts.postMins ?? 90;
  const bars = (candlesBySym.get(symbol) || []).filter(
    (c) => c.ts >= eventTs - pre * 60000 && c.ts <= eventTs + post * 60000
  );
  if (bars.length < 10) return null;

  // Anchor: last close at or before event
  let anchor = bars.find((b) => b.ts >= eventTs) || bars[Math.floor(bars.length / 2)];
  const before = bars.filter((b) => b.ts <= eventTs);
  if (before.length) anchor = before[before.length - 1];
  const p0 = anchor.close;
  if (!(p0 > 0)) return null;

  const baseline = bars.filter((b) => b.ts < eventTs - 5 * 60000 && b.ts >= eventTs - pre * 60000);
  const baseVol = baseline.length
    ? baseline.reduce((s, b) => s + b.volume, 0) / baseline.length
    : mean(bars.map((b) => b.volume)) || 1;

  const pathRel = bars.map((b) => ({
    mins: Math.round((b.ts - eventTs) / 60000),
    close: b.close,
    ret: (b.close - p0) / p0,
    vol_mult: baseVol > 0 ? b.volume / baseVol : 0,
    volume: b.volume,
  }));

  const after = pathRel.filter((p) => p.mins >= 0 && p.mins <= post);
  if (!after.length) return null;

  let peak = after[0];
  let trough = after[0];
  for (const p of after) {
    if (p.ret > peak.ret) peak = p;
    if (p.ret < trough.ret) trough = p;
  }

  const at = (m) => {
    const hit = pathRel.find((p) => p.mins === m);
    return hit ? hit.ret : null;
  };

  const volAt = (m) => {
    const hit = pathRel.find((p) => p.mins === m);
    return hit ? hit.vol_mult : null;
  };

  // Pre-pump: return T-30..T-1 and vol in last 5 min before
  const preRet = (() => {
    const early = pathRel.find((p) => p.mins === -30) || pathRel.find((p) => p.mins <= -20);
    const late = pathRel.find((p) => p.mins === -1) || pathRel.find((p) => p.mins < 0 && p.mins >= -3);
    if (!early || !late) return null;
    return (late.close - early.close) / early.close;
  })();

  const preVolSpike = mean(
    pathRel.filter((p) => p.mins >= -5 && p.mins < 0).map((p) => p.vol_mult)
  );

  const postVolSpike = mean(
    pathRel.filter((p) => p.mins >= 0 && p.mins <= 3).map((p) => p.vol_mult)
  );

  // Dump speed: max drawdown from peak within 30m after peak
  const afterPeak = after.filter((p) => p.mins >= peak.mins && p.mins <= peak.mins + 30);
  let dumpRet = 0;
  for (const p of afterPeak) {
    const dd = (p.close - peak.close) / peak.close;
    if (dd < dumpRet) dumpRet = dd;
  }

  // Was it actually a "pump"? peak >= +5% within 30m and peak within 20m
  const isPumpish = peak.ret >= 0.05 && peak.mins <= 20 && peak.mins >= 0;
  const isFade = peak.ret < 0.03; // never really ran
  const isDumpFirst = at(2) != null && at(2) < -0.03 && peak.ret < 0.05;

  return {
    symbol,
    event_ts: eventTs,
    bars: bars.length,
    peak_ret: peak.ret,
    peak_mins: peak.mins,
    trough_ret: trough.ret,
    trough_mins: trough.mins,
    dump_from_peak_30m: dumpRet,
    ret_m0: at(0),
    ret_m1: at(1),
    ret_m2: at(2),
    ret_m3: at(3),
    ret_m5: at(5),
    ret_m8: at(8),
    ret_m15: at(15),
    ret_m30: at(30),
    ret_m60: at(60),
    vol_m0: volAt(0),
    vol_m1: volAt(1),
    vol_m2: volAt(2),
    pre_ret_30m: preRet,
    pre_vol_mult_5m: preVolSpike,
    post_vol_mult_0_3m: postVolSpike,
    is_pumpish: isPumpish,
    is_fade: isFade,
    is_dump_first: isDumpFirst,
    path: pathRel.filter((p) => p.mins >= -15 && p.mins <= 45),
  };
}

function summarize(studies, label) {
  const ok = studies.filter(Boolean);
  const peaks = ok.map((s) => s.peak_ret);
  const peakMins = ok.map((s) => s.peak_mins);
  const dumps = ok.map((s) => s.dump_from_peak_30m);
  const pumpish = ok.filter((s) => s.is_pumpish);
  const fades = ok.filter((s) => s.is_fade);

  const entrySim = (delayMins, holdMins, cost = 0.0185) => {
    const pnls = [];
    for (const s of ok) {
      const entryRet = s[`ret_m${delayMins}`];
      // exit at min(peak after entry, hold) — approximate: use ret at delay+hold relative to p0, convert
      if (entryRet == null) continue;
      const exitAbs = s[`ret_m${delayMins + holdMins}`] ?? s.ret_m15 ?? s.ret_m8 ?? s.peak_ret;
      // both relative to p0; trade pnl = (1+exit)/(1+entry) - 1
      const gross = (1 + exitAbs) / (1 + entryRet) - 1;
      pnls.push(gross - cost);
    }
    return {
      n: pnls.length,
      mean_net: round(mean(pnls), 4),
      median_net: round(median(pnls), 4),
      win_rate: round(pnls.filter((x) => x > 0).length / (pnls.length || 1), 3),
      p25: round(pctile(pnls, 25), 4),
      p75: round(pctile(pnls, 75), 4),
    };
  };

  // Better exit: enter at delay, exit at peak if peak after entry else time stop
  const entryToPeak = (delayMins, cost = 0.0185) => {
    const pnls = [];
    for (const s of ok) {
      const entryRet = s[`ret_m${delayMins}`];
      if (entryRet == null) continue;
      if (s.peak_mins < delayMins) {
        // already peaked — late
        const exitAbs = s[`ret_m${delayMins + 5}`] ?? s.ret_m8 ?? entryRet;
        const gross = (1 + exitAbs) / (1 + entryRet) - 1;
        pnls.push(gross - cost);
        continue;
      }
      const peakAbs = s.peak_ret;
      const gross = (1 + peakAbs) / (1 + entryRet) - 1;
      // can't exit exactly at peak; take 70% of move (secure/core style)
      const capture = gross * 0.65;
      pnls.push(capture - cost);
    }
    return {
      n: pnls.length,
      mean_net: round(mean(pnls), 4),
      median_net: round(median(pnls), 4),
      win_rate: round(pnls.filter((x) => x > 0).length / (pnls.length || 1), 3),
    };
  };

  // Indicators: compare pumpish vs fade on pre signals
  const ind = (sel) => ({
    n: sel.length,
    median_pre_ret: round(median(sel.map((s) => s.pre_ret_30m).filter((x) => x != null)), 4),
    median_pre_vol: round(median(sel.map((s) => s.pre_vol_mult_5m).filter((x) => x != null)), 2),
    median_post_vol: round(median(sel.map((s) => s.post_vol_mult_0_3m).filter((x) => x != null)), 2),
    median_peak: round(median(sel.map((s) => s.peak_ret)), 4),
    median_peak_mins: round(median(sel.map((s) => s.peak_mins)), 1),
    median_dump: round(median(sel.map((s) => s.dump_from_peak_30m)), 4),
  });

  // Average path for chart
  const mins = [];
  for (let m = -15; m <= 45; m++) mins.push(m);
  const avgPath = mins.map((m) => {
    const rets = ok.map((s) => s.path.find((p) => p.mins === m)?.ret).filter((x) => x != null);
    const vols = ok.map((s) => s.path.find((p) => p.mins === m)?.vol_mult).filter((x) => x != null);
    return {
      mins: m,
      mean_ret: round(mean(rets), 4),
      median_ret: round(median(rets), 4),
      mean_vol_mult: round(mean(vols), 2),
      n: rets.length,
    };
  });

  return {
    label,
    events_studied: ok.length,
    pumpish_pct: round(pumpish.length / ok.length, 3),
    fade_pct: round(fades.length / ok.length, 3),
    peak_ret: {
      mean: round(mean(peaks), 4),
      median: round(median(peaks), 4),
      p25: round(pctile(peaks, 25), 4),
      p75: round(pctile(peaks, 75), 4),
      p90: round(pctile(peaks, 90), 4),
    },
    peak_mins: {
      mean: round(mean(peakMins), 2),
      median: round(median(peakMins), 1),
      p25: round(pctile(peakMins, 25), 1),
      p75: round(pctile(peakMins, 75), 1),
    },
    dump_from_peak_30m: {
      mean: round(mean(dumps), 4),
      median: round(median(dumps), 4),
    },
    indicators: {
      all: ind(ok),
      pumpish: ind(pumpish),
      fade: ind(fades),
    },
    entry_hold_net_cost1p85: {
      enter_0_hold_5: entrySim(0, 5),
      enter_1_hold_5: entrySim(1, 5),
      enter_2_hold_5: entrySim(2, 5),
      enter_3_hold_5: entrySim(3, 5),
      enter_5_hold_5: entrySim(5, 5),
      enter_0_hold_8: entrySim(0, 8),
      enter_1_hold_8: entrySim(1, 8),
      enter_2_hold_8: entrySim(2, 8),
    },
    entry_capture65_of_peak_net: {
      enter_0: entryToPeak(0),
      enter_1: entryToPeak(1),
      enter_2: entryToPeak(2),
      enter_3: entryToPeak(3),
      enter_5: entryToPeak(5),
    },
    avg_path: avgPath,
    top_runners: [...ok]
      .sort((a, b) => b.peak_ret - a.peak_ret)
      .slice(0, 8)
      .map((s) => ({
        symbol: s.symbol,
        peak_ret: round(s.peak_ret, 4),
        peak_mins: s.peak_mins,
        dump: round(s.dump_from_peak_30m, 4),
        pre_vol: round(s.pre_vol_mult_5m, 2),
        post_vol: round(s.post_vol_mult_0_3m, 2),
        pre_ret: round(s.pre_ret_30m, 4),
      })),
    worst_fades: [...ok]
      .sort((a, b) => a.peak_ret - b.peak_ret)
      .slice(0, 8)
      .map((s) => ({
        symbol: s.symbol,
        peak_ret: round(s.peak_ret, 4),
        peak_mins: s.peak_mins,
        dump: round(s.dump_from_peak_30m, 4),
        pre_vol: round(s.pre_vol_mult_5m, 2),
        post_vol: round(s.post_vol_mult_0_3m, 2),
      })),
  };
}

function indexCandles(timeline) {
  const map = new Map();
  for (const ev of timeline) {
    if (ev.type !== 'candle') continue;
    if (!map.has(ev.symbol)) map.set(ev.symbol, []);
    map.get(ev.symbol).push(ev);
  }
  for (const [, arr] of map) arr.sort((a, b) => a.ts - b.ts);
  return map;
}

function studyFile(timelineFile, label) {
  const timeline = loadTimeline(timelineFile);
  const candles = indexCandles(timeline);
  const posts = timeline.filter((e) => e.type === 'post');
  // unique symbol+ts
  const seen = new Set();
  const studies = [];
  for (const p of posts) {
    const k = `${p.symbol}|${p.ts}`;
    if (seen.has(k)) continue;
    seen.add(k);
    studies.push(studyEvent(candles, p.symbol, p.ts));
  }
  return summarize(studies.filter(Boolean), label);
}

function main() {
  const a = studyFile('blind_timeline.jsonl', 'segment_A_2019');
  const b = studyFile('blind_b_timeline.jsonl', 'segment_B_2020');

  // Combined unique events
  const timelineA = loadTimeline('blind_timeline.jsonl');
  const timelineB = loadTimeline('blind_b_timeline.jsonl');
  const candles = indexCandles([...timelineA, ...timelineB]);
  const posts = [...timelineA, ...timelineB].filter((e) => e.type === 'post');
  const seen = new Set();
  const studies = [];
  for (const p of posts) {
    const k = `${p.symbol}|${p.ts}`;
    if (seen.has(k)) continue;
    seen.add(k);
    studies.push(studyEvent(candles, p.symbol, p.ts));
  }
  const combined = summarize(studies.filter(Boolean), 'combined_A_plus_B');

  // Pattern rules scored on combined
  const ok = studies.filter(Boolean);
  const rules = [
    {
      name: 'post_vol_ge_3x_and_peak_within_8m',
      test: (s) => (s.post_vol_mult_0_3m || 0) >= 3 && s.peak_mins <= 8 && s.peak_ret >= 0.05,
    },
    {
      name: 'pre_vol_ge_2x_accumulation',
      test: (s) => (s.pre_vol_mult_5m || 0) >= 2,
    },
    {
      name: 'pre_drift_up_ge_3pct',
      test: (s) => (s.pre_ret_30m || 0) >= 0.03,
    },
    {
      name: 'no_pre_drift_flat_then_spike',
      test: (s) => Math.abs(s.pre_ret_30m || 0) < 0.02 && (s.post_vol_mult_0_3m || 0) >= 4,
    },
    {
      name: 'already_up_5pct_by_m1',
      test: (s) => (s.ret_m1 || 0) >= 0.05,
    },
    {
      name: 'dead_on_arrival_down_by_m2',
      test: (s) => (s.ret_m2 || 0) <= -0.03,
    },
  ];

  const ruleStats = rules.map((r) => {
    const hit = ok.filter(r.test);
    const miss = ok.filter((s) => !r.test(s));
    return {
      rule: r.name,
      hit_n: hit.length,
      hit_rate: round(hit.length / ok.length, 3),
      hit_median_peak: round(median(hit.map((s) => s.peak_ret)), 4),
      miss_median_peak: round(median(miss.map((s) => s.peak_ret)), 4),
      hit_median_peak_mins: round(median(hit.map((s) => s.peak_mins)), 1),
      hit_median_dump: round(median(hit.map((s) => s.dump_from_peak_30m)), 4),
    };
  });

  const report = {
    at: new Date().toISOString(),
    source:
      'Real Binance Vision 1m + Sapienza Telegram pump timestamps (Segments A & B). Not synthetic.',
    honesty:
      'These are labeled TG pump announcements — not all market ups. Past patterns may decay. Costs ~1.85% RT obscure assumed in entry sims.',
    segment_A: a,
    segment_B: b,
    combined,
    rule_stats: ruleStats,
  };

  const out = path.join(LIP_DATA, 'pattern-study-real.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  // slim console
  const slim = {
    at: report.at,
    combined: {
      events: combined.events_studied,
      pumpish_pct: combined.pumpish_pct,
      fade_pct: combined.fade_pct,
      peak_ret: combined.peak_ret,
      peak_mins: combined.peak_mins,
      dump: combined.dump_from_peak_30m,
      indicators: combined.indicators,
      entry_hold: combined.entry_hold_net_cost1p85,
      entry_capture65: combined.entry_capture65_of_peak_net,
    },
    rule_stats: ruleStats,
    top_runners: combined.top_runners,
    worst_fades: combined.worst_fades,
    avg_path_sample: combined.avg_path.filter((p) => [-10, -5, -1, 0, 1, 2, 3, 5, 8, 15, 30].includes(p.mins)),
  };
  console.log(JSON.stringify(slim, null, 2));
  console.error(`Wrote ${out}`);
}

main();
