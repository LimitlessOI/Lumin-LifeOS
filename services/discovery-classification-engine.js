/**
 * SYNOPSIS: Service module — Discovery Classification Engine.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const version = "2026-08-02";

const TIER_LADDER = [
  "observation",
  "inference",
  "hypothesis",
  "model",
  "principle",
  "law",
  "constitutional_principle",
];

const PROMOTION_CRITERIA = {
  observation: { count: 1, weight: 0.1 },
  inference: { count: 1, weight: 0.3 },
  hypothesis: { count: 2, weight: 0.5 },
  model: { count: 5, weight: 1.5 },
  principle: { count: 10, weight: 3.0 },
  law: { count: 20, weight: 6.0 },
  constitutional_principle: { count: 50, weight: 15.0 },
};

/**
 * Calculates the total evidence count and weight for an idea.
 * @param {Array<{type: string, source: string, weight: number}>} evidenceList
 * @returns {{count: number, totalWeight: number}}
 */
function calculateEvidenceSummary(evidenceList) {
  const count = evidenceList.length;
  const totalWeight = evidenceList.reduce((sum, ev) => sum + (ev.weight || 0), 0);
  return { count, totalWeight };
}

/**
 * Determines the classification and next possible tier for an idea based on its evidence.
 * @param {{statement: string, evidence: Array<{type: string, source: string, weight: number}>, current_tier?: string}} idea
 * @param {Array<any>} evidence_history - Not used in this version but kept for signature compatibility.
 * @returns {{classification: string, next_tier: string, missing_evidence: string[], confidence: number}}
 */
function classifyIdea(idea, evidence_history = []) {
  const { count, totalWeight } = calculateEvidenceSummary(idea.evidence);
  let classification = TIER_LADDER[0];
  let nextTier = TIER_LADDER[0];
  let confidence = 0;

  for (let i = 0; i < TIER_LADDER.length; i++) {
    const tier = TIER_LADDER[i];
    const criteria = PROMOTION_CRITERIA[tier];

    if (count >= criteria.count && totalWeight >= criteria.weight) {
      classification = tier;
      nextTier = TIER_LADDER[i + 1] || tier; // If it's the highest tier, nextTier is the same.
      
      // Basic confidence: ratio of current weight/count to next tier's requirement
      if (i < TIER_LADDER.length - 1) {
        const nextCriteria = PROMOTION_CRITERIA[TIER_LADDER[i + 1]];
        const weightRatio = Math.min(1, totalWeight / nextCriteria.weight);
        const countRatio = Math.min(1, count / nextCriteria.count);
        confidence = (weightRatio + countRatio) / 2;
      } else {
        confidence = 1; // Highest tier, max confidence for its own classification
      }

    } else {
      nextTier = tier; // The first tier not met is the next target
      break;
    }
  }

  // If classification is the highest tier, then nextTier should also be the highest tier.
  if (classification === TIER_LADDER[TIER_LADDER.length - 1]) {
    nextTier = classification;
  }

  // Determine missing evidence for the next tier
  const targetCriteria = PROMOTION_CRITERIA[nextTier];
  const missingEvidence = [];
  if (count < targetCriteria.count) {
    missingEvidence.push(`Requires ${targetCriteria.count - count} more evidence items.`);
  }
  if (totalWeight < targetCriteria.weight) {
    missingEvidence.push(`Requires ${Math.round((targetCriteria.weight - totalWeight) * 100) / 100} more total evidence weight.`);
  }

  return {
    classification,
    next_tier: nextTier,
    missing_evidence: missingEvidence,
    confidence: parseFloat(confidence.toFixed(2)),
  };
}

/**
 * Attempts to promote an idea by one tier if promotion criteria are met.
 * @param {{statement: string, evidence: Array<{type: string, source: string, weight: number}>, current_tier?: string}} idea
 * @param {Array<any>} evidence_history - Not used in this version but kept for signature compatibility.
 * @returns {{classification: string, next_tier: string, missing_evidence: string[], confidence: number}}
 */
function promoteIdea(idea, evidence_history) {
  const { classification, next_tier, missing_evidence, confidence } = classifyIdea(idea, evidence_history);

  // If the idea's current classification is already at or above the target next_tier determined by classifyIdea,
  // it means it's ready for a promotion or already at the highest possible.
  const currentTierIndex = TIER_LADDER.indexOf(idea.current_tier || TIER_LADDER[0]);
  const classifiedTierIndex = TIER_LADDER.indexOf(classification);

  if (classifiedTierIndex > currentTierIndex) {
    // Promotion is possible to the 'classification' tier
    const newNextTier = TIER_LADDER[classifiedTierIndex + 1] || classification; // If promoted to highest, next is highest
    const newTargetCriteria = PROMOTION_CRITERIA[newNextTier];
    const { count, totalWeight } = calculateEvidenceSummary(idea.evidence);

    const newMissingEvidence = [];
    if (count < newTargetCriteria.count) {
      newMissingEvidence.push(`Requires ${newTargetCriteria.count - count} more evidence items.`);
    }
    if (totalWeight < newTargetCriteria.weight) {
      newMissingEvidence.push(`Requires ${Math.round((newTargetCriteria.weight - totalWeight) * 100) / 100} more total evidence weight.`);
    }

    return {
      classification: classification, // The new tier after promotion
      next_tier: newNextTier,
      missing_evidence: newMissingEvidence,
      confidence: confidence,
    };
  } else {
    // No promotion occurred, return current classification and next_tier as determined by classifyIdea
    return {
      classification: idea.current_tier || TIER_LADDER[0], // If no promotion, current_tier remains
      next_tier: next_tier,
      missing_evidence: missing_evidence,
      confidence: confidence,
    };
  }
}

/**
 * Returns the required evidence count and total weight for the given tier.
 * @param {string} tier - The tier name (e.g., "observation", "hypothesis").
 * @returns {{count: number, weight: number} | null} The criteria or null if tier is invalid.
 */
function listPromotionCriteria(tier) {
  return PROMOTION_CRITERIA[tier] || null;
}

/**
 * Returns the ordered array of tier strings.
 * @returns {string[]} An array of tier names.
 */
function getTierLadder() {
  return [...TIER_LADDER];
}

export {
  classifyIdea,
  promoteIdea,
  listPromotionCriteria,
  getTierLadder,
  version,
};