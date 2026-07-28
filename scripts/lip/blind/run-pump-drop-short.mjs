/**
 * SYNOPSIS: Blind test: pump shout → short on first drop. Segments A–E + late-long control.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Blind test: pump shout → short on first drop. Segments A–E + late-long control.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createFeeder } from './feeder.mjs';
import { createPumpDropShortReader } from './reader-pump-drop-short.mjs';
import { createReader } from './reader.mjs';
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

function runPumpDrop(timeline, label, opts = {}) {
  const feeder = createFeeder(timeline);
  const reader = createPumpDropShortReader({ startingCash: 10000, ...opts });
  let enters = 0;
  let aborts = 0;
  let expired = 0;
  let ev;
  while ((ev = feeder.next())) {
    const r = reader.onEvent(ev);
    if (r?.action === 'enter_short') enters += 1;
    if (r?.action === 'abort_still_pumping') aborts += 1;
    if (r?.action === 'arm_expired') expired += 1;
  }
  const snap = reader.snapshot();
  return {
    label,
    enters,
    aborts_still_pumping: aborts,
    arms_expired: expired,
    net_return_pct: snap.net_return_pct,
    win_rate: snap.win_rate,
    closed_trades: snap.closed_trades,
    avg_mins_after_shout: snap.avg_mins_after_shout,
    reasons: snap.reasons,
    sample: snap.closed.slice(0, 8),
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
  return {
    label,
    enters,
    net_return_pct: snap.net_return_pct,
    win_rate: snap.win_rate,
    closed_trades: snap.closed_trades,
  };
}

async function main() {
  ensureLipDataDir();
  const segments = [
    ['A', 'blind_timeline.jsonl'],
    ['B', 'blind_b_timeline.jsonl'],
    ['C', 'blind_c_timeline.jsonl'],
    ['D', 'blind_d_timeline.jsonl'],
    ['E', 'blind_e_timeline.jsonl'],
  ];

  const scoreboard = [];
  const details = {};

  for (const [seg, file] of segments) {
    const tl = loadTimeline(file);
    if (!tl) {
      scoreboard.push({ segment: seg, error: 'missing_timeline' });
      continue;
    }
    const drop = runPumpDrop(tl, `${seg}_first_drop_short`);
    const atShout = runPumpDrop(tl, `${seg}_short_at_shout`, { shortAtShout: true });
    const late = runLateLong(tl, `${seg}_late_long`);
    scoreboard.push({
      segment: seg,
      first_drop_short_net_pct: drop.net_return_pct,
      first_drop_wr: drop.win_rate,
      first_drop_trades: drop.closed_trades,
      first_drop_avg_lag_mins: drop.avg_mins_after_shout,
      short_at_shout_net_pct: atShout.net_return_pct,
      short_at_shout_wr: atShout.win_rate,
      late_long_net_pct: late.net_return_pct,
      late_long_wr: late.win_rate,
      beat_late_long: drop.net_return_pct > late.net_return_pct,
      green: drop.net_return_pct > 0,
    });
    details[seg] = { first_drop: drop, short_at_shout: atShout, late_long: late };
  }

  const tested = scoreboard.filter((r) => r.first_drop_short_net_pct != null);
  const green = tested.filter((r) => r.green).length;
  const report = {
    at: new Date().toISOString(),
    thesis:
      'If a pump is underway (public shout), short as soon as the first down minute prints — do not buy the pump.',
    fence: 'Pattern identification only. Never organize or coordinate a pump.',
    rule: {
      arm: 'public pump shout',
      enter: 'first 1m candle close < prior close × 0.997',
      exit: '≈5.5% down target / ≈6% up stop / 12m time / trail',
      size: '8% of equity per trade',
      costs: 'on',
    },
    scoreboard,
    segments_green: green,
    segments_tested: tested.length,
    all_green: green === tested.length && tested.length > 0,
    beats_late_long_everywhere: tested.every((r) => r.beat_late_long),
    plain_english: {
      question: 'What if the pump is on — short the first drop?',
      answer: null,
    },
    details,
  };

  if (!tested.length) {
    report.plain_english.answer = 'No timelines found — cannot judge.';
  } else if (report.all_green) {
    report.plain_english.answer = `Yes on these labeled slices: first-drop short was green on ${green}/${tested.length} segments and beat buying the shout.`;
  } else if (green >= Math.ceil(tested.length * 0.6)) {
    report.plain_english.answer = `Mostly: green on ${green}/${tested.length}. Better than late longs where noted — refine stops if a red segment exists.`;
  } else {
    report.plain_english.answer = `Not clean enough: only ${green}/${tested.length} green. First-drop short helped vs late longs in places but is not a sure win yet.`;
  }

  const out = path.join(LIP_DATA, 'blind-sim-pump-drop-short.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ...report,
        details: undefined,
        sample_A: details.A?.first_drop?.sample,
        sample_E: details.E?.first_drop?.sample,
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
