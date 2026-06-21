/**
 * SYNOPSIS: services/memory-retrieval.js
 */
// services/memory-retrieval.js
/** @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md */
import { buildProvenanceChain } from './memory-provenance.js';

const TRUST_TO_PERMISSION = {
  UNTRUSTED: 'blocked',
  PROPOSED: 'context_only',
  SCOPED: 'context_only',
  RECEIPT_BACKED: 'decision_support',
  TRUSTED_FOR_CONTEXT: 'action_authority',
};

const LANE_TO_PERMISSION = {
  context_lane: 'context_only',
  decision_support_lane: 'decision_support',
  action_authority_lane: 'action_authority',
  relationship_sensitive_lane: 'decision_support',
  review_lane: 'blocked',
};

async function assignRetrievalPermission(capsuleId, pool) {
  const result = await pool.query(
    `SELECT trust_level FROM memory_capsules WHERE capsule_id = $1`,
    [capsuleId]
  );
  const trustLevel = result.rows[0].trust_level;
  const permission = TRUST_TO_PERMISSION[trustLevel] || 'context_only';
  await pool.query(
    `UPDATE memory_capsules SET retrieval_permission = $1 WHERE capsule_id = $2`,
    [permission, capsuleId]
  );
  const receiptResult = await pool.query(
    `SELECT id FROM memory_use_receipts WHERE capsule_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [capsuleId]
  );
  return receiptResult.rows[0]?.id;
}

async function enforceLaneCeiling(capsule, requestedLane) {
  if (
    (capsule.status === 'QUARANTINED' || capsule.status === 'DEPRECATED') &&
    requestedLane !== 'review_lane'
  ) {
    return { allowed: false, reason: 'Blocked capsule in non-review lane' };
  }
  if (capsule.retrieval_permission === 'blocked' && requestedLane !== 'review_lane') {
    return { allowed: false, reason: 'Blocked capsule in non-review lane' };
  }
  const ceilingOrder = ['blocked', 'context_only', 'decision_support', 'action_authority'];
  const currentIndex = ceilingOrder.indexOf(capsule.retrieval_permission);
  const requestedPermission = LANE_TO_PERMISSION[requestedLane];
  const requestedIndex = ceilingOrder.indexOf(requestedPermission);
  if (requestedLane === 'review_lane') {
    return { allowed: true, reason: 'Review lane bypass allowed' };
  }
  if (requestedIndex === -1) {
    throw { halt_code: 'RETRIEVAL_LANE_CEILING_EXCEEDED' };
  }
  if (currentIndex > requestedIndex) {
    return { allowed: false, reason: 'Lane ceiling exceeded' };
  }
  return { allowed: true, reason: 'Lane ceiling satisfied' };
}

async function retrieveCapsules(query, lane, taskScope, whyRetrieved, allowedUse, pool) {
  if (!lane) {
    throw { halt_code: 'MEMORY_RETRIEVAL_PERMISSION_UNKNOWN' };
  }
  const results = await pool.query(`SELECT * FROM memory_capsules`);
  const capsules = results.rows;
  const includedCapsules = [];
  let abstentionCount = 0;
  for (const capsule of capsules) {
    const enforcementResult = await enforceLaneCeiling(capsule, lane);
    if (enforcementResult.allowed) {
      includedCapsules.push(capsule);
    } else {
      abstentionCount++;
    }
  }
  const provenanceChains = await Promise.all(
    includedCapsules.map((capsule) =>
      buildProvenanceChain(capsule.capsule_id, lane, whyRetrieved, allowedUse, pool)
    )
  );
  return {
    results: includedCapsules,
    provenance: provenanceChains,
    abstention_count: abstentionCount,
    lane_applied: lane,
  };
}

async function checkZombieLane(capsule, lane) {
  if (capsule.status === 'QUARANTINED' && lane !== 'review_lane') {
    throw { halt_code: 'ZOMBIE_MEMORY_USED_FOR_ACTION' };
  }
  if (capsule.status === 'DEPRECATED' && lane !== 'review_lane') {
    throw { halt_code: 'DEPRECATED_MEMORY_USED_FOR_ACTION' };
  }
}

export { assignRetrievalPermission, enforceLaneCeiling, retrieveCapsules, checkZombieLane };
