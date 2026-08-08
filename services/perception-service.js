/**
 * SYNOPSIS: Perception Engine -- face/body/biometric channels under explicit
 * per-context consent, fused with transcript + tonality evidence via the
 * shared Evidence Fusion service. Ported from the proven prototype
 * (scripts/prototype-perception-v3.mjs, 27/27 tests) -- same algorithm, no
 * changes to scoring logic. Face/body/biometric signal COLLECTION is out of
 * scope here; this module only fuses already-collected signals.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { extractTranscriptEvidence, extractTonalityEvidence, fuseEvidence } from './evidence-fusion-service.js';

export function hasConsent(consents, channel) {
  return !!(consents && consents[channel]);
}

export function extractFaceEvidence(faceFrame) {
  const f = faceFrame || {};
  const scores = {};
  if (f.smile > 0.5) scores.celebrating = Math.min(1, f.smile);
  if (f.frown > 0.4) scores.frustrated = Math.min(1, f.frown);
  if (f.raisedEyebrows > 0.4) scores.confused = Math.min(1, f.raisedEyebrows);
  if (f.lookingAway > 0.5) scores.confused = Math.max(scores.confused || 0, f.lookingAway * 0.7);
  if (f.eyeContact > 0.7) scores.finished = Math.min(1, f.eyeContact * 0.5);
  if (f.headNod > 0.5) scores.finished = Math.max(scores.finished || 0, f.headNod);
  if (f.yawning > 0.5) scores.tired = Math.min(1, f.yawning);
  return scores;
}

export function extractBodyEvidence(bodyFrame) {
  const b = bodyFrame || {};
  const scores = {};
  if (b.leaningForward > 0.5) {
    scores.curious = Math.min(1, b.leaningForward);
    scores.finished = Math.max(scores.finished || 0, b.leaningForward * 0.3);
  }
  if (b.leaningBack > 0.5) scores.calm = Math.min(1, b.leaningBack * 0.6);
  if (b.restless > 0.5) scores.frustrated = Math.max(scores.frustrated || 0, b.restless);
  if (b.handRaised) scores.curious = Math.max(scores.curious || 0, 0.4);
  if (b.gesturing > 0.5) scores.emphatic = Math.min(1, b.gesturing);
  if (b.slumped > 0.5) scores.tired = Math.min(1, b.slumped);
  return scores;
}

export function extractBiometricEvidence(bioFrame) {
  const b = bioFrame || {};
  const scores = {};
  const hr = b.heartRate || 70;
  const hrv = b.heartRateVariability || 50;
  const gsr = b.skinConductance || 0.5;

  if (hr > 95 && hrv < 30) scores.excited = 0.5;
  if (hr > 90 && gsr > 1.2) scores.frustrated = 0.5;
  if (hr < 60) scores.tired = 0.4;
  if (hrv > 60 && gsr < 0.7) scores.calm = 0.5;
  return scores;
}

export function detectPositiveSignals(faceFrame, bodyFrame) {
  const signals = [];
  const f = faceFrame || {};
  const b = bodyFrame || {};
  if (f.smile > 0.5) signals.push({ signal: 'smile', confidence: f.smile });
  if (f.headNod > 0.5) signals.push({ signal: 'nod', confidence: f.headNod });
  if (b.leaningForward > 0.5) signals.push({ signal: 'leaning_forward', confidence: b.leaningForward });
  if (f.raisedEyebrows > 0.4) signals.push({ signal: 'raised_eyebrows', confidence: f.raisedEyebrows });
  if (f.eyeContact > 0.7) signals.push({ signal: 'steady_gaze', confidence: f.eyeContact });
  if (b.gesturing > 0.4) signals.push({ signal: 'expressive_gesture', confidence: b.gesturing });
  return signals;
}

export function fusePerception({ transcript, tonality, faceFrame, bodyFrame, bioFrame, consents }, options = {}) {
  const modalities = {};

  if (transcript) modalities.transcript = extractTranscriptEvidence(transcript);
  if (tonality) modalities.tonality = extractTonalityEvidence(tonality);
  if (hasConsent(consents, 'camera')) {
    if (faceFrame) modalities.face = extractFaceEvidence(faceFrame);
    if (bodyFrame) modalities.body = extractBodyEvidence(bodyFrame);
  }
  if (hasConsent(consents, 'biometric') && bioFrame) modalities.biometric = extractBiometricEvidence(bioFrame);

  const weights = {
    transcript: 1,
    tonality: 1,
    face: 0.8,
    body: 0.7,
    biometric: 0.5,
  };

  const result = fuseEvidence(modalities, { ...options, weights });
  const positive = detectPositiveSignals(faceFrame, bodyFrame);

  return {
    ...result,
    modalities,
    positiveSignals: positive,
    consent: { camera: hasConsent(consents, 'camera'), biometric: hasConsent(consents, 'biometric') },
  };
}