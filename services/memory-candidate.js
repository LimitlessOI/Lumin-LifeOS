// services/memory-candidate.js
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { genRandomUUID } from 'pg';
import { crypto } from 'crypto';

const createCandidate = async (signal, pool) => {
  if (!pool) {
    throw new Error('pool required');
  }

  const detectDuplicate = async (statement, domain, pool) => {
    const result = await pool.query(
      'SELECT id FROM epistemic_facts WHERE LOWER(TRIM(statement)) = LOWER(TRIM($1)) AND domain = $2 LIMIT 1',
      [statement, domain]
    );
    return { exists: result.rowCount > 0, fact_id: result.rows[0].id };
  };

  const { exists, fact_id } = await detectDuplicate(signal.content, signal.domain || 'general', pool);
  if (exists) {
    return { fact_id, candidate_id: fact_id, deduplicated: true };
  }

  const newFactId = uuidv4();
  const newFact = {
    statement: signal.content,
    domain: signal.domain || 'general',
    level: 0,
    source_count: 0,
    created_by: 'system',
    created_at: new Date(),
    decay_rate: 30,
    review_by: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };

  await pool.query(
    'INSERT INTO epistemic_facts (id, statement, domain, level, source_count, created_by, created_at, decay_rate, review_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [
      newFactId,
      newFact.statement,
      newFact.domain,
      newFact.level,
      newFact.source_count,
      newFact.created_by,
      newFact.created_at,
      newFact.decay_rate,
      newFact.review_by,
    ]
  );

  await pool.query(
    'INSERT INTO memory_use_receipts (receipt_type, fact_id, created_by) VALUES ($1, $2, $3)',
    ['candidate_memory_receipt', newFactId, 'system']
  );

  return { fact_id: newFactId, candidate_id: newFactId, deduplicated: false };
};

export { createCandidate };
```

```json
---
METADATA---
{
  "target_file": "services/memory-candidate.js",
  "insert_after_line": null,
  "confidence": 1
}