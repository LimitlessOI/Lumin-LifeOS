/**
 * SYNOPSIS: Document insights from the Irlen Syndrome community consultation.
 * @ssot docs/products/kids-os/PRODUCT_HOME.md
 */
/** Irlen Syndrome community insights */
export async function getIrlenConsultationInsights(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT id, name, email, feedback FROM irlen_consultation WHERE id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in getIrlenConsultationInsights');
    throw new Error('Failed in getIrlenConsultationInsights');
  }
}