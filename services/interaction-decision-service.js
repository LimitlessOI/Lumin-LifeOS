/**
 * SYNOPSIS: Exports computeTurnCompletionConfidence — services/interaction-decision-service.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

export function computeTurnCompletionConfidence(turns, options = {}) {
  const {
    currentIndex = turns.length - 1,
    pauseMs = 0,
    finalTranscript = true,
    minimumPauseMs = 600,
    threshold = 90
  } = options || {};

  const sources = [];
  let score = 0;

  const current = turns[currentIndex];
  const text = String(current && current.text ? current.text : '').replace(/\s+/g, ' ').trim();

  // Factor: finalTranscript
  if (finalTranscript) {
    score += 25;
    sources.push({ source: 'finalTranscript', value: true, weight: 25 });
  } else {
    sources.push({ source: 'finalTranscript', value: false, weight: 0 });
  }

  // Factor: trailing punctuation
  if (/[.!?\u2026]\s*$/.test(text)) {
    score += 35;
    sources.push({ source: 'trailingPunctuation', value: true, weight: 35 });
  } else {
    score -= 15;
    sources.push({ source: 'trailingPunctuation', value: false, weight: -15 });
  }

  // Factor: trailing filler word
  if (/\b(um|uh|like|you know)[.!?\u2026]?\s*$/i.test(text)) {
    score -= 35;
    sources.push({ source: 'trailingFillerWord', value: true, weight: -35 });
  } else {
    score += 15;
    sources.push({ source: 'trailingFillerWord', value: false, weight: 15 });
  }

  // Factor: pauseMs vs minimumPauseMs
  if (pauseMs >= minimumPauseMs) {
    score += 30;
    sources.push({ source: 'pauseDuration', value: pauseMs, weight: 30 });
  } else if (pauseMs > 0) {
    const calculatedWeight = Math.round((pauseMs / minimumPauseMs) * 30);
    score += calculatedWeight;
    sources.push({ source: 'pauseDuration', value: pauseMs, weight: calculatedWeight });
  } else {
    sources.push({ source: 'pauseDuration', value: pauseMs, weight: 0 });
  }

  // Factor: previous turn was assistant
  if (currentIndex > 0 && turns[currentIndex - 1] && turns[currentIndex - 1].role === 'assistant') {
    score += 5;
    sources.push({ source: 'previousTurnAssistant', value: true, weight: 5 });
  } else {
    sources.push({ source: 'previousTurnAssistant', value: false, weight: 0 });
  }

  score = Math.min(100, Math.max(0, score));

  return {
    finished: score >= threshold,
    confidence: score,
    pause_ms: pauseMs,
    sources: sources
  };
}