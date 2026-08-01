/**
 * SYNOPSIS: Extracts sub-features from server.js and persists them.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
export async function extractSubRoutes(deps, payload) {
  const { pool, logger } = deps;
  const { serverRoutes, sourceFileName = 'server.js' } = payload || {}; // Expecting server.routes as serverRoutes
  const extractedFeatures = [];

  try {
    if (!Array.isArray(serverRoutes)) {
      throw new Error('Invalid payload: serverRoutes must be an array.');
    }

    // This is the extraction logic.
    for (const route of serverRoutes) {
      if (route && route.isSubFeature && route.name && route.path) { // Assuming sub-features have a name and path
        const featureData = {
          name: route.name,
          path: route.path,
          method: route.method || 'GET', // Default to GET if not specified
          sourceFile: sourceFileName,
          // Add any other relevant route properties here
        };

        const { rows } = await pool.query(
          `INSERT INTO extracted_sub_features(feature_name, feature_data)
           VALUES ($1, $2)
           RETURNING id, feature_name, feature_data, created_at, updated_at`,
          [featureData.name, JSON.stringify(featureData)]
        );
        extractedFeatures.push(rows[0]);
      }
    }

    return extractedFeatures;
  } catch (error) {
    logger.error({ error, payload }, 'Error in extractSubRoutes');
    throw new Error('Failed to extract sub-features');
  }
}