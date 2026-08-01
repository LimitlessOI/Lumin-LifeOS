/**
 * SYNOPSIS: Approves past performance disclosure language based on content.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
export async function approvePerformanceDisclosure(deps, payload) {
  const { pool, logger } = deps;
  const { id, disclosureText } = payload || {};

  if (!id || !disclosureText) {
    logger.warn({ payload }, 'Missing id or disclosureText in payload for approvePerformanceDisclosure');
    throw new Error('Missing required payload fields');
  }

  try {
    const approved = disclosureText.includes('past performance') && disclosureText.includes('future risks');
    const status = approved ? 'approved' : 'rejected';
    const review_summary = approved ? 'Disclosure approved: includes past performance and future risks.' : 'Disclosure rejected: must include both past performance and future risks.';

    // Assuming tc_review_packages is the most appropriate table for review status updates
    // and that 'status' and 'review_summary' columns can hold this information.
    const { rows } = await pool.query(
      'UPDATE tc_review_packages SET status = $1, review_summary = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [status, review_summary, id]
    );

    if (rows.length === 0) {
      logger.warn({ id }, 'No tc_review_packages found with the given ID for update.');
      return null; // Or throw an error if not finding the package is critical
    }

    return rows[0];
  } catch (error) {
    logger.error({ error, id, disclosureText }, 'Error in approvePerformanceDisclosure');
    throw new Error('Failed to approve performance disclosure');
  }
}