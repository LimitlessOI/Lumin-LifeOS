/**
 * SYNOPSIS: Blind Segment B + Reader v2 (all lessons) + costs
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Blind Segment B + Reader v2 (all lessons) + costs
 * Reuses cached timeline when present; optional Reddit enrich.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createFeeder } from './feeder.mjs';
import { createReader, LESSONS } from './reader.mjs';
import { buildSegmentBTimeline } from './fetch-segment-b.mjs';
import { enrichSegmentBWithReddit } from './enrich-reddit-b.mjs';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

function loadCachedTimeline() {
  const tlPath = path.join(LIP_DATA, 'blind_b_timeline.jsonl');
  const metaPath = path.join(LIP_DATA, 'blind_b_meta.json');
  if (!fs.existsSync(tlPath) || !fs.existsSync(metaPath)) return null;
  const timeline = fs
    .readFileSync(tlPath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  return { timeline, meta };
}

function run(timeline, opts, label) {
  const feeder = createFeeder(timeline);
  const reader = createReader(opts);
  let enters = 0;
  let arms = 0;
  let ev;
  while ((ev = feeder.next())) {
    const r = reader.onEvent(ev);
    if (r?.action === 'enter') enters += 1;
    if (r?.action === 'arm_post') arms += 1;
  }
  const snap = reader.snapshot();
  return {
    label,
    lessons_applied: LESSONS,
    feeder_events: feeder.total(),
    remaining: feeder.remaining(),
    arms,
    enters,
    ...snap,
  };
}

async function main() {
  ensureLipDataDir();
  const forceRebuild = process.argv.includes('--rebuild');
  const skipReddit = process.argv.includes('--skip-reddit');

  let packed = !forceRebuild ? loadCachedTimeline() : null;
  if (!packed || (packed.timeline?.length || 0) < 50) {
    packed = await buildSegmentBTimeline({ maxPumps: 28 });
  }

  if (!skipReddit) {
    try {
      const enriched = await enrichSegmentBWithReddit({});
      packed = loadCachedTimeline() || packed;
      packed.meta = { ...packed.meta, ...enriched.meta };
    } catch (e) {
      packed.meta = {
        ...packed.meta,
        reddit_enrich_error: String(e.message || e),
      };
    }
  }

  const { timeline, meta } = packed;
  if (timeline.length < 50) {
    console.log(JSON.stringify({ ok: false, error: 'thin_segment_b', meta }, null, 2));
    process.exit(1);
  }

  const v2 = run(
    timeline,
    {
      lessonsMode: true,
      allowTapeOnly: false,
      postWindowMins: 3,
      maxHoldMins: 12,
      startingCash: 10000,
    },
    'segment_B_lessons_v2_posts_reddit_tg_net_costs'
  );

  const loose = run(
    timeline,
    {
      lessonsMode: false,
      allowTapeOnly: true,
      postWindowMins: 30,
      maxHoldMins: 45,
      startingCash: 10000,
    },
    'segment_B_loose_old_rules_net_costs'
  );

  const report = {
    at: new Date().toISOString(),
    clarification: {
      optimistic_125_pct_net:
        'That was the synthetic SCENARIO over 6 months (early detect), NOT the prior blind real run.',
      prior_blind_segment_A: 'Lost ~21–26% net on real 2019–era sample.',
    },
    segment_b_meta: meta,
    results: [v2, loose],
    honesty:
      'New real segment + time-matched Reddit (Pullpush, when available) + TG labels. Costs on. Lessons v2 vs loose ablation.',
  };

  fs.writeFileSync(path.join(LIP_DATA, 'blind-sim-segment-b.json'), JSON.stringify(report, null, 2));
  const slim = {
    ...report,
    results: report.results.map(({ closed, ...r }) => ({
      ...r,
      sample_closed: (closed || []).slice(0, 6),
    })),
  };
  console.log(JSON.stringify(slim, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
