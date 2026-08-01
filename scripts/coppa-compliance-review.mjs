/**
 * SYNOPSIS: Conduct and document the COPPA compliance review.
 * @ssot docs/products/kids-os/PRODUCT_HOME.md
 */

export async function conductCoppaComplianceReview(deps, userId, parentEmail, consentObtained, notes = null) {
  const { pool, logger } = deps;

  if (!userId || !parentEmail || typeof consentObtained !== 'boolean') {
    logger.error({ userId, parentEmail, consentObtained }, 'Invalid input for COPPA compliance review.');
    throw new Error('User ID, parent email, and consent status are required.');
  }

  try {
    const reviewDate = new Date();
    const consentDate = consentObtained ? reviewDate : null;
    const status = consentObtained ? 'compliant' : 'non-compliant';

    const sql = `
      INSERT INTO coppa_compliance_reviews (user_id, parent_email, consent_obtained, consent_date, reviewer_id, review_date, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at, updated_at;
    `;
    const reviewerId = null; // As per schema, reviewer_id can be null if not applicable or known.
    const result = await pool.query(sql, [userId, parentEmail, consentObtained, consentDate, reviewerId, reviewDate, status, notes]);

    logger.info({ reviewId: result.rows[0].id, userId, status }, 'COPPA compliance review documented.');
    return result.rows[0];
  } catch (error) {
    logger.error({ error, userId, parentEmail }, 'Failed to conduct COPPA compliance review.');
    throw new Error(`Failed to document COPPA compliance review: ${error.message}`);
  }
}