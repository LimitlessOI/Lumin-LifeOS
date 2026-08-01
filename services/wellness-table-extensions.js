/**
 * SYNOPSIS: extendTableServices - Provides service functions for managing wellness studio table data.
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
export async function manageJoyCheckins(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT * FROM wellness_studio_sessions WHERE joy_checkin_id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in manageJoyCheckins');
    throw new Error('Failed in manageJoyCheckins');
  }
}

export async function manageIntegrityScore(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT * FROM wellness_studio_sessions WHERE integrity_score_log_id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in manageIntegrityScore');
    throw new Error('Failed in manageIntegrityScore');
  }
}

export async function manageWearableData(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT * FROM wellness_studio_sessions WHERE wearable_data_id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in manageWearableData');
    throw new Error('Failed in manageWearableData');
  }
}

export async function manageEmotionalPatterns(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT * FROM wellness_studio_sessions WHERE emotional_pattern_id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in manageEmotionalPatterns');
    throw new Error('Failed in manageEmotionalPatterns');
  }
}