/**
 * SYNOPSIS: services/memory-legacy-bridge.js
 */
// services/memory-legacy-bridge.js
/** @ssot docs/products/memory-system/PRODUCT_HOME.md */
import { randomUUID } from 'crypto';

const allowedImportMethods = ['conversation_memory_migration', 'knowledge_base_upload', 'ssot_doc_sync'];

async function isLegacyImport(capsule) {
  return capsule.source_type === 'legacy_import';
}

async function enforceLegacyLaneCeiling(capsule, lane) {
  if (lane !== 'context_lane' && lane !== 'review_lane') {
    throw { halt_code: 'LEGACY_MEMORY_BYPASS' };
  }
}

async function importLegacyRow(sourceTable, sourceRowId, importMethod, content, domain, pool) {
  if (!allowedImportMethods.includes(importMethod)) {
    throw new Error(`Invalid import method: ${importMethod}`);
  }

  const factId = randomUUID();
  await pool.query(
    `INSERT INTO epistemic_facts (id, text, domain, level, source_count, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [factId, content, domain || 'general', 0, 0, 'legacy_import']
  );

  const capsuleResult = await pool.query(
    `INSERT INTO memory_capsules
       (fact_id, title, capsule_type, truth_class, source_type, trust_level, evidence_level,
        sensitivity, retrieval_permission, review_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '30 days')
     RETURNING capsule_id`,
    [
      factId,
      String(content).substring(0, 100),
      'knowledge',
      'document_truth',
      'legacy_import',
      'PROPOSED',
      'CLAIM',
      'STANDARD',
      'context_only',
    ]
  );
  const capsuleId = capsuleResult.rows[0].capsule_id;

  const receiptResult = await pool.query(
    `INSERT INTO memory_import_receipts (source_table, source_row_id, import_method, capsule_id, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`,
    [sourceTable, sourceRowId, importMethod, capsuleId]
  );

  return { capsule_id: capsuleId, receipt_id: receiptResult.rows[0].id };
}

async function batchImportLegacy(sourceTable, rows, importMethod, pool) {
  const results = [];
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const clientProxy = { query: (...args) => client.query(...args) };
      for (const row of batch) {
        const result = await importLegacyRow(
          sourceTable, row.id, importMethod, row.content, row.domain || 'general', clientProxy
        );
        results.push(result);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return results;
}

export { importLegacyRow, batchImportLegacy, isLegacyImport, enforceLegacyLaneCeiling };
