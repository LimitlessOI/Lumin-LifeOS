// services/memory-relationship.js
import { pool } from '../db/pool.js';
import { LEVEL } from '../services/memory-intelligence-service.js';

const isRelationshipCapsule = (capsule) => {
  return capsule.truth_class === 'relationship';
};

const requireFounderConfirmation = async (capsuleId, targetTrustLevel, pool) => {
  const capsule = await pool.query('SELECT * FROM capsules WHERE id = $1', [capsuleId]);
  if (!capsule || !capsule.relationship) {
    throw { halt_code: 'RELATIONSHIP_MEMORY_OVERREACH' };
  }
  const memoryUseReceipts = await pool.query('SELECT * FROM memory_use_receipts WHERE capsule_id = $1', [capsuleId]);
  if (!memoryUseReceipts.find((receipt) => receipt.type === 'founder_confirmation')) {
    throw { halt_code: 'RELATIONSHIP_MEMORY_OVERREACH' };
  }
};

const validateRelationshipSource = (capsule) => {
  if (capsule.truth_class === 'relationship' && (capsule.source === 'council_output' || capsule.source === 'system_observation')) {
    throw { halt_code: 'RELATIONSHIP_MEMORY_OVERREACH', reason: 'model_narration_not_valid' };
  }
};

const enforceRelationshipLane = async (capsule, lane, pool) => {
  const contextLane = await pool.query('SELECT context_lane FROM capsules WHERE id = $1', [capsule.id]);
  if (contextLane.context_lane >= lane) {
    await requireFounderConfirmation(capsule.id, lane, pool);
  }
};

export { isRelationshipCapsule, requireFounderConfirmation, validateRelationshipSource, enforceRelationshipLane };