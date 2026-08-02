/**
 * SYNOPSIS: Exports compareDecisions — services/chair-solomon-calibration.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Compares Chair and Solomon reasoning against actual outcomes and calibrates both.
 * @param {object} chairPreliminary - The Chair's preliminary decision.
 * @param {object} solomonRecommendation - Solomon's independent recommendation.
 * @param {object} outcome - The actual outcome with actualResult.
 * @returns {{agreement: boolean, divergence: string, chairFit: number, solomonFit: number, lesson: string}}
 */
export function compareDecisions(chairPreliminary, solomonRecommendation, outcome = { actualResult: null }) {
  const chairResult = chairPreliminary.decision;
  const solomonResult = solomonRecommendation.recommendation;
  const actualResult = outcome.actualResult;

  const agreement = (chairResult === solomonResult);

  let divergence = 'None';
  if (chairResult !== actualResult && solomonResult !== actualResult) {
    divergence = 'Both diverged from outcome';
  } else if (chairResult !== actualResult) {
    divergence = 'Chair diverged from outcome';
  } else if (solomonResult !== actualResult) {
    divergence = 'Solomon diverged from outcome';
  } else if (chairResult !== solomonResult) {
    divergence = 'Chair and Solomon disagreed';
  }

  const chairFit = chairResult === actualResult ? 1 : 0;
  const solomonFit = solomonResult === actualResult ? 1 : 0;

  let lesson = 'No clear lesson.';
  if (chairFit === 1 && solomonFit === 0) {
    lesson = 'Chair was correct, Solomon was not. Review Solomon\'s reasoning.';
  } else if (chairFit === 0 && solomonFit === 1) {
    lesson = 'Solomon was correct, Chair was not. Review Chair\'s reasoning.';
  } else if (chairFit === 0 && solomonFit === 0) {
    lesson = 'Both Chair and Solomon diverged from the actual outcome. Investigate the underlying assumptions and context.';
  } else if (chairFit === 1 && solomonFit === 1 && agreement) {
    lesson = 'Both Chair and Solomon were correct and in agreement. Reinforce successful patterns.';
  } else if (chairFit === 1 && solomonFit === 1 && !agreement) {
    lesson = 'Both Chair and Solomon were correct but disagreed initially. Analyze the path to convergence.';
  }

  return { agreement, divergence, chairFit, solomonFit, lesson };
}

/**
 * Updates calibration scores for an office.
 * @param {string} officeId - The ID of the office (e.g., 'Chair', 'Solomon').
 * @param {boolean} result - True if the prediction was correct, false otherwise.
 * @param {object} ledger - The current ledger object.
 * @returns {object} An updated ledger object.
 */
export function updateCalibrationScores(officeId, result, ledger = {}) {
  const officeData = ledger[officeId] || { predictions: 0, correct: 0, calibrationScore: 0, lastUpdated: null };

  officeData.predictions += 1;
  if (result) {
    officeData.correct += 1;
  }
  officeData.calibrationScore = officeData.correct / officeData.predictions;
  officeData.lastUpdated = new Date().toISOString();

  return {
    ...ledger,
    [officeId]: officeData,
  };
}

/**
 * Returns a concise markdown-ish report string comparing decisions and outcome.
 * @param {object} chairPreliminary - The Chair's preliminary decision.
 * @param {object} solomonRecommendation - Solomon's independent recommendation.
 * @param {object} outcome - The actual outcome with actualResult.
 * @returns {string} A markdown-formatted report.
 */
export function formatComparisonReport(chairPreliminary, solomonRecommendation, outcome) {
  const { agreement, divergence, chairFit, solomonFit, lesson } = compareDecisions(
    chairPreliminary,
    solomonRecommendation,
    outcome
  );

  const chairStatus = chairFit === 1 ? '✅ Correct' : '❌ Incorrect';
  const solomonStatus = solomonFit === 1 ? '✅ Correct' : '❌ Incorrect';
  const agreementStatus = agreement ? 'Yes' : 'No';

  return `
### Decision Calibration Report

- Chair's Preliminary Decision:** ${chairPreliminary.decision}
- Solomon's Recommendation:** ${solomonRecommendation.recommendation}
- Actual Outcome:** ${outcome.actualResult}

---

- Chair's Fit to Outcome:** ${chairStatus}
- Solomon's Fit to Outcome:** ${solomonStatus}
- Initial Agreement (Chair vs Solomon):** ${agreementStatus}
- Divergence Summary:** ${divergence}

Lesson Learned:** ${lesson}
`;
}

/**
 * Retrieves the calibration score for a given office.
 * @param {object} ledger - The calibration ledger.
 * @param {string} officeId - The ID of the office.
 * @returns {number} The calibration score (0-1) or 0 if not found.
 */
export function getCalibrationScore(ledger, officeId) {
  return ledger[officeId]?.calibrationScore || 0;
}