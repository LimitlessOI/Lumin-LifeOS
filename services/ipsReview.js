/**
 * SYNOPSIS: Implements attorney review for IPS module risk assessment.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
export async function reviewIPSRisk(deps, payload) {
  const { pool, logger, callCouncilMember } = deps;
  const { id } = payload || {};

  if (!id) {
    logger.warn('reviewIPSRisk called without an ID in payload.');
    throw new Error('Missing IPS module ID for review.');
  }

  try {
    // Fetch the IPS module details
    const { rows: ipsRows } = await pool.query(
      'SELECT id, user_id, statement_text, risk_notes FROM lifeos_finance_ips WHERE id = $1',
      [id]
    );

    if (ipsRows.length === 0) {
      return null; // IPS module not found
    }

    const ipsModule = ipsRows[0];
    const { statement_text, risk_notes } = ipsModule;

    // Use AI to assess RIA trigger risk based on statement_text and risk_notes
    const prompt = `Review the following Investment Policy Statement (IPS) text and associated risk notes for potential RIA (Registered Investment Adviser) trigger risk. Specifically, look for language that implies the provision of specific investment advice, discretionary management, or holding oneself out as an investment adviser.

IPS Statement Text:
"${statement_text}"

Risk Notes:
"${risk_notes || 'No specific risk notes provided.'}"

Based on this information, provide a concise assessment of the RIA trigger risk. If there is a high risk, explain why. If the risk is low, state that.`;

    const aiResponse = await callCouncilMember('attorney_review_agent', prompt, {
      temperature: 0.3,
      max_tokens: 500
    });

    let riskLevel = 'low';
    let reviewSummary = aiResponse;

    // Simple heuristic to determine risk level from AI response
    if (aiResponse.toLowerCase().includes('high risk')) {
      riskLevel = 'high';
    }

    // Insert a record into tc_review_packages for this attorney review
    // We're treating this as a document/package that was reviewed
    const { rows: reviewPackageRows } = await pool.query(
      `INSERT INTO tc_review_packages (transaction_id, title, doc_type, status, review_summary, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        id, // Using IPS module ID as transaction_id for linking
        `IPS Module Attorney Review - ${id}`,
        'IPS_ATTORNEY_REVIEW',
        riskLevel === 'high' ? 'PENDING_ATTORNEY_ACTION' : 'COMPLETED',
        reviewSummary,
        { ips_module_id: id, assessed_risk_level: riskLevel }
      ]
    );

    const reviewPackage = reviewPackageRows[0];

    // Optionally update the lifeos_finance_ips with the new risk notes or a link to the review
    await pool.query(
      `UPDATE lifeos_finance_ips
       SET risk_notes = $1, updated_at = NOW()
       WHERE id = $2`,
      [`${risk_notes || ''}\nAttorney Review Summary (ID: ${reviewPackage.id}): ${reviewSummary}`, id]
    );

    return {
      ipsModuleId: id,
      riskLevel,
      reviewSummary,
      reviewPackageId: reviewPackage.id,
      createdAt: reviewPackage.created_at
    };

  } catch (error) {
    logger.error({ error, payload }, 'Error in reviewIPSRisk');
    throw new Error('Failed to perform IPS attorney review.');
  }
}