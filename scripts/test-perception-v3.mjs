#!/usr/bin/env node
/**
 * SYNOPSIS: Exhaustive V3 Perception (face/body/biometric) test transcript.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasConsent, extractFaceEvidence, extractBodyEvidence, extractBiometricEvidence, detectPositiveSignals, fusePerception } from './prototype-perception-v3.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPT_PATH = path.resolve(__dirname, '../products/receipts/COMMUNICATION_SYSTEM_V3_TEST_TRANSCRIPT.json');

class TestLog {
  constructor() { this.tests = []; this.startedAt = new Date().toISOString(); }
  add({ suite, name, ok, error, details }) { this.tests.push({ suite, name, result: ok ? 'PASS' : 'FAIL', error: error || null, details: details || null, at: new Date().toISOString() }); }
  summary() { return { total: this.tests.length, pass: this.tests.filter((t) => t.result === 'PASS').length, fail: this.tests.filter((t) => t.result === 'FAIL').length }; }
  toJSON(extra = {}) { return { schema: 'communication_system_v3_test_transcript_v1', generatedAt: new Date().toISOString(), startedAt: this.startedAt, summary: this.summary(), ...extra, tests: this.tests }; }
}

const log = new TestLog();

async function consentSuite() {
  const cases = [
    { consents: { camera: true, microphone: true }, channel: 'camera', expect: true },
    { consents: { camera: false, microphone: true }, channel: 'camera', expect: false },
    { consents: { biometric: true }, channel: 'biometric', expect: true },
    { consents: {}, channel: 'camera', expect: false },
    { consents: undefined, channel: 'camera', expect: false },
  ];
  for (const c of cases) {
    try {
      assert.strictEqual(hasConsent(c.consents, c.channel), c.expect);
      log.add({ suite: 'consent', name: `channel_${c.channel}_consent_${c.expect}`, ok: true, details: c });
    } catch (err) {
      log.add({ suite: 'consent', name: `channel_${c.channel}_consent_${c.expect}`, ok: false, error: err.message, details: c });
    }
  }
}

async function faceSuite() {
  const cases = [
    { name: 'smile_celebrating', frame: { smile: 0.9 }, expect: 'celebrating' },
    { name: 'frown_frustrated', frame: { frown: 0.9 }, expect: 'frustrated' },
    { name: 'raised_eyebrows_confused', frame: { raisedEyebrows: 0.8 }, expect: 'confused' },
    { name: 'looking_away_confused', frame: { lookingAway: 0.9, eyeContact: 0.1 }, expect: 'confused' },
    { name: 'nod_finished', frame: { headNod: 0.8, eyeContact: 0.8 }, expect: 'finished' },
    { name: 'yawn_tired', frame: { yawning: 0.9 }, expect: 'tired' },
  ];
  for (const c of cases) {
    const scores = extractFaceEvidence(c.frame);
    const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    try {
      assert.ok(top && top[0] === c.expect, `expected ${c.expect}, got ${top ? top[0] : 'none'}`);
      log.add({ suite: 'face', name: c.name, ok: true, details: scores });
    } catch (err) {
      log.add({ suite: 'face', name: c.name, ok: false, error: err.message, details: scores });
    }
  }
}

async function bodySuite() {
  const cases = [
    { name: 'lean_forward_curious', frame: { leaningForward: 0.8 }, expect: 'curious' },
    { name: 'lean_back_calm', frame: { leaningBack: 0.8 }, expect: 'calm' },
    { name: 'restless_frustrated', frame: { restless: 0.8 }, expect: 'frustrated' },
    { name: 'hand_raised_curious', frame: { handRaised: true }, expect: 'curious' },
    { name: 'gesturing_emphatic', frame: { gesturing: 0.8 }, expect: 'emphatic' },
    { name: 'slumped_tired', frame: { slumped: 0.9 }, expect: 'tired' },
  ];
  for (const c of cases) {
    const scores = extractBodyEvidence(c.frame);
    const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    try {
      assert.ok(top && top[0] === c.expect, `expected ${c.expect}, got ${top ? top[0] : 'none'}`);
      log.add({ suite: 'body', name: c.name, ok: true, details: scores });
    } catch (err) {
      log.add({ suite: 'body', name: c.name, ok: false, error: err.message, details: scores });
    }
  }
}

async function biometricSuite() {
  const cases = [
    { name: 'elevated_hr_excited', frame: { heartRate: 105, heartRateVariability: 25, skinConductance: 0.8 }, expect: 'excited' },
    { name: 'high_gsr_frustrated', frame: { heartRate: 95, heartRateVariability: 35, skinConductance: 1.5 }, expect: 'frustrated' },
    { name: 'low_hr_tired', frame: { heartRate: 55, heartRateVariability: 50, skinConductance: 0.5 }, expect: 'tired' },
    { name: 'high_hrv_calm', frame: { heartRate: 70, heartRateVariability: 65, skinConductance: 0.5 }, expect: 'calm' },
  ];
  for (const c of cases) {
    const scores = extractBiometricEvidence(c.frame);
    const top = Object.entries(scores).sort((a, b) => b[1] - a[0])[0];
    try {
      assert.ok(top && top[0] === c.expect, `expected ${c.expect}, got ${top ? top[0] : 'none'}`);
      log.add({ suite: 'biometric', name: c.name, ok: true, details: scores });
    } catch (err) {
      log.add({ suite: 'biometric', name: c.name, ok: false, error: err.message, details: scores });
    }
  }
}

async function positiveSignalsSuite() {
  const face = { smile: 0.9, raisedEyebrows: 0.7, eyeContact: 0.85, headNod: 0.8 };
  const body = { leaningForward: 0.9, gesturing: 0.6 };
  const signals = detectPositiveSignals(face, body);
  const names = signals.map((s) => s.signal);
  try {
    assert.ok(names.includes('smile'), 'smile signal');
    assert.ok(names.includes('nod'), 'nod signal');
    assert.ok(names.includes('leaning_forward'), 'leaning forward signal');
    assert.ok(names.includes('raised_eyebrows'), 'raised eyebrows signal');
    assert.ok(names.includes('steady_gaze'), 'steady gaze signal');
    assert.ok(names.includes('expressive_gesture'), 'expressive gesture signal');
    log.add({ suite: 'positive_signals', name: 'detect_all_positive_cues', ok: true, details: signals });
  } catch (err) {
    log.add({ suite: 'positive_signals', name: 'detect_all_positive_cues', ok: false, error: err.message, details: signals });
  }
}

async function fusionSuite() {
  const cases = [
    {
      name: 'confused_looking_away',
      input: { transcript: 'I am confused and lost.', faceFrame: { raisedEyebrows: 0.8, lookingAway: 0.7 }, consents: { camera: true } },
      expect: 'confused',
    },
    {
      name: 'frustrated_frown_restless',
      input: { transcript: 'This is broken again.', faceFrame: { frown: 0.9 }, bodyFrame: { restless: 0.8 }, consents: { camera: true } },
      expect: 'frustrated',
    },
    {
      name: 'celebrating_smile_nod',
      input: { transcript: 'Great, it works!', faceFrame: { smile: 0.9, headNod: 0.7, eyeContact: 0.8 }, bodyFrame: { leaningForward: 0.7 }, consents: { camera: true } },
      expect: 'celebrating',
    },
    {
      name: 'camera_denied_uses_text',
      input: { transcript: 'I am worried about this.', faceFrame: { frown: 0.9 }, consents: { camera: false } },
      expect: 'concerned',
    },
    {
      name: 'biometric_only_calm',
      input: { bioFrame: { heartRate: 65, heartRateVariability: 65, skinConductance: 0.5 }, consents: { biometric: true } },
      expect: 'calm',
    },
  ];

  for (const c of cases) {
    const result = fusePerception(c.input);
    try {
      assert.strictEqual(result.state, c.expect, `expected ${c.expect}, got ${result.state}`);
      if (c.input.consents && c.input.consents.camera === false) {
        assert.strictEqual(result.modalities.face, undefined, 'face ignored when consent denied');
      }
      log.add({ suite: 'fusion', name: c.name, ok: true, details: result });
    } catch (err) {
      log.add({ suite: 'fusion', name: c.name, ok: false, error: err.message, details: result });
    }
  }
}

async function main() {
  await consentSuite();
  await faceSuite();
  await bodySuite();
  await biometricSuite();
  await positiveSignalsSuite();
  await fusionSuite();

  const summary = log.summary();
  const report = log.toJSON({ prototype: 'scripts/prototype-perception-v3.mjs' });

  fs.mkdirSync(path.dirname(TRANSCRIPT_PATH), { recursive: true });
  fs.writeFileSync(TRANSCRIPT_PATH, JSON.stringify(report, null, 2));

  console.log(`V3 Perception test transcript: ${summary.pass}/${summary.total} passed.`);
  if (summary.fail > 0) {
    console.log('Failures:');
    for (const t of log.tests.filter((t) => t.result === 'FAIL')) console.log(`  [${t.suite}] ${t.name}: ${t.error}`);
    process.exit(1);
  } else {
    console.log(`All V3 tests passed. Transcript written to ${TRANSCRIPT_PATH}`);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
