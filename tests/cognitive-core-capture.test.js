/**
 * SYNOPSIS: Cognitive Core auto-capture — deterministic proof of the prediction half.
 * The Outcome Oracle solved OUTCOMES (receipts); this proves PREDICTIONS get captured
 * automatically at a prior read from the FOUNDER's own language (not the builder's),
 * that ship/build detection is sane, that a terminal build job maps to a verdict, and
 * that the sweep resolves deterministically by job_id + is fail-closed on unknown jobs.
 * Pure/logic paths run in CI (no DB); DB paths are guarded (require pool).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inferPriorConfidence,
  detectShipDecision,
  verdictFromBuildJob,
  createCognitiveCoreCapture,
} from '../services/cognitive-core-capture.js';

test('inferPriorConfidence reads HIGH confidence from founder language', () => {
  const a = inferPriorConfidence('just ship it, this should just work');
  assert.equal(a.band, 'high');
  assert.ok(a.prior >= 0.75, `expected high prior, got ${a.prior}`);
  assert.equal(a.source, 'language_high');
  assert.ok(a.cues.length >= 1);
});

test('inferPriorConfidence reads LOW confidence from tentative language', () => {
  const a = inferPriorConfidence("let's try this, not sure it'll work but worth a shot");
  assert.equal(a.band, 'low');
  assert.ok(a.prior <= 0.4, `expected low prior, got ${a.prior}`);
});

test('inferPriorConfidence: explicit hedge dominates', () => {
  const a = inferPriorConfidence("I'm not sure, but make the button blue");
  assert.equal(a.band, 'hedged');
  assert.ok(a.prior > 0.4 && a.prior < 0.5);
});

test('inferPriorConfidence: no confidence language → neutral DEFAULT (labelled, not a read)', () => {
  const a = inferPriorConfidence('add a logout endpoint to the auth routes');
  assert.equal(a.band, 'neutral');
  assert.equal(a.source, 'default_neutral');
  assert.equal(a.prior, 0.55);
});

test('inferPriorConfidence: mixed high+low signal collapses to ~0.5, not overconfident', () => {
  const a = inferPriorConfidence('this is simple but honestly kind of risky');
  assert.equal(a.band, 'mixed');
  assert.equal(a.prior, 0.5);
});

test('detectShipDecision classifies ship vs build vs neither', () => {
  assert.equal(detectShipDecision('ship it'), 'ship');
  assert.equal(detectShipDecision('make it happen'), 'ship');
  assert.equal(detectShipDecision('fix the header spacing'), 'build');
  assert.equal(detectShipDecision('refactoring the auth flow'), 'build'); // gerund
  assert.equal(detectShipDecision('shipping the new pricing page'), 'build'); // doubled consonant
  assert.equal(detectShipDecision('what did the last build do?'), null);
  assert.equal(detectShipDecision(''), null);
});

test('verdictFromBuildJob maps terminal jobs; fail-closed while running/unknown', () => {
  assert.equal(verdictFromBuildJob({ status: 'completed', result: { pass_fail: 'PASS' } }), 'pass');
  assert.equal(verdictFromBuildJob({ status: 'failed', result: { pass_fail: 'FAIL' } }), 'fail');
  assert.equal(verdictFromBuildJob({ status: 'waiting_for_proof', result: { pass_fail: 'PASS' } }), 'pass');
  assert.equal(verdictFromBuildJob({ status: 'running', result: null }), null); // never guess a live outcome
  assert.equal(verdictFromBuildJob(null), null);
});

test('sweep resolves deterministically by job_id and is fail-closed on a running job', async () => {
  const resolved = [];
  // Fake judgment: two open founder_build decisions, one with a finished job, one still running.
  const judgment = {
    listOpenDecisions: async () => ([
      { decision_id: 'd-done', source_surface: 'founder_build', situation_snapshot: { job_id: 'j-done', commit_sha: 'abc123' } },
      { decision_id: 'd-run', source_surface: 'founder_build', situation_snapshot: { job_id: 'j-run' } },
      { decision_id: 'd-other', source_surface: 'life_admin', situation_snapshot: {} },
    ]),
  };
  const oracle = {
    resolveFromReceipt: async ({ decisionId, verdict }) => {
      resolved.push({ decisionId, verdict });
      return { ok: true };
    },
  };
  const jobs = {
    'j-done': { status: 'completed', result: { pass_fail: 'PASS', commit_sha: 'abc123def' } },
    'j-run': { status: 'running', result: null },
  };
  const capture = createCognitiveCoreCapture({
    pool: {}, judgment, oracle, getFounderBuildJob: (id) => jobs[id] || null,
  });
  const out = await capture.sweepOpenBuildDecisions({ userId: '1' });
  assert.equal(out.ok, true);
  assert.equal(out.scanned, 2, 'only founder_build decisions are scanned');
  assert.equal(out.resolved.length, 1);
  assert.equal(out.resolved[0].decision_id, 'd-done');
  assert.equal(out.resolved[0].verdict, 'pass');
  assert.equal(out.pending.length, 1);
  assert.equal(out.pending[0].reason, 'job_running');
  assert.equal(resolved.length, 1, 'no mis-attribution: the running job is left open');
});

test('capture DB path fails-closed without a pool', () => {
  const capture = createCognitiveCoreCapture({ pool: null });
  assert.rejects(() => capture.captureBuildDecision({ text: 'ship it' }), /cognitive_core_requires_pool/);
});