/**
 * SYNOPSIS: Blind Segment C — unused market slice + success-trail hunter.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Blind Segment C — unused market slice + success-trail hunter.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createFeeder } from './feeder.mjs';
import { createSuccessTrailReader, TRAIL_LESSONS } from './reader-success-trail.mjs';
import { createReader } from './reader.mjs';
import { buildSegmentCTimeline } from './fetch-segment-c.mjs';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

function loadCached() {
  const tlPath = path.join(LIP_DATA, 'blind_c_timeline.jsonl');
  const metaPath = path.join(LIP_DATA, 'blind_c_meta.json');
  if (!fs.existsSync(tlPath) || !fs.existsSync(metaPath)) return null;
  const timeline = fs
    .readFileSync(tlPath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  return { timeline, meta: JSON.parse(fs.readFileSync(metaPath, 'utf8')) };
}

function runTrail(timeline) {
  const feeder = createFeeder(timeline);
  const reader = createSuccessTrailReader({ startingCash: 10000 });
  let enters = 0;
  let shouts = 0;
  let ev;
  while ((ev = feeder.next())) {
    const r = reader.onEvent(ev);
    if (r?.action === 'enter') enters += 1;
    if (r?.action === 'shout_seen') shouts += 1;
  }
  return { label: 'segment_C_success_trail_blind', enters, shouts, ...reader.snapshot() };
}

function runLateAnnounce(timeline) {
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
    const r = reader.onEvent(ev);
    if (r?.action === 'enter') enters += 1;
  }
  return { label: 'segment_C_late_announce_long_control', enters, ...reader.snapshot() };
}

async function main() {
  ensureLipDataDir();
  const force = process.argv.includes('--rebuild');
  let packed = !force ? loadCached() : null;
  if (!packed || (packed.timeline?.length || 0) < 100) {
    packed = await buildSegmentCTimeline({ maxPumps: 28 });
  }
  const { timeline, meta } = packed;
  if (timeline.length < 100) {
    console.log(JSON.stringify({ ok: false, error: 'thin_segment_c', meta }, null, 2));
    process.exit(1);
  }

  const trail = runTrail(timeline);
  const late = runLateAnnounce(timeline);

  const report = {
    at: new Date().toISOString(),
    blind: true,
    segment: 'C',
    plain_english: {
      question: 'On a new unused market slice, can we find the success trail blindly?',
      success_trail: 'Buy when volume wakes + price drifts UP before the public shout; abort if red by ~2m; exit when shout hits.',
      control: 'Old habit: buy near the Telegram announce (usually late).',
    },
    trail_lessons: TRAIL_LESSONS,
    segment_c_meta: meta,
    results: [trail, late],
  };

  fs.writeFileSync(path.join(LIP_DATA, 'blind-sim-segment-c.json'), JSON.stringify(report, null, 2));
  const slim = {
    ...report,
    results: report.results.map(({ closed, ...r }) => ({
      ...r,
      sample_closed: (closed || []).slice(0, 8),
      reasons: (closed || []).reduce((acc, c) => {
        acc[c.reason] = (acc[c.reason] || 0) + 1;
        return acc;
      }, {}),
    })),
  };
  console.log(JSON.stringify(slim, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
