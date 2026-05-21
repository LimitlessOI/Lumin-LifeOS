// services/memory-receipts.js
/**
 * @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md
 *
 * Service for managing memory use receipts.
 * These receipts track how memory capsules are used in various decision-making processes.
 */

const VALID_USE_TYPES = [
  'classification',
  'routing',
  'bounded_action',
  'trusted_state_mutation',
  'escalation',
  'founder_confirmation',
];

/**
 * Records a memory use receipt.
 *
 * @param {string} capsuleId - The ID of the memory capsule used.
 * @param {string} useType - The type of use (e.g., 'routing', 'classification').
 * @param {string} decisionRef - A reference to the decision context where memory was used.
 * @param {string} taskScope - The scope of the task associated with the decision.
 * @param {string} lane - The retrieval lane used for the memory.
 * @param {object} pool - PostgreSQL connection pool.
 * @returns {Promise<{id: string}>} The ID of the newly created receipt.
 * @throws {Error} If useType is invalid or decisionRef is empty.
 */
export async function writeMemoryUseReceipt(capsuleId, useType, decisionRef, taskScope, lane, pool) {
  if (!VALID_USE_TYPES.includes(useType)) {
    throw new Error(`Invalid useType: ${useType}. Must be one of: ${VALID_USE_TYPES.join(', ')}`);
  }
  if (!decisionRef || decisionRef.trim() === '') {
    throw new Error('decisionRef cannot be empty.');
  }

  const query = `
    INSERT INTO memory_use_receipts (
      receipt_type,
      capsule_id,
      use_type,
      decision_ref,
      task_scope,
      retrieval_lane,
      created_by,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id;
  `;
  const values = [
    'memory_use_receipt',
    capsuleId,
    useType,
    decisionRef,
    taskScope,
    lane,
    'system', // As per spec, created_by is 'system'
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Retrieves all memory use receipts for a given decision reference.
 *
 * @param {string} decisionRef - The decision reference to query by.
 * @param {object} pool - PostgreSQL connection pool.
 * @returns {Promise<Array<{capsule_id: string, use_type: string, created_at: Date}>>} An array of receipts.
 */
export async function getReceiptsForDecision(decisionRef, pool) {
  const query = `
    SELECT capsule_id, use_type, created_at
    FROM memory_use_receipts
    WHERE decision_ref = $1
    ORDER BY created_at;
  `;
  const result = await pool.query(query, [decisionRef]);
  return result.rows;
}

/**
 * Retrieves all memory use receipts for a given capsule ID.
 *
 * @param {string} capsuleId - The capsule ID to query by.
 * @param {object} pool - PostgreSQL connection pool.
 * @returns {Promise<Array<{decision_ref: string, use_type: string, created_at: Date}>>} An array of receipts.
 */
export async function getReceiptsForCapsule(capsuleId, pool) {
  const query = `
    SELECT decision_ref, use_type, created_at
    FROM memory_use_receipts
    WHERE capsule_id = $1
    ORDER BY created_at;
  `;
  const result = await pool.query(query, [capsuleId]);
  return result.rows;
}

/**
 * Checks if a specific memory use receipt exists for a given capsule ID and decision reference.
 *
 * @param {string} capsuleId - The ID of the memory capsule.
 * @param {string} decisionRef - The decision reference.
 * @param {object} pool - PostgreSQL connection pool.
 *