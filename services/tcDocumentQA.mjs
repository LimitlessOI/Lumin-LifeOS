/**
 * SYNOPSIS: Exports runDocumentQA — services/tcDocumentQA.mjs.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
export async function runDocumentQA(deps, { transactionId, documentBuffer }) {
  const { pool, callCouncilMember, logger } = deps || {};

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('runDocumentQA: deps.pool with query() is required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('runDocumentQA: deps.callCouncilMember is required');
  }

  const db = deps.db || pool;

  await db.query(`
    CREATE TABLE IF NOT EXISTS tc_document_qa_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      intake_run_id UUID NOT NULL,
      document_name TEXT NOT NULL,
      issues JSONB NOT NULL DEFAULT '[]'::jsonb,
      passed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const excerpt = Buffer.isBuffer(documentBuffer)
    ? documentBuffer.subarray(0, 12000).toString('base64')
    : Buffer.from(String(documentBuffer || ''), 'utf8').subarray(0, 12000).toString('base64');

  const prompt = [
    'Review the uploaded document for missing signatures and missing required fields.',
    'Return ONLY valid JSON in this exact shape: [{"field":"...","issue":"...","page":1}]',
    'If no issues are found, return an empty JSON array.',
    `transactionId: ${transactionId}`,
    `document_excerpt_base64: ${excerpt}`
  ].join('\n');

  let raw;
  try {
    raw = await callCouncilMember('doc-qa', prompt);
  } catch (error) {
    logger?.error?.({ error, transactionId }, 'document QA council call failed');
    throw error;
  }

  let issues;
  try {
    const parsed = JSON.parse(raw);
    issues = Array.isArray(parsed) ? parsed : [];
  } catch {
    issues = [];
  }

  issues = issues
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      field: typeof item.field === 'string' ? item.field : '',
      issue: typeof item.issue === 'string' ? item.issue : '',
      page: Number.isFinite(Number(item.page)) ? Number(item.page) : null
    }))
    .filter((item) => item.field || item.issue || item.page !== null);

  const passed = issues.length === 0;

  await db.query(
    `
      INSERT INTO tc_document_qa_results (intake_run_id, document_name, issues, passed)
      VALUES ($1, $2, $3::jsonb, $4)
    `,
    [transactionId, 'uploaded-document', JSON.stringify(issues), passed]
  );

  return { passed, issues };
}

export default {
  runDocumentQA,
};
