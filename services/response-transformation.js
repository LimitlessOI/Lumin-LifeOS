/**
 * SYNOPSIS: Response transformation middleware that strips model names and costs from outgoing responses.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */

// module.exports = { transformResponse, responseTransformationMiddleware }

/**
 * Strips model-name fields from a response payload.
 */
function stripModelNames(body) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    const cleaned = Array.isArray(body) ? [...body] : { ...body };
    delete cleaned.modelName;
    delete cleaned.model;
    delete cleaned.model_name;
    delete cleaned.model_id;
    return cleaned;
  }
  return body;
}

/**
 * Strips cost-related fields from a response payload.
 */
function stripCosts(body) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    const cleaned = Array.isArray(body) ? [...body] : { ...body };
    delete cleaned.cost;
    delete cleaned.costs;
    delete cleaned.totalCost;
    delete cleaned.estimatedCost;
    delete cleaned.price;
    delete cleaned.tokensUsed;
    return cleaned;
  }
  return body;
}

/**
 * DB-backed optional transform for a specific white-label client.
 */
export async function applyWhiteLabelResponseTransform(deps, payload) {
  const { pool, logger } = deps || {};
  const { clientId, response } = payload || {};

  if (!clientId || !response || typeof response !== 'object') {
    logger?.warn?.('applyWhiteLabelResponseTransform received invalid payload');
    return response;
  }

  try {
    if (!pool) {
      return stripCosts(stripModelNames(response));
    }

    const { rows } = await pool.query(
      'SELECT hide_models, hide_costs FROM white_label_configs WHERE client_id = $1',
      [clientId]
    );

    const config = rows[0];
    let transformedResponse = { ...response };

    if (config?.hide_models) {
      transformedResponse = stripModelNames(transformedResponse);
    }

    if (config?.hide_costs) {
      transformedResponse = stripCosts(transformedResponse);
    }

    return transformedResponse;
  } catch (error) {
    logger?.error?.({ error, clientId }, 'Error in applyWhiteLabelResponseTransform');
    throw new Error('Failed to apply response transformation due to a configuration lookup error.');
  }
}

/**
 * Express middleware that intercepts res.send to remove model names and costs.
 */
export function transformResponse(req, res, next) {
  const originalSend = res.send;
  res.send = function (body) {
    let cleaned = body;
    cleaned = stripModelNames(cleaned);
    cleaned = stripCosts(cleaned);
    return originalSend.call(this, cleaned);
  };
  next();
}

/**
 * Alias export for consumers expecting responseTransformationMiddleware.
 */
export function responseTransformationMiddleware(req, res, next) {
  return transformResponse(req, res, next);
}
