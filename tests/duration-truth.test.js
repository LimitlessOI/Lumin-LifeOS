/**
 * SYNOPSIS: tests/duration-truth.test.js — measured-only duration gate.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getSystemClock,
  gateDurationClaim,
  estimateFromMeasuredHistory,
  enforceMeasuredEconomicsEstimate,
  buildDurationTruthSnapshot,
  loadFoundationLoopSamples,
  loadInstallStepSamples,
  OPERATION_CLASSES,
} from '../services/duration-truth.js';

test('getSystemClock returns host clock fields', () => {
  const c = getSystemClock(new Date('2026-07-08T18:00:00.000Z'));
  assert.equal(c.measurement_source, 'clock');
  assert.equal(c.iso, '2026-07-08T18:00:00.000Z');
  assert.equal(c.unix_ms, Date.parse('2026-07-08T18:00:00.000Z'));
  assert.ok(c.timezone);
  assert.ok(c.local);
});

test('gateDurationClaim rejects AI / seed / cold-start sources', () => {
  for (const source of ['ai', 'seed-estimate', 'cold-start', 'guess', 'prediction-loop']) {
    const g = gateDurationClaim({ measurement_source: source, ok: true, estimated_ms: 60000, sample_count: 10 });
    assert.equal(g.allowed, false, source);
    assert.equal(g.reason, 'AI_OR_SEED_DURATION_FORBIDDEN');
  }
});

test('gateDurationClaim accepts measured clock claim with enough samples', () => {
  const g = gateDurationClaim({
    measurement_source: 'clock',
    ok: true,
    estimated_ms: 7000,
    sample_count: 5,
    min_samples_required: 3,
  });
  assert.equal(g.allowed, true);
  assert.equal(g.claim.estimated_ms, 7000);
});

test('gateDurationClaim fails closed on insufficient samples', () => {
  const g = gateDurationClaim({
    measurement_source: 'clock',
    ok: true,
    estimated_ms: 7000,
    sample_count: 1,
    min_samples_required: 3,
  });
  assert.equal(g.allowed, false);
  assert.equal(g.reason, 'INSUFFICIENT_MEASURED_HISTORY');
});

test('enforceMeasuredEconomicsEstimate rejects pure cold-start', () => {
  const r = enforceMeasuredEconomicsEstimate({
    confidence: 'seed-estimate',
    estimatedUsd: 0.01,
    estimatedMinutes: 120,
    historyBackedSegments: 0,
    perSegment: [{ source: 'cold-start', estimatedUsd: 0.01, estimatedMinutes: 120 }],
  });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'INSUFFICIENT_MEASURED_HISTORY');
  assert.equal(r.estimated_minutes, null);
});

test('enforceMeasuredEconomicsEstimate strips cold-start segments from mixed estimate', () => {
  const r = enforceMeasuredEconomicsEstimate({
    confidence: 'low',
    estimatedUsd: 0.4,
    estimatedMinutes: 10,
    historyBackedSegments: 1,
    perSegment: [
      { source: 'class:safe', estimatedUsd: 0.15, estimatedMinutes: 1.5 },
      { source: 'cold-start', estimatedUsd: 0.25, estimatedMinutes: 8.5 },
    ],
  });
  assert.equal(r.allowed, true);
  assert.equal(r.partial, true);
  assert.equal(r.cold_start_segments_rejected, 1);
  assert.equal(r.estimated_minutes, 1.5);
  assert.equal(r.perSegment.length, 1);
});

test('estimateFromMeasuredHistory install_step uses fixture metrics and scales by stepCount', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dur-truth-'));
  const metricsDir = path.join(dir, 'factory-staging', 'data');
  fs.mkdirSync(metricsDir, { recursive: true });
  const lines = [
    { latency_ms: 10, step_id: 'fixture' },
    { latency_ms: 6000, step_id: 's1', recorded_at: '2026-07-01T00:00:00Z' },
    { latency_ms: 8000, step_id: 's2', recorded_at: '2026-07-01T00:01:00Z' },
    { latency_ms: 7000, step_id: 's3', recorded_at: '2026-07-01T00:02:00Z' },
  ];
  fs.writeFileSync(path.join(metricsDir, 'tsos-step-metrics.jsonl'), lines.map((o) => JSON.stringify(o)).join('\n'));

  const one = estimateFromMeasuredHistory(OPERATION_CLASSES.INSTALL_STEP, { root: dir, minSamples: 3 });
  assert.equal(one.ok, true);
  assert.equal(one.sample_count, 3);
  assert.equal(one.estimated_ms, 7000);

  const n = estimateFromMeasuredHistory(OPERATION_CLASSES.INSTALL_STEP, {
    root: dir,
    minSamples: 3,
    stepCount: 4,
  });
  assert.equal(n.ok, true);
  assert.equal(n.step_count, 4);
  assert.equal(n.estimated_ms, 28000);
  assert.equal(n.estimated_minutes, 0.47);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('estimateFromMeasuredHistory blueprint fails closed when too few foundation receipts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dur-bp-'));
  fs.mkdirSync(path.join(dir, 'builderos-reboot', 'MISSIONS', 'M1', 'receipts'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'builderos-reboot', 'MISSIONS', 'M1', 'receipts', 'FOUNDATION_LOOP_RECEIPT.json'),
    JSON.stringify({ latency_ms: 120000, started_at: '2026-07-01T00:00:00Z', finished_at: '2026-07-01T00:02:00Z' }),
  );
  const r = estimateFromMeasuredHistory(OPERATION_CLASSES.BLUEPRINT_FOUNDATION, { root: dir, minSamples: 3 });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'INSUFFICIENT_MEASURED_HISTORY');
  assert.equal(r.sample_count, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('repo has loadable install-step samples (smoke)', () => {
  const samples = loadInstallStepSamples();
  assert.ok(Array.isArray(samples));
  // May be empty in a fresh checkout without factory metrics — still must not throw.
  const foundation = loadFoundationLoopSamples();
  assert.ok(Array.isArray(foundation));
});

test('buildDurationTruthSnapshot includes clock + law', () => {
  const snap = buildDurationTruthSnapshot({ now: new Date('2026-07-08T18:00:00.000Z'), minSamples: 99 });
  assert.equal(snap.schema, 'duration_truth_v1');
  assert.equal(snap.clock.iso, '2026-07-08T18:00:00.000Z');
  assert.equal(snap.law.ai_guess_eta, 'forbidden');
  assert.equal(snap.averages.install_step.measurement_source, 'clock');
  assert.ok('ok' in snap.averages.install_step);
  assert.ok('ok' in snap.averages.blueprint_foundation);
});
