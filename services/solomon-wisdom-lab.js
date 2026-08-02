/**
 * SYNOPSIS: Exports createEvidencePackage — services/solomon-wisdom-lab.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * @typedef {Object} EvidencePackage
 * @property {string} topic - The topic of the wisdom inquiry.
 * @property {Array<Object>} findings - A list of gathered evidence and perspectives.
 * @property {Array<Object>} models - Compared models.
 * @property {Array<string>} constitutionalTensions - Identified constitutional tensions.
 * @property {Object} confidence - Confidence, assumptions, uncertainties, reasoning.
 * @property {string | null} recommendation - The recommendation, initially withheld.
 * @property {boolean} revealAfterChairCommit - Flag to reveal recommendation after chair decision.
 * @property {string | null} chairPreliminaryDecision - The chair's preliminary decision.
 */

/**
 * Creates a new evidence package for a given topic.
 * @param {string} topic - The topic for the wisdom inquiry.
 * @returns {EvidencePackage} A new, empty evidence package.
 */
export function createEvidencePackage(topic) {
  return {
    topic,
    findings: [],
    models: [],
    constitutionalTensions: [],
    confidence: {
      epistemic: 0,
      commitment: 0,
      assumptions: [],
      uncertainties: [],
      reasoning: "Initial package creation, no reasoning yet."
    },
    recommendation: null,
    revealAfterChairCommit: false,
    chairPreliminaryDecision: null,
  };
}

/**
 * Adds a finding (evidence, perspective, implication, tension, model) to an evidence package.
 * @param {EvidencePackage} pkg - The evidence package to update.
 * @param {Object} finding - The finding to add. Can include evidence, perspective, implication, model or tension.
 * @returns {EvidencePackage} The updated evidence package.
 */
export function addFinding(pkg, finding) {
  // Deep copy to prevent external modification issues
  const updatedPkg = JSON.parse(JSON.stringify(pkg));

  // Example structure for a finding; actual content can vary based on the type
  updatedPkg.findings.push({
    timestamp: new Date().toISOString(),
    ...finding
  });

  // Basic logic to update confidence based on new findings, this is a placeholder
  // In a real system, this would involve a call to the Confidence Vector Model or similar.
  updatedPkg.confidence.epistemic = Math.min(1, updatedPkg.confidence.epistemic + 0.05);
  updatedPkg.confidence.reasoning = "Findings added, epistemic confidence adjusted.";

  return updatedPkg;
}

/**
 * Adds a recommendation to the evidence package. The recommendation is initially withheld.
 * @param {EvidencePackage} pkg - The evidence package to update.
 * @param {string} recommendation - The recommendation to record.
 * @param {boolean} revealAfterChairCommit - If true, the recommendation is revealed only after the chair's decision.
 * @returns {EvidencePackage} The updated evidence package.
 */
export function addRecommendation(pkg, recommendation, revealAfterChairCommit) {
  const updatedPkg = JSON.parse(JSON.stringify(pkg));
  updatedPkg.recommendation = recommendation;
  updatedPkg.revealAfterChairCommit = revealAfterChairCommit;
  updatedPkg.confidence.reasoning = "Recommendation recorded, awaiting chair decision if required.";
  return updatedPkg;
}

/**
 * Retrieves the recommendation from the evidence package.
 * The recommendation is only revealed if `revealAfterChairCommit` is false,
 * or if a `chairPreliminaryDecision` has been recorded.
 * @param {EvidencePackage} pkg - The evidence package.
 * @param {string | null} chairPreliminaryDecision - The chair's preliminary decision. Pass null if not available.
 * @returns {string | null} The recommendation, or null if it is withheld.
 */
export function getRevelation(pkg, chairPreliminaryDecision) {
  const updatedPkg = JSON.parse(JSON.stringify(pkg));
  updatedPkg.chairPreliminaryDecision = chairPreliminaryDecision;

  if (updatedPkg.recommendation === null) {
    return null;
  }

  if (updatedPkg.revealAfterChairCommit && !updatedPkg.chairPreliminaryDecision) {
    return null; // Withhold if chair's decision is required but not yet present
  }

  return updatedPkg.recommendation;
}