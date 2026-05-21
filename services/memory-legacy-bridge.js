// services/memory-legacy-bridge.js
import { Pool } from 'pg';
import { LEVEL } from '../memory-intelligence-service.js';

const allowedImportMethods = ['insert', 'update', 'delete'];

async function isLegacyImport(capsule) {
  return capsule.source_type === 'legacy_import';
}

async function enforceLegacyLaneCeiling(capsule, lane) {
  if (capsule.context_lane !== lane) {
    throw { halt_code: 'LEGACY_MEMORY_BYPASS' };
  }
}

async function importLegacyRow(
  sourceTable,
  sourceRowId,
  importMethod,
  content,
  domain,
  pool
) {
  if (!allowedImportMethods.includes(importMethod)) {
    throw new Error(`Invalid import method: ${importMethod}`);
  }

  const capsule = {
    trust: 'PROPOSED',
    evidence: 'CLAIM',
    perm: 'context_only',
    source_type: 'legacy_import',
    review_required: true,
  };

  const fact = {
    level: LEVEL.CLAIM,
    scope: domain,
    content,
  };

  const receipt = {
    source_table: sourceTable,
    source_row_id: sourceRowId,
    import_method: importMethod,
  };

  const capsuleId = await insertCapsule(capsule, pool);
  const receiptId = await insertReceipt(receipt, pool);
  await insertFact(fact, pool);
  await insertMemoryImportReceipt(capsuleId, receiptId, pool);

  return { capsule_id: capsuleId, receipt_id: receiptId };
}

async function batchImportLegacy(
  sourceTable,
  rows,
  importMethod,
  pool
) {
  const transactions = [];
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    transactions.push(importLegacyRow(sourceTable, rows[i].id, importMethod, rows[i].content, 'Memory Intelligence System', pool));
  }
  await Promise.all(transactions);
}

async function insertCapsule(capsule, pool) {
  const result = await pool.query(
    `INSERT INTO memory_capsules (trust, evidence, perm, source_type, review_required)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [capsule.trust, capsule.evidence, capsule.perm, capsule.source_type, capsule.review_required]
  );
  return result.rows[0].id;
}

async function insertReceipt(receipt, pool) {
  const result = await pool.query(
    `INSERT INTO memory_import_receipts (source_table, source_row_id, import_method)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [receipt.source_table, receipt.source_row_id, receipt.import_method]
  );
  return result.rows[0].id;
}

async function insertFact(fact, pool) {
  const result = await pool.query(
    `INSERT INTO epistemic_facts (level, scope, content)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [fact.level, fact.scope, fact.content]
  );
  return result.rows[0].id;
}

async function insertMemoryImportReceipt(capsuleId, receiptId, pool) {
  await pool.query(
    `INSERT INTO memory_import_receipts_capsules (capsule_id, receipt_id)
     VALUES ($1, $2)`,
    [capsuleId, receiptId]
  );
}

export { importLegacyRow, batchImportLegacy, isLegacyImport, enforceLegacyLaneCeiling };
```