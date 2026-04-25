/**
 * @ssot docs/projects/AMENDMENT_10_API_COST_SAVINGS.md
 *
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                  TOKENOS QUALITY GUARD (TCO-C01 + TCO-C02)                        ║
 * ║   Meaning checksum + quality regression detection for compressed AI calls        ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * TCO-C01: Meaning checksum
 *   Before compressing a prompt, extract key semantic markers (entities, intent,
 *   numbers, names). After the compressed call returns, verify those markers are
 *   still present in the response. If coverage drops below threshold → flag.
 *
 * TCO-C02: Quality regression detection
 *   Compare compressed response quality against direct baseline. If quality score
 *   drops more than REGRESSION_THRESHOLD_PCT → auto-fallback to direct call and
 *   record the regression so the compression stack can be tuned.
 *
 * Design constraints:
 *   - Zero external AI calls for quality checks (must not burn tokens checking tokens)
 *   - Heuristic-only in Phase 1; embedding-based scoring deferred to Phase 2
 *   - Never inflate quality scores — fail toward false positives (call direct if unsure)
 */

// Quality threshold: if compressed response scores below this, trigger fallback
const QUALITY_THRESHOLD = 72;

// If quality drops more than this percent vs direct baseline, it's a regression
const REGRESSION_THRESHOLD_PCT = 15;

/**
 * TCO-C01: Extract semantic markers from a prompt.
 * Returns an array of strings that MUST appear (or have synonyms) in the response.
 *
 * @param {string|Array} input - prompt string or messages array
 * @returns {string[]} markers
 */
export function extractSemanticMarkers(input) {
  const text = normalizeInput(input);
  const markers = [];

  // Numbers and figures (must be preserved exactly)
  const numbers = text.match(/\b\d[\d,]*(?:\.\d+)?(?:%|\s*(?:USD|GBP|EUR|tokens?|ms|seconds?|minutes?|hours?|days?))?\b/gi) || [];
  markers.push(...numbers.slice(0, 20));

  // Proper nouns (capitalized words not at sentence start)
  const properNouns = text.match(/(?<![.!?]\s)[A-Z][a-z]{2,}/g) || [];
  markers.push(...new Set(properNouns).values());

  // Technical identifiers (function names, API paths, model names)
  const identifiers = text.match(/\b(?:claude|gpt|gemini|llama|openai|anthropic|google|POST|GET|PUT|DELETE|\/api\/[^\s]+)\b/gi) || [];
  markers.push(...new Set(identifiers).values());

  // Key question words — what the prompt is asking about
  const questionTargets = text.match(/(?:what|how|why|when|where|who)\s+(?:is|are|was|were|do|does|did|can|will|should)?\s+(\w+)/gi) || [];
  markers.push(...questionTargets.slice(0, 5));

  return [...new Set(markers)].filter(m => m.length > 2);
}

/**
 * TCO-C01: Check that a response preserves the key markers from the original prompt.
 * Returns a coverage score 0-100 and a list of missing markers.
 *
 * @param {string[]} markers - from extractSemanticMarkers
 * @param {string} response - AI response text
 * @returns {{ score: number, missing: string[], coverage: number }}
 */
export function checkMeaningCoverage(markers, response) {
  if (!markers || markers.length === 0) {
    return { score: 100, missing: [], coverage: 1.0 };
  }

  const responseLower = response.toLowerCase();
  const missing = [];
  let hits = 0;

  for (const marker of markers) {
    const markerLower = marker.toLowerCase();
    if (responseLower.includes(markerLower)) {
      hits++;
    } else {
      missing.push(marker);
    }
  }

  const coverage = hits / markers.length;
  // Numbers must ALL be present — weight them heavily
  const numberMarkers = markers.filter(m => /\d/.test(m));
  const numberMissing = missing.filter(m => /\d/.test(m));
  const numberPenalty = numberMarkers.length > 0
    ? (numberMissing.length / numberMarkers.length) * 30
    : 0;

  const score = Math.max(0, Math.round(coverage * 100 - numberPenalty));

  return { score, missing, coverage };
}

/**
 * TCO-C02: Score the quality of an AI response heuristically (0-100).
 * Phase 1: structural + content signals. Phase 2: embeddings.
 *
 * @param {string} response - AI response text
 * @param {string|Array} originalPrompt - original prompt (for context)
 * @returns {{ score: number, signals: object }}
 */
