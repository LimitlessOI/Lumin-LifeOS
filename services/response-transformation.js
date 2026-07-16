/**
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Exports transformResponse — services/response-transformation.js.
 */

/**
 * Transforms a response by removing model names and costs.
 *
 * @param {object} response - The response object to be transformed.
 * @returns {object} - The transformed response object without model names and costs.
 */
export function transformResponse(response) {
  // Assuming response is an object with a structure that includes model names and costs
  if (response && typeof response === 'object') {
    const { modelName, cost, ...rest } = response;
    return rest;
  }
  return response;
}

/**
 * Middleware to transform the response before sending it.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {function} next - The next middleware function.
 */
export function responseTransformationMiddleware(req, res, next) {
  const originalSend = res.send;
  res.send = function (body) {
    const transformedBody = transformResponse(body);
    originalSend.call(this, transformedBody);
  };
  next();
}
