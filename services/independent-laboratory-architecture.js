/**
 * SYNOPSIS: Exports compareFindings — services/independent-laboratory-architecture.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const version = "2026-08-02";

const SUPPORTED_OFFICES = ['Chair', 'Solomon', 'Sentry'];

/**
 * Derives findings for a given office based on the evidence package.
 * @param {object} evidencePackage - The evidence package to analyze.
 * @param {string} office - The name of the office performing the analysis.
 * @returns {string[]} The findings derived by the office.
 */
function getOfficeFindings(evidencePackage, office) {
  const keys = Object.keys(evidencePackage);
  if (office === 'Chair') {
    return keys.slice(0, 2);
  } else if (office === 'Solomon') {
    return keys.slice(-2);
  } else if (office === 'Sentry') {
    return keys.filter(key => typeof evidencePackage[key] === 'number').map(String);
  }
  return [];
}

/**
 * Compares findings from multiple offices to generate a convergence report.
 * @param {{office: string, findings: string[], confidence: number}[]} findings - An array of findings from different offices.
 * @returns {{agreed: string[], disagreed: string[], best_predictor: string|null}} The convergence report.
 */
export function compareFindings(findings) {
  if (findings.length === 0) {
    return { agreed: [], disagreed: [], best_predictor: null };
  }

  const allFindings = findings.flatMap(f => f.findings);
  const findingCounts = {};
  for (const finding of allFindings) {
    findingCounts[finding] = (findingCounts[finding] || 0) + 1;
  }

  const agreed = Object.keys(findingCounts).filter(f => findingCounts[f] === findings.length);
  const disagreed = Object.keys(findingCounts).filter(f => findingCounts[f] < findings.length);

  let bestPredictor = null;
  if (findings.length > 0) {
    // A simple heuristic for best_predictor: the office with the highest average confidence.
    // If confidences are equal, the first office in the list is chosen.
    let maxConfidenceSum = -1;
    for (const officeFinding of findings) {
      const currentConfidenceSum = officeFinding.confidence; // Assuming confidence is per office, not per finding
      if (currentConfidenceSum > maxConfidenceSum) {
        maxConfidenceSum = currentConfidenceSum;
        bestPredictor = officeFinding.office;
      }
    }
  }

  return { agreed, disagreed, best_predictor: bestPredictor };
}

/**
 * Recommends a convergence strategy based on the findings.
 * @param {{office: string, findings: string[], confidence: number}[]} findings - An array of findings from different offices.
 * @returns {string} A recommendation string.
 */
export function recommendConvergence(findings) {
  const { agreed, disagreed, best_predictor } = compareFindings(findings);

  if (agreed.length > 0 && disagreed.length === 0) {
    return "All offices agree on findings. Proceed with unified action.";
  } else if (agreed.length > 0 && disagreed.length > 0) {
    return `Partial agreement. Focus on resolving discrepancies in: ${disagreed.join(', ')}. Consider prioritizing input from ${best_predictor || 'an identified lead office'}.`;
  } else if (agreed.length === 0 && disagreed.length > 0) {
    return `Significant divergence among offices. Further investigation and discussion are required for: ${disagreed.join(', ')}. Prioritize input from ${best_predictor || 'an identified lead office'} for initial direction.`;
  }
  return "No findings to compare. Further analysis is needed.";
}

/**
 * Returns the names of all supported offices.
 * @returns {string[]} An array of supported office names.
 */
export function getSupportedOffices() {
  return [...SUPPORTED_OFFICES];
}

/**
 * Runs an independent analysis across specified offices on a given evidence package.
 * @param {object} evidencePackage - The evidence package to be analyzed.
 * @param {string[]} offices - An array of office names to perform the analysis. Defaults to ['Chair', 'Solomon', 'Sentry'].
 * @returns {{independent_findings: {office: string, findings: string[], confidence: number}[], convergence_report: {agreed: string[], disagreed: string[], best_predictor: string|null}, confidence: number}} The results of the independent analysis and convergence.
 */
export function runIndependentAnalysis(evidencePackage, offices = SUPPORTED_OFFICES) {
  const independentFindings = offices.map(office => {
    const findings = getOfficeFindings(evidencePackage, office);
    // Simple deterministic confidence based on number of findings
    const confidence = findings.length > 0 ? (findings.length / Object.keys(evidencePackage).length) : 0;
    return { office, findings, confidence };
  });

  const convergenceReport = compareFindings(independentFindings);

  // Overall confidence for the entire analysis
  const totalConfidence = independentFindings.reduce((sum, f) => sum + f.confidence, 0) / independentFindings.length;

  return {
    independent_findings: independentFindings,
    convergence_report: convergenceReport,
    confidence: totalConfidence
  };
}