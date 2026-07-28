/**
 * SYNOPSIS: Blind Segment D — apply C lessons (success-trail v4) on unused market.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Blind Segment D — apply C lessons (success-trail v4) on unused market.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createFeeder } from './feeder.mjs';
import { createSuccessTrailReader, TRAIL_LESSONS } from './reader-success-trail.mjs';
import { createReader } from './reader.mjs';
import { buildSegmentDTimeline } from './fetch-segment-d.mjs';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

function loadCached() {
  const tlPath = path.join(LIP_DATA, 'blind_d_timeline.jsonl');
  const metaPath = path.join(LIP_DATA, 'blind_d_meta.json');
  if (!fs.existsSync(tlPath) || !fs.existsSync(metaPath)) return null;
  const timeline = fs
    .readFileSync(tlPath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  return { timeline, meta: JSON.parse(fs.readFileSync(metaPath, 'utf8')) };
}

function distToNearestPost(posts, symbol, ts) {
  let best = null;
  for (const p of posts) {
    if (p.symbol !== symbol) continue;
    const mins = (ts - p.ts) / 60000;
    if (best == null || Math.abs(mins) < Math.abs(best)) best = mins;
  }
  return best;
}

function annotate(closed, posts) {
  return closed.map((c) => {
    const mins = distToNearestPost(posts, c.symbol, c.entry_ts);
    return {
      ...c,
      mins_to_nearest_post: mins == null ? null : Math.round(mins),
      near_event: mins != null && mins > -60 && mins < 0,
    };
  });
}

function runTrail(timeline) {
  const feeder = createFeeder(timeline);
  const reader = createSuccessTrailReader({ startingCash: 10000 });
  let enters = 0;
  let ev;
  while ((ev = feeder.next())) {
    const r = reader.onEvent(ev);
    if (r?.action === 'enter') enters += 1;
  }
  const snap = reader.snapshot();
  const posts = timeline.filter((e) => e.type === 'post');
  const closed = annotate(snap.closed, posts);
  const near = closed.filter((c) => c.near_event);
  const far = closed.filter((c) => !c.near_event);
  const avg = (arr) => (arr.length ? arr.reduce((s, c) => s + c.net_pnl_pct, 0) / arr.length : null);
  return {
    label: 'segment_D_success_trail_v4_blind',
    enters,
    ...snap,
    closed,
    near_event_trades: near.length,
    far_event_trades: far.length,
    near_avg_net: near.length ? Math.round(avg(near) * 10000) / 10000 : null,
    far_avg_net: far.length ? Math.round(avg(far) * 10000) / 10000 : null,
  };
}

function runLate(timeline) {
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
  return { label: 'segment_D_late_announce_control', enters, ...reader.snapshot() };
}

async function main() {
  ensureLipDataDir();
  const force = process.argv.includes('--rebuild');
  let packed = !force ? loadCached() : null;
  if (!packed || (packed.timeline?.length || 0) < 100) {
    packed = await buildSegmentDTimeline({ maxPumps: 28 });
  }
  const { timeline, meta } = packed;
  if (timeline.length < 100) {
    console.log(JSON.stringify({ ok: false, error: 'thin_segment_d', meta }, null, 2));
    process.exit(1);
  }

  const trail = runTrail(timeline);
  const late = runLate(timeline);

  const lessons_we_changed = [
    'Raised volume bar from ~8× to ~40× (stop mild false wakes)',
    'Require volume still accelerating (not just high once)',
    'One trade per symbol (stop VIA/QSP spam)',
    'Fail-fast exit by 8 minutes if not working (stop fee bleed)',
    'Keep m2 abort + never chase after shout',
  ];

  const report = {
    at: new Date().toISOString(),
    blind: true,
    segment: 'D',
    learned_from: 'Segment C',
    lessons_we_changed,
    trail_lessons: TRAIL_LESSONS,
    segment_d_meta: meta,
    results: [trail, late],
    plain_english: {
      c_problem: 'Most C trades were random volume spikes days away from real events.',
      d_fix: 'Only trade extreme accelerating wakes; one shot; quit fast if flat.',
    },
  };

  fs.writeFileSync(path.join(LIP_DATA, 'blind-sim-segment-d.json'), JSON.stringify(report, null, 2));
  const slim = {
    ...report,
    results: report.results.map(({ closed, ...r }) => ({
      ...r,
      reasons: (closed || []).reduce((acc, c) => {
        acc[c.reason] = (acc[c.reason] || 0) + 1;
        return acc;
      }, {}),
      sample_closed: (closed || []).slice(0, 10).map((c) => ({
        symbol: c.symbol,
        net: c.net_pnl_pct,
        reason: c.reason,
        mins: c.mins_held,
        mins_to_post: c.mins_to_nearest_post ?? null,
        near: c.near_event ?? null,
        vol: c.entry_vol_mult ?? null,
      })),
    })),
  };
  console.log(JSON.stringify(slim, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