export function scoreResponseQuality(response, originalPrompt = '') {
  if (!response || typeof response !== 'string') {
    return { score: 0, signals: { empty: true } };
  }

  const signals = {};
  let score = 50; // baseline

  // Length signal — very short responses to non-trivial prompts are suspect
  const promptLen = normalizeInput(originalPrompt).length;
  const responseLen = response.length;
  signals.responseLength = responseLen;

  if (responseLen < 10) {
    score -= 30;
    signals.tooShort = true;
  } else if (promptLen > 200 && responseLen < 50) {
    score -= 20;
    signals.suspiciouslyBrief = true;
  } else if (responseLen > 100) {
    score += 15;
  }

  // Coherence signal — does it contain real sentences?
  const sentenceCount = (response.match(/[.!?]+\s/g) || []).length;
  if (sentenceCount >= 2) score += 10;
  if (sentenceCount >= 5) score += 5;
  signals.sentenceCount = sentenceCount;

  // Refusal signal — did the AI refuse or produce a non-answer?
  const refusalPatterns = [
    /i (cannot|can't|won't|am unable to)/i,
    /as an ai (language model|assistant)/i,
    /i don't have (the ability|access|information)/i,
    /i'm (sorry|afraid) (but )?i (can't|cannot)/i,
  ];
  const isRefusal = refusalPatterns.some(p => p.test(response));
  if (isRefusal) {
    score -= 25;
    signals.refusal = true;
  }

  // Repetition signal — lots of repeated phrases = degraded output
  const words = response.toLowerCase().split(/\s+/);
  const wordFreq = {};
  for (const w of words) wordFreq[w] = (wordFreq[w] || 0) + 1;
  const maxFreq = Math.max(...Object.values(wordFreq));
  const totalWords = words.length;
  if (totalWords > 20 && maxFreq / totalWords > 0.15) {
    score -= 15;
    signals.repetitive = true;
  }

  // Structure signal — headers, lists, code blocks = well-formed output
  if (/#{1,3}\s/.test(response)) { score += 5; signals.hasHeaders = true; }
  if (/^[-*]\s/m.test(response)) { score += 5; signals.hasList = true; }
  if (/```/.test(response)) { score += 5; signals.hasCode = true; }

  // Truncation signal — abrupt endings suggest the response was cut off
  const trimmed = response.trimEnd();
  if (trimmed.length > 50 && !/[.!?)\]"']$/.test(trimmed)) {
    score -= 10;
    signals.possiblyTruncated = true;
  }

  return { score: Math.max(0, Math.min(100, score)), signals };
}

/**
 * TCO-C02: Detect quality regression between a compressed response and a direct response.
 * Returns whether to fall back to direct and the reason.
 *
 * @param {string} compressedResponse
 * @param {string} directResponse
 * @returns {{ shouldFallback: boolean, reason: string, delta: number }}
 */
export function detectQualityRegression(compressedResponse, directResponse) {
  const { score: compressedScore } = scoreResponseQuality(compressedResponse);
  const { score: directScore } = scoreResponseQuality(directResponse);

  const delta = directScore - compressedScore;
  const regressionPct = directScore > 0 ? (delta / directScore) * 100 : 0;

  if (regressionPct > REGRESSION_THRESHOLD_PCT) {
    return {
      shouldFallback: true,
      reason: `Quality regression: compressed=${compressedScore}, direct=${directScore}, drop=${regressionPct.toFixed(1)}%`,
      delta,
      compressedScore,
      directScore,
    };
  }

  return {
    shouldFallback: false,
    reason: 'Quality within acceptable range',
    delta,
    compressedScore,
    directScore,
  };
}

/**
 * Full quality gate: run C01 + C02 in one call.
 * Returns a verdict: pass | warn | fail
 *
 * @param {{ prompt, compressedResponse, directResponse?, markers? }} opts
 * @returns {{ verdict: 'pass'|'warn'|'fail', score: number, details: object }}
 */
export function runQualityGate({ prompt, compressedResponse, directResponse = null, markers = null }) {
  const extractedMarkers = markers ?? extractSemanticMarkers(prompt);
  const coverage = checkMeaningCoverage(extractedMarkers, compressedResponse);
  const quality = scoreResponseQuality(compressedResponse, prompt);

  let regression = null;
  if (directResponse) {
    regression = detectQualityRegression(compressedResponse, directResponse);
  }

  // Combined score: 60% quality heuristic + 40% coverage
  const combinedScore = Math.round(quality.score * 0.6 + coverage.score * 0.4);

  let verdict;
  if (combinedScore >= QUALITY_THRESHOLD && !regression?.shouldFallback) {
    verdict = 'pass';
  } else if (combinedScore >= QUALITY_THRESHOLD * 0.85) {
    verdict = 'warn';
  } else {
    verdict = 'fail';
  }

  return {
    verdict,
    score: combinedScore,
    details: {
      qualityScore: quality.score,
      qualitySignals: quality.signals,
      coverageScore: coverage.score,
      missingMarkers: coverage.missing,
      regression,
      threshold: QUALITY_THRESHOLD,
    },
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function normalizeInput(input) {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (Array.isArray(input)) {
    return input.map(m => (typeof m === 'object' ? m.content ?? '' : String(m))).join('\n');
  }
  return String(input);
}

export default {
  extractSemanticMarkers,
  checkMeaningCoverage,
  scoreResponseQuality,
  detectQualityRegression,
  runQualityGate,
  QUALITY_THRESHOLD,
  REGRESSION_THRESHOLD_PCT,
};
