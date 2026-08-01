/**
 * SYNOPSIS: Define how project entitlements gate features per request.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
export async function checkFeatureAccess(deps, payload) {
  const { pool, logger } = deps;
  const { projectId, featureName } = payload || {}; // Expect projectId and featureName in payload
  try {
    // gate features by checking project_entitlements
    const { rows } = await pool.query(
      'SELECT enabled FROM project_entitlements WHERE project_id = $1 AND entitlement = $2 AND enabled = TRUE',
      [projectId, featureName]
    );
    return rows.length > 0; // If any row is found, the feature is enabled for the project
  } catch (error) {
    logger.error({ error, projectId, featureName }, 'Error in checkFeatureAccess for feature gating');
    throw new Error('Failed in checkFeatureAccess for feature gating');
  }
}