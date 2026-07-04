/**
 * SYNOPSIS: Exports createAuditService — services/audit-service.js.
 */
export function createAuditService(pool, callCouncilMember) {
  async function analyzeStack({ ownerId, stack, vendorAuth = null } = {}) {
    if (!ownerId) {
      const err = new Error('jwt_required');
      err.status = 401;
      throw err;
    }

    let normalizedStack = stack;
    if (normalizedStack == null) {
      const { rows } = await pool.query(
        `SELECT stack, vendor_auth
           FROM business_audits
          WHERE created_at IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 1`,
        [],
      );
      normalizedStack = rows[0]?.stack || {};
      if (!vendorAuth) vendorAuth = rows[0]?.vendor_auth || null;
    }

    const auditPayload = {
      ownerId,
      stack: normalizedStack || {},
      vendorAuth: vendorAuth || null,
    };

    const aiResult = await callCouncilMember(
      'openai',
      {
        purpose: 'Analyze business stack and provide ROI reports using AI',
        ownerId,
        stack: auditPayload.stack,
        vendorAuth: auditPayload.vendorAuth,
        prompt:
          'Perform a business audit of the provided stack, identify highest-ROI optimization opportunities, and return a concise ROI report with prioritized recommendations.',
      },
      { taskType: 'general' },
    );

    const { rows } = await pool.query(
      `INSERT INTO business_audits (stack, vendor_auth)
       VALUES ($1::jsonb, $2::jsonb)
       RETURNING *`,
      [
        JSON.stringify(auditPayload.stack || {}),
        JSON.stringify(auditPayload.vendorAuth || null),
      ],
    );

    return {
      audit: rows[0],
      report: aiResult,
    };
  }

  return {
    analyzeStack,
  };
}