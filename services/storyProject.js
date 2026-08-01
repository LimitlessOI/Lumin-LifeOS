/**
 * SYNOPSIS: A story project can be created and re-opened with persistent canon data.
 * @ssot docs/products/story-studio/PRODUCT_HOME.md
 */
export async function createStoryProject(deps, payload) {
  const { pool, logger } = deps;
  const { owner_id, title, logline, rights_mode, privacy_mode, canon_mode, status } = payload || {};

  try {
    const { rows } = await pool.query(
      `INSERT INTO story_projects (owner_id, title, logline, rights_mode, privacy_mode, canon_mode, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, owner_id, title, logline, rights_mode, privacy_mode, canon_mode, status, created_at`,
      [owner_id, title, logline, rights_mode, privacy_mode, canon_mode, status]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in createStoryProject');
    throw new Error('Failed to create story project');
  }
}

/**
 * SYNOPSIS: Retrieves a story project by its ID.
 * @ssot docs/products/story-studio/PRODUCT_HOME.md
 */
export async function getStoryProject(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};

  try {
    const { rows } = await pool.query('SELECT id, owner_id, title, logline, rights_mode, privacy_mode, canon_mode, status, created_at FROM story_projects WHERE id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in getStoryProject');
    throw new Error('Failed to retrieve story project');
  }
}