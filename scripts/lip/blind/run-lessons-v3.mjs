/**
 * SYNOPSIS: Lessons v3 blind: never buy late / just short first drop. Replay A–E + fresh F.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Lessons v3 blind: never buy late / just short first drop. Replay A–E + fresh F.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createFeeder } from './feeder.mjs';
import { createLessonsV3Reader, LESSONS_V3 } from './reader-lessons-v3.mjs';
import { createPumpDropShortReader } from './reader-pump-drop-short.mjs';
import { createReader } from './reader.mjs';
import { buildSegmentFTimeline } from './fetch-segment-f.mjs';
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

function runV3(timeline, label) {
  const feeder = createFeeder(timeline);
  const reader = createLessonsV3Reader({ startingCash: 10000 });
  let ev;
  while ((ev = feeder.next())) reader.onEvent(ev);
  const snap = reader.snapshot();
  return {
    label,
    net_return_pct: snap.net_return_pct,
    win_rate: snap.win_rate,
    closed_trades: snap.closed_trades,
    long_trades: snap.long_trades,
    short_trades: snap.short_trades,
    pct_where_long_would_be_late: snap.pct_shorts_where_long_would_be_late,
    stats: snap.stats,
    reasons: snap.reasons,
    sample: snap.closed.slice(0, 6),
  };
}

function runPriorDrop(timeline) {
  const feeder = createFeeder(timeline);
  const reader = createPumpDropShortReader({ startingCash: 10000 });
  let ev;
  while ((ev = feeder.next())) reader.onEvent(ev);
  const snap = reader.snapshot();
  return { net_return_pct: snap.net_return_pct, win_rate: snap.win_rate, closed_trades: snap.closed_trades };
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
  const snap = reader.snapshot();
  return { net_return_pct: snap.net_return_pct, win_rate: snap.win_rate, closed_trades: snap.closed_trades };
}

async function main() {
  ensureLipDataDir();
  const force = process.argv.includes('--rebuild');

  let fTimeline = !force ? loadTimeline('blind_f_timeline.jsonl') : null;
  let fMeta = null;
  const fMetaPath = path.join(LIP_DATA, 'blind_f_meta.json');
  if (fTimeline && fs.existsSync(fMetaPath)) fMeta = JSON.parse(fs.readFileSync(fMetaPath, 'utf8'));
  if (!fTimeline || fTimeline.length < 50) {
    console.error('Building fresh Segment F (2021 Q1 unused pumps)...');
    const built = await buildSegmentFTimeline({ maxPumps: 30 });
    fTimeline = built.timeline;
    fMeta = built.meta;
  }

  const segments = [
    ['A', 'blind_timeline.jsonl', true],
    ['B', 'blind_b_timeline.jsonl', true],
    ['C', 'blind_c_timeline.jsonl', true],
    ['D', 'blind_d_timeline.jsonl', true],
    ['E', 'blind_e_timeline.jsonl', true],
    ['F', null, false],
  ];

  const scoreboard = [];
  const details = {};

  for (const [seg, file, replay] of segments) {
    const tl = seg === 'F' ? fTimeline : loadTimeline(file);
    if (!tl) {
      scoreboard.push({ segment: seg, error: 'missing' });
      continue;
    }
    const v3 = runV3(tl, `${seg}_lessons_v3`);
    const prior = runPriorDrop(tl);
    const late = runLateLong(tl);
    scoreboard.push({
      segment: seg,
      replay,
      v3_net_pct: v3.net_return_pct,
      v3_wr: v3.win_rate,
      v3_trades: v3.closed_trades,
      v3_longs: v3.long_trades,
      pct_late_for_long: v3.pct_where_long_would_be_late,
      prior_drop_net_pct: prior.net_return_pct,
      late_long_net_pct: late.net_return_pct,
      green: v3.net_return_pct > 0,
      beat_late_long: v3.net_return_pct > late.net_return_pct,
      never_bought: v3.long_trades === 0,
    });
    details[seg] = v3;
  }

  const tested = scoreboard.filter((r) => r.v3_net_pct != null);
  const green = tested.filter((r) => r.green).length;
  const fresh = tested.filter((r) => !r.replay);

  const report = {
    at: new Date().toISOString(),
    thesis: 'Too late on the way up → do not buy. Just short the first drop after the public pump shout.',
    lessons: LESSONS_V3,
    segment_f_meta: fMeta,
    scoreboard,
    segments_green: green,
    segments_tested: tested.length,
    fresh_segment_F_net_pct: fresh[0]?.v3_net_pct ?? null,
    all_green: green === tested.length && tested.length > 0,
    never_bought_any_long: tested.every((r) => r.never_bought),
    plain_english: {
      did_we_buy_on_the_way_up_if_late: 'No. Lessons v3 never opens a long after the public shout.',
      are_we_just_shorting: 'Yes. Short-only: arm at shout, enter on first down minute.',
      lessons_in_one_line:
        'Public shout is too late to buy; buying loses; shorting the first drop won small and consistent on labeled history.',
      result: null,
    },
    details,
  };

  const fNet = report.fresh_segment_F_net_pct;
  if (report.all_green) {
    report.plain_english.result = `Won again: v3 green on ${green}/${tested.length} (incl. fresh F ${fNet}% ). Zero longs taken.`;
  } else if (green >= Math.ceil(tested.length * 0.6)) {
    report.plain_english.result = `Mostly won: ${green}/${tested.length} green. Fresh F: ${fNet}%. Still never bought late.`;
  } else {
    report.plain_english.result = `Not clean: only ${green}/${tested.length} green. Fresh F: ${fNet}%.`;
  }

  fs.writeFileSync(path.join(LIP_DATA, 'blind-sim-lessons-v3.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ...report,
        details: undefined,
        sample_F: details.F?.sample,
        sample_E: details.E?.sample,
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
