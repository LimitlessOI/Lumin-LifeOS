/**
 * SYNOPSIS: Exports scoreConfidence — services/confidence-vector.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Defines the criteria for promoting evidence through different tiers.
 * Each tier requires specific evidence to advance to the next.
 */
export const TIER_PROMOTION_CRITERIA = {
  Observation: {
    nextTier: 'Inference',
    requiredEvidence: 'repeated, documented',
    epistemicBoost: 0.1,
    commitmentBoost: 0.05,
  },
  Inference: {
    nextTier: 'Hypothesis',
    requiredEvidence: 'single-step logical consequence',
    epistemicBoost: 0.15,
    commitmentBoost: 0.08,
  },
  Hypothesis: {
    nextTier: 'Model',
    requiredEvidence: 'testable, not yet tested',
    epistemicBoost: 0.2,
    commitmentBoost: 0.1,
  },
  Model: {
    nextTier: 'Principle',
    requiredEvidence: 'predicts outcomes across multiple cases',
    epistemicBoost: 0.25,
    commitmentBoost: 0.15,
  },
  Principle: {
    nextTier: 'Law',
    requiredEvidence: 'survives adversarial challenge',
    epistemicBoost: 0.3,
    commitmentBoost: 0.2,
  },
  Law: {
    nextTier: 'Constitutional Principle',
    requiredEvidence: 'encoded in governance and enforced',
    epistemicBoost: 0.35,
    commitmentBoost: 0.25,
  },
  'Constitutional Principle': {
    nextTier: null, // Top tier
    requiredEvidence: 'ratified and woven into CONSTITUTIONAL_FRAMEWORK',
    epistemicBoost: 0, // No further promotion
    commitmentBoost: 0,
  },
};

/**
 * Scores the confidence of evidence based on its nature.
 * This is a foundational scoring, not a promotion mechanism.
 *
 * @param {object} evidence - The evidence object.
 * @param {string} evidence.type - The type of evidence (e.g., 'observation', 'empirical', 'logical', 'governance').
 * @param {number} [evidence.weight=1] - A numerical weight for the evidence strength (0-1).
 * @returns {{epistemic: number, commitment: number}} A confidence vector.
 */
export function scoreConfidence(evidence) {
  let epistemic = 0;
  let commitment = 0;
  const weight = evidence.weight ?? 1;

  switch (evidence.type) {
    case 'observation':
      epistemic = 0.3 * weight;
      commitment = 0.1 * weight;
      break;
    case 'empirical':
      epistemic = 0.5 * weight;
      commitment = 0.2 * weight;
      break;
    case 'logical':
      epistemic = 0.6 * weight;
      commitment = 0.3 * weight;
      break;
    case 'adversarial_challenge':
      epistemic = 0.7 * weight;
      commitment = 0.4 * weight;
      break;
    case 'governance_enforcement':
      epistemic = 0.8 * weight;
      commitment = 0.7 * weight;
      break;
    case 'constitutional_ratification':
      epistemic = 0.9 * weight;
      commitment = 0.9 * weight;
      break;
    default:
      // For unknown types, assign a minimal confidence
      epistemic = 0.05 * weight;
      commitment = 0.01 * weight;
      break;
  }

  return {
    epistemic: Math.min(1, Math.max(0, epistemic)),
    commitment: Math.min(1, Math.max(0, commitment)),
  };
}

/**
 * Promotes an evidence tier based on the provided evidence and current tier.
 *
 * @param {object} evidence - The evidence object (details not fully specified, assume it influences confidence).
 * @param {string} currentTier - The current tier of the evidence (e.g., 'Observation', 'Inference').
 * @returns {{newTier: string, confidence: {epistemic: number, commitment: number}, requiredEvidence: string}}
 */
export function promoteEvidenceTier(evidence, currentTier) {
  const criteria = TIER_PROMOTION_CRITERIA[currentTier];

  if (!criteria) {
    return {
      newTier: currentTier,
      confidence: { epistemic: 0, commitment: 0 },
      requiredEvidence: 'Invalid or top tier reached.',
    };
  }

  // Calculate base confidence from the evidence itself
  const baseConfidence = scoreConfidence(evidence);

  // Apply tier-specific boosts for promotion
  const newEpistemic = baseConfidence.epistemic + criteria.epistemicBoost;
  const newCommitment = baseConfidence.commitment + criteria.commitmentBoost;

  return {
    newTier: criteria.nextTier || currentTier,
    confidence: {
      epistemic: Math.min(1, newEpistemic),
      commitment: Math.min(1, newCommitment),
    },
    requiredEvidence: criteria.requiredEvidence,
  };
}