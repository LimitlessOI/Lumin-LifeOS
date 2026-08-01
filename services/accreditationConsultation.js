/**
 * SYNOPSIS: Schedules a preliminary accreditation body consultation.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
export async function scheduleConsultation(deps, payload) {
  const { pool, logger } = deps;
  const { opportunity_id, proposal_data, status } = payload || {}; // Assuming these are the fields for a new proposal
  try {
    const { rows } = await pool.query(
      'INSERT INTO service_proposals (opportunity_id, proposal_data, status) VALUES ($1, $2, $3) RETURNING id, created_at',
      [opportunity_id, proposal_data, status]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in scheduleConsultation');
    throw new Error('Failed to schedule consultation');
  }
}

/**
 * SYNOPSIS: Retrieves details for a scheduled consultation.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
export async function getConsultationDetails(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT * FROM service_proposals WHERE id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in getConsultationDetails');
    throw new Error('Failed to retrieve consultation details');
  }
}