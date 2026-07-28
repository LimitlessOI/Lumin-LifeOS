/**
 * SYNOPSIS: Blind partitioned sim: Feeder streams real data; Reader cannot see future.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Blind partitioned sim: Feeder streams real data; Reader cannot see future.
 * Costs applied on every round-trip.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFeeder } from './feeder.mjs';
import { createReader } from './reader.mjs';
import { buildRealTimeline } from './fetch-real.mjs';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

function runPartitioned(timeline, readerOpts, label) {
  const feeder = createFeeder(timeline);
  const reader = createReader(readerOpts);
  let enters = 0;
  let arms = 0;
  let ev;
  // Strict partition: reader only gets feeder.next() — never timeline array
  while ((ev = feeder.next())) {
    const r = reader.onEvent(ev);
    if (r?.action === 'enter') enters += 1;
    if (r?.action === 'arm_post') arms += 1;
  }
  const snap = reader.snapshot();
  return {
    label,
    feeder_events_consumed: feeder.total(),
    remaining_should_be_zero: feeder.remaining(),
    posts_armed: arms,
    enter_signals: enters,
    ...snap,
  };
}

async function main() {
  ensureLipDataDir();
  const { timeline, meta } = await buildRealTimeline({ maxPumps: 40 });

  if (timeline.length < 100) {
    console.log(JSON.stringify({ ok: false, error: 'insufficient_timeline', meta }, null, 2));
    process.exit(1);
  }

  const withPosts = runPartitioned(
    timeline,
    { mode: 'posts_and_tape', usePosts: true, startingCash: 10000 },
    'blind_real_posts_and_tape_net_costs'
  );
  const tapeOnly = runPartitioned(
    timeline,
    { mode: 'tape_only', usePosts: false, startingCash: 10000 },
    'blind_real_tape_only_net_costs'
  );

  const report = {
    at: new Date().toISOString(),
    partition: {
      feeder: 'scripts/lip/blind/feeder.mjs — chronological real ticks/posts only',
      reader: 'scripts/lip/blind/reader.mjs — no access to future timeline',
      data: 'Binance Vision 1m klines (real) + Sapienza Telegram pump timestamps (real posts)',
    },
    data_meta: meta,
    results: [withPosts, tapeOnly],
    honesty:
      'Blind walk-forward on historical real minutes. Post times are real labeled pump announcements. Costs included. Past ≠ future; sample is pumps we could still download USDT 1m for.',
  };

  // Strip huge closed arrays from console; keep in file
  fs.writeFileSync(path.join(LIP_DATA, 'blind-sim-report.json'), JSON.stringify(report, null, 2));
  const slim = {
    ...report,
    results: report.results.map(({ closed, ...r }) => ({
      ...r,
      closed_trades_count: closed?.length || r.closed_trades,
      sample_closed: (closed || []).slice(0, 5),
    })),
  };
  console.log(JSON.stringify(slim, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
