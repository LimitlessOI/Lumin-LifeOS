/**
 * SYNOPSIS: services/memory-relationship.js
 */
// services/memory-relationship.js
/** @ssot docs/products/memory-system/PRODUCT_HOME.md */

const LANE_ORDER = [
  'context_lane',
  'decision_support_lane',
  'action_authority_lane',
  'review_lane',
  'relationship_sensitive_lane',
];

const isRelationshipCapsule = (capsule) => {
  return capsule.truth_class === 'relationship';
};

const requireFounderConfirmation = async (capsuleId, targetTrustLevel, pool) => {
  const capsule = await pool.query(
    'SELECT * FROM memory_capsules WHERE capsule_id = $1',
    [capsuleId]
  );
  if (!capsule.rows[0] || capsule.rows[0].truth_class !== 'relationship') {
    throw { halt_code: 'RELATIONSHIP_MEMORY_OVERREACH' };
  }
  const memoryUseReceipts = await pool.query(
    'SELECT * FROM memory_use_receipts WHERE capsule_id = $1',
    [capsuleId]
  );
  if (!memoryUseReceipts.rows.find((receipt) =>
    receipt.receipt_type === 'founder_confirmation_receipt' ||
    (receipt.receipt_type === 'memory_use_receipt' && receipt.use_type === 'founder_confirmation')
  )) {
    throw { halt_code: 'RELATIONSHIP_MEMORY_OVERREACH' };
  }
};

const validateRelationshipSource = (capsule) => {
  if (
    capsule.truth_class === 'relationship' &&
    (capsule.source_type === 'council_output' || capsule.source_type === 'system_observation')
  ) {
    throw { halt_code: 'RELATIONSHIP_MEMORY_OVERREACH', reason: 'model_narration_not_valid' };
  }
};

const enforceRelationshipLane = async (capsule, lane, pool) => {
  const capsulePermission = capsule.retrieval_permission || 'context_lane';
  const currentIndex = LANE_ORDER.indexOf(capsulePermission);
  const requestedIndex = LANE_ORDER.indexOf(lane);
  if (requestedIndex > currentIndex) {
    await requireFounderConfirmation(capsule.capsule_id, lane, pool);
  }
};

export { isRelationshipCapsule, requireFounderConfirmation, validateRelationshipSource, enforceRelationshipLane };
