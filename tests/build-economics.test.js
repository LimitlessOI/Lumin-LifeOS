/**
 * SYNOPSIS: tests/build-economics.test.js — unit tests for build cost/time prediction.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHistory, estimateSegments } from '../services/build-economics.js';

const HISTORY = [
  { stability_class: 'safe', estimated_usd: 0.10, total_ms: 60000, total_tokens: 4000, lines_added: 20, lines_deleted: 5 },
  { stability_class: 'safe', estimated_usd: 0.20, total_ms: 120000, total_tokens: 6000, lines_added: 30, lines_deleted: 15 },
  { stability_class: 'needs-review', estimated_usd: 0.50, total_ms: 300000, total_tokens: 12000, lines_added: 80, lines_deleted: 40 },
];

test('summarizeHistory computes per-class and overall averages', () => {
  const s = summarizeHistory(HISTORY);
  assert.equal(s.byClass.safe.samples, 2);
  assert.equal(s.byClass.safe.avgUsd, 0.15);
  assert.equal(s.byClass.safe.avgMinutes, 1.5); // (60000+120000)/2/60000
  assert.equal(s.byClass['needs-review'].samples, 1);
  assert.equal(s.overall.samples, 3);
  assert.equal(s.overall.avgUsd, 0.26667);
});

test('estimateSegments uses class average when available', () => {
  const summary = summarizeHistory(HISTORY);
  const segs = [
    { id: 1, stability_class: 'safe', estimated_hours: 1 },
    { id: 2, stability_class: 'needs-review', estimated_hours: 2 },
  ];
  const est = estimateSegments(segs, summary);
  // safe avg 0.15 + needs-review avg 0.50 = 0.65
  assert.equal(est.estimatedUsd, 0.65);
  // safe 1.5min + needs-review 5min = 6.5
  assert.equal(est.estimatedMinutes, 6.5);
  assert.equal(est.historyBackedSegments, 2);
  assert.equal(est.perSegment[0].source, 'class:safe');
});

test('estimateSegments falls back to overall then cold-start', () => {
  const summary = summarizeHistory(HISTORY);
  const segs = [{ id: 3, stability_class: 'brand-new-class', estimated_hours: 1 }];
  const est = estimateSegments(segs, summary);
  // unknown class → overall average used
  assert.equal(est.perSegment[0].source, 'overall');
  assert.equal(est.perSegment[0].estimatedUsd, 0.26667);
});

test('estimateSegments cold-start when there is no history', () => {
  const summary = summarizeHistory([]);
  const segs = [{ id: 4, stability_class: 'safe', estimated_hours: 2 }];
  const est = estimateSegments(segs, summary, { env: {} });
  assert.equal(est.confidence, 'seed-estimate');
  assert.equal(est.perSegment[0].source, 'cold-start');
  // 2 hours → 120 minutes
  assert.equal(est.estimatedMinutes, 120);
  // cold-start cost = gpt-4o-mini (12000 in, 3000 out) = 0.0018+0.0018 = 0.0036
  assert.equal(est.perSegment[0].estimatedUsd, 0.0036);
});

test('estimateSegments confidence scales with sample count', () => {
  const many = [];
  for (let i = 0; i < 25; i += 1) {
    many.push({ stability_class: 'safe', estimated_usd: 0.1, total_ms: 60000, total_tokens: 4000, lines_added: 10, lines_deleted: 0 });
  }
  const est = estimateSegments([{ id: 1, stability_class: 'safe' }], summarizeHistory(many));
  assert.equal(est.confidence, 'high');
});

test('estimateSegments handles empty segment list', () => {
  const est = estimateSegments([], summarizeHistory(HISTORY));
  assert.equal(est.confidence, 'none');
  assert.equal(est.estimatedUsd, 0);
});
