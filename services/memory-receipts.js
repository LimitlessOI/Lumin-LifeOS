/**
 * SYNOPSIS: services/memory-receipts.js
 */
// services/memory-receipts.js
/**
 * @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md
 */

const VALID_USE_TYPES = [
  'classification',
  'routing',
  'bounded_action',
  'trusted_state_mutation',
  'escalation',
  'founder_confirmation',
];

export async function writeMemoryUseReceipt(capsuleId, useType, decisionRef, taskScope, lane, pool) {
  if (!VALID_USE_TYPES.includes(useType)) {
    throw new Error(`Invalid useType: ${useType}. Must be one of: ${VALID_USE_TYPES.join(', ')}`);
  }
  if (!decisionRef || decisionRef.trim() === '') {
    throw new Error('decisionRef cannot be empty.');
  }
  const result = await pool.query(
    `INSERT INTO memory_use_receipts
       (receipt_type, capsule_id, use_type, decision_ref, task_scope, retrieval_lane, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id`,
    ['memory_use_receipt', capsuleId, useType, decisionRef, taskScope, lane, 'system']
  );
  return result.rows[0];
}

export async function getReceiptsForDecision(decisionRef, pool) {
  const result = await pool.query(
    `SELECT capsule_id, use_type, created_at
     FROM memory_use_receipts
     WHERE decision_ref = $1
     ORDER BY created_at`,
    [decisionRef]
  );
  return result.rows;
}

export async function getReceiptsForCapsule(capsuleId, pool) {
  const result = await pool.query(
    `SELECT decision_ref, use_type, created_at
     FROM memory_use_receipts
     WHERE capsule_id = $1
     ORDER BY created_at`,
    [capsuleId]
  );
  return result.rows;
}

export async function isReceiptWritten(capsuleId, decisionRef, pool) {
  const result = await pool.query(
    `SELECT id FROM memory_use_receipts WHERE capsule_id = $1 AND decision_ref = $2 LIMIT 1`,
    [capsuleId, decisionRef]
  );
  return result.rows.length > 0;
}
