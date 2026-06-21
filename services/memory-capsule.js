/**
 * SYNOPSIS: services/memory-capsule.js
 */
// services/memory-capsule.js
/** @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md */

const createCapsule = async (candidate, fields, pool) => {
  if (!fields.title || !fields.capsule_type || !fields.truth_class || !fields.source_type) {
    throw { halt_code: 'CAPSULE_SCHEMA_INCOMPLETE', missing: fields };
  }

  if (fields.trust_level === 'CANONICAL') {
    throw { halt_code: 'MEMORY_PROMOTION_BYPASS' };
  }

  const defaults = {
    trust_level: 'PROPOSED',
    evidence_level: 'CLAIM',
    sensitivity: 'STANDARD',
    retrieval_permission: 'context_only',
    review_by: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const capsuleFields = { ...defaults, ...fields };
  const capsuleId = await insertCapsule(candidate?.fact_id || null, capsuleFields, pool);
  await writeReceipt(capsuleId, 'capsule_receipt', 'system', new Date().toISOString(), pool);
  return { capsule_id: capsuleId };
};

const getCapsule = async (capsuleId, pool) => {
  const result = await pool.query(
    'SELECT * FROM memory_capsules WHERE capsule_id = $1',
    [capsuleId]
  );
  return result.rows[0] || null;
};

const validateRealityAnchor = async (capsuleId, liveValue, pool) => {
  const result = await pool.query(
    `SELECT mc.capsule_id, mc.title, mc.status, ef.text
     FROM memory_capsules mc
     LEFT JOIN epistemic_facts ef ON ef.id = mc.fact_id
     WHERE mc.capsule_id = $1`,
    [capsuleId]
  );
  const capsule = result.rows[0];
  if (!capsule) {
    throw { halt_code: 'REALITY_ANCHOR_MEMORY_MISMATCH', reason: 'capsule_not_found' };
  }

  const expectedValue = String(capsule.text || capsule.title || '').trim();
  const observedValue = String(liveValue ?? '').trim();
  if (expectedValue === observedValue) {
    return { matched: true, status: capsule.status };
  }

  await pool.query(
    `UPDATE memory_capsules
     SET status = 'QUARANTINED', retrieval_permission = 'blocked', updated_at = NOW()
     WHERE capsule_id = $1`,
    [capsuleId]
  );
  await writeReceipt(capsuleId, 'halt_receipt', 'system', new Date().toISOString(), pool);

  throw {
    halt_code: 'REALITY_ANCHOR_MEMORY_MISMATCH',
    capsule_id: capsuleId,
    expected_value: expectedValue,
    observed_value: observedValue,
  };
};

const updateCapsuleTrust = async (capsuleId, newTrustLevel, receiptNote, pool) => {
  if (newTrustLevel === 'CANONICAL') {
    throw { halt_code: 'MEMORY_PROMOTION_BYPASS' };
  }

  const currentResult = await pool.query(
    'SELECT trust_level FROM memory_capsules WHERE capsule_id = $1',
    [capsuleId]
  );
  const currentTrustLevel = currentResult.rows[0]?.trust_level;

  if (currentTrustLevel === 'RECEIPT_BACKED' && newTrustLevel === 'TRUSTED_FOR_CONTEXT') {
    const receiptResult = await pool.query(
      `SELECT id
       FROM memory_use_receipts
       WHERE capsule_id = $1
         AND receipt_type = 'audit_completion_receipt'
       ORDER BY created_at DESC
       LIMIT 1`,
      [capsuleId]
    );
    if (!receiptResult.rows[0]) {
      return {
        updated: false,
        blocked: true,
        blocked_by: 'audit_completion_receipt_missing',
      };
    }
  }

  await updateCapsule(capsuleId, newTrustLevel, new Date().toISOString(), pool);
  await writeReceipt(capsuleId, 'capsule_receipt', 'system', new Date().toISOString(), pool);
  return {
    updated: true,
    trust_level: newTrustLevel,
  };
};

const insertCapsule = async (factId, capsuleFields, pool) => {
  const result = await pool.query(
    'INSERT INTO memory_capsules (fact_id, title, capsule_type, truth_class, source_type, trust_level, evidence_level, sensitivity, retrieval_permission, review_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING capsule_id',
    [
      factId,
      capsuleFields.title,
      capsuleFields.capsule_type,
      capsuleFields.truth_class,
      capsuleFields.source_type,
      capsuleFields.trust_level,
      capsuleFields.evidence_level,
      capsuleFields.sensitivity,
      capsuleFields.retrieval_permission,
      capsuleFields.review_by,
    ]
  );
  return result.rows[0].capsule_id;
};

const updateCapsule = async (capsuleId, newTrustLevel, updatedAt, pool) => {
  await pool.query(
    'UPDATE memory_capsules SET trust_level = $1, updated_at = $2 WHERE capsule_id = $3',
    [newTrustLevel, updatedAt, capsuleId]
  );
};

const writeReceipt = async (capsuleId, receiptType, createdBy, createdAt, pool) => {
  await pool.query(
    'INSERT INTO memory_use_receipts (receipt_type, capsule_id, created_by, created_at) VALUES ($1, $2, $3, $4)',
    [receiptType, capsuleId, createdBy, createdAt]
  );
};

export { createCapsule, getCapsule, updateCapsuleTrust, validateRealityAnchor };
