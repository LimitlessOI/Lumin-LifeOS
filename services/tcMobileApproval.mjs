/**
 * SYNOPSIS: Exports createApprovalRequest — services/tcMobileApproval.mjs.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
export async function createApprovalRequest(deps, { transactionId, agentId, documentUrl, action }) {
  const { pool, baseUrl, logger } = deps;

  if (!pool || !baseUrl) {
    throw new Error('createApprovalRequest requires pool and baseUrl');
  }

  if (!transactionId || !agentId || !documentUrl || !action) {
    throw new Error('createApprovalRequest requires transactionId, agentId, documentUrl, and action');
  }

  const requestData = {
    transactionId,
    agentId,
    documentUrl,
    action
  };

  const insertSql =
    'insert into approval_requests (request_id, type, description, potential_issues, request_data, status, approval_notes, approved_at) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id, request_id';

  const requestId = `mobile-approval:${transactionId}:${agentId}:${action}`;
  const description = `One-tap mobile approval request for ${action}`;
  const potentialIssues = `Mobile approval flow for transaction ${transactionId}`;
  const approvalNotes = null;
  const approvedAt = null;

  const result = await pool.query(insertSql, [
    requestId,
    'mobile_approval',
    description,
    potentialIssues,
    JSON.stringify(requestData),
    'pending',
    approvalNotes,
    approvedAt
  ]);

  const approvalId = result.rows[0] && result.rows[0].id ? result.rows[0].id : null;
  if (!approvalId) {
    throw new Error('Failed to create approval request');
  }

  const deepLink = `${baseUrl.replace(/\/+$/, '')}/mobile-approval/${approvalId}`;

  if (logger && logger.info) {
    logger.info({ approvalId, transactionId, agentId, action }, 'created mobile approval request');
  }

  return { approvalId, deepLink };
}

export async function processApproval(deps, { approvalId, decision, signatureToken }) {
  const { pool, logger, tcIntakePipeline } = deps;

  if (!pool) {
    throw new Error('processApproval requires pool');
  }

  if (!approvalId || !decision || !signatureToken) {
    throw new Error('processApproval requires approvalId, decision, and signatureToken');
  }

  const normalizedDecision = String(decision).toLowerCase();
  if (normalizedDecision !== 'approved' && normalizedDecision !== 'rejected') {
    throw new Error('processApproval decision must be approved or rejected');
  }

  const approvalResult = await pool.query(
    'select id, request_id, type, description, potential_issues, request_data, status, approval_notes, approved_at, created_at from approval_requests where id = $1 limit 1',
    [approvalId]
  );

  if (!approvalResult.rows.length) {
    throw new Error('Approval request not found');
  }

  const approvalRow = approvalResult.rows[0];
  const requestData = approvalRow.request_data && typeof approvalRow.request_data === 'object'
    ? approvalRow.request_data
    : (() => {
        try {
          return approvalRow.request_data ? JSON.parse(approvalRow.request_data) : {};
        } catch {
          return {};
        }
      })();

  const updateSql =
    'update approval_requests set status = $2, approval_notes = $3, approved_at = case when $2 = \'approved\' then now() else approved_at end where id = $1 returning id, status, approved_at';

  const updated = await pool.query(updateSql, [
    approvalId,
    normalizedDecision,
    signatureToken
  ]);

  if (!updated.rows.length) {
    throw new Error('Failed to update approval request');
  }

  const commsLedgerSql =
    'insert into tc_comms_ledger (transaction_id, channel, direction, recipient, subject, body, status, metadata) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id';

  const transactionId = requestData.transactionId || null;
  const ledgerMetadata = {
    approvalId,
    decision: normalizedDecision,
    signatureToken,
    requestId: approvalRow.request_id
  };

  try {
    await pool.query(commsLedgerSql, [
      transactionId,
      'mobile_approval',
      'incoming',
      requestData.agentId || null,
      `Approval ${normalizedDecision}`,
      approvalRow.description || null,
      'logged',
      JSON.stringify(ledgerMetadata)
    ]);
  } catch (error) {
    if (logger && logger.warn) {
      logger.warn({ error: error && error.message ? error.message : error, approvalId }, 'tc_comms_ledger insert skipped or failed');
    }
  }

  if (normalizedDecision === 'approved' && tcIntakePipeline && typeof tcIntakePipeline.runIntakePipeline === 'function') {
    await tcIntakePipeline.runIntakePipeline(requestData);
  }

  if (logger && logger.info) {
    logger.info({ approvalId, decision: normalizedDecision }, 'processed mobile approval');
  }

  return {
    approvalId,
    status: normalizedDecision
  };
}

export default {
  createApprovalRequest,
  processApproval,
};
