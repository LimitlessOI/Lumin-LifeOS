/**
 * SYNOPSIS: Handles rotation metadata for environment registry, including crypto tier labels.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
export async function handleRotationMetadata(deps, payload) {
  const { pool, logger } = deps;
  const { env_registry_id, metadata_key, metadata_value } = payload || {};

  try {
    if (!env_registry_id || !metadata_key || !metadata_value) {
      throw new Error('Missing required payload fields: env_registry_id, metadata_key, metadata_value');
    }

    const { rows } = await pool.query(
      `INSERT INTO env_registry_metadata (env_registry_id, metadata_key, metadata_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (env_registry_id, metadata_key) DO UPDATE SET metadata_value = EXCLUDED.metadata_value, updated_at = NOW()
       RETURNING id, env_registry_id, metadata_key, metadata_value, created_at, updated_at`,
      [env_registry_id, metadata_key, metadata_value]
    );

    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in handleRotationMetadata');
    throw new Error('Failed to process rotation metadata');
  }
}