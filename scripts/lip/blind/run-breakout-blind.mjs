/**
 * SYNOPSIS: Blind breakout experiments across unused time segments + buy/sell rules.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Blind breakout experiments across unused time segments + buy/sell rules.
 * Also replays P&D fade solve on prior pump segments for one scoreboard.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createFeeder } from './feeder.mjs';
import { createBreakoutReader, buyHoldReturn, BREAKOUT_LESSONS } from './reader-breakout.mjs';
import { createSolveReader } from './reader-solve.mjs';
import { buildBreakoutUniverse, sliceSegment } from './fetch-breakout-universe.mjs';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

const SEGMENTS = [
  { id: 'F', start: '2024-01-01', end: '2024-06-30', label: '2024 H1 — ETF / early bull' },
  { id: 'G', start: '2024-07-01', end: '2024-12-31', label: '2024 H2' },
  { id: 'H', start: '2025-01-01', end: '2025-06-30', label: '2025 H1' },
  { id: 'I', start: '2025-07-01', end: '2026-06-30', label: '2025 H2–2026 H1' },
];

function runBreakout(timeline, label) {
  const feeder = createFeeder(timeline);
  const reader = createBreakoutReader({ startingCash: 10000, requireBtcGate: true });
  let buys = 0;
  let ev;
  while ((ev = feeder.next())) {
    const r = reader.onEvent(ev);
    if (r?.action === 'buy') buys += 1;
  }
  const snap = reader.snapshot();
  const reasons = {};
  for (const c of snap.closed) reasons[c.reason] = (reasons[c.reason] || 0) + 1;

  const btcBars = timeline.filter((e) => e.symbol === 'BTC');
  const btcHold = buyHoldReturn(btcBars);

  return {
    label,
    buys,
    reasons,
    breakout_net_pct: snap.net_return_pct,
    breakout_wr: snap.win_rate,
    breakout_trades: snap.closed_trades,
    btc_hold_net_pct: btcHold.net_return_pct,
    beat_btc: snap.net_return_pct > btcHold.net_return_pct,
    sample: snap.closed.slice(0, 8),
    equity: snap.equity,
  };
}

function loadPumpTimeline(name) {
  const p = path.join(LIP_DATA, name);
  if (!fs.existsSync(p)) return null;
  return fs
    .readFileSync(p, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function runFade(timeline, label) {
  if (!timeline) return null;
  const feeder = createFeeder(timeline);
  const reader = createSolveReader({ startingCash: 10000 });
  let ev;
  while ((ev = feeder.next())) reader.onEvent(ev);
  const snap = reader.snapshot();
  return {
    label,
    fade_net_pct: snap.net_return_pct,
    fade_wr: snap.win_rate,
    fade_trades: snap.closed_trades,
  };
}

async function main() {
  ensureLipDataDir();
  const force = process.argv.includes('--rebuild');
  const uniPath = path.join(LIP_DATA, 'breakout_universe.jsonl');
  let all;
  let meta;
  if (!force && fs.existsSync(uniPath)) {
    all = fs
      .readFileSync(uniPath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    meta = JSON.parse(fs.readFileSync(path.join(LIP_DATA, 'breakout_universe_meta.json'), 'utf8'));
  } else {
    const built = await buildBreakoutUniverse({});
    all = built.all;
    meta = built.meta;
  }

  const lessons = [
    'P&D: do not buy the shout — fade after dump confirm (worked A–E)',
    'Takeoff: buy quiet coil + OBV up + resistance close + volume + RSI>50',
    'Sell: failed break, stop, trail, target, exhaustion, time',
    'BTC regime gate for alt breakouts',
    'Always subtract costs; compare to BTC hold',
    'Different market segments — no peeking across future',
  ];

  const breakout_scoreboard = [];
  for (const seg of SEGMENTS) {
    const tl = sliceSegment(all, seg.start, seg.end);
    if (tl.length < 200) {
      breakout_scoreboard.push({ segment: seg.id, label: seg.label, error: 'thin', events: tl.length });
      continue;
    }
    const r = runBreakout(tl, `${seg.id}_${seg.label}`);
    breakout_scoreboard.push({
      segment: seg.id,
      label: seg.label,
      events: tl.length,
      ...r,
    });
  }

  const fade_scoreboard = [];
  for (const [id, file] of [
    ['A', 'blind_timeline.jsonl'],
    ['B', 'blind_b_timeline.jsonl'],
    ['C', 'blind_c_timeline.jsonl'],
    ['D', 'blind_d_timeline.jsonl'],
    ['E', 'blind_e_timeline.jsonl'],
  ]) {
    const r = runFade(loadPumpTimeline(file), `fade_${id}`);
    if (r) fade_scoreboard.push({ segment: id, ...r });
  }

  const boWins = breakout_scoreboard.filter((r) => r.breakout_net_pct > 0).length;
  const boBeatBtc = breakout_scoreboard.filter((r) => r.beat_btc).length;
  const fadeWins = fade_scoreboard.filter((r) => r.fade_net_pct > 0).length;

  const report = {
    at: new Date().toISOString(),
    lessons_given_to_system: lessons,
    breakout_lessons: BREAKOUT_LESSONS,
    universe_meta: meta,
    breakout_scoreboard,
    fade_scoreboard,
    summary: {
      breakout_segments_green: boWins,
      breakout_segments_tested: breakout_scoreboard.filter((r) => r.breakout_net_pct != null).length,
      breakout_beats_btc_hold: boBeatBtc,
      fade_segments_green: fadeWins,
      fade_segments_tested: fade_scoreboard.length,
    },
    plain_english: {
      what_we_did:
        'Gave the system the full buy/sell checklist for real takeoffs, ran it blind on four different 2024–2026 market halves, and re-checked the P&D fade play on A–E.',
      buy_rule: 'Coil + OBV up + close above resistance + volume spike + RSI>50 + BTC not crashing.',
      sell_rule: 'Failed break, stop, trail, +15% target, exhaustion, or time.',
    },
  };

  const boOk = report.summary.breakout_segments_tested;
  report.plain_english.verdict =
    boWins >= Math.ceil(boOk * 0.6)
      ? 'Breakout sleeve looks promising on these halves — keep testing vs BTC.'
      : boWins >= 1
        ? 'Mixed — some segments work; not yet a consistent money printer vs BTC.'
        : 'Breakout checklist did not make money on these segments yet — refine or sit with funding/BTC.';

  fs.writeFileSync(path.join(LIP_DATA, 'blind-sim-breakout.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
