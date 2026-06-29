/**
 * SYNOPSIS: services/memory-oil-bridge.js
 */
// services/memory-oil-bridge.js
/** @ssot docs/products/memory-system/PRODUCT_HOME.md */

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
    retrieval_ceiling: 'action_authority',
  },
};

// Permission values ordered from most restricted to least restricted.
const PERMISSION_ORDER = ['blocked', 'context_only', 'decision_support', 'action_authority'];

const validateOILMemoryAlignment = async (capsuleId, oilTrustLevel, pool) => {
  const dbTrustLevel = await pool.query(
    'SELECT trust_level FROM memory_capsules WHERE capsule_id = $1',
    [capsuleId]
  );
  if (!dbTrustLevel.rows[0]) {
    throw { halt_code: 'TRUST_BRIDGE_MISMATCH' };
  }
  if (oilTrustLevel !== dbTrustLevel.rows[0].trust_level) {
    throw { halt_code: 'TRUST_BRIDGE_MISMATCH' };
  }
};

// Returns true if requestedPermission is within the capsule's retrieval ceiling.
const enforceRetrievalCeiling = (capsuleTrustLevel, requestedPermission) => {
  const ceiling = OIL_TRUST_MAP[capsuleTrustLevel]?.retrieval_ceiling;
  const ceilingIndex = PERMISSION_ORDER.indexOf(ceiling);
  const requestedIndex = PERMISSION_ORDER.indexOf(requestedPermission);
  if (ceilingIndex === -1 || requestedIndex === -1) {
    throw { halt_code: 'RETRIEVAL_LANE_CEILING_EXCEEDED' };
  }
  return requestedIndex <= ceilingIndex;
};

const getRetrievalCeiling = (trustLevel) => {
  return OIL_TRUST_MAP[trustLevel]?.retrieval_ceiling ?? 'blocked';
};

export { OIL_TRUST_MAP, validateOILMemoryAlignment, enforceRetrievalCeiling, getRetrievalCeiling };
