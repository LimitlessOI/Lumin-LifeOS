/**
 * SYNOPSIS: Implements the gating strategy for project entitlements using the database.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
export async function checkEntitlements(deps, payload) {
  const { pool, logger } = deps;
  const { projectId, entitlement } = payload || {}; // Assuming payload contains projectId and the specific entitlement to check

  try {
    // This query implements the gating strategy by checking if a project has a specific entitlement that is enabled.
    const { rows } = await pool.query(
      'SELECT enabled FROM project_entitlements WHERE project_id = $1 AND entitlement = $2 AND enabled = TRUE',
      [projectId, entitlement]
    );
    return rows.length > 0; // Returns true if the entitlement is found and enabled, false otherwise
  } catch (error) {
    logger.error({ error, projectId, entitlement }, 'Error in checkEntitlements for gating strategy');
    throw new Error('Failed to check entitlements');
  }
}