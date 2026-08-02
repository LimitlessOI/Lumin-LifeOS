/**
 * SYNOPSIS: Exports createEvidencePackage — services/chair-preliminary-decision.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Creates an evidence package for a given topic.
 * @param {string} topic - The topic of the evidence package.
 * @param {Array<Object>} evidenceItems - An array of evidence items. Each item should have {source, content, confidence}.
 * @returns {Object} An object containing the topic, evidence items, and creation timestamp.
 */
export function createEvidencePackage(topic, evidenceItems) {
  if (!topic || typeof topic !== 'string') {
    throw new Error('Topic must be a non-empty string.');
  }
  if (!Array.isArray(evidenceItems)) {
    throw new Error('Evidence items must be an array.');
  }
  const validatedEvidenceItems = evidenceItems.map(item => {
    if (!item || typeof item.source !== 'string' || typeof item.content !== 'string' || typeof item.confidence !== 'number') {
      throw new Error('Each evidence item must have a source (string), content (string), and confidence (number).');
    }
    return { source: item.source, content: item.content, confidence: item.confidence };
  });

  return {
    topic,
    evidenceItems: validatedEvidenceItems,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Records the Chair's preliminary decision on an evidence package.
 * @param {Object} pkg - The evidence package object.
 * @param {string} chairId - The ID of the Chair making the decision.
 * @param {string} reasoning - The Chair's reasoning for the decision.
 * @param {string} proposedDecision - The Chair's proposed decision.
 * @returns {Object} A new object with the preliminary decision added.
 */
export function recordPreliminaryDecision(pkg, chairId, reasoning, proposedDecision) {
  if (!pkg || typeof pkg !== 'object') {
    throw new Error('Package must be an object.');
  }
  if (typeof chairId !== 'string' || chairId.trim() === '') {
    throw new Error('Chair ID must be a non-empty string.');
  }
  if (typeof reasoning !== 'string' || reasoning.trim() === '') {
    throw new Error('Reasoning must be a non-empty string.');
  }
  if (typeof proposedDecision !== 'string' || proposedDecision.trim() === '') {
    throw new Error('Proposed decision must be a non-empty string.');
  }
  if (pkg.chairPreliminary) {
    throw new Error('A preliminary decision has already been recorded for this package.');
  }

  return {
    ...pkg,
    chairPreliminary: {
      chairId,
      reasoning,
      proposedDecision,
      recordedAt: new Date().toISOString(),
    },
  };
}

/**
 * Retrieves the Chair's reasoning from an evidence package.
 * @param {Object} pkg - The evidence package object.
 * @returns {string|null} The reasoning string or null if not found.
 */
export function getChairReasoning(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    return null;
  }
  return pkg.chairPreliminary?.reasoning || null;
}

/**
 * Retrieves the Chair's proposed decision from an evidence package.
 * @param {Object} pkg - The evidence package object.
 * @returns {string|null} The proposed decision string or null if not found.
 */
export function getProposedDecision(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    return null;
  }
  return pkg.chairPreliminary?.proposedDecision || null;
}

/**
 * Checks if an evidence package has a preliminary decision recorded.
 * @param {Object} pkg - The evidence package object.
 * @returns {boolean} True if a preliminary decision exists, false otherwise.
 */
export function hasPreliminaryDecision(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    return false;
  }
  return !!pkg.chairPreliminary;
}