/**
 * SYNOPSIS: Service for handling evaluator and mentor qualification criteria.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
export async function getMentorQualificationCriteria(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT * FROM mentor_qualification_criteria WHERE id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in getMentorQualificationCriteria');
    throw new Error('Failed to retrieve mentor qualification criteria');
  }
}

/**
 * SYNOPSIS: Updates or creates mentor qualification criteria.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
export async function updateMentorQualificationCriteria(deps, payload) {
  const { pool, logger } = deps;
  const { id, role, criteria_name, criteria_description, min_value, max_value, unit } = payload || {};

  try {
    if (id) {
      // Update existing criteria
      const { rows } = await pool.query(
        `UPDATE mentor_qualification_criteria
         SET role = $1, criteria_name = $2, criteria_description = $3, min_value = $4, max_value = $5, unit = $6, updated_at = NOW()
         WHERE id = $7 RETURNING *`,
        [role, criteria_name, criteria_description, min_value, max_value, unit, id]
      );
      return rows[0] || null;
    } else {
      // Insert new criteria
      const { rows } = await pool.query(
        `INSERT INTO mentor_qualification_criteria (role, criteria_name, criteria_description, min_value, max_value, unit)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [role, criteria_name, criteria_description, min_value, max_value, unit]
      );
      return rows[0] || null;
    }
  } catch (error) {
    logger.error({ error }, 'Error in updateMentorQualificationCriteria');
    throw new Error('Failed to update mentor qualification criteria');
  }
}