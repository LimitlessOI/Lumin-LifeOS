/**
 * SYNOPSIS: Solve loop: fade-primary reader on Segment E + replay prior segments.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Solve loop: fade-primary reader on Segment E + replay prior segments.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createFeeder } from './feeder.mjs';
import { createSolveReader, SOLVE_LESSONS } from './reader-solve.mjs';
import { createReader } from './reader.mjs';
import { buildSegmentETimeline } from './fetch-segment-e.mjs';
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

function runSolve(timeline, label) {
  const feeder = createFeeder(timeline);
  const reader = createSolveReader({ startingCash: 10000 });
  let shorts = 0;
  let longs = 0;
  let ev;
  while ((ev = feeder.next())) {
    const r = reader.onEvent(ev);
    if (r?.action === 'enter_short') shorts += 1;
    if (r?.action === 'enter_long') longs += 1;
  }
  const snap = reader.snapshot();
  const reasons = {};
  const regimes = {};
  for (const c of snap.closed) {
    reasons[c.reason] = (reasons[c.reason] || 0) + 1;
    regimes[c.regime] = (regimes[c.regime] || 0) + 1;
  }
  return {
    label,
    enters_short: shorts,
    enters_long: longs,
    reasons,
    regimes,
    ...snap,
  };
}

function runLateLong(timeline, label) {
  const feeder = createFeeder(timeline);
  const reader = createReader({
    lessonsMode: true,
    allowTapeOnly: false,
    postWindowMins: 3,
    maxHoldMins: 12,
    startingCash: 10000,
  });
  let enters = 0;
  let ev;
  while ((ev = feeder.next())) {
    if (reader.onEvent(ev)?.action === 'enter') enters += 1;
  }
  const snap = reader.snapshot();
  return { label, enters, net_return_pct: snap.net_return_pct, closed_trades: snap.closed_trades, win_rate: snap.win_rate };
}

async function main() {
  ensureLipDataDir();
  const force = process.argv.includes('--rebuild');
  let eTimeline = !force ? loadTimeline('blind_e_timeline.jsonl') : null;
  let eMeta = null;
  const metaPath = path.join(LIP_DATA, 'blind_e_meta.json');
  if (eTimeline && fs.existsSync(metaPath)) eMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (!eTimeline || eTimeline.length < 50) {
    const built = await buildSegmentETimeline({ maxPumps: 30 });
    eTimeline = built.timeline;
    eMeta = built.meta;
  }

  const scoreboard = [];
  const eSolve = runSolve(eTimeline, 'E_solve_fade_primary');
  const eLate = runLateLong(eTimeline, 'E_late_long_control');
  scoreboard.push({
    segment: 'E',
    solve_net_pct: eSolve.net_return_pct,
    solve_wr: eSolve.win_rate,
    solve_trades: eSolve.closed_trades,
    short_wr: eSolve.short_win_rate,
    long_trades: eSolve.long_trades,
    late_long_net_pct: eLate.net_return_pct,
  });

  for (const [seg, file] of [
    ['A', 'blind_timeline.jsonl'],
    ['B', 'blind_b_timeline.jsonl'],
    ['C', 'blind_c_timeline.jsonl'],
    ['D', 'blind_d_timeline.jsonl'],
  ]) {
    const tl = loadTimeline(file);
    if (!tl) continue;
    const s = runSolve(tl, `${seg}_solve_replay`);
    scoreboard.push({
      segment: seg,
      solve_net_pct: s.net_return_pct,
      solve_wr: s.win_rate,
      solve_trades: s.closed_trades,
      short_wr: s.short_win_rate,
      long_trades: s.long_trades,
      replay: true,
    });
  }

  const profitable = scoreboard.filter((r) => r.solve_net_pct > 0).length;
  const report = {
    at: new Date().toISOString(),
    thesis:
      'Stop buying the shout. At shout time, read the last 30m: if already ran → short the dump; only rare flat+nuke gets a tiny long.',
    lessons: SOLVE_LESSONS,
    segment_e_meta: eMeta,
    scoreboard,
    segments_profitable: profitable,
    segments_tested: scoreboard.length,
    consistent_money: profitable >= Math.ceil(scoreboard.length * 0.75) && scoreboard.every((r) => r.solve_net_pct > -1),
    e_detail: {
      ...eSolve,
      closed: undefined,
      sample: eSolve.closed.slice(0, 12),
    },
    e_late_control: eLate,
    plain_english: {
      what_changed: 'We flipped the main trade: bet on the drop after the public shout, not the rise.',
      did_we_solve: null,
    },
  };

  report.plain_english.did_we_solve =
    report.consistent_money
      ? 'Mostly yes on these labeled slices — fade-primary was profitable across most segments.'
      : profitable >= 3
        ? 'Partly — fade wins often but not every segment. Keep refining stops/holds.'
        : 'Not yet — fade helped vs late longs but still not consistent profit.';

  fs.writeFileSync(path.join(LIP_DATA, 'blind-sim-solve.json'), JSON.stringify({ ...report, e_full: eSolve }, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
