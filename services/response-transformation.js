/**
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Response transformation middleware that strips model names and costs from outgoing responses.
 */

// module.exports = { transformResponse, responseTransformationMiddleware }

/**
 * Strips model names from a response payload.
 */
function stripModelNames(body) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    const cleaned = Array.isArray(body) ? [...body] : { ...body };
    delete cleaned.modelName;
    delete cleaned.model;
    return cleaned;
  }
  return body;
}

/**
 * Strips cost information from a response payload.
 */
function stripCosts(body) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    const cleaned = Array.isArray(body) ? [...body] : { ...body };
    delete cleaned.cost;
    delete cleaned.costs;
    delete cleaned.totalCost;
    delete cleaned.tokensUsed;
    return cleaned;
  }
  return body;
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
