/**
 * SYNOPSIS: Exports computeConfidenceVector — services/confidence-vectors.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const DIMENSIONS = [
  "belief_strength",
  "evidence_support",
  "behavior_alignment",
  "emotional_weight",
  "identity_attachment",
  "readiness",
  "trust",
  "confidence",
];

export const DEFAULT_WEIGHTS = DIMENSIONS.reduce((acc, dim) => {
  if (dim !== "confidence") {
    acc[dim] = 1.0;
  }
  return acc;
}, {});

/**
 * Computes a confidence vector from evidence.
 * @param {object} evidence - Object with dimension keys and values in [0, 1].
 * @returns {object} A vector object with all dimensions and a 'confidence' scalar.
 */
export function computeConfidenceVector(evidence) {
  const vector = {};
  let totalWeightedValue = 0;
  let totalWeight = 0;

  for (const dim of DIMENSIONS) {
    if (dim !== "confidence") {
      const value = Math.max(0, Math.min(1, evidence[dim] ?? 0.0));
      vector[dim] = value;
      totalWeightedValue += value * (DEFAULT_WEIGHTS[dim] ?? 0);
      totalWeight += (DEFAULT_WEIGHTS[dim] ?? 0);
    }
  }

  vector.confidence = totalWeight > 0 ? Math.max(0, Math.min(1, totalWeightedValue / totalWeight)) : 0.0;
  return vector;
}

/**
 * Combines an array of confidence vectors.
 * @param {Array<object>} vectors - An array of vector objects.
 * @param {Array<number>} [weights=[]] - Optional array of weights for each vector.
 * @returns {object} A combined vector using weighted averages.
 */
export function combineConfidenceVectors(vectors, weights = []) {
  if (vectors.length === 0) {
    const zeroVector = {};
    for (const dim of DIMENSIONS) {
      zeroVector[dim] = 0.0;
    }
    return zeroVector;
  }

  const combinedVector = {};
  const effectiveWeights = weights.length === vectors.length
    ? weights.map(w => Math.max(0, Math.min(1, w)))
    : Array(vectors.length).fill(1.0);

  for (const dim of DIMENSIONS) {
    let dimWeightedSum = 0;
    let dimTotalWeight = 0;

    for (let i = 0; i < vectors.length; i++) {
      const vector = vectors[i];
      const weight = effectiveWeights[i];
      const value = Math.max(0, Math.min(1, vector[dim] ?? 0.0));
      dimWeightedSum += value * weight;
      dimTotalWeight += weight;
    }
    combinedVector[dim] = dimTotalWeight > 0 ? Math.max(0, Math.min(1, dimWeightedSum / dimTotalWeight)) : 0.0;
  }
  return combinedVector;
}

/**
 * Calibrates the confidence dimension of a vector based on an outcome.
 * @param {object} vector - The original confidence vector.
 * @param {object} outcome - An object `{ actual: number, expected: number }` in [0, 1].
 * @returns {object} A new vector with adjusted confidence.
 */
export function calibrateConfidence(vector, outcome) {
  const newVector = { ...vector };
  const actual = Math.max(0, Math.min(1, outcome.actual ?? 0.0));
  const expected = Math.max(0, Math.min(1, outcome.expected ?? 0.0));

  const penalty = Math.abs(actual - expected);
  const currentConfidence = Math.max(0, Math.min(1, vector.confidence ?? 0.0));
  let newConfidence = currentConfidence - penalty;

  const evidenceSupport = Math.max(0, Math.min(1, vector.evidence_support ?? 0.0));
  const lowerBound = evidenceSupport > 0.5 ? 0.1 : 0.0;
  
  newVector.confidence = Math.max(lowerBound, newConfidence);
  return newVector;
}

/**
 * Formats a confidence vector into a compact string.
 * @param {object} vector - The confidence vector.
 * @param {number} [precision=2] - Number of decimal places for formatting.
 * @returns {string} A formatted string representation.
 */
export function formatConfidence(vector, precision = 2) {
  const format = (value) => (value ?? 0).toFixed(precision);
  const abbr = {
    belief_strength: "bs",
    evidence_support: "es",
    behavior_alignment: "ba",
    emotional_weight: "ew",
    identity_attachment: "ia",
    readiness: "read",
    trust: "trust",
  };

  const parts = [];
  for (const dim of DIMENSIONS) {
    if (dim !== "confidence") {
      parts.push(`${abbr[dim]}:${format(vector[dim])}`);
    }
  }

  return `confidence:${format(vector.confidence)}[${parts.join(",")}]`;
}

export const version = "2026-08-02";