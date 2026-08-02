/**
 * SYNOPSIS: Exports computeRealityAlignment — services/reality-alignment.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Computes the alignment score between a RealityPackage and a Claim.
 *
 * @param {object} realityPackage - The RealityPackage containing various reality layers.
 * @param {Array<string>} realityPackage.observed - List of observed facts.
 * @param {Array<string>} realityPackage.experienced - List of experienced events or feelings.
 * @param {Array<string>} realityPackage.remembered - List of recalled memories.
 * @param {Array<string>} realityPackage.predicted - List of predicted outcomes.
 * @param {Array<string>} realityPackage.shared - List of shared understandings or beliefs.
 * @param {object} [realityPackage.source_weights] - Optional weights for each reality source.
 * @param {string} claim - The claim or decision to align.
 * @returns {{alignment_score: number, drift_report: string[], reconciliation: string}}
 */
export function computeRealityAlignment(realityPackage, claim) {
  const { observed, experienced, remembered, predicted, shared, source_weights } = realityPackage;

  const weights = {
    observed: source_weights?.observed ?? 1.0,
    experienced: source_weights?.experienced ?? 0.8,
    remembered: source_weights?.remembered ?? 0.7,
    predicted: source_weights?.predicted ?? 0.6,
    shared: source_weights?.shared ?? 0.5,
  };

  let totalScore = 0;
  let totalWeight = 0;
  const driftReport = [];

  // Simple keyword matching for alignment. In a real system, this would involve
  // NLP, semantic embeddings, and deeper logical reasoning.
  const checkAlignment = (source, weight, type) => {
    let matches = 0;
    const lowerClaim = claim.toLowerCase();
    const divergences = [];

    if (source && source.length > 0) {
      for (const item of source) {
        if (lowerClaim.includes(item.toLowerCase()) || item.toLowerCase().includes(lowerClaim)) {
          matches++;
        } else {
          divergences.push(`Claim "${claim}" diverges from ${type}: "${item}"`);
        }
      }
      const sourceScore = matches / source.length;
      totalScore += sourceScore * weight;
      totalWeight += weight;
      if (sourceScore < 1.0) {
        driftReport.push(...divergences);
      }
    } else {
      // If a reality source is empty, it neither supports nor refutes, but its weight is still considered
      // for the average, implying a lack of evidence rather than direct contradiction.
      totalWeight += weight;
      driftReport.push(`No ${type} data available to align with claim "${claim}".`);
    }
  };

  checkAlignment(observed, weights.observed, "observed reality");
  checkAlignment(experienced, weights.experienced, "experienced reality");
  checkAlignment(remembered, weights.remembered, "remembered reality");
  checkAlignment(predicted, weights.predicted, "predicted reality");
  checkAlignment(shared, weights.shared, "shared reality");

  const alignment_score = totalWeight > 0 ? totalScore / totalWeight : 0;

  // Reconciliation provides a narrative explanation for discrepancies
  let reconciliation = "The claim appears to align with multiple layers of reality. ";
  if (driftReport.length > 0) {
    reconciliation = `The claim "${claim}" shows some divergences across reality layers. `;
    reconciliation += "To hold multiple truths without forcing one, consider the context and source strength of each divergence. ";
    reconciliation += "For example, remembered reality might differ from observed due to cognitive biases, while shared reality may reflect collective beliefs rather than individual experience. ";
    reconciliation += "Further investigation into the most divergent layers is recommended to understand the underlying reasons for the differences. ";
  } else if (alignment_score === 1.0) {
    reconciliation += "It is strongly supported across all available reality layers.";
  } else {
    reconciliation += "Minor differences exist, which may be due to nuances not fully captured or incomplete data in certain reality layers.";
  }


  return { alignment_score, drift_report, reconciliation };
}

/**
 * Explains the drift observed within a RealityPackage, highlighting divergences between its various layers.
 *
 * @param {object} realityPackage - The RealityPackage containing various reality layers.
 * @param {Array<string>} realityPackage.observed - List of observed facts.
 * @param {Array<string>} realityPackage.experienced - List of experienced events or feelings.
 * @param {Array<string>} realityPackage.remembered - List of recalled memories.
 * @param {Array<string>} realityPackage.predicted - List of predicted outcomes.
 * @param {Array<string>} realityPackage.shared - List of shared understandings or beliefs.
 * @returns {string[]} A list of explanations for divergences.
 */
