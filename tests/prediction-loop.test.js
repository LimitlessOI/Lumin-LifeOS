/**
 * SYNOPSIS: S5 Prediction Loop v0 — unit tests
 * S5 Prediction Loop v0 — unit tests
 *
 * Tests makePrediction() and evaluatePrediction() as pure functions.
 * Also emits one synthetic prediction+evaluation pair to prove the log shape is valid.
 * Tests validatePredictions() against a real or empty JSONL file (warn-only).
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePrediction, evaluatePrediction } from '../scripts/lib/prediction-loop.mjs';
import { validatePredictions, formatPredictionReport } from '../scripts/validate-predictions.mjs';

// ── makePrediction ──────────────────────────────────────────────────────────

test('makePrediction: SIS1 skip → skipped_already_valid', () => {
  const p = makePrediction({ taskId: 'task-1', lane: 'TEST_LANE', sis1WillSkip: true });
  assert.equal(p.event, 'prediction_recorded');
  assert.equal(p.task_id, 'task-1');
  assert.equal(p.lane, 'TEST_LANE');
  assert.equal(p.predicted_ok, true);
  assert.equal(p.predicted_closure_type, 'skipped_already_valid');
  assert.ok(Array.isArray(p.predicted_duration_ms_range), 'predicted_duration_ms_range must be array');
  assert.equal(p.predicted_duration_ms_range.length, 2);
});

test('makePrediction: builder path → committed_success', () => {
  const p = makePrediction({ taskId: 'task-2', lane: 'TEST_LANE', sis1WillSkip: false });
  assert.equal(p.predicted_closure_type, 'committed_success');
  assert.equal(p.predicted_ok, true);
  assert.ok(p.predicted_duration_ms_range[1] > p.predicted_duration_ms_range[0]);
});

// ── evaluatePrediction ──────────────────────────────────────────────────────

test('evaluatePrediction: match — SIS1 skip correct', () => {
  const p = makePrediction({ taskId: 'task-3', lane: 'L', sis1WillSkip: true });
  const ev = evaluatePrediction(p, { actual_ok: true, actual_duration_ms: 50, actual_closure_type: 'skipped_already_valid' });
  assert.equal(ev.event, 'prediction_evaluated');
  assert.equal(ev.prediction_match, true);
  assert.equal(ev.miss_reason, null);
  assert.equal(ev.actual_ok, true);
  assert.equal(ev.actual_closure_type, 'skipped_already_valid');
});

test('evaluatePrediction: match — committed_success correct', () => {
  const p = makePrediction({ taskId: 'task-4', lane: 'L', sis1WillSkip: false });
  const ev = evaluatePrediction(p, { actual_ok: true, actual_duration_ms: 12000, actual_closure_type: 'committed_success' });
  assert.equal(ev.prediction_match, true);
  assert.equal(ev.miss_reason, null);
});

test('evaluatePrediction: miss — actual_ok=false', () => {
  const p = makePrediction({ taskId: 'task-5', lane: 'L', sis1WillSkip: false });
  const ev = evaluatePrediction(p, { actual_ok: false, actual_duration_ms: 30000, actual_closure_type: 'explicit_noncommit_reason' });
  assert.equal(ev.prediction_match, false);
  assert.ok(typeof ev.miss_reason === 'string' && ev.miss_reason.length > 0, 'miss_reason must be non-empty string');
  assert.ok(ev.miss_reason.includes('ok_mismatch'), `expected ok_mismatch in miss_reason: ${ev.miss_reason}`);
  assert.ok(ev.miss_reason.includes('closure_mismatch'), `expected closure_mismatch in miss_reason: ${ev.miss_reason}`);
});

test('evaluatePrediction: miss — only closure type wrong', () => {
  const p = makePrediction({ taskId: 'task-6', lane: 'L', sis1WillSkip: false });
  // predicted committed_success but got explicit_noncommit_reason (still ok_to_advance)
  const ev = evaluatePrediction(p, { actual_ok: true, actual_duration_ms: 5000, actual_closure_type: 'explicit_noncommit_reason' });
  assert.equal(ev.prediction_match, false);
  assert.ok(ev.miss_reason.includes('closure_mismatch'));
  assert.ok(!ev.miss_reason.includes('ok_mismatch'), 'ok_mismatch should not appear when ok matched');
});

test('evaluatePrediction: carries all required fields', () => {
  const p = makePrediction({ taskId: 'task-7', lane: 'MY_LANE', sis1WillSkip: false });
  const ev = evaluatePrediction(p, { actual_ok: true, actual_duration_ms: 8000, actual_closure_type: 'committed_success' });
  assert.equal(typeof ev.task_id, 'string');
  assert.equal(typeof ev.lane, 'string');
  assert.ok(Array.isArray(ev.predicted_duration_ms_range));
  assert.equal(typeof ev.actual_duration_ms, 'number');
  assert.equal(typeof ev.prediction_match, 'boolean');
});

// ── Synthetic proof event ───────────────────────────────────────────────────
// Required by S5: one synthetic prediction_recorded + prediction_evaluated event pair
// proving the log shape is valid JSON round-trip.

test('synthetic proof: prediction_recorded + prediction_evaluated round-trip', () => {
  const prediction = makePrediction({
    taskId: 'synthetic-proof-task',
    lane: 'TEST_LANE',
    sis1WillSkip: false,
  });
  const evaluation = evaluatePrediction(prediction, {
    actual_ok: true,
    actual_duration_ms: 23456,
    actual_closure_type: 'committed_success',
  });

  // Simulate logPrediction() serialization
  const predLine = JSON.stringify({ ts: new Date().toISOString(), ...prediction });
  const evalLine = JSON.stringify({ ts: new Date().toISOString(), ...evaluation });

  const pred = JSON.parse(predLine);
  const ev = JSON.parse(evalLine);

  assert.equal(pred.event, 'prediction_recorded');
  assert.equal(pred.predicted_closure_type, 'committed_success');
  assert.equal(pred.predicted_ok, true);

  assert.equal(ev.event, 'prediction_evaluated');
  assert.equal(ev.task_id, 'synthetic-proof-task');
  assert.equal(ev.prediction_match, true);
  assert.equal(ev.miss_reason, null);
  assert.equal(ev.actual_ok, true);
  assert.equal(ev.actual_duration_ms, 23456);

  console.log('\n[S5 SYNTHETIC PROOF — prediction_recorded]', predLine);
  console.log('[S5 SYNTHETIC PROOF — prediction_evaluated]', evalLine);
});

// ── validatePredictions ─────────────────────────────────────────────────────

test('validatePredictions: returns valid report structure (no records = ok)', async () => {
  const report = await validatePredictions();
  assert.equal(typeof report.predictions, 'number');
  assert.equal(typeof report.evaluations, 'number');
  assert.equal(typeof report.matches, 'number');
  assert.equal(typeof report.misses, 'number');
  assert.equal(typeof report.miss_reasons, 'object');
  // If records exist: matches + misses = evaluations
  if (report.evaluations > 0) {
    assert.equal(report.matches + report.misses, report.evaluations, 'matches + misses must equal evaluations');
  }
});

test('formatPredictionReport: returns non-empty string', async () => {
  const report = await validatePredictions();
  const text = formatPredictionReport(report);
  assert.equal(typeof text, 'string');
  assert.ok(text.length > 0);
  assert.ok(text.includes('warn-only') || text.includes('No prediction'), 'must mention warn-only or no-records state');
});
