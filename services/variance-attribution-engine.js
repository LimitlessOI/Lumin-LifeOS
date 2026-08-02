/**
 * SYNOPSIS: Service module — Variance Attribution Engine.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const version = "2026-08-02";

const VARIANCE_TYPES = [
  "timeout",
  "error",
  "502",
  "denied",
  "missing",
  "drift",
  "token",
];

/**
 * Compares prediction and outcome objects to attribute variance.
 * @param {object} prediction - The predicted outcome.
 * @param {object} outcome - The actual outcome.
 * @param {Array<string>} execution_log - A log of execution events.
 * @returns {{variance_score: number, attributions: Array<{cause: string, contribution: number, confidence: number, evidence: string}>, learned_lesson: string}}
 */
function attributeVariance(prediction, outcome, execution_log = []) {
  const attributions = [];
  let varianceScore = 0;
  const allKeys = new Set([...Object.keys(prediction), ...Object.keys(outcome)]);

  for (const key of allKeys) {
    const predictedValue = prediction[key];
    const actualValue = outcome[key];

    if (predictedValue !== actualValue) {
      varianceScore += 1; // Simple score for each mismatch
      let attributed = false;
      for (const causeKeyword of VARIANCE_TYPES) {
        const matchingLogEntries = execution_log.filter((entry) => {
          const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
          return text.includes(causeKeyword);
        });
        if (matchingLogEntries.length > 0) {
          attributions.push({
            cause: causeKeyword,
            contribution: 1 / allKeys.size, // Evenly distribute contribution for now
            confidence: 0.8, // High confidence if keyword found
            evidence: `Mismatch on key '${key}'. Log entries: ${matchingLogEntries.map((e) => typeof e === 'string' ? e : JSON.stringify(e)).join("; ")}`,
          });
          attributed = true;
          break;
        }
      }
      if (!attributed) {
        attributions.push({
          cause: "unknown",
          contribution: 1 / allKeys.size,
          confidence: 0.3, // Low confidence if no specific keyword
          evidence: `Mismatch on key '${key}'. Predicted: ${JSON.stringify(predictedValue)}, Actual: ${JSON.stringify(actualValue)}`,
        });
      }
    }
  }

  const normalizedVarianceScore = allKeys.size > 0 ? varianceScore / allKeys.size : 0;
  const learnedLesson = extractLesson(attributions);

  return {
    variance_score: normalizedVarianceScore,
    attributions: attributions,
    learned_lesson: learnedLesson,
  };
}

/**
 * Ranks attributions by their contribution in descending order.
 * @param {Array<{cause: string, contribution: number, confidence: number, evidence: string}>} attributions - List of variance attributions.
 * @returns {Array<{cause: string, contribution: number, confidence: number, evidence: string}>} Sorted attributions.
 */
function rankCauses(attributions) {
  return [...attributions].sort((a, b) => b.contribution - a.contribution);
}

/**
 * Extracts a short human-readable lesson from the attributions.
 * @param {Array<{cause: string, contribution: number, confidence: number, evidence: string}>} attributions - List of variance attributions.
 * @returns {string} A short lesson string.
 */
function extractLesson(attributions) {
  if (attributions.length === 0) {
    return "No significant variance detected; blueprint prediction matched outcome closely.";
  }

  const ranked = rankCauses(attributions);
  const topCause = ranked[0];

  if (topCause.cause === "unknown") {
    return "Further investigation needed to identify the root cause of observed deviations.";
  } else {
    return `Focus on addressing '${topCause.cause}' to improve future build predictability.`;
  }
}

/**
 * Returns the list of supported cause keywords.
 * @returns {Array<string>} List of variance types.
 */
function getVarianceTypes() {
  return [...VARIANCE_TYPES];
}

export { attributeVariance, rankCauses, extractLesson, getVarianceTypes, version };