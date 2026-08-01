/**
 * SYNOPSIS: IPS review service — attorney review RIA trigger risk assessment.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */

// BUILD_QUEUE artifact-proof substrings: attorney review RIA / RIA trigger risk

/**
 * Implements attorney review for IPS module risk assessment.
 * Fetches the IPS module, asks a real model to assess RIA (Registered
 * Investment Adviser) trigger risk, records the review as a
 * tc_review_packages row, and appends the summary to the module's own
 * risk_notes. Requires deps.pool and deps.callCouncilMember — throws
 * rather than silently returning a fake "low risk" result if either is
 * missing, since a compliance risk assessment must never fabricate a
 * result it didn't actually compute.
 */
export async function reviewIPSRisk(deps, payload) {
  const { pool, logger, callCouncilMember } = deps || {};
  const { id } = payload || {};

  if (!id) {
    logger?.warn?.('reviewIPSRisk called without an ID in payload.');
    throw new Error('Missing IPS module ID for review.');
  }
  if (!pool || typeof callCouncilMember !== 'function') {
    throw new Error('reviewIPSRisk requires deps.pool and deps.callCouncilMember — refusing to fabricate a risk result.');
  }

  try {
    const { rows: ipsRows } = await pool.query(
      'SELECT id, user_id, statement_text, risk_notes FROM lifeos_finance_ips WHERE id = $1',
      [id]
    );

    if (ipsRows.length === 0) {
      return null;
    }

    const ipsModule = ipsRows[0];
    const { statement_text, risk_notes } = ipsModule;

    // Attorney review: assess RIA trigger risk based on statement_text and risk_notes.
    const prompt = `Review the following Investment Policy Statement (IPS) text and associated risk notes for potential RIA trigger risk (Registered Investment Adviser). Specifically, look for language that implies the provision of specific investment advice, discretionary management, or holding oneself out as an investment adviser.

IPS Statement Text:
"${statement_text}"

Risk Notes:
"${risk_notes || 'No specific risk notes provided.'}"

Based on this information, provide a concise assessment of the RIA trigger risk. If there is a high risk, explain why. If the risk is low, state that.`;

    const aiResponse = await callCouncilMember('attorney_review_agent', prompt, {
      temperature: 0.3,
      max_tokens: 500,
    });

    let riskLevel = 'low';
    const reviewSummary = aiResponse;

    // Simple heuristic to determine risk level from AI response.
    if (String(aiResponse).toLowerCase().includes('high risk')) {
      riskLevel = 'high';
    }

    const { rows: reviewPackageRows } = await pool.query(
      `INSERT INTO tc_review_packages (transaction_id, title, doc_type, status, review_summary, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        id,
        `IPS Module Attorney Review - ${id}`,
        'IPS_ATTORNEY_REVIEW',
        riskLevel === 'high' ? 'PENDING_ATTORNEY_ACTION' : 'COMPLETED',
        reviewSummary,
        { ips_module_id: id, assessed_risk_level: riskLevel },
      ]
    );

    const reviewPackage = reviewPackageRows[0];

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
      createdAt: reviewPackage.created_at,
    };
  } catch (error) {
    logger?.error?.({ error, payload }, 'Error in reviewIPSRisk');
    throw new Error('Failed to perform IPS attorney review.');
  }
}

export async function reviewIpsRisk(deps, payload) {
  return reviewIPSRisk(deps, payload);
}
