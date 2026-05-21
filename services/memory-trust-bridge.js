// services/memory-trust-bridge.js
import { pool } from '../db/pool.js';
import { LEVEL } from '../services/memory-intelligence-service.js';

const TRUST_MAP = {
  UNTRUSTED: { floor: LEVEL.CLAIM, ceiling: LEVEL.BLOCKED },
  PROPOSED: { floor: LEVEL.CLAIM, ceiling: LEVEL.CONTEXT_ONLY },
  SCOPED: { floor: LEVEL.HYPOTHESIS, ceiling: LEVEL.CONTEXT_ONLY },
  RECEIPT_BACKED: { floor: LEVEL.RECEIPT, ceiling: LEVEL.DECISION_SUPPORT },
  TRUSTED_FOR_CONTEXT: { floor: LEVEL.VERIFIED, ceiling: LEVEL.DECISION_SUPPORT },
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

function evidenceLevelSatisfiesFloor(evidenceLevel, trustLevel) {
  if (evidenceLevel === LEVEL.CANONICAL) {
    throw new Error('MEMORY_PROMOTION_BYPASS');
  }
  const { floor } = TRUST_MAP[trustLevel];
  return evidenceLevel >= floor;
}

async function assignTrust(capsuleId, requestedTrustLevel, pool) {
  if (requestedTrustLevel === LEVEL.CANONICAL) {
    throw new Error('MEMORY_PROMOTION_BYPASS');
  }
  const factLevel = await pool.query(
    `
      SELECT level FROM epistemic_facts
      WHERE fact_id = (SELECT fact_id FROM memory_capsules WHERE id = $1)
    `,
    [capsuleId]
  );
  if (!factLevel || factLevel.level < TRUST_MAP[requestedTrustLevel].floor) {
    throw new Error('TRUST_BRIDGE_MISMATCH');
  }
  await pool.query(
    `
      UPDATE memory_capsules
      SET trust_level = $1
      WHERE id = $2
    `,
    [requestedTrustLevel, capsuleId]
  );
  await pool.query(
    `
      INSERT INTO capsule_receipts (capsule_id, receipt_type)
      VALUES ($1, 'TRUST_ASSIGNMENT')
    `,
    [capsuleId]
  );
}

export { TRUST_MAP, EVIDENCE_LEVELS, evidenceLevelSatisfiesFloor, assignTrust };