/**
 * SYNOPSIS: Exports calibrateOffice — services/organizational-calibration-engine.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const version = "2026-08-02";

/**
 * Calibrates the trust and accuracy score for a given office.
 * @param {string} office - The name of the office.
 * @param {Array<Object>} predictions - An array of prediction objects.
 * @param {number} predictions[].prediction - The predicted value (0-1).
 * @param {number} predictions[].outcome - The actual outcome (0-1).
 * @param {number} predictions[].confidence - The confidence in the prediction (0-1).
 * @returns {{calibration_score: number, bias_report: {overconfidence: number, underconfidence: number, directional_bias: string}, recommendation: string}}
 */
export function calibrateOffice(office, predictions = []) {
  if (predictions.length === 0) {
    return {
      calibration_score: 0,
      bias_report: { overconfidence: 0, underconfidence: 0, directional_bias: "neutral" },
      recommendation: "No predictions available for calibration.",
    };
  }

  let totalAbsoluteDifference = 0;
  let totalOverconfidence = 0;
  let totalUnderconfidence = 0;
  let totalConfidence = 0;
  let totalOutcome = 0;

  for (const p of predictions) {
    totalAbsoluteDifference += Math.abs(p.confidence - p.outcome);
    totalOverconfidence += Math.max(0, p.confidence - p.outcome);
    totalUnderconfidence += Math.max(0, p.outcome - p.confidence);
    totalConfidence += p.confidence;
    totalOutcome += p.outcome;
  }

  const calibration_score = 1 - (totalAbsoluteDifference / predictions.length);
  const overconfidence = totalOverconfidence / predictions.length;
  const underconfidence = totalUnderconfidence / predictions.length;

  let directional_bias = "neutral";
  if (totalConfidence > totalOutcome) {
    directional_bias = "overconfident";
  } else if (totalConfidence < totalOutcome) {
    directional_bias = "underconfident";
  }

  const bias_report = { overconfidence, underconfidence, directional_bias };
  const recommendation = suggestRecalibration(calibration_score);

  return { calibration_score, bias_report, recommendation };
}

/**
 * Compares calibration scores across multiple offices.
 * @param {Object<string, Array<Object>>} predictionsByOffice - An object where keys are office names and values are prediction arrays.
 * @returns {{rankings: Array<{office: string, score: number}>, best_office: string, worst_office: string, summary: string}}
 */
export function compareOffices(predictionsByOffice) {
  const officeScores = [];
  for (const officeName in predictionsByOffice) {
    const { calibration_score } = calibrateOffice(officeName, predictionsByOffice[officeName]);
    officeScores.push({ office: officeName, score: calibration_score });
  }

  officeScores.sort((a, b) => b.score - a.score);

  const rankings = officeScores;
  const best_office = officeScores.length > 0 ? officeScores[0].office : "none";
  const worst_office = officeScores.length > 0 ? officeScores[officeScores.length - 1].office : "none";

  let summary = "Comparison of office calibration scores.";
  if (officeScores.length > 0) {
    summary += ` The best performing office is ${best_office} with a score of ${rankings[0].score.toFixed(4)}.`;
    if (officeScores.length > 1) {
        summary += ` The worst performing office is ${worst_office} with a score of ${rankings[rankings.length - 1].score.toFixed(4)}.`;
    }
  } else {
    summary = "No office data available for comparison.";
  }

  return { rankings, best_office, worst_office, summary };
}

/**
 * Suggests a recalibration action based on the calibration score.
 * @param {number} calibration_score - The calibration score (0-1).
 * @returns {string} A recommendation string.
 */
export function suggestRecalibration(calibration_score) {
  if (calibration_score >= 0.9) {
    return "Calibration is excellent. Maintain current processes and monitor for changes.";
  } else if (calibration_score >= 0.7) {
    return "Calibration is good. Minor adjustments may be beneficial, review recent predictions.";
  } else if (calibration_score >= 0.5) {
    return "Calibration is moderate. Consider a targeted review of prediction confidence settings.";
  } else {
    return "Calibration is low. Immediate and thorough recalibration of prediction confidence is recommended.";
  }
}

/**
 * Returns a list of supported offices.
 * @returns {Array<string>} An array of office names.
 */
export function getSupportedOffices() {
  return ['Chair', 'Solomon', 'Builder', 'Sentry', 'Historian'];
}