export function explainDrift(realityPackage) {
  const { observed, experienced, remembered, predicted, shared } = realityPackage;
  const divergences = [];

  const compareSets = (nameA, setA, nameB, setB) => {
    if (!setA || !setB) return;
    const lowerSetA = new Set(setA.map(s => s.toLowerCase()));
    const lowerSetB = new Set(setB.map(s => s.toLowerCase()));

    const onlyInA = [...lowerSetA].filter(item => !lowerSetB.has(item));
    const onlyInB = [...lowerSetB].filter(item => !lowerSetA.has(item));

    if (onlyInA.length > 0) {
      divergences.push(`${nameA} contains elements not in ${nameB}: ${onlyInA.join(", ")}`);
    }
    if (onlyInB.length > 0) {
      divergences.push(`${nameB} contains elements not in ${nameA}: ${onlyInB.join(", ")}`);
    }
  };

  compareSets("Observed", observed, "Experienced", experienced);
  compareSets("Observed", observed, "Remembered", remembered);
  compareSets("Observed", observed, "Predicted", predicted);
  compareSets("Observed", observed, "Shared", shared);
  compareSets("Experienced", experienced, "Remembered", remembered);
  compareSets("Experienced", experienced, "Predicted", predicted);
  compareSets("Experienced", experienced, "Shared", shared);
  compareSets("Remembered", remembered, "Predicted", predicted);
  compareSets("Remembered", remembered, "Shared", shared);
  compareSets("Predicted", predicted, "Shared", shared);

  if (divergences.length === 0) {
    divergences.push("No significant drift detected between reality layers.");
  }

  return divergences;
}

/**
 * Promotes confidence in a claim based on a positive outcome, updating the RealityPackage.
 * In a full implementation, this would involve updating the Calibration Ledger.
 *
 * @param {object} realityPackage - The RealityPackage.
 * @param {string} claim - The claim that had an outcome.
 * @param {boolean} outcome - True if the outcome was positive/confirming, false otherwise.
 * @returns {{updatedPackage: object, newConfidenceScore: number}} An object containing the updated RealityPackage and a new confidence score.
 */
export function promoteConfidence(realityPackage, claim, outcome) {
  const updatedPackage = { ...realityPackage };
  let newConfidenceScore = 0;

  // Simplified confidence promotion. In a real system, this would involve
  // sophisticated models, potentially updating weights in source_weights
  // or interacting with a Confidence Vector Model.

  if (outcome) {
    // If the claim was validated, increase confidence, especially for 'predicted'
    if (updatedPackage.predicted && !updatedPackage.predicted.includes(claim)) {
      updatedPackage.predicted.push(claim);
    }
    // Reflect positive outcome in remembered and experienced realities
    if (updatedPackage.experienced && !updatedPackage.experienced.includes(`Validated: ${claim}`)) {
      updatedPackage.experienced.push(`Validated: ${claim}`);
    }
    if (updatedPackage.remembered && !updatedPackage.remembered.includes(`Confirmed: ${claim}`)) {
      updatedPackage.remembered.push(`Confirmed: ${claim}`);
    }
    newConfidenceScore = 0.9; // Arbitrary increase for demonstration
  } else {
    // If the claim was invalidated, decrease confidence and add to 'observed' or 'experienced'
    // as a counter-factual or new observation
    if (updatedPackage.observed && !updatedPackage.observed.includes(`Invalidated: ${claim}`)) {
      updatedPackage.observed.push(`Invalidated: ${claim}`);
    }
    if (updatedPackage.experienced && !updatedPackage.experienced.includes(`Disproven: ${claim}`)) {
      updatedPackage.experienced.push(`Disproven: ${claim}`);
    }
    newConfidenceScore = 0.1; // Arbitrary decrease for demonstration
  }

  // Recalculate alignment with the (potentially) updated package
  const { alignment_score } = computeRealityAlignment(updatedPackage, claim);
  newConfidenceScore = alignment_score;

  return { updatedPackage, newConfidenceScore };
}