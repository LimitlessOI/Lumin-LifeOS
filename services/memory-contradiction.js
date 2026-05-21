// services/memory-contradiction.js
import { Pool } from 'pg';
import { LEVEL } from '../memory-intelligence-service.js';

const pool = new Pool({
  user: 'your_username',
  host: 'your_host',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});

async function checkContradiction(
  capsuleId,
  domain,
  statement,
  factFamilyId,
  pool
) {
  const result = await pool.query(
    `
    SELECT EXISTS(
      SELECT 1
      FROM memory_capsules mc
      JOIN epistemic_facts ef ON mc.id = ef.capsule_id
      WHERE mc.domain = $1 AND LOWER(TRIM($2)) = LOWER(TRIM(ef.statement))
      OR mc.fact_family_id = $3 AND mc.id != $4
    )
    `,
    [domain, statement, factFamilyId, capsuleId]
  );
  const exists = result.rows[0].exists;
  if (!exists) return { exists: false, contradiction_id: null, conflicting_capsule_id: null };

  const contradictionResult = await pool.query(
    `
    SELECT id, capsule_id AS conflicting_capsule_id
    FROM memory_capsules mc
    JOIN epistemic_facts ef ON mc.id = ef.capsule_id
    WHERE mc.domain = $1 AND LOWER(TRIM($2)) = LOWER(TRIM(ef.statement))
    OR mc.fact_family_id = $3 AND mc.id != $4
    `,
    [domain, statement, factFamilyId, capsuleId]
  );
  const contradictionId = contradictionResult.rows[0].id;
  const conflictingCapsuleId = contradictionResult.rows[0].conflicting_capsule_id;
  return { exists: true, contradiction_id: contradictionId, conflicting_capsule_id: conflictingCapsuleId };
}

async function createContradictionRecord(
  capsuleIdA,
  capsuleIdB,
  domain,
  pool
) {
  const contradictionId = await pool.query(
    `
    INSERT INTO contradiction_records (status)
    VALUES ('open')
    RETURNING id
    `
  );
  const contradictionIdValue = contradictionId.rows[0].id;
  await pool.query(
    `
    UPDATE memory_capsules
    SET status = 'contested'
    WHERE id IN ($1, $2)
    `,
    [capsuleIdA, capsuleIdB]
  );
  await pool.query(
    `
    INSERT INTO memory_use_receipts (receipt_type)
    VALUES ('contradiction_receipt')
    RETURNING id
    `,
    [contradictionIdValue]
  );
  return { contradiction_id: contradictionIdValue };
}

async function resolveContradiction(
  contradictionId,
  winningCapsuleId,
  resolutionReceipt,
  pool
) {
  const resolutionReceiptResult = await pool.query(
    `
    SELECT id
    FROM memory_use_receipts
    WHERE id = $1 AND receipt_type = 'contradiction_resolution_receipt'
    `,
    [resolutionReceipt]
  );
  if (!resolutionReceiptResult.rows[0]) throw new Error('Resolution receipt not found');
  await pool.query(
    `
    UPDATE contradiction_records
    SET status = 'resolved'
    WHERE id = $1
    `,
    [contradictionId]
  );
  await pool.query(
    `
    UPDATE memory_capsules
    SET status = 'quarantined'
    WHERE id = $1
    `,
    [winningCapsuleId]
  );
}

export { checkContradiction, createContradictionRecord, resolveContradiction };
```

```json
---
METADATA---
{
  "target_file": "services/memory-contradiction.js",
  "insert_after_line": null,
  "confidence": 0.8
}