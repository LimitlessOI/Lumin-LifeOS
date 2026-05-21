// services/memory-oil-bridge.js
import { Pool } from 'pg';
import { LEVEL } from '../memory-intelligence-service.js';

const OIL_TRUST_MAP = {
  UNTRUSTED: {
    memory_state: 'UNTRUSTED',
    evidence_floor: 'CLAIM',
    retrieval_ceiling: 'blocked',
  },
  PROPOSED: {
    memory_state: 'PROPOSED',
    evidence_floor: 'CLAIM',
    retrieval_ceiling: 'context_only',
  },
  SCOPED: {
    memory_state: 'SCOPED',
    evidence_floor: 'HYPOTHESIS',
    retrieval_ceiling: 'context_only',
  },
  RECEIPT_BACKED: {
    memory_state: 'RECEIPT_BACKED',
    evidence_floor: 'RECEIPT',
    retrieval_ceiling: 'decision_support',
  },
  TRUSTED_FOR_CONTEXT: {
    memory_state: 'TRUSTED_FOR_CONTEXT',
    evidence_floor: 'VERIFIED',
    retrieval_ceiling: 'decision_support',
  },
};

const validateOILMemoryAlignment = async (capsuleId, oilTrustLevel, pool) => {
  const dbTrustLevel = await pool.query(
    'SELECT trust_level FROM memory_capsules WHERE id = $1',
    [capsuleId]
  );
  if (oilTrustLevel !== dbTrustLevel.rows[0].trust_level) {
    throw { halt_code: 'TRUST_BRIDGE_MISMATCH' };
  }
};

const enforceRetrievalCeiling = (capsuleTrustLevel, requestedLane) => {
  const ceiling = OIL_TRUST_MAP[capsuleTrustLevel].retrieval_ceiling;
  const ceilings = ['blocked', 'context_only', 'decision_support', 'action_authority'];
  const index = ceilings.indexOf(ceiling);
  return requestedLane <= ceilings[index + 1];
};

const getRetrievalCeiling = (trustLevel) => {
  return OIL_TRUST_MAP[trustLevel].retrieval_ceiling;
};

export { OIL_TRUST_MAP, validateOILMemoryAlignment, enforceRetrievalCeiling, getRetrievalCeiling };