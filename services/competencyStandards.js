/**
 * SYNOPSIS: Retrieves competency standards from the database.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
export async function getCompetencyStandards(deps, payload) {
  const { pool, logger } = deps;
  const { id, domain } = payload || {};

  try {
    let query = 'SELECT * FROM competency_standards';
    const params = [];

    if (id) {
      query += ' WHERE id = $1';
      params.push(id);
    } else if (domain) {
      query += ' WHERE domain = $1';
      params.push(domain);
    }

    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    logger.error({ error }, 'Error in getCompetencyStandards');
    throw new Error('Failed to retrieve competency standards');
  }
}