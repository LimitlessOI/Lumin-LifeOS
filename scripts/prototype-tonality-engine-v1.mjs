#!/usr/bin/env node
/**
 * SYNOPSIS: Prototype V1 — Tonality Engine.
 * Extracts pitch, volume, speaking rate, pause, and roughness from audio or
 * synthetic fixtures, classifies tonal states, and fuses them with transcript
 * evidence to improve turn-completion and contract decisions.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- WAV I/O (mono PCM16 LE) ---

function parseWav(buffer) {
  const view = new DataView(buffer.buffer || buffer);
  const getString = (off, len) => Buffer.from(buffer.subarray(off, off + len)).toString('ascii');
  if (getString(0, 4) !== 'RIFF' || getString(8, 4) !== 'WAVE') {
    throw new Error('Not a WAV file');
  }

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
    const v = view.getInt16(i, true) / 32768.0;
    samples[s++] = v;
  }

  return { sampleRate: fmt.sampleRate, samples };
}

function writeWav(samples, sampleRate, outPath) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const buf = Buffer.alloc(headerSize + dataSize);

  const writeStr = (off, str) => buf.write(str, off, 'ascii');
  const writeU16 = (off, v) => buf.writeUInt16LE(v, off);
  const writeU32 = (off, v) => buf.writeUInt32LE(v, off);

  writeStr(0, 'RIFF');
  writeU32(4, 36 + dataSize);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  writeU32(16, 16);
  writeU16(20, 1); // PCM
  writeU16(22, 1); // mono
  writeU32(24, sampleRate);
  writeU32(28, sampleRate * bytesPerSample);
  writeU16(32, bytesPerSample);
  writeU16(34, 16);
  writeStr(36, 'data');
  writeU32(40, dataSize);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.writeFileSync(outPath, buf);
}

function generateSine(freq, durationSec, sampleRate) {
  const samples = new Float32Array(Math.floor(durationSec * sampleRate));
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / sampleRate;
    samples[i] = Math.sin(2 * Math.PI * freq * t) * 0.5;
  }
  return samples;
}

// --- Feature extraction ---

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

function rms(frame) {
  let sum = 0;
  for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

function zeroCrossingRate(frame) {
  let zcr = 0;
  for (let i = 1; i < frame.length; i += 1) {
    if ((frame[i] >= 0 && frame[i - 1] < 0) || (frame[i] < 0 && frame[i - 1] >= 0)) {
      zcr += 1;
    }
  }
  return zcr / (frame.length - 1);
}

function autocorrelationPitch(frame, sampleRate, minFreq = 50, maxFreq = 1000) {
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);
  let bestLag = null;
  let bestCorr = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < frame.length - lag; i += 1) {
      sum += frame[i] * frame[i + lag];
      count += 1;
    }
    if (count > 0 && sum > bestCorr) {
      bestCorr = sum;
      bestLag = lag;
    }
  }

  if (!bestLag) return null;
  return sampleRate / bestLag;
}

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

  // Cumulative mean normalized difference.
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

function extractFrames(samples, sampleRate, frameMs = 40, hopMs = 20) {
  const frameSize = Math.floor((frameMs / 1000) * sampleRate);
  const hopSize = Math.floor((hopMs / 1000) * sampleRate);
  const maxTau = Math.floor(sampleRate / 50); // enough for lowest pitch
  const frames = [];
  for (let start = 0; start + frameSize + maxTau <= samples.length; start += hopSize) {
    const frame = samples.subarray(start, start + frameSize);
    const extended = samples.subarray(start, start + frameSize + maxTau);
    const energy = rms(frame);
    const zcr = zeroCrossingRate(frame);
    const pitch = energy > 0.005 ? yinPitch(extended, sampleRate) : null;
    frames.push({
      startSec: start / sampleRate,
      endSec: (start + frameSize) / sampleRate,
      energy,
      zcr,
      pitch,
    });
  }
  return frames;
}

function detectPauses(frames, silenceThreshold = 0.01, minPauseMs = 200) {
  const pauses = [];
  let inPause = false;
  let start = 0;
  for (let i = 0; i < frames.length; i += 1) {
    const isSilent = frames[i].energy < silenceThreshold;
    if (isSilent && !inPause) {
      inPause = true;
      start = frames[i].startSec;
    } else if (!isSilent && inPause) {
      inPause = false;
      const dur = (frames[i - 1].endSec || frames[i].startSec) - start;
      if (dur * 1000 >= minPauseMs) pauses.push({ start, end: frames[i].startSec, durationMs: dur * 1000 });
    }
  }
  return pauses;
}

// --- Tonality profile ---

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values) {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export function profileTonality(frames, transcriptText = '', options = {}) {
  const pitches = frames.map((f) => f.pitch).filter((p) => p && Number.isFinite(p));
  const energies = frames.map((f) => f.energy).filter((e) => Number.isFinite(e));
  const speechFrames = frames.filter((f) => f.energy > (options.silenceThreshold || 0.01));
  const speechPitches = speechFrames.map((f) => f.pitch).filter((p) => p && Number.isFinite(p));

  const durationSec = frames.length ? frames[frames.length - 1].endSec : 0;
  const words = (transcriptText || '').split(/\s+/).filter(Boolean).length;
  const wordRate = durationSec > 0 ? (words / durationSec) * 60 : 0;

  const meanPitch = mean(speechPitches);
  const pitchStd = std(speechPitches);
  const pitchRange = speechPitches.length ? Math.max(...speechPitches) - Math.min(...speechPitches) : 0;
  const meanEnergy = mean(energies);
  const energyStd = std(energies);

  const sortedPitches = [...speechPitches].sort((a, b) => a - b);
  const lastPitchFrames = speechPitches.slice(-3);
  const startPitch = mean(sortedPitches.slice(0, Math.min(3, sortedPitches.length)));
  const endPitch = mean(lastPitchFrames);
  const pitchSlope = endPitch - startPitch;

  const pauses = detectPauses(frames, options.silenceThreshold || 0.01, options.minPauseMs || 200);
  const meanPauseMs = mean(pauses.map((p) => p.durationMs));

  return {
    durationSec,
    wordRate,
    meanPitch,
    pitchStd,
    pitchRange,
    meanEnergy,
    energyStd,
    pitchSlope,
    meanPauseMs,
    pauseCount: pauses.length,
    pitchSamples: speechPitches.length,
    energySamples: energies.length,
    frames: frames.length,
  };
}

export function classifyTonality(profile) {
  const states = [];
  const fast = profile.wordRate > 120 || profile.wordRate === 0;
  const slow = profile.wordRate < 90;

  if (profile.meanEnergy > 0.12 && profile.pitchStd > 50 && fast) {
    states.push({ state: 'excited', confidence: 0.7, cues: ['high_energy', 'pitch_variation', fast ? 'fast_speech' : 'no_transcript'] });
  }

  if (profile.meanEnergy > 0.15 && profile.pitchStd > 30 && profile.meanPauseMs < 400) {
    states.push({ state: 'frustrated', confidence: 0.6, cues: ['high_energy', 'irregular_pauses', 'pitch_variation'] });
  }

  if (profile.meanPitch < 140 && profile.meanEnergy < 0.12 && (slow || profile.wordRate === 0)) {
    states.push({ state: 'tired', confidence: 0.65, cues: ['low_pitch', 'low_energy', slow ? 'slow_speech' : 'no_transcript'] });
  }

  if (profile.pitchSlope > 20 && profile.meanEnergy < 0.12) {
    states.push({ state: 'uncertain', confidence: 0.55, cues: ['pitch_rise', 'low_energy'] });
  }

  if (profile.meanEnergy < 0.12 && profile.pitchStd < 30) {
    states.push({ state: 'calm', confidence: 0.65, cues: ['low_energy', 'stable_pitch'] });
  }

  if (profile.energyStd > 0.04 && profile.pitchStd > 30) {
    states.push({ state: 'emphatic', confidence: 0.55, cues: ['energy_spikes', 'pitch_jumps'] });
  }

  if (states.length === 0) {
    states.push({ state: 'neutral', confidence: 0.5, cues: ['no_strong_cues'] });
  }

  return states.sort((a, b) => b.confidence - a.confidence);
}

// --- Evidence fusion with tonality ---

export function fuseTurnCompletionWithTonality(base, tonalityProfile, tonalityClasses) {
  const sources = [...(base.sources || [])];
  let score = base.confidence;

  if (tonalityProfile.meanPauseMs > 600) {
    score += 20;
    sources.push({ source: 'tonality_long_pause', value: tonalityProfile.meanPauseMs, weight: 20 });
  } else if (tonalityProfile.meanPauseMs > 300) {
    score += 10;
    sources.push({ source: 'tonality_pause', value: tonalityProfile.meanPauseMs, weight: 10 });
  }

  const uncertain = tonalityClasses.some((c) => c.state === 'uncertain' && c.confidence > 0.5);
  if (uncertain) {
    score -= 15;
    sources.push({ source: 'tonality_uncertain', value: true, weight: -15 });
  }

  const excited = tonalityClasses.some((c) => c.state === 'excited' && c.confidence > 0.5);
  if (excited) {
    score -= 5;
    sources.push({ source: 'tonality_excited', value: true, weight: -5 });
  }

  score = Math.min(100, Math.max(0, score));
  return { ...base, confidence: score, finished: score >= 75, sources };
}

// --- Main / fixtures ---

function synthesizeSpeechLike(freqBase, variation, durationSec, sampleRate, pauseAtSec = null, amplitude = 0.4) {
  const samples = new Float32Array(Math.floor(durationSec * sampleRate));
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / sampleRate;
    let f = freqBase + variation * Math.sin(2 * Math.PI * 3 * t);
    let amp = amplitude;
    if (pauseAtSec && t >= pauseAtSec && t < pauseAtSec + 0.5) amp = 0;
    samples[i] = Math.sin(2 * Math.PI * f * t) * amp;
  }
  return samples;
}

function selfTest() {
  const sampleRate = 8000;

  // Test pitch detection on pure tones.
  const cases = [
    { freq: 150, file: '/tmp/tonality_150hz.wav' },
    { freq: 250, file: '/tmp/tonality_250hz.wav' },
  ];

  for (const { freq, file } of cases) {
    const samples = generateSine(freq, 1, sampleRate);
    writeWav(samples, sampleRate, file);
    const wav = parseWav(fs.readFileSync(file));
    const ds = downsample(wav.samples, wav.sampleRate, 8000);
    const frames = extractFrames(ds.samples, ds.sampleRate, 40, 20);
    const profile = profileTonality(frames);
    const tol = 10;
    assert.ok(Math.abs(profile.meanPitch - freq) < tol, `pitch for ${freq}Hz should be within ${tol}; got ${profile.meanPitch}`);
  }

  // Test tonality classification: excited vs calm.
  const excited = synthesizeSpeechLike(220, 40, 2, sampleRate);
  const calm = synthesizeSpeechLike(120, 0, 2, sampleRate, null, 0.15);
  const excitedWav = parseWav(Buffer.from(writeWavToBuffer(excited, sampleRate)));
  const calmWav = parseWav(Buffer.from(writeWavToBuffer(calm, sampleRate)));

  const excitedProfile = profileTonality(extractFrames(downsample(excitedWav.samples, excitedWav.sampleRate, 8000).samples, 8000, 40, 20));
  const calmProfile = profileTonality(extractFrames(downsample(calmWav.samples, calmWav.sampleRate, 8000).samples, 8000, 40, 20));

  const excitedClasses = classifyTonality(excitedProfile);
  const calmClasses = classifyTonality(calmProfile);

  assert.ok(excitedClasses.some((c) => c.state === 'excited'), 'excited synthetic should be classified as excited');
  assert.ok(calmClasses.some((c) => c.state === 'calm' || c.state === 'tired'), 'calm synthetic should be calm or tired');

  console.log('Tonality self-tests passed.');
  console.log('excitedProfile:', JSON.stringify(excitedProfile, null, 2));
  console.log('calmProfile:', JSON.stringify(calmProfile, null, 2));
}

function writeWavToBuffer(samples, sampleRate) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
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

async function main() {
  const args = process.argv.slice(2);
  const wavIdx = args.indexOf('--wav');
  const wavPath = wavIdx !== -1 ? args[wavIdx + 1] : null;
  const fixture = args.includes('--fixture');

  if (wavPath) {
    const wav = parseWav(fs.readFileSync(wavPath));
    const ds = downsample(wav.samples, wav.sampleRate, 8000);
    const frames = extractFrames(ds.samples, ds.sampleRate, 40, 20);
    const profile = profileTonality(frames, '', { silenceThreshold: 0.005 });
    const classes = classifyTonality(profile);
    console.log(JSON.stringify({ profile, classes }, null, 2));
    return;
  }

  if (fixture) {
    const synthetic = synthesizeSpeechLike(180, 30, 3, 8000, 1.2);
    const buf = writeWavToBuffer(synthetic, 8000);
    const wav = parseWav(buf);
    const ds = downsample(wav.samples, wav.sampleRate, 8000);
    const frames = extractFrames(ds.samples, ds.sampleRate, 40, 20);
    const profile = profileTonality(frames, 'I want to build this thing with you', { silenceThreshold: 0.005 });
    const classes = classifyTonality(profile);
    const base = {
      confidence: 60,
      finished: false,
      sources: [
        { source: 'transcript_final', value: true, weight: 25 },
        { source: 'trailing_punctuation', value: false, weight: 0 },
      ],
    };
    const fused = fuseTurnCompletionWithTonality(base, profile, classes);
    console.log(JSON.stringify({ profile, classes, fused }, null, 2));
    return;
  }

  selfTest();
}

if (process.argv.includes('--test')) {
  selfTest();
} else {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
