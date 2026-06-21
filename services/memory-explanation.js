/**
 * SYNOPSIS: services/memory-explanation.js
 */
// services/memory-explanation.js
/** @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md */
export function buildExplanation(capsuleId, influenceType, decisionContext) {
  if (!['classification', 'routing', 'bounded_action', 'trusted_state_mutation', 'escalation'].includes(influenceType)) {
    throw new Error(`Invalid influenceType: ${influenceType}`);
  }

  if (!decisionContext.why_retrieved) {
    throw { halt_code: 'MEMORY_RETRIEVAL_UNJUSTIFIED' };
  }

  return {
    capsule_id: capsuleId,
    influence_type: influenceType,
    why_retrieved: decisionContext.why_retrieved,
    allowed_use: decisionContext.allowed_use,
  };
}

export function checkCitationPresent(output, capsuleIds) {
  const outputString = JSON.stringify(output);
  for (const capsuleId of capsuleIds) {
    if (!outputString.includes(capsuleId)) {
      throw { halt_code: 'MEMORY_INFLUENCE_UNCITED', missing_capsule_id: capsuleId };
    }
  }
}

export function formatCitationLine(provenance) {
  return `${provenance.title} (Trust Level: ${provenance.trust_level}, Evidence Level: ${provenance.evidence_level}, Why Retrieved: ${provenance.why_retrieved})`;
}