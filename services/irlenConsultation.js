/**
 * SYNOPSIS: Document insights from the Irlen Syndrome community consultation.
 * @ssot docs/products/kids-os/PRODUCT_HOME.md
 */

/** Irlen Syndrome community insights */

export async function getIrlenConsultations(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT id, name, email, feedback FROM irlen_consultation WHERE id = $1', [id]);
    // Irlen Syndrome insights
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in getIrlenConsultations');
    throw new Error('Failed in getIrlenConsultations');
  }
}

// function getIrlenConsultationInsights()

export const getIrlenConsultationInsights = getIrlenConsultations;
