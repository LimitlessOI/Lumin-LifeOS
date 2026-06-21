/**
 * SYNOPSIS: services/memory-trust-bridge.js
 */
// services/memory-trust-bridge.js
/** @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md */
import { LEVEL } from './memory-intelligence-service.js';

// floor = minimum evidence level (numeric) required for this trust tier
// retrieval_ceiling = maximum retrieval permission string for this trust tier
const TRUST_MAP = {
  UNTRUSTED:          { floor: LEVEL.CLAIM,      retrieval_ceiling: 'blocked' },
  PROPOSED:           { floor: LEVEL.CLAIM,      retrieval_ceiling: 'context_only' },
  SCOPED:             { floor: LEVEL.HYPOTHESIS,  retrieval_ceiling: 'context_only' },
  RECEIPT_BACKED:     { floor: LEVEL.RECEIPT,     retrieval_ceiling: 'decision_support' },
  TRUSTED_FOR_CONTEXT:{ floor: LEVEL.VERIFIED,    retrieval_ceiling: 'action_authority' },
};

const EVIDENCE_LEVELS = [
  LEVEL.CLAIM,
  LEVEL.HYPOTHESIS,
  LEVEL.TESTED,
  LEVEL.RECEIPT,
  LEVEL.VERIFIED,
  LEVEL.FACT,
  LEVEL.INVARIANT,
];

// evidenceLevel: numeric value from LEVEL constants (0–6)
// trustLevel: trust tier string ('PROPOSED', 'RECEIPT_BACKED', etc.)
function evidenceLevelSatisfiesFloor(evidenceLevel, trustLevel) {
  if (trustLevel === 'CANONICAL') {
    throw new Error('MEMORY_PROMOTION_BYPASS');
  }
  const tier = TRUST_MAP[trustLevel];
  if (!tier) throw new Error(`Unknown trust level: ${trustLevel}`);
  return evidenceLevel >= tier.floor;
}

async function assignTrust(capsuleId, requestedTrustLevel, pool) {
  if (requestedTrustLevel === 'CANONICAL') {
    throw { halt_code: 'MEMORY_PROMOTION_BYPASS' };
  }
  if (!TRUST_MAP[requestedTrustLevel]) {
    throw new Error(`Unknown trust level: ${requestedTrustLevel}`);
  }

  const factResult = await pool.query(
    `SELECT ef.level
     FROM epistemic_facts ef
     JOIN memory_capsules mc ON mc.fact_id = ef.id
     WHERE mc.capsule_id = $1`,
    [capsuleId]
  );

  if (!factResult.rows[0]) {
    throw { halt_code: 'TRUST_BRIDGE_MISMATCH' };
  }
  if (factResult.rows[0].level < TRUST_MAP[requestedTrustLevel].floor) {
    throw { halt_code: 'TRUST_BRIDGE_MISMATCH' };
  }

  await pool.query(
    `UPDATE memory_capsules SET trust_level = $1, updated_at = NOW() WHERE capsule_id = $2`,
    [requestedTrustLevel, capsuleId]
  );

  await pool.query(
    `INSERT INTO memory_use_receipts (capsule_id, receipt_type, created_by, created_at)
     VALUES ($1, 'TRUST_ASSIGNMENT', 'system', NOW())`,
    [capsuleId]
  );
}

export { TRUST_MAP, EVIDENCE_LEVELS, evidenceLevelSatisfiesFloor, assignTrust };
