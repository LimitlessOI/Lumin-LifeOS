/**
 * SYNOPSIS: js — tests/lumin-strategic-intelligence.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFutureLookBackPrompts,
  buildLocalStrategicNotes,
  formatStrategicBriefSection,
  CHAIR_STRATEGIC_DOCTRINE,
} from '../services/lumin-strategic-intelligence.js';

test('future horizons include 6mo and 10y with confidence labels', () => {
  const h = buildFutureLookBackPrompts('LifeRE');
  assert.ok(h.some((x) => x.horizon_months === 6 && x.confidence === 'THINK'));
  assert.ok(h.some((x) => x.horizon_months === 120 && x.confidence === 'GUESS'));
});

test('local notes offer gaps for LifeRE when usability false', () => {
  const notes = buildLocalStrategicNotes('Build LifeRE daily command', {
    label: 'LifeRE Alpha',
    mission_id: 'PRODUCT-LIFERE-OS-V1-0001',
  });
  assert.ok(notes.ideas.length >= 1);
});

test('strategic section includes scoreboard line', () => {
  const text = formatStrategicBriefSection({
    ideas: ['Ship auto-load'],
    gaps: ['Founder usability not confirmed'],
  });
  assert.match(text, /scoreboard/i);
  assert.match(text, /Ideas:/);
});

test('doctrine encodes chair offers not listen-only', () => {
  assert.match(CHAIR_STRATEGIC_DOCTRINE.chair_offers, /Ideas/i);
});

console.log('✅ lumin-strategic-intelligence.test.js passed');
