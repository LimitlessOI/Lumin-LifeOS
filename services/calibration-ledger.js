/**
 * SYNOPSIS: In-memory store for predictions and outcomes.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { randomUUID } from 'node:crypto';

// In-memory store for predictions and outcomes.
// In a real system, this would be a database.
const calibrationLedger = new Map(); // Stores { entryId: { officeId, modelId, prediction, outcome, timestamp } }
const officeCalibrationScores = new Map(); // Stores { officeId: { correctPredictions, totalPredictions, score } }

/**
 * Records a new prediction entry in the calibration ledger.
 * @param {object} entry - The prediction entry.
 * @param {string} entry.officeId - The ID of the office making the prediction.
 * @param {string} entry.modelId - The ID of the model used for the prediction.
 * @param {*} entry.prediction - The actual prediction value.
 * @returns {string} The unique ID of the recorded prediction entry.
 */
export function recordPrediction(entry) {
  const entryId = randomUUID();
  const timestamp = new Date().toISOString();
  calibrationLedger.set(entryId, { ...entry, timestamp, outcome: null });
  return entryId;
}

/**
 * Records the outcome for a previously made prediction.
 * @param {string} entryId - The ID of the prediction entry.
 * @param {*} outcome - The actual outcome value.
 * @returns {boolean} True if the outcome was recorded successfully, false otherwise (e.g., entry not found).
 */
export function recordOutcome(entryId, outcome) {
  const entry = calibrationLedger.get(entryId);
  if (!entry) {
    return false;
  }

  entry.outcome = outcome;
  calibrationLedger.set(entryId, entry); // Update the entry

  // Update calibration score for the office
  updateCalibrationScore(entry.officeId);
  
  return true;
}

/**
 * Calculates and returns the calibration score for a given office.
 * Calibration score is the ratio of correct predictions to total predictions.
 * @param {string} officeId - The ID of the office.
 * @returns {number} The calibration score (0-1), or 0 if no predictions exist.
 */
export function getCalibrationScore(officeId) {
  const scoreData = officeCalibrationScores.get(officeId);
  return scoreData ? scoreData.score : 0;
}

/**
 * Calculates and returns the trust score for a given office.
 * For now, trust score is a direct reflection of calibration score.
 * @param {string} officeId - The ID of the office.
 * @returns {number} The trust score (0-1), or 0 if no predictions exist.
 */
export function getTrustScore(officeId) {
  return getCalibrationScore(officeId);
}

/**
 * Internal function to update the calibration score for an office.
 * This is called automatically when an outcome is recorded.
 * @param {string} officeId - The ID of the office to update.
 */
function updateCalibrationScore(officeId) {
  let correctPredictions = 0;
  let totalPredictions = 0;

  for (const entry of calibrationLedger.values()) {
    if (entry.officeId === officeId && entry.outcome !== null) {
      totalPredictions++;
      if (entry.prediction === entry.outcome) {
        correctPredictions++;
      }
    }
  }

  const score = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  officeCalibrationScores.set(officeId, { correctPredictions, totalPredictions, score });
}