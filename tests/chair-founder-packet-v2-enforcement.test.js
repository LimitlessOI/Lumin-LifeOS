/**
 * SYNOPSIS: js — tests/chair-founder-packet-v2-enforcement.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assessLiveIntentCoverage,
  enforceFounderPacketV2ChairTurn,
  FP_V2_CHAIR_LAW,
  writeChairForecastSimulationReceipt,
} from '../services/chair-founder-packet-v2-enforcement.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('FP V2 law points to Founder Packet V2 authority', () => {
  assert.match(FP_V2_CHAIR_LAW.authority, /FOUNDER_PACKET_V2/);
  assert.match(FP_V2_CHAIR_LAW.scoreboard, /scoreboard/i);
});

test('understood intent clears tier-1 coverage for live lap', () => {
  const cov = assessLiveIntentCoverage('build LifeRE daily command', {
    intent_understood: true,
    outcome_hypothesis: 'Ship daily command',
  });
  assert.equal(cov.tier1_load_bearing_ready, true);
});

test('writes canonical CHAIR_FORECAST receipt', async () => {
  const { receipt } = await writeChairForecastSimulationReceipt({
    cleanedInput: 'LifeRE Point B',
    pointBTarget: { label: 'LifeRE Alpha' },
  });
  assert.equal(receipt.schema, 'chair_forecast_simulation_v1');
  assert.ok(receipt.predictions.length >= 4);
  assert.equal(receipt.seat, 'CHAIR');
});

test('blocks execute channel without understood intent', async () => {
  const result = await enforceFounderPacketV2ChairTurn({
    cleanedInput: 'build something vague',
    understanding: { intent_understood: false },
    channel: 'build_async',
  });
  assert.equal(result.execute_cleared, false);
  assert.match(result.violations.join(' '), /INTENT_AMBIGUITY/);
});

test('clears execute when intent understood and offers present', async () => {
  const result = await enforceFounderPacketV2ChairTurn({
    cleanedInput: 'Build LifeRE auto-load daily command on open',
    understanding: {
      intent_understood: true,
      outcome_hypothesis: 'LifeRE loads daily command automatically',
    },
    channel: 'build_async',
    confirmIntent: true,
  });
  assert.equal(result.execute_cleared, true);
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'data/chair-live/CHAIR_FORECAST_SIMULATION_RECEIPT.json')));
});

console.log('✅ chair-founder-packet-v2-enforcement.test.js passed');
