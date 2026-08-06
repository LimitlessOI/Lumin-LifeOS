#!/usr/bin/env node
/**
 * SYNOPSIS: Exhaustive V2 Evidence Fusion & Cognitive Dynamics test transcript.
 * Verifies multi-modal fusion, positive/momentum signals, and learning.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTranscriptEvidence, extractTimingEvidence, extractTonalityEvidence, extractHistoryEvidence, extractFaceBodyEvidence, fuseEvidence, learnWeights } from './prototype-evidence-fusion-v2.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPT_PATH = path.resolve(__dirname, '../products/receipts/COMMUNICATION_SYSTEM_V2_TEST_TRANSCRIPT.json');

class TestLog {
  constructor() {
    this.tests = [];
    this.startedAt = new Date().toISOString();
  }
  add({ suite, name, ok, error, details }) {
    this.tests.push({ suite, name, result: ok ? 'PASS' : 'FAIL', error: error || null, details: details || null, at: new Date().toISOString() });
  }
  summary() { return { total: this.tests.length, pass: this.tests.filter((t) => t.result === 'PASS').length, fail: this.tests.filter((t) => t.result === 'FAIL').length }; }
  toJSON(extra = {}) {
    return { schema: 'communication_system_v2_test_transcript_v1', generatedAt: new Date().toISOString(), startedAt: this.startedAt, summary: this.summary(), ...extra, tests: this.tests };
  }
}

const log = new TestLog();

async function modalitySuite() {
  const cases = [
    { name: 'frustrated_keywords', text: 'I am stuck and this is completely broken', expectTop: 'frustrated' },
    { name: 'celebrating_keywords', text: 'It works! That is amazing!', expectTop: 'celebrating' },
    { name: 'confused_question', text: 'Wait, what does that mean?', expectTop: 'confused' },
    { name: 'curious_probe', text: 'How would that work? What if we tried this?', expectTop: 'curious' },
    { name: 'excited_energy', text: "I love this! I can't wait to ship it", expectTop: 'excited' },
    { name: 'calm_ack', text: 'That is fine, we can wait.', expectTop: 'calm' },
    { name: 'concerned_risk', text: 'I am worried about the risk here.', expectTop: 'concerned' },
  ];

  for (const c of cases) {
    const scores = extractTranscriptEvidence(c.text);
    const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    try {
      assert.ok(top && top[0] === c.expectTop, `expected top ${c.expectTop}, got ${top ? top[0] : 'none'}`);
      assert.ok(top[1] > 0, 'non-zero score');
      log.add({ suite: 'transcript_modality', name: c.name, ok: true, details: scores });
    } catch (err) {
      log.add({ suite: 'transcript_modality', name: c.name, ok: false, error: err.message, details: scores });
    }
  }

  // Timing.
  const timing = [
    { name: 'long_pause_finished', turn: { pauseMs: 900 }, expectIncludes: 'finished' },
    { name: 'short_pause_no_finished', turn: { pauseMs: 100 }, expectIncludes: null },
    { name: 'slow_response_confused', turn: { latencyMs: 2000 }, expectIncludes: 'confused' },
    { name: 'overlap_frustrated', turn: { overlap: true }, expectIncludes: 'frustrated' },
  ];
  for (const c of timing) {
    const scores = extractTimingEvidence(c.turn);
    try {
      if (c.expectIncludes) assert.ok(Object.keys(scores).includes(c.expectIncludes), `expected ${c.expectIncludes}`);
      else assert.strictEqual(Object.keys(scores).length, 0, 'no timing evidence');
      log.add({ suite: 'timing_modality', name: c.name, ok: true, details: scores });
    } catch (err) {
      log.add({ suite: 'timing_modality', name: c.name, ok: false, error: err.message, details: scores });
    }
  }

  // Tonality.
  const tonal = [
    { name: 'excited_tonality', profile: { meanEnergy: 0.2, pitchStd: 80, wordRate: 150 }, expect: 'excited' },
    { name: 'frustrated_tonality', profile: { meanEnergy: 0.16, pitchStd: 40, meanPauseMs: 200 }, expect: 'frustrated' },
    { name: 'tired_tonality', profile: { meanPitch: 120, meanEnergy: 0.08 }, expect: 'tired' },
    { name: 'uncertain_tonality', profile: { pitchSlope: 40, meanEnergy: 0.08 }, expect: 'confused' },
    { name: 'calm_tonality', profile: { meanEnergy: 0.08, pitchStd: 10 }, expect: 'calm' },
    { name: 'emphatic_tonality', profile: { energyStd: 0.06, pitchStd: 50 }, expect: 'emphatic' },
  ];
  for (const c of tonal) {
    const scores = extractTonalityEvidence(c.profile);
    try {
      assert.ok(scores[c.expect] > 0, `expected ${c.expect} in ${JSON.stringify(scores)}`);
      log.add({ suite: 'tonality_modality', name: c.name, ok: true, details: scores });
    } catch (err) {
      log.add({ suite: 'tonality_modality', name: c.name, ok: false, error: err.message, details: scores });
    }
  }

  // Face/body.
  const fbcases = [
    { name: 'smile_celebrating', fb: { smile: true }, expect: 'celebrating' },
    { name: 'frown_frustrated', fb: { frown: true }, expect: 'frustrated' },
    { name: 'looking_away_confused', fb: { lookingAway: true }, expect: 'confused' },
    { name: 'nod_finished', fb: { nodding: true }, expect: 'finished' },
  ];
  for (const c of fbcases) {
    const scores = extractFaceBodyEvidence(c.fb);
    try {
      assert.ok(scores[c.expect] > 0, `expected ${c.expect}`);
      log.add({ suite: 'face_body_modality', name: c.name, ok: true, details: scores });
    } catch (err) {
      log.add({ suite: 'face_body_modality', name: c.name, ok: false, error: err.message, details: scores });
    }
  }

  // History.
  const h = extractHistoryEvidence({ previousState: 'frustrated', consecutiveQuestions: 2, recentFailures: 1 });
  try {
    assert.ok(h.frustrated > 0 && h.confused > 0, 'history carries forward');
    log.add({ suite: 'history_modality', name: 'cascading_context', ok: true, details: h });
  } catch (err) {
    log.add({ suite: 'history_modality', name: 'cascading_context', ok: false, error: err.message, details: h });
  }
}

async function fusionSuite() {
  const cases = [
    {
      name: 'frustrated_user',
      modalities: {
        transcript: { frustrated: 0.7, confused: 0.2 },
        timing: { confused: 0.4 },
        tonality: { frustrated: 0.5 },
      },
      expect: 'frustrated',
      expectFinished: false,
    },
    {
      name: 'finished_user',
      modalities: {
        transcript: { calm: 0.6, finished: 0.4 },
        timing: { finished: 0.6 },
        history: { finished: 0.25 },
      },
      expect: 'finished',
      expectFinished: true,
    },
    {
      name: 'celebrating_user',
      modalities: {
        transcript: { celebrating: 0.9 },
        tonality: { excited: 0.5 },
        faceBody: { celebrating: 0.4 },
      },
      expect: 'celebrating',
      expectFinished: true,
    },
    {
      name: 'confused_user',
      modalities: {
        transcript: { confused: 0.6 },
        timing: { confused: 0.4 },
        tonality: { confused: 0.4 },
        faceBody: { confused: 0.3 },
      },
      expect: 'confused',
      expectFinished: false,
    },
    {
      name: 'curious_user',
      modalities: {
        transcript: { curious: 0.7 },
        tonality: { curious: 0.4 },
      },
      expect: 'curious',
      expectFinished: false,
    },
  ];

  for (const c of cases) {
    const result = fuseEvidence(c.modalities);
    try {
      assert.strictEqual(result.state, c.expect, `expected ${c.expect}, got ${result.state}`);
      assert.strictEqual(result.finished, c.expectFinished, `finished flag`);
      assert.ok(result.confidence >= 0.3, 'confidence reasonable');
      assert.ok(result.sources.length > 0, 'sources listed');
      log.add({ suite: 'fusion', name: c.name, ok: true, details: result });
    } catch (err) {
      log.add({ suite: 'fusion', name: c.name, ok: false, error: err.message, details: result });
    }
  }

  // Momentum / positive signal detection.
  const momentum = fuseEvidence({
    transcript: { celebrating: 0.8, excited: 0.4 },
    tonality: { excited: 0.5 },
    faceBody: { smile: true },
  });
  try {
    assert.ok(['celebrating', 'excited'].includes(momentum.state), 'momentum is positive');
    log.add({ suite: 'fusion', name: 'positive_momentum_signal', ok: true, details: momentum });
  } catch (err) {
    log.add({ suite: 'fusion', name: 'positive_momentum_signal', ok: false, error: err.message, details: momentum });
  }
}

async function learningSuite() {
  const training = [
    { transcript: 'I am stuck and this is completely broken', timing: { pauseMs: 900 }, tonality: { meanEnergy: 0.16, pitchStd: 40, meanPauseMs: 200 }, label: 'frustrated' },
    { transcript: 'Wait, I do not understand what you mean', timing: { latencyMs: 1800 }, tonality: { pitchSlope: 40, meanEnergy: 0.08 }, label: 'confused' },
    { transcript: 'Great, it works perfectly now!', timing: { pauseMs: 200 }, tonality: { meanEnergy: 0.22, pitchStd: 90, wordRate: 160 }, label: 'celebrating' },
    { transcript: 'That is fine. We can wait.', timing: { pauseMs: 1000 }, tonality: { meanEnergy: 0.08, pitchStd: 10 }, label: 'finished' },
    { transcript: 'How would that work? What if we tried this?', timing: { pauseMs: 300 }, tonality: { meanEnergy: 0.12, pitchStd: 35, wordRate: 140 }, label: 'curious' },
  ];

  const initial = { transcript: 1, timing: 0.8, tonality: 0.8, history: 0.5, faceBody: 0.5 };
  const learned = learnWeights(training, initial, { learningRate: 0.1, iterations: 100 });

  try {
    assert.ok(learned.weights.transcript >= 0.1, 'transcript weight positive');
    assert.ok(Object.keys(learned.weights).length >= 3, 'multiple weights');
    log.add({ suite: 'learning', name: 'weight_learning_runs', ok: true, details: learned });
  } catch (err) {
    log.add({ suite: 'learning', name: 'weight_learning_runs', ok: false, error: err.message, details: learned });
  }

  // After learning, all training examples should be classified correctly.
  let correct = 0;
  for (const ex of training) {
    const modalities = {
      transcript: extractTranscriptEvidence(ex.transcript),
      timing: extractTimingEvidence(ex.timing),
      tonality: extractTonalityEvidence(ex.tonality),
    };
    const result = fuseEvidence(modalities, { weights: learned.weights });
    if (result.state === ex.label) correct += 1;
  }
  try {
    assert.ok(correct >= training.length * 0.6, `learning accuracy ${correct}/${training.length} >= 60%`);
    log.add({ suite: 'learning', name: 'training_accuracy', ok: true, details: { correct, total: training.length, weights: learned.weights } });
  } catch (err) {
    log.add({ suite: 'learning', name: 'training_accuracy', ok: false, error: err.message, details: { correct, total: training.length, weights: learned.weights } });
  }
}

async function main() {
  await modalitySuite();
  await fusionSuite();
  await learningSuite();

  const summary = log.summary();
  const report = log.toJSON({ prototype: 'scripts/prototype-evidence-fusion-v2.mjs' });

  fs.mkdirSync(path.dirname(TRANSCRIPT_PATH), { recursive: true });
  fs.writeFileSync(TRANSCRIPT_PATH, JSON.stringify(report, null, 2));

  console.log(`V2 Evidence Fusion test transcript: ${summary.pass}/${summary.total} passed.`);
  if (summary.fail > 0) {
    console.log('Failures:');
    for (const t of log.tests.filter((t) => t.result === 'FAIL')) console.log(`  [${t.suite}] ${t.name}: ${t.error}`);
    process.exit(1);
  } else {
    console.log(`All V2 tests passed. Transcript written to ${TRANSCRIPT_PATH}`);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
