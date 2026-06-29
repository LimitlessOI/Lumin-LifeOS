/**
 * SYNOPSIS: services/memory-candidate.js
 */
// services/memory-candidate.js
/** @ssot docs/products/memory-system/PRODUCT_HOME.md */
import { randomUUID } from 'crypto';

const detectDuplicate = async (text, domain, pool) => {
  const result = await pool.query(
    'SELECT id FROM epistemic_facts WHERE LOWER(TRIM(text)) = LOWER(TRIM($1)) AND domain = $2 LIMIT 1',
    [text, domain]
  );
  return { exists: result.rowCount > 0, fact_id: result.rows[0]?.id };
};

const createCandidate = async (signal, pool) => {
  if (!pool) {
    throw new Error('pool required');
  }

  const { exists, fact_id } = await detectDuplicate(signal.content, signal.domain || 'general', pool);
  if (exists) {
    return { fact_id, candidate_id: fact_id, deduplicated: true };
  }

  const newFactId = randomUUID();
  await pool.query(
    'INSERT INTO epistemic_facts (id, text, domain, level, source_count, created_by, created_at, decay_rate, review_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [
      newFactId,
      signal.content,
      signal.domain || 'general',
      0,
      0,
      'system',
      new Date(),
      'normal',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ]
  );

  await pool.query(
    `INSERT INTO memory_use_receipts (receipt_type, decision_ref, source_ref, created_by, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    ['candidate_memory_receipt', `candidate:${newFactId}`, newFactId, 'system']
  );

  return { fact_id: newFactId, candidate_id: newFactId, deduplicated: false };
};

export { createCandidate, detectDuplicate };
