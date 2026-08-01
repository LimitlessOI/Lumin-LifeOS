/**
 * SYNOPSIS: Middleware to transform API responses by stripping model names and costs based on white-label configurations.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
export async function transformResponse(deps, payload) {
  const { pool, logger } = deps;
  const { clientId, response } = payload; // Assuming payload contains clientId and the response object
  
  if (!clientId || !response || typeof response !== 'object') {
    logger.warn('transformResponse received invalid payload: %j', payload);
    return response; // Return original response if payload is invalid
  }

  try {
    const { rows } = await pool.query(
      'SELECT hide_models, hide_costs FROM white_label_configs WHERE client_id = $1',
      [clientId]
    );

    const config = rows[0];

    if (!config) {
      logger.info({ clientId }, 'No white-label config found for client, returning original response.');
      return response;
    }

    let transformedResponse = { ...response };

    if (config.hide_models) {
      transformedResponse = stripModelNames(transformedResponse);
    }

    if (config.hide_costs) {
      transformedResponse = stripCosts(transformedResponse);
    }

    return transformedResponse;

  } catch (error) {
    logger.error({ error, clientId }, 'Error in transformResponse');
    // Depending on desired behavior, either rethrow or return original response on error
    throw new Error('Failed to apply response transformation due to a configuration lookup error.');
  }
}

/**
 * Strips model names from the response object.
 * This is a helper function internal to the middleware.
 * @param {object} response - The response object.
 * @returns {object} The response object with model names stripped.
 */
function stripModelNames(response) {
  if (response && typeof response === 'object') {
    const { modelName, model_name, model_id, ...rest } = response; // Common model name fields
    return rest;
  }
  return response;
}

/**
 * Strips cost-related fields from the response object.
 * This is a helper function internal to the middleware.
 * @param {object} response - The response object.
 * @returns {object} The response object with cost fields stripped.
 */
function stripCosts(response) {
  if (response && typeof response === 'object') {
    const { cost, totalCost, estimatedCost, price, ...rest } = response; // Common cost fields
    return rest;
  }
  return response;
}