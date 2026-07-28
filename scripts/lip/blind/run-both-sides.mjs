/**
 * SYNOPSIS: Both-sides blind: UP trail long + DOWN first-drop short.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Both-sides blind: UP trail long + DOWN first-drop short.
 * Modes: public trail (no future) vs early-info trail (VIP ceiling).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createFeeder } from './feeder.mjs';
import { createBothSidesReader, BOTH_SIDES_LESSONS } from './reader-both-sides.mjs';
import { createLessonsV3Reader } from './reader-lessons-v3.mjs';
import { createReader } from './reader.mjs';
import { buildSegmentGTimeline } from './fetch-segment-g.mjs';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

function loadTimeline(name) {
  const p = path.join(LIP_DATA, name);
  if (!fs.existsSync(p)) return null;
  return fs
    .readFileSync(p, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function runBoth(timeline, label, opts = {}) {
  const feeder = createFeeder(timeline);
  const reader = createBothSidesReader({ startingCash: 10000, ...opts });
  if (opts.earlyInfoMode) reader.preloadShouts(timeline);
  let longs = 0;
  let shorts = 0;
  let ev;
  while ((ev = feeder.next())) {
    const r = reader.onEvent(ev);
    if (r?.action === 'enter_long') longs += 1;
    if (r?.action === 'enter_short') shorts += 1;
  }
  const snap = reader.snapshot();
  return {
    label,
    enters_long: longs,
    enters_short: shorts,
    net_return_pct: snap.net_return_pct,
    win_rate: snap.win_rate,
    long_trades: snap.long_trades,
    short_trades: snap.short_trades,
    long_wr: snap.long_wr,
    short_wr: snap.short_wr,
    approx_up_pnl_usd: snap.approx_up_pnl_usd,
    approx_down_pnl_usd: snap.approx_down_pnl_usd,
    paths: snap.paths,
    reasons: snap.reasons,
    sample: snap.closed.slice(0, 8),
  };
}

function runShortOnly(timeline) {
  const feeder = createFeeder(timeline);
  const reader = createLessonsV3Reader({ startingCash: 10000 });
  let ev;
  while ((ev = feeder.next())) reader.onEvent(ev);
  const s = reader.snapshot();
  return { net_return_pct: s.net_return_pct, trades: s.closed_trades, wr: s.win_rate };
}

function runLateLong(timeline) {
  const feeder = createFeeder(timeline);
  const reader = createReader({
    lessonsMode: true,
    allowTapeOnly: false,
    postWindowMins: 3,
    maxHoldMins: 12,
    startingCash: 10000,
  });
  let ev;
  while ((ev = feeder.next())) reader.onEvent(ev);
  const s = reader.snapshot();
  return { net_return_pct: s.net_return_pct, trades: s.closed_trades, wr: s.win_rate };
}

async function main() {
  ensureLipDataDir();
  const force = process.argv.includes('--rebuild');
  let gTimeline = !force ? loadTimeline('blind_g_timeline.jsonl') : null;
  let gMeta = null;
  const gMetaPath = path.join(LIP_DATA, 'blind_g_meta.json');
  if (gTimeline && fs.existsSync(gMetaPath)) gMeta = JSON.parse(fs.readFileSync(gMetaPath, 'utf8'));
  if (!gTimeline || gTimeline.length < 50) {
    console.error('Building fresh Segment G (2021 Q2 unused pumps)...');
    const built = await buildSegmentGTimeline({ maxPumps: 30 });
    gTimeline = built.timeline;
    gMeta = built.meta;
  }

  const segments = [
    ['A', 'blind_timeline.jsonl', true],
    ['B', 'blind_b_timeline.jsonl', true],
    ['C', 'blind_c_timeline.jsonl', true],
    ['D', 'blind_d_timeline.jsonl', true],
    ['E', 'blind_e_timeline.jsonl', true],
    ['F', 'blind_f_timeline.jsonl', true],
    ['G', null, false],
  ];

  const scoreboard = [];
  const details = {};

  for (const [seg, file, replay] of segments) {
    const tl = seg === 'G' ? gTimeline : loadTimeline(file);
    if (!tl) {
      scoreboard.push({ segment: seg, error: 'missing' });
      continue;
    }
    const pub = runBoth(tl, `${seg}_public_both`, { earlyInfoMode: false });
    const early = runBoth(tl, `${seg}_early_info_both`, { earlyInfoMode: true });
    const shortOnly = runShortOnly(tl);
    const late = runLateLong(tl);
    scoreboard.push({
      segment: seg,
      replay,
      public_both_net_pct: pub.net_return_pct,
      public_longs: pub.long_trades,
      public_shorts: pub.short_trades,
      public_up_usd: pub.approx_up_pnl_usd,
      public_down_usd: pub.approx_down_pnl_usd,
      early_both_net_pct: early.net_return_pct,
      early_longs: early.long_trades,
      early_shorts: early.short_trades,
      early_up_usd: early.approx_up_pnl_usd,
      early_down_usd: early.approx_down_pnl_usd,
      short_only_net_pct: shortOnly.net_return_pct,
      late_long_net_pct: late.net_return_pct,
      public_green: pub.net_return_pct > 0,
      early_green: early.net_return_pct > 0,
    });
    details[seg] = { public: pub, early };
  }

  const tested = scoreboard.filter((r) => r.public_both_net_pct != null);
  const report = {
    at: new Date().toISOString(),
    thesis:
      'Make money both ways: UP on the success trail before the shout; DOWN by shorting the first drop after. Never buy late.',
    lessons: BOTH_SIDES_LESSONS,
    plain_map: {
      way_up:
        'Success trail = exploding volume + price drifting up before the public call. Sell when the shout hits (or trail/stop). Needs early eyes or a very strict tape wake.',
      way_down:
        'Failure of the long is the short’s edge: after the public shout, short the first down minute.',
      do_not:
        'Do not buy the public shout on the way up — that path loses.',
    },
    segment_g_meta: gMeta,
    scoreboard,
    segments_tested: tested.length,
    public_green: tested.filter((r) => r.public_green).length,
    early_green: tested.filter((r) => r.early_green).length,
    fresh_G: tested.find((r) => r.segment === 'G') || null,
    plain_english: { result: null },
    details,
  };

  const g = report.fresh_G;
  report.plain_english.result = g
    ? `Fresh G: public both ${g.public_both_net_pct}% (up≈$${g.public_up_usd}, down≈$${g.public_down_usd}); early-info both ${g.early_both_net_pct}%; short-only ${g.short_only_net_pct}%; late-long ${g.late_long_net_pct}%.`
    : 'No fresh G.';

  fs.writeFileSync(path.join(LIP_DATA, 'blind-sim-both-sides.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ...report,
        details: undefined,
        sample_G_public: details.G?.public?.sample,
        sample_G_early: details.G?.early?.sample,
        sample_F_early: details.F?.early?.sample,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
