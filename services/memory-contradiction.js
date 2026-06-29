/**
 * SYNOPSIS: services/memory-contradiction.js
 */
// services/memory-contradiction.js
/** @ssot docs/products/memory-system/PRODUCT_HOME.md */

async function checkContradiction(capsuleId, domain, statement, factFamilyId, pool) {
  const result = await pool.query(
    `SELECT EXISTS(
      SELECT 1
      FROM memory_capsules mc
      JOIN epistemic_facts ef ON mc.fact_id = ef.id
      WHERE (ef.domain = $1 AND LOWER(TRIM($2)) = LOWER(TRIM(ef.text)))
         OR (mc.fact_family_id = $3 AND mc.capsule_id != $4)
    )`,
    [domain, statement, factFamilyId, capsuleId]
  );
  const exists = result.rows[0].exists;
  if (!exists) return { exists: false, contradiction_id: null, conflicting_capsule_id: null };

  const contradictionResult = await pool.query(
    `SELECT mc.capsule_id AS conflicting_capsule_id
     FROM memory_capsules mc
     JOIN epistemic_facts ef ON mc.fact_id = ef.id
     WHERE (ef.domain = $1 AND LOWER(TRIM($2)) = LOWER(TRIM(ef.text)))
        OR (mc.fact_family_id = $3 AND mc.capsule_id != $4)
     LIMIT 1`,
    [domain, statement, factFamilyId, capsuleId]
  );
  const conflictingCapsuleId = contradictionResult.rows[0].conflicting_capsule_id;
  return { exists: true, conflicting_capsule_id: conflictingCapsuleId };
}

async function createContradictionRecord(capsuleIdA, capsuleIdB, domain, pool) {
  const contradictionResult = await pool.query(
    `INSERT INTO contradiction_records (capsule_id_a, capsule_id_b, domain, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'open', NOW(), NOW())
     RETURNING contradiction_id`,
    [capsuleIdA, capsuleIdB, domain]
  );
  const contradictionId = contradictionResult.rows[0].contradiction_id;
  await pool.query(
    `UPDATE memory_capsules SET status = 'CONTESTED', updated_at = NOW() WHERE capsule_id IN ($1, $2)`,
    [capsuleIdA, capsuleIdB]
  );
  await pool.query(
    `INSERT INTO memory_use_receipts (receipt_type, capsule_id, created_by, created_at)
     VALUES ($1, $2, $3, NOW())`,
    ['contradiction_receipt', capsuleIdA, 'system']
  );
  return { contradiction_id: contradictionId };
}

async function resolveContradiction(contradictionId, winningCapsuleId, losingCapsuleId, resolutionReceipt, pool) {
  const receiptResult = await pool.query(
    `SELECT id FROM memory_use_receipts WHERE id = $1 AND receipt_type = 'contradiction_resolution_receipt'`,
    [resolutionReceipt]
  );
  if (!receiptResult.rows[0]) throw new Error('Resolution receipt not found');
  await pool.query(
    `UPDATE contradiction_records
     SET status = 'resolved', resolution_receipt_id = $2, updated_at = NOW()
     WHERE contradiction_id = $1`,
    [contradictionId, resolutionReceipt]
  );
  await pool.query(
    `UPDATE memory_capsules SET status = 'QUARANTINED', updated_at = NOW() WHERE capsule_id = $1`,
    [losingCapsuleId]
  );
}

export { checkContradiction, createContradictionRecord, resolveContradiction };
