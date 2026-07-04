/**
 * SYNOPSIS: Exports createSecurityReceiptsService — services/security_receipts.js.
 */
export function createSecurityReceiptsService(pool, callCouncilMember) {
  function assertPool() {
    if (!pool || typeof pool.query !== 'function') {
      const err = new Error('pool_required');
      err.status = 500;
      throw err;
    }
  }

  function normalizeJson(value, fallback = {}) {
    if (value == null) return fallback;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  function toInt(value, defaultValue = 50, min = 1, max = 200) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return defaultValue;
    return Math.min(Math.max(n, min), max);
  }

  async function proveWithCouncilMember(task, context = {}) {
    if (typeof callCouncilMember !== 'function') {
      const err = new Error('callCouncilMember_required');
      err.status = 500;
      throw err;
    }

    const proof = await callCouncilMember('gemini', task, {
      taskType: 'general',
      ...context,
    });

    return proof;
  }

  async function createReceipt({
    ownerId,
    receiptType,
    securityCaseId = null,
    status = 'pending',
    payload = {},
    proof = null,
  }) {
    assertPool();

    if (!ownerId) {
      const err = new Error('jwt_required');
      err.status = 401;
      throw err;
    }

    const proofReceipt = proof || (await proveWithCouncilMember(
      `Provide a runtime proof receipt for a security receipt lifecycle event: type=${String(receiptType || '')}, status=${String(status || '')}. Include only a concise verification receipt and any relevant checks performed.`,
      { ownerId, receiptType, securityCaseId, status, payload },
    ));

    const { rows } = await pool.query(
      `INSERT INTO security_receipts
         (owner_id, security_case_id, receipt_type, status, payload, proof_receipt)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
       RETURNING *`,
      [
        ownerId,
        securityCaseId,
        receiptType,
        status,
        JSON.stringify(payload || {}),
        JSON.stringify(normalizeJson(proofReceipt, { raw: proofReceipt })),
      ],
    );

    return rows[0];
  }

  async function getReceipt({ ownerId, receiptId }) {
    assertPool();

    if (!ownerId) {
      const err = new Error('jwt_required');
      err.status = 401;
      throw err;
    }

    const { rows } = await pool.query(
      `SELECT * FROM security_receipts WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [receiptId, ownerId],
    );

    if (!rows[0]) {
      const err = new Error('receipt_not_found');
      err.status = 404;
      throw err;
    }

    return rows[0];
  }

  async function listReceipts({ ownerId, status = null, receiptType = null, limit = 50 } = {}) {
    assertPool();

    if (!ownerId) {
      const err = new Error('jwt_required');
      err.status = 401;
      throw err;
    }

    const lim = toInt(limit, 50, 1, 200);

    const params = [ownerId];
    let where = `WHERE owner_id = $1`;

    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }

    if (receiptType) {
      params.push(receiptType);
      where += ` AND receipt_type = $${params.length}`;
    }

    params.push(lim);

    const { rows } = await pool.query(
      `SELECT * FROM security_receipts
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params,
    );

    return rows;
  }

  async function updateReceiptStatus({
    ownerId,
    receiptId,
    status,
    detail = {},
  }) {
    assertPool();

    if (!ownerId) {
      const err = new Error('jwt_required');
      err.status = 401;
      throw err;
    }

    const allowed = new Set(['pending', 'verified', 'failed', 'archived']);
    if (!allowed.has(status)) {
      const err = new Error('invalid_status');
      err.status = 400;
      throw err;
    }

    const existing = await getReceipt({ ownerId, receiptId });

    const proofReceipt = await proveWithCouncilMember(
      `Provide a runtime proof receipt for updating a security receipt lifecycle status from ${String(existing.status)} to ${String(status)}. Include a concise receipt of validation.`,
      { ownerId, receiptId, previousStatus: existing.status, nextStatus: status, detail },
    );

    const { rows } = await pool.query(
      `UPDATE security_receipts
          SET status = $3,
              detail = $4::jsonb,
              proof_receipt = $5::jsonb,
              updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        receiptId,
        ownerId,
        status,
        JSON.stringify(detail || {}),
        JSON.stringify(normalizeJson(proofReceipt, { raw: proofReceipt })),
      ],
    );

    return rows[0];
  }

  async function attachCase({ ownerId, receiptId, securityCaseId }) {
    assertPool();

    if (!ownerId) {
      const err = new Error('jwt_required');
      err.status = 401;
      throw err;
    }

    const proofReceipt = await proveWithCouncilMember(
      `Provide a runtime proof receipt for attaching a security receipt to a security case. Confirm the attachment action and reference identifiers.`,
      { ownerId, receiptId, securityCaseId },
    );

    const { rows } = await pool.query(
      `UPDATE security_receipts
          SET security_case_id = $3,
              proof_receipt = $4::jsonb,
              updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        receiptId,
        ownerId,
        securityCaseId,
        JSON.stringify(normalizeJson(proofReceipt, { raw: proofReceipt })),
      ],
    );

    if (!rows[0]) {
      const err = new Error('receipt_not_found');
      err.status = 404;
      throw err;
    }

    return rows[0];
  }

  async function recordLifecycleEvent({
    ownerId,
    receiptType,
    securityCaseId = null,
    action,
    payload = {},
  }) {
    assertPool();

    if (!ownerId) {
      const err = new Error('jwt_required');
      err.status = 401;
      throw err;
    }

    const proofReceipt = await proveWithCouncilMember(
      `Provide a runtime proof receipt for a security receipt lifecycle action: ${String(action || '')}. Return a concise proof receipt for auditability.`,
      { ownerId, receiptType, securityCaseId, action, payload },
    );

    const { rows } = await pool.query(
      `INSERT INTO security_receipt_events
         (owner_id, receipt_type, security_case_id, action, payload, proof_receipt)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
       RETURNING *`,
      [
        ownerId,
        receiptType,
        securityCaseId,
        action,
        JSON.stringify(payload || {}),
        JSON.stringify(normalizeJson(proofReceipt, { raw: proofReceipt })),
      ],
    );

    return rows[0];
  }

  return {
    createReceipt,
    getReceipt,
    listReceipts,
    updateReceiptStatus,
    attachCase,
    recordLifecycleEvent,
  };
}