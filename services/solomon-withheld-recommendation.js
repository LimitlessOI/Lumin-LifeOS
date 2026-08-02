/**
 * SYNOPSIS: Exports createWithheldPackage — services/solomon-withheld-recommendation.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Creates a base Solomon package with the evidence.
 * @param {object} evidencePackage - The evidence package for Solomon's analysis.
 * @returns {object} A base package with the evidence.
 */
export function createWithheldPackage(evidencePackage) {
  return {
    evidencePackage,
    findings: [],
    solomonRecommendation: null,
    withheld: false, // Initially not withheld, will be set to true when recommendation is added
  };
}

/**
 * Adds a Solomon finding to the package.
 * @param {object} pkg - The Solomon package.
 * @param {{claim: string, evidence: string, confidence: number}} finding - The finding to add.
 * @returns {object} An updated package with the finding.
 */
export function addSolomonFinding(pkg, finding) {
  return {
    ...pkg,
    findings: [...pkg.findings, finding],
  };
}

/**
 * Adds a Solomon recommendation to the package.
 * Sets `withheld: true` indicating the recommendation is not yet revealed.
 * @param {object} pkg - The Solomon package.
 * @param {{courseOfAction: string, confidence: number, assumptions: string[], uncertainties: string[], constitutionalTensions: string[]}} recommendation - The recommendation to add.
 * @returns {object} An updated package with a `solomonRecommendation` object and `withheld: true`.
 */
export function addSolomonRecommendation(pkg, recommendation) {
  return {
    ...pkg,
    solomonRecommendation: recommendation,
    withheld: true,
  };
}

/**
 * Reveals the Solomon recommendation only if the Chair has recorded a preliminary decision.
 * @param {object} pkg - The Solomon package.
 * @param {object | null} chairPreliminaryPkg - The Chair's preliminary decision package.
 * @returns {object} The `solomonRecommendation` if revealed, otherwise an object indicating it's withheld.
 */
export function revealRecommendation(pkg, chairPreliminaryPkg) {
  if (chairPreliminaryPkg && chairPreliminaryPkg.proposedDecision) {
    return pkg.solomonRecommendation;
  }
  return { revealed: false, reason: 'Chair preliminary decision not yet recorded' };
}

/**
 * Returns a string summary of findings and recommendation (even if withheld).
 * @param {object} pkg - The Solomon package.
 * @returns {string} A string summary.
 */
export function getSolomonSummary(pkg) {
  let summary = 'Solomon Analysis Summary:\n';

  if (pkg.findings.length > 0) {
    summary += 'Findings:\n';
    pkg.findings.forEach((f, index) => {
      summary += `  ${index + 1}. Claim: ${f.claim}, Evidence: ${f.evidence}, Confidence: ${f.confidence}\n`;
    });
  } else {
    summary += 'No specific findings recorded.\n';
  }

  if (pkg.solomonRecommendation) {
    summary += 'Recommendation:\n';
    summary += `  Course of Action: ${pkg.solomonRecommendation.courseOfAction}\n`;
    summary += `  Confidence: ${pkg.solomonRecommendation.confidence}\n`;
    if (pkg.solomonRecommendation.assumptions && pkg.solomonRecommendation.assumptions.length > 0) {
      summary += `  Assumptions: ${pkg.solomonRecommendation.assumptions.join(', ')}\n`;
    }
    if (pkg.solomonRecommendation.uncertainties && pkg.solomonRecommendation.uncertainties.length > 0) {
      summary += `  Uncertainties: ${pkg.solomonRecommendation.uncertainties.join(', ')}\n`;
    }
    if (pkg.solomonRecommendation.constitutionalTensions && pkg.solomonRecommendation.constitutionalTensions.length > 0) {
      summary += `  Constitutional Tensions: ${pkg.solomonRecommendation.constitutionalTensions.join(', ')}\n`;
    }
    if (pkg.withheld) {
      summary += '  (Recommendation is currently withheld until Chair preliminary decision is recorded.)\n';
    }
  } else {
    summary += 'No recommendation recorded yet.\n';
  }

  return summary;
}