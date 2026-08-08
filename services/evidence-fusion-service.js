/**
 * SYNOPSIS: Evidence Fusion Engine -- combines transcript, timing, tonality,
 * history, and face/body signals into calibrated confidence estimates for
 * user cognitive/emotional state, and learns per-context modality weights
 * from labeled outcomes. Ported from the proven prototype
 * (scripts/prototype-evidence-fusion-v2.mjs, 30/30 tests) -- same algorithm,
 * no changes to scoring logic.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const KEYWORD_BANK = {
  frustrated: ['stuck', 'broken', 'annoying', 'annoyed', 'frustrated', 'nothing works', 'waste', 'terrible', 'hate', 'sick of', 'fed up'],
  celebrating: ['fixed', 'solved', 'done', 'great', 'awesome', 'works', 'perfect', 'amazing', 'love it', 'yes', 'celebrate', 'victory'],
  confused: ['what', 'huh', 'confused', 'lost', 'doesn\'t make sense', 'unclear', 'not sure', '?', 'don\'t understand'],
  curious: ['how', 'why', 'what if', 'could we', 'would it', 'interesting', 'curious', 'wonder', 'explore', 'try', 'tried', 'trying'],
  excited: ['love', 'excited', ' pumped', 'stoked', 'thrilled', 'can\'t wait', 'let\'s go', 'next', 'more'],
  calm: ['fine', 'ok', 'okay', 'calm', 'steady', 'relaxed', 'sure', 'wait'],
  concerned: ['worried', 'concerned', 'nervous', 'anxious', 'risk', 'what about', 'safe'],
};

export function extractTranscriptEvidence(text) {
  const lower = String(text || '').toLowerCase();
  const scores = {};
  for (const [state, words] of Object.entries(KEYWORD_BANK)) {
    let hits = 0;
    for (const w of words) if (lower.includes(w)) hits += 1;
    scores[state] = Math.min(1, hits * 0.35 + (lower.includes('?') && state === 'confused' ? 0.2 : 0));
  }
  if (/!/.test(text)) scores.celebrating = Math.max(scores.celebrating || 0, 0.3);
  if (/\?/.test(text)) {
    if ((scores.curious || 0) > (scores.confused || 0)) {
      scores.curious = Math.max(scores.curious || 0, 0.25);
    } else {
      scores.confused = Math.max(scores.confused || 0, 0.1);
    }
  }
  if (/\.{2,}|…/.test(text)) scores.confused = Math.max(scores.confused || 0, 0.15);
  return scores;
}

export function extractTimingEvidence(turn) {
  const pauseMs = turn.pauseMs || 0;
  const latencyMs = turn.latencyMs || 0;
  const overlap = turn.overlap || false;
  const scores = {};
  if (pauseMs > 800) scores.finished = 0.6;
  else if (pauseMs > 300) scores.finished = 0.3;
  if (latencyMs > 1500 && !overlap) scores.confused = 0.4;
  if (overlap) scores.frustrated = 0.3;
  return scores;
}

export function extractTonalityEvidence(tonalityProfile) {
  const p = tonalityProfile || {};
  const scores = {};
  if (p.meanEnergy > 0.12 && p.pitchStd > 50 && p.wordRate > 120) scores.excited = 0.6;
  if (p.meanEnergy > 0.15 && p.pitchStd > 30 && p.meanPauseMs < 400) scores.frustrated = 0.5;
  if (p.meanPitch < 140 && p.meanEnergy < 0.12) scores.tired = 0.5;
  if (p.pitchSlope > 20 && p.meanEnergy < 0.12) scores.confused = 0.4;
  if (p.meanEnergy < 0.12 && p.pitchStd < 30) scores.calm = 0.5;
  if (p.energyStd > 0.04 && p.pitchStd > 30) scores.emphatic = 0.4;
  return scores;
}

export function extractHistoryEvidence(history) {
  const h = history || {};
  const scores = {};
  if (h.previousState === 'frustrated') scores.frustrated = 0.2;
  if (h.previousState === 'confused') scores.confused = 0.2;
  if (h.previousState === 'celebrating') scores.celebrating = 0.15;
  if (h.consecutiveQuestions > 1) scores.confused = 0.25;
  if (h.consecutiveAffirmatives > 1) scores.finished = 0.25;
  if (h.recentFailures > 0) scores.frustrated = 0.2;
  return scores;
}

export function extractFaceBodyEvidence(faceBody) {
  const fb = faceBody || {};
  const scores = {};
  if (fb.lookingAway) scores.confused = 0.3;
  if (fb.frown) scores.frustrated = 0.4;
  if (fb.smile) scores.celebrating = 0.4;
  if (fb.raisedEyebrows) scores.confused = 0.3;
  if (fb.nodding) scores.finished = 0.3;
  return scores;
}

function normalizeScores(scores) {
  const vals = Object.values(scores);
  if (!vals.length) return {};
  const max = Math.max(...vals);
  if (max === 0) return scores;
  const out = {};
  for (const [k, v] of Object.entries(scores)) out[k] = v / max;
  return out;
}

export function fuseEvidence(modalities, options = {}) {
  const {
    weights = { transcript: 1, timing: 1, tonality: 1, history: 0.8, faceBody: 0.6 },
    calibrationOffset = {},
    temperature = 1,
    threshold = 0.55,
  } = options;

  const stateScores = {};
  const sources = [];

  for (const [modality, scores] of Object.entries(modalities)) {
    const w = weights[modality] || 0;
    if (!w) continue;
    const norm = normalizeScores(scores || {});
    for (const [state, value] of Object.entries(norm)) {
      stateScores[state] = (stateScores[state] || 0) + value * w;
    }
    const dominant = Object.entries(scores || {}).sort((a, b) => b[1] - a[1])[0];
    sources.push({ modality, weight: w, dominant: dominant ? { state: dominant[0], score: dominant[1] } : null });
  }

  for (const state of Object.keys(stateScores)) {
    const offset = calibrationOffset[state] || 0;
    let v = stateScores[state] + offset;
    v = v / temperature;
    if (v < 0) v = 0;
    stateScores[state] = v;
  }

  const entries = Object.entries(stateScores).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const calibrated = entries.map(([state, score]) => ({ state, confidence: score / total, rawScore: score }));
  const top = calibrated[0];

  return {
    state: top ? top.state : 'neutral',
    confidence: top ? top.confidence : 0,
    finished: top ? top.confidence >= threshold && ['finished', 'celebrating', 'calm'].includes(top.state) : false,
    calibrated,
    sources,
    raw: stateScores,
  };
}

export function learnWeights(labeledExamples, initialWeights, options = {}) {
  const { learningRate = 0.05, iterations = 50 } = options;
  const weights = { ...initialWeights };
  const states = new Set(labeledExamples.map((e) => e.label));

  for (let iter = 0; iter < iterations; iter += 1) {
    for (const ex of labeledExamples) {
      const modalities = {
        transcript: ex.transcript ? extractTranscriptEvidence(ex.transcript) : {},
        timing: ex.timing ? extractTimingEvidence(ex.timing) : {},
        tonality: ex.tonality ? extractTonalityEvidence(ex.tonality) : {},
        history: ex.history ? extractHistoryEvidence(ex.history) : {},
        faceBody: ex.faceBody ? extractFaceBodyEvidence(ex.faceBody) : {},
      };
      const result = fuseEvidence(modalities, { weights, threshold: 0.55 });
      const predicted = result.state;
      const error = predicted === ex.label ? 0 : 1;
      if (error === 0) continue;

      for (const mod of Object.keys(modalities)) {
        const dom = Object.entries(modalities[mod]).sort((a, b) => b[1] - a[1])[0];
        if (dom && dom[0] === ex.label) {
          weights[mod] = (weights[mod] || 0) + learningRate * (1 - (weights[mod] || 0));
        } else if (dom && dom[0] === predicted) {
          weights[mod] = Math.max(0.1, (weights[mod] || 0) - learningRate * (weights[mod] || 0));
        }
      }
    }
  }

  const max = Math.max(...Object.values(weights));
  if (max > 0) {
    for (const k of Object.keys(weights)) weights[k] = parseFloat((weights[k] / max).toFixed(3));
  }

  return { weights, states: [...states] };
}