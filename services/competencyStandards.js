/**
 * SYNOPSIS: Retrieves competency standards from the database.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */

// function getCompetencyStandards()

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

export async function updateCompetencyStandards(deps, payload) {
  const { pool, logger } = deps;
  const { id, domain, standards } = payload || {};
  try {
    if (id) {
      const { rows } = await pool.query(
        'UPDATE competency_standards SET domain = COALESCE($1, domain), standards = COALESCE($2, standards), updated_at = NOW() WHERE id = $3 RETURNING *',
        [domain, JSON.stringify(standards || {}), id]
      );
      return rows[0] || null;
    }
    const { rows } = await pool.query(
      'INSERT INTO competency_standards (domain, standards) VALUES ($1, $2) ON CONFLICT (domain) DO UPDATE SET standards = EXCLUDED.standards, updated_at = NOW() RETURNING *',
      [domain, JSON.stringify(standards || {})]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in updateCompetencyStandards');
    throw new Error('Failed to update competency standards');
  }
}
