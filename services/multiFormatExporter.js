/**
 * SYNOPSIS: Provides multi-format export capabilities for story projects.
 * @ssot docs/products/story-studio/PRODUCT_HOME.md
 */
export async function exportToStorybook(deps, payload) {
  const { pool, logger } = deps;
  const { project_id } = payload || {};
  try {
    // One project can export at least storybook + comic from the same story bible
    const { rows } = await pool.query(
      'INSERT INTO format_exports (export_name, format_type, export_status) VALUES ($1, $2, $3) RETURNING *',
      [`Storybook Export for Project ${project_id}`, 'storybook', 'pending']
    );
    logger.info({ exportId: rows[0].id, project_id }, 'Initiated Storybook export');
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, project_id }, 'Error in exportToStorybook');
    throw new Error('Failed to initiate Storybook export');
  }
}

export async function exportToComic(deps, payload) {
  const { pool, logger } = deps;
  const { project_id } = payload || {};
  try {
    const { rows } = await pool.query(
      'INSERT INTO format_exports (export_name, format_type, export_status) VALUES ($1, $2, $3) RETURNING *',
      [`Comic Export for Project ${project_id}`, 'comic', 'pending']
    );
    logger.info({ exportId: rows[0].id, project_id }, 'Initiated Comic export');
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, project_id }, 'Error in exportToComic');
    throw new Error('Failed to initiate Comic export');
  }
}

export async function exportToMotionComic(deps, payload) {
  const { pool, logger } = deps;
  const { project_id } = payload || {};
  try {
    const { rows } = await pool.query(
      'INSERT INTO format_exports (export_name, format_type, export_status) VALUES ($1, $2, $3) RETURNING *',
      [`Motion Comic Export for Project ${project_id}`, 'motion_comic', 'pending']
    );
    logger.info({ exportId: rows[0].id, project_id }, 'Initiated Motion Comic export');
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, project_id }, 'Error in exportToMotionComic');
    throw new Error('Failed to initiate Motion Comic export');
  }
}