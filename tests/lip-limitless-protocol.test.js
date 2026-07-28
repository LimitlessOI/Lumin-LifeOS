/**
 * SYNOPSIS: js — tests/lip-limitless-protocol.test.js.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePumpWindow, detectEvents, typicalSwing } from '../scripts/lip/lib/detector.mjs';
import { exitPrice, simulateTrade, TRANCHE_EXIT_FRAC } from '../scripts/lip/lib/strategy.mjs';
import { generateSyntheticPumps } from '../scripts/lip/lib/synthetic.mjs';

test('typicalSwing median', () => {
  assert.equal(typicalSwing([0.2, 0.4, 0.6]), 0.4);
});

test('exitPrice uses tranche fractions', () => {
  const entry = 100;
  const swing = 0.5;
  assert.equal(exitPrice(entry, swing, 'core'), 100 * (1 + 0.5 * TRANCHE_EXIT_FRAC.core));
  assert.ok(exitPrice(entry, swing, 'secure') < exitPrice(entry, swing, 'runner'));
});

test('scorePumpWindow flags volume+price spike', () => {
  const bars = [];
  for (let i = 0; i < 30; i++) bars.push({ close: 1, volume: 100 });
  bars.push({ close: 1.2, volume: 2000 });
  const s = scorePumpWindow(bars, { lookback: 24, volMult: 4, retThresh: 0.1 });
  assert.equal(s.is_candidate, true);
});

test('simulateTrade trail exits after giveback from peak', () => {
  const bars = [
    { close: 100, volume: 1 },
    { close: 120, volume: 1 },
    { close: 140, volume: 1 },
    { close: 125, volume: 1 },
  ];
  const r = simulateTrade(bars, 0, 100, 999, {
    mode: 'trail',
    swingEst: 0.5,
    trailArmFrac: 0.3,
    trailGiveback: 0.1,
    maxBars: 10,
    stopFloor: 0.5,
  });
  assert.equal(r.reason, 'trail');
  assert.ok(r.pnl_pct > 0);
});

test('synthetic pumps produce detectEvents', () => {
  const bars = generateSyntheticPumps({ days: 60, pumpCount: 20, seed: 1 });
  const events = detectEvents(bars, { lookback: 24, volMult: 3.2, retThresh: 0.05 });
  assert.ok(events.length > 0, 'expected some pump events');
});
