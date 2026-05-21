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
  const capsuleId = await insertCapsule(capsuleFields, pool);
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

const updateCapsuleTrust = async (capsuleId, newTrustLevel, receiptNote, pool) => {
  if (newTrustLevel === 'CANONICAL') {
    throw { halt_code: 'MEMORY_PROMOTION_BYPASS' };
  }

  await updateCapsule(capsuleId, newTrustLevel, new Date().toISOString(), pool);
  await writeReceipt(capsuleId, 'capsule_receipt', 'system', new Date().toISOString(), pool);
};

const insertCapsule = async (capsuleFields, pool) => {
  const result = await pool.query(
    'INSERT INTO memory_capsules (title, capsule_type, truth_class, source_type, trust_level, evidence_level, sensitivity, retrieval_permission, review_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING capsule_id',
    [
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

export { createCapsule, getCapsule, updateCapsuleTrust };
