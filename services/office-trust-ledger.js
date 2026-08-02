/**
 * SYNOPSIS: Exports updateTrust — services/office-trust-ledger.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const officeTrustLedger = new Map(); // officeId -> { dimension -> score }

export const TRUST_DIMENSIONS = Object.freeze({
  TRACK_RECORD: 'track_record',
  CONSTITUTIONAL_ALIGNMENT: 'constitutional_alignment',
  TRANSPARENCY: 'transparency',
  INDEPENDENCE: 'independence',
});

/**
 * Updates the trust score for a specific office and dimension.
 * Scores are clamped between 0 and 1.
 * @param {string} officeId The unique identifier for the office.
 * @param {string} dimension The dimension of trust to update (e.g., 'track_record').
 * @param {number} delta The amount to add to the current score.
 * @returns {object} The updated trust scores for the office, or null if dimension is invalid.
 */
export function updateTrust(officeId, dimension, delta) {
  if (!Object.values(TRUST_DIMENSIONS).includes(dimension)) {
    console.warn(`Invalid trust dimension: ${dimension}`);
    return null;
  }

  if (!officeTrustLedger.has(officeId)) {
    officeTrustLedger.set(officeId, {
      [TRUST_DIMENSIONS.TRACK_RECORD]: 0.5,
      [TRUST_DIMENSIONS.CONSTITUTIONAL_ALIGNMENT]: 0.5,
      [TRUST_DIMENSIONS.TRANSPARENCY]: 0.5,
      [TRUST_DIMENSIONS.INDEPENDENCE]: 0.5,
    });
  }

  const officeScores = officeTrustLedger.get(officeId);
  let currentScore = officeScores[dimension];
  let newScore = currentScore + delta;

  // Clamp score between 0 and 1
  newScore = Math.max(0, Math.min(1, newScore));
  officeScores[dimension] = newScore;

  return { ...officeScores };
}

/**
 * Gets the aggregated trust score for a specific office.
 * The aggregated score is the average of all trust dimensions.
 * @param {string} officeId The unique identifier for the office.
 * @returns {number} The aggregated trust score (0-1), or 0 if the office is not found.
 */
export function getTrustScore(officeId) {
  if (!officeTrustLedger.has(officeId)) {
    return 0;
  }

  const officeScores = officeTrustLedger.get(officeId);
  const dimensions = Object.values(TRUST_DIMENSIONS);
  
  if (dimensions.length === 0) {
    return 0;
  }

  const totalScore = dimensions.reduce((sum, dim) => sum + (officeScores[dim] || 0), 0);
  return totalScore / dimensions.length;
}