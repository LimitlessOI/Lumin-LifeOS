/**
 * SYNOPSIS: Cognitive Core Outcome Oracle — deterministic proof of the closed-loop math.
 * Proves the parts that were shallow before: Murphy decomposition (exact identity),
 * Brier, anytime-valid e-value (won't flag noise), Platt recalibration (identity until
 * earned), Chow's decide gate (stake-aware), and receipt→verdict mapping / fail-closed.
 * Pure math — no DB — so it runs in CI. DB paths are guarded (require pool).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  brierScore,
  murphyDecomposition,
  reliabilityBins,
  confidenceGap,
  calibrationEValue,
  recalibrationMap,
  applyRecalibration,
  decideGate,
  verdictFromReceipt,
  createCognitiveCoreOracle,
} from '../services/cognitive-core-oracle.js';

test('brierScore matches known example (Anamnesis python parity)', () => {
  const preds = [
    { p: 0.9, o: 1 }, { p: 0.8, o: 1 }, { p: 0.3, o: 0 }, { p: 0.6, o: 1 }, { p: 0.5, o: 0 },
  ];
  const b = brierScore(preds);
  assert.ok(Math.abs(b - 0.11) < 1e-9, `expected 0.11, got ${b}`);
});

test('murphy decomposition identity holds exactly (Brier = Rel − Res + Unc)', () => {
  const preds = [
    { p: 0.9, o: 1 }, { p: 0.9, o: 0 }, { p: 0.7, o: 1 }, { p: 0.7, o: 1 },
    { p: 0.3, o: 0 }, { p: 0.3, o: 1 }, { p: 0.5, o: 0 }, { p: 0.5, o: 1 },
  ];
  const d = murphyDecomposition(preds);
  assert.ok(Math.abs(d.check - d.brier) < 1e-9, `identity broke: ${d.check} vs ${d.brier}`);
  assert.equal(d.n, 8);
  assert.ok(d.uncertainty > 0);
});

test('e-value does NOT flag small / calibrated samples (honest on noise)', () => {
  // Perfectly calibrated toy set: a 0.5 that splits 50/50 has no directional edge.
  const calibrated = [{ p: 0.5, o: 1 }, { p: 0.5, o: 0 }];
  const e = calibrationEValue(calibrated);
  assert.ok(e <= 1.05, `calibrated data should give e~1, got ${e}`);
});

test('e-value rises on systematic overconfidence', () => {
  // Says 0.9 every time but is wrong every time → strong evidence of miscalibration.
  const overconfident = Array.from({ length: 12 }, () => ({ p: 0.9, o: 0 }));
  const e = calibrationEValue(overconfident);
  assert.ok(e >= 3, `systematic miss should give large e, got ${e}`);
});

test('recalibration stays identity until a correction is earned', () => {
  const thin = [{ p: 0.9, o: 0 }, { p: 0.8, o: 0 }]; // n<6 → not earned
  const rThin = recalibrationMap(thin);
  assert.equal(rThin.applied, false);
  assert.equal(applyRecalibration(0.9, rThin), 0.9);

  // Enough evidence of overconfidence → a correction is earned and shades down.
  const dense = Array.from({ length: 20 }, () => ({ p: 0.9, o: 0 }));
  const rDense = recalibrationMap(dense);
  assert.equal(rDense.applied, true);
  assert.ok(applyRecalibration(0.9, rDense) < 0.9, 'earned correction should shade 0.9 down');
});

test('decide gate: stake raises the bar (proceed → verify)', () => {
  const recal = { a: 0, b: 1, applied: false };
  const ordinary = decideGate({ p: 0.85, stakesLabel: 'low', recal }); // τ=0.8
  assert.equal(ordinary.verdict, 'proceed');
  const irreversible = decideGate({ p: 0.85, stakesLabel: 'high', recal }); // τ=0.96
  assert.equal(irreversible.verdict, 'verify');
  const weak = decideGate({ p: 0.3, stakesLabel: 'low', recal });
  assert.equal(weak.verdict, 'abstain');
});

test('decide gate applies an earned correction before thresholding', () => {
  const overconf = Array.from({ length: 20 }, () => ({ p: 0.9, o: 0 }));
  const recal = recalibrationMap(overconf);
  const g = decideGate({ p: 0.9, stakesLabel: 'low', recal });
  assert.equal(g.correction_applied, true);
  assert.ok(g.p_hat < 0.9, 'corrected confidence should be below stated');
});

test('verdictFromReceipt maps real receipt shapes; fail-closed on unknown', () => {
  assert.equal(verdictFromReceipt('revert', {}), 'reverted');
  assert.equal(verdictFromReceipt('sentry', { passed: true }), 'pass');
  assert.equal(verdictFromReceipt('sentry', { passed: false }), 'fail');
  assert.equal(verdictFromReceipt('deploy', { success: true }), 'pass');
  assert.equal(verdictFromReceipt('ci', { status: 'failure' }), 'fail');
  assert.equal(verdictFromReceipt('deploy', { note: 'who knows' }), null); // never guess
});

test('reliabilityBins + confidenceGap surface overconfidence direction', () => {
  const preds = Array.from({ length: 10 }, () => ({ p: 0.9, o: 0 }));
  const bins = reliabilityBins(preds, 10);
  assert.ok(bins.length >= 1);
  const gap = confidenceGap(preds);
  assert.ok(gap.gap > 0, 'all-wrong high-confidence should read overconfident');
});

test('oracle DB methods fail-closed without a pool', async () => {
  const oracle = createCognitiveCoreOracle({ pool: null });
  await assert.rejects(
    () => oracle.resolveFromReceipt({ decisionId: 'x', receiptKind: 'deploy', raw: { success: true } }),
    /cognitive_core_requires_pool/,
  );
  await assert.rejects(() => oracle.calibrationReport({ userId: '1' }), /cognitive_core_requires_pool/);
});