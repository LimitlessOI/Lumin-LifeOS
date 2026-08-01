/**
 * SYNOPSIS: Manage provider cooldowns by persisting them to the database.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
/**
 * Persists cooldowns to DB for a given provider.
 * @param {object} deps - Injected dependencies (pool, logger).
 * @param {object} payload - The payload containing provider cooldown information.
 * @param {string} payload.provider - The name of the provider.
 * @param {string} payload.provider_id - The unique identifier for the provider.
 * @param {string} payload.cooldown_until - ISO 8601 timestamp string when the cooldown ends.
 * @returns {Promise<object|null>} The inserted/updated row or null on failure.
 */
export async function persistCooldowns(deps, payload) {
  const { pool, logger } = deps;
  const { provider, provider_id, cooldown_until } = payload || {};

  if (!provider || !provider_id || !cooldown_until) {
    logger.warn({ payload }, 'Missing required fields for persistCooldowns');
    throw new Error('Missing required fields for persistCooldowns');
  }

  try {
    // Upsert logic: try to update, if no rows affected, then insert.
    // The provider and provider_id uniquely identify a cooldown entry.
    const updateResult = await pool.query(
      `UPDATE provider_cooldowns
       SET cooldown_until = $1, updated_at = NOW()
       WHERE provider = $2 AND provider_id = $3
       RETURNING *`,
      [cooldown_until, provider, provider_id]
    );

    if (updateResult.rows.length > 0) {
      return updateResult.rows[0];
    } else {
      const insertResult = await pool.query(
        `INSERT INTO provider_cooldowns (provider, provider_id, cooldown_until, cooldown_start)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [provider, provider_id, cooldown_until]
      );
      return insertResult.rows[0] || null;
    }
  } catch (error) {
    logger.error({ error, provider, provider_id }, 'Error in persistCooldowns');
    throw new Error('Failed to persist cooldowns to DB');
  }
}

/**
 * Retrieves the current cooldown for a given provider.
 * @param {object} deps - Injected dependencies (pool, logger).
 * @param {object} payload - The payload containing provider identification.
 * @param {string} payload.provider - The name of the provider.
 * @param {string} payload.provider_id - The unique identifier for the provider.
 * @returns {Promise<object|null>} The cooldown entry if exists, otherwise null.
 */
export async function getCooldowns(deps, payload) {
  const { pool, logger } = deps;
  const { provider, provider_id } = payload || {};

  if (!provider || !provider_id) {
    logger.warn({ payload }, 'Missing required fields for getCooldowns');
    throw new Error('Missing required fields for getCooldowns');
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM provider_cooldowns
       WHERE provider = $1 AND provider_id = $2`,
      [provider, provider_id]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, provider, provider_id }, 'Error in getCooldowns');
    throw new Error('Failed to retrieve cooldowns');
  }
}