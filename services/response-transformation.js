/**
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Exports transformResponse — services/response-transformation.js.
 */
export function transformResponse(response) {
  // Assuming response is an object with a structure that includes model names and costs
  if (response && typeof response === 'object') {
    const { modelName, cost, ...rest } = response;
    return rest;
  }
  return response;
}

export function responseTransformationMiddleware(req, res, next) {
  const originalSend = res.send;
  res.send = function (body) {
    const transformedBody = transformResponse(body);
    originalSend.call(this, transformedBody);
  };
  next();
}