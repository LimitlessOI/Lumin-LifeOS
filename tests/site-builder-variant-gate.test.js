/**
 * SYNOPSIS: Regression tests for Site Builder variant gate cull decisions.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideVariantFate,
  UX_HARD_KILL_THRESHOLD,
} from '../services/site-builder-variant-gate.js';

test('decideVariantFate keeps variant when UX and baseline are clear', () => {
  const fate = decideVariantFate({
    variantScore: { scorePct: 80 },
    uxHeuristics: { overall: 75 },
    baseline: { visualScore: 40 },
  });
  assert.equal(fate.keep, true);
  assert.ok(fate.rank > 0);
});

test('decideVariantFate culls only catastrophic UX, not mid-band scores', () => {
  const mid = decideVariantFate({
    variantScore: { scorePct: 80 },
    uxHeuristics: { overall: 40 },
    baseline: null,
  });
  assert.equal(mid.keep, true, 'overall 40 must not hard-kill (old threshold 60 did)');

  const bad = decideVariantFate({
    variantScore: { scorePct: 80 },
    uxHeuristics: { overall: UX_HARD_KILL_THRESHOLD - 1 },
    baseline: null,
  });
  assert.equal(bad.keep, false);
  assert.match(bad.reason, /UX heuristics/i);
});

test('decideVariantFate treats missing UX score as fail-open (not overall:0)', () => {
  for (const uxHeuristics of [null, undefined, {}]) {
    const fate = decideVariantFate({
      variantScore: { scorePct: 70 },
      uxHeuristics,
      baseline: null,
    });
    assert.equal(fate.keep, true, `expected keep for uxHeuristics=${JSON.stringify(uxHeuristics)}`);
  }
});

test('decideVariantFate culls when structural score loses to a strong baseline', () => {
  const fate = decideVariantFate({
    variantScore: { scorePct: 72.1 },
    uxHeuristics: { overall: 75 },
    baseline: { visualScore: 94.2 },
  });
  assert.equal(fate.keep, false);
  assert.match(fate.reason, /below baseline/i);
});

test('decideVariantFate keeps when variant beats baseline', () => {
  const fate = decideVariantFate({
    variantScore: { scorePct: 88 },
    uxHeuristics: { overall: 70 },
    baseline: { visualScore: 70 },
  });
  assert.equal(fate.keep, true);
});
