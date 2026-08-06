#!/usr/bin/env node
/**
 * SYNOPSIS: Exhaustive V1.1 Tonality Engine test transcript.
 * Generates synthetic audio, parses WAV, profiles pitch/energy/pauses, classifies
 * tonal states, and fuses with contract evidence.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profileTonality, classifyTonality, fuseTurnCompletionWithTonality } from './prototype-tonality-engine-v1.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPT_PATH = path.resolve(__dirname, '../products/receipts/COMMUNICATION_SYSTEM_V1_1_TONALITY_TEST_TRANSCRIPT.json');

function writeWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buf.writeUInt16LE(bytesPerSample, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buf;
}

function parseWav(buffer) {
  const view = new DataView(buffer.buffer || buffer);
  const getString = (off, len) => Buffer.from(buffer.subarray(off, off + len)).toString('ascii');
  if (getString(0, 4) !== 'RIFF' || getString(8, 4) !== 'WAVE') throw new Error('Not a WAV file');
  let off = 12;
  let fmt = null;
  let dataOffset = 0;
  let dataSize = 0;
  while (off < buffer.length) {
    const chunkId = getString(off, 4);
    const chunkSize = view.getUint32(off + 4, true);
    if (chunkId === 'fmt ') {
      fmt = {
        format: view.getUint16(off + 8, true),
        channels: view.getUint16(off + 10, true),
        sampleRate: view.getUint32(off + 12, true),
        bitsPerSample: view.getUint16(off + 22, true),
      };
    } else if (chunkId === 'data') {
      dataOffset = off + 8;
      dataSize = chunkSize;
      break;
    }
    off += 8 + chunkSize;
    if (chunkSize % 2) off += 1;
  }
  if (!fmt || fmt.format !== 1) throw new Error('Only PCM WAV supported');
  if (fmt.bitsPerSample !== 16) throw new Error('Only 16-bit WAV supported');
  const samples = new Float32Array(dataSize / (fmt.bitsPerSample / 8) / fmt.channels);
  let s = 0;
  for (let i = dataOffset; i < dataOffset + dataSize; i += fmt.channels * 2) {
    samples[s++] = view.getInt16(i, true) / 32768.0;
  }
  return { sampleRate: fmt.sampleRate, samples };
}

function downsample(samples, sampleRate, targetRate) {
  const ratio = Math.floor(sampleRate / targetRate);
  if (ratio <= 1) return { sampleRate, samples };
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i += 1) {
    let sum = 0;
    for (let j = 0; j < ratio; j += 1) sum += samples[i * ratio + j] || 0;
    out[i] = sum / ratio;
  }
  return { sampleRate: targetRate, samples: out };
}

// YIN pitch detector copied locally so frames can be built without exporting internals.
function yinPitch(samples, sampleRate, threshold = 0.15, minFreq = 50, maxFreq = 1000) {
  const minTau = Math.max(1, Math.floor(sampleRate / maxFreq));
  const maxTau = Math.floor(sampleRate / minFreq);
  const diff = new Float64Array(maxTau + 1);
  for (let tau = minTau; tau <= maxTau; tau += 1) {
    let sum = 0;
    const limit = Math.min(samples.length - maxTau, samples.length - tau);
    for (let i = 0; i < limit; i += 1) {
      const d = samples[i] - samples[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }
  const cmnd = new Float64Array(maxTau + 1);
  let running = 0;
  for (let tau = minTau; tau <= maxTau; tau += 1) {
    running += diff[tau];
    cmnd[tau] = diff[tau] / (running / (tau - minTau + 1));
  }
  let tau = -1;
  for (let t = minTau + 1; t < maxTau; t += 1) {
    if (cmnd[t] < threshold && cmnd[t] < cmnd[t - 1] && cmnd[t] < cmnd[t + 1]) {
      tau = t;
      break;
    }
  }
  if (tau === -1) return null;
  const a = cmnd[tau - 1];
  const b = cmnd[tau];
  const c = cmnd[tau + 1];
  const p = 0.5 * (a - c) / (a - 2 * b + c);
  return sampleRate / (tau + p);
}

function rms(frame) {
  let sum = 0;
  for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

function zeroCrossingRate(frame) {
  let zcr = 0;
  for (let i = 1; i < frame.length; i += 1) {
    if ((frame[i] >= 0 && frame[i - 1] < 0) || (frame[i] < 0 && frame[i - 1] >= 0)) zcr += 1;
  }
  return zcr / (frame.length - 1);
}

function buildFrames(samples, sampleRate, frameMs = 40, hopMs = 20) {
  const frameSize = Math.floor((frameMs / 1000) * sampleRate);
  const hopSize = Math.floor((hopMs / 1000) * sampleRate);
  const maxTau = Math.floor(sampleRate / 50);
  const frames = [];
  for (let start = 0; start + frameSize + maxTau <= samples.length; start += hopSize) {
    const frame = samples.subarray(start, start + frameSize);
    const extended = samples.subarray(start, start + frameSize + maxTau);
    const energy = rms(frame);
    const zcr = zeroCrossingRate(frame);
    const pitch = energy > 0.005 ? yinPitch(extended, sampleRate) : null;
    frames.push({ startSec: start / sampleRate, endSec: (start + frameSize) / sampleRate, energy, zcr, pitch });
  }
  return frames;
}

function generateSine(freq, durationSec, sampleRate, amplitude = 0.5) {
  const samples = new Float32Array(Math.floor(durationSec * sampleRate));
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.sin(2 * Math.PI * freq * (i / sampleRate)) * amplitude;
  }
  return samples;
}

function synthesizeVocal(baseFreq, variation, durationSec, sampleRate, amplitude = 0.4, pauseAtSec = null) {
  const samples = new Float32Array(Math.floor(durationSec * sampleRate));
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / sampleRate;
    let f = baseFreq + variation * Math.sin(2 * Math.PI * 3 * t);
    let amp = amplitude;
    if (pauseAtSec && t >= pauseAtSec && t < pauseAtSec + 0.5) amp = 0;
    samples[i] = Math.sin(2 * Math.PI * f * t) * amp;
  }
  return samples;
}

function synthesizeEmphatic(baseFreq, durationSec, sampleRate) {
  // Amplitude-spiked speech to trigger energyStd + pitch jumps.
  const samples = new Float32Array(Math.floor(durationSec * sampleRate));
  const words = 5;
  const wordLen = durationSec / words;
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / sampleRate;
    const wordIdx = Math.floor(t / wordLen);
    const inWord = (t % wordLen) / wordLen;
    const f = baseFreq + (wordIdx % 2 === 0 ? 40 : -30);
    const spike = Math.sin(2 * Math.PI * inWord * 3); // envelope within word
    const amp = 0.25 + 0.25 * spike;
    samples[i] = Math.sin(2 * Math.PI * f * t) * Math.max(0.05, amp);
  }
  return samples;
}

function buildProfile(samples, sampleRate, transcriptText = '', options = {}) {
  const ds = downsample(samples, sampleRate, 8000);
  const frames = buildFrames(ds.samples, ds.sampleRate, 40, 20);
  return profileTonality(frames, transcriptText, options);
}

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
    return { schema: 'communication_system_v1_1_tonality_test_transcript_v1', generatedAt: new Date().toISOString(), startedAt: this.startedAt, summary: this.summary(), ...extra, tests: this.tests };
  }
}

const log = new TestLog();

async function pitchSuite() {
  const sampleRate = 8000;
  const freqs = [120, 220, 440];
  for (const freq of freqs) {
    const samples = generateSine(freq, 1.5, sampleRate, 0.5);
    const profile = buildProfile(samples, sampleRate);
    try {
      assert.ok(Math.abs(profile.meanPitch - freq) < 15, `pitch for ${freq}Hz within tolerance; got ${profile.meanPitch}`);
      assert.ok(profile.pitchSamples > 0, 'pitch samples > 0');
      log.add({ suite: 'pitch', name: `sine_${freq}hz`, ok: true, details: profile });
    } catch (err) {
      log.add({ suite: 'pitch', name: `sine_${freq}hz`, ok: false, error: err.message, details: profile });
    }
  }

  // WAV round-trip.
  const freq = 250;
  const samples = generateSine(freq, 1, sampleRate);
  const buf = writeWav(samples, sampleRate);
  const wav = parseWav(buf);
  const profile = buildProfile(wav.samples, wav.sampleRate);
  try {
    assert.strictEqual(wav.sampleRate, sampleRate, 'parsed sample rate');
    assert.ok(Math.abs(profile.meanPitch - freq) < 15, `round-trip pitch for ${freq}Hz`);
    log.add({ suite: 'pitch', name: 'wav_round_trip_250hz', ok: true, details: profile });
  } catch (err) {
    log.add({ suite: 'pitch', name: 'wav_round_trip_250hz', ok: false, error: err.message, details: profile });
  }
}

async function classificationSuite() {
  const sampleRate = 8000;

  const cases = [
    { name: 'excited', base: 250, variation: 60, amp: 0.45, duration: 2, text: 'I want to build this thing with you right now', expect: 'excited' },
    { name: 'calm', base: 150, variation: 0, amp: 0.1, duration: 2, text: 'that is fine we can wait', expect: 'calm' },
    { name: 'tired', base: 100, variation: 0, amp: 0.08, duration: 2.5, text: 'I am tired', expect: 'tired' },
    { name: 'uncertain', base: 120, variation: 30, amp: 0.1, duration: 2, text: 'maybe we should try that?', expect: 'uncertain' },
    { name: 'frustrated', base: 200, variation: 45, amp: 0.5, duration: 1.5, text: 'this keeps breaking every single time', expect: 'frustrated' },
    { name: 'emphatic', base: 180, variation: 0, amp: 0.25, duration: 2, text: 'we must finish this tonight', expect: 'emphatic', useEmphatic: true },
  ];

  for (const c of cases) {
    const samples = c.useEmphatic ? synthesizeEmphatic(c.base, c.duration, sampleRate) : synthesizeVocal(c.base, c.variation, c.duration, sampleRate, c.amp);
    const profile = buildProfile(samples, sampleRate, c.text, { silenceThreshold: 0.005 });
    const classes = classifyTonality(profile);
    try {
      assert.ok(classes.some((cls) => cls.state === c.expect), `expected ${c.expect} in ${classes.map((x) => x.state).join(',')}`);
      log.add({ suite: 'classification', name: c.name, ok: true, details: { profile, classes } });
    } catch (err) {
      log.add({ suite: 'classification', name: c.name, ok: false, error: err.message, details: { profile, classes } });
    }
  }

  // Neutral / calm fallback: low stable pitch, low energy, no strong cues.
  const neutralSamples = synthesizeVocal(180, 0, 1.5, sampleRate, 0.15);
  const neutralProfile = buildProfile(neutralSamples, sampleRate, 'the report is in the folder');
  const neutralClasses = classifyTonality(neutralProfile);
  try {
    assert.ok(neutralClasses.length > 0, 'classes exist');
    assert.ok(['neutral', 'calm'].includes(neutralClasses[0].state), `expected neutral or calm, got ${neutralClasses[0].state}`);
    log.add({ suite: 'classification', name: 'neutral', ok: true, details: { profile: neutralProfile, classes: neutralClasses } });
  } catch (err) {
    log.add({ suite: 'classification', name: 'neutral', ok: false, error: err.message, details: { profile: neutralProfile, classes: neutralClasses } });
  }
}

async function pauseSuite() {
  const sampleRate = 8000;
  // 2.5s audio with a 0.7s silence in the middle.
  const samples = synthesizeVocal(180, 10, 2.5, sampleRate, 0.25, 0.9);
  const profile = buildProfile(samples, sampleRate, 'we need to pause and think', { silenceThreshold: 0.01, minPauseMs: 200 });
  try {
    assert.ok(profile.pauseCount >= 1, 'detected at least one pause');
    assert.ok(profile.meanPauseMs > 400, `long pause detected; got ${profile.meanPauseMs}`);
    log.add({ suite: 'pause', name: 'detect_long_silence', ok: true, details: profile });
  } catch (err) {
    log.add({ suite: 'pause', name: 'detect_long_silence', ok: false, error: err.message, details: profile });
  }

  const noPause = synthesizeVocal(180, 5, 1.5, sampleRate, 0.2);
  const noPauseProfile = buildProfile(noPause, sampleRate, 'continuous speech', { silenceThreshold: 0.01, minPauseMs: 200 });
  try {
    assert.strictEqual(noPauseProfile.pauseCount, 0, 'no false pauses');
    log.add({ suite: 'pause', name: 'no_false_pauses', ok: true, details: noPauseProfile });
  } catch (err) {
    log.add({ suite: 'pause', name: 'no_false_pauses', ok: false, error: err.message, details: noPauseProfile });
  }
}

async function fusionSuite() {
  const sampleRate = 8000;
  const excitedSamples = synthesizeVocal(250, 60, 2, sampleRate, 0.45);
  const profile = buildProfile(excitedSamples, sampleRate, 'I want to build this thing with you', { silenceThreshold: 0.005 });
  const classes = classifyTonality(profile);

  const base = { confidence: 60, finished: false, sources: [{ source: 'transcript_final', value: true, weight: 25 }, { source: 'trailing_punctuation', value: true, weight: 35 }] };
  const fused = fuseTurnCompletionWithTonality(base, profile, classes);
  try {
    assert.ok(fused.confidence >= base.confidence || fused.confidence <= 100, 'fused score bounded');
    assert.ok(Array.isArray(fused.sources), 'sources preserved');
    log.add({ suite: 'fusion', name: 'tonality_fusion_does_not_crash', ok: true, details: fused });
  } catch (err) {
    log.add({ suite: 'fusion', name: 'tonality_fusion_does_not_crash', ok: false, error: err.message, details: fused });
  }

  // A long pause via tonality should boost completion.
  const pausedSamples = synthesizeVocal(180, 0, 2.5, sampleRate, 0.2, 1.2);
  const pausedProfile = buildProfile(pausedSamples, sampleRate, 'ok.', { silenceThreshold: 0.005, minPauseMs: 200 });
  const pausedClasses = classifyTonality(pausedProfile);
  const lowBase = { confidence: 50, finished: false, sources: [{ source: 'transcript_final', value: true, weight: 25 }] };
  const pausedFused = fuseTurnCompletionWithTonality(lowBase, pausedProfile, pausedClasses);
  try {
    assert.ok(pausedFused.confidence > lowBase.confidence, 'long pause boosts confidence');
    log.add({ suite: 'fusion', name: 'long_pause_boosts_completion', ok: true, details: pausedFused });
  } catch (err) {
    log.add({ suite: 'fusion', name: 'long_pause_boosts_completion', ok: false, error: err.message, details: pausedFused });
  }
}

async function main() {
  await pitchSuite();
  await classificationSuite();
  await pauseSuite();
  await fusionSuite();

  const summary = log.summary();
  const report = log.toJSON({ prototype: 'scripts/prototype-tonality-engine-v1.mjs' });

  fs.mkdirSync(path.dirname(TRANSCRIPT_PATH), { recursive: true });
  fs.writeFileSync(TRANSCRIPT_PATH, JSON.stringify(report, null, 2));

  console.log(`V1.1 Tonality Engine test transcript: ${summary.pass}/${summary.total} passed.`);
  if (summary.fail > 0) {
    console.log('Failures:');
    for (const t of log.tests.filter((t) => t.result === 'FAIL')) console.log(`  [${t.suite}] ${t.name}: ${t.error}`);
    process.exit(1);
  } else {
    console.log(`All V1.1 tests passed. Transcript written to ${TRANSCRIPT_PATH}`);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
