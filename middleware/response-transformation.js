/**
 * SYNOPSIS: mw/response-transformation.js
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
// mw/response-transformation.js

/**
 * Middleware function to transform responses by removing model names and costs
 */
export function responseTransformationMiddleware(req, res, next) {
  // Capture the original send function
  const originalSend = res.send;

  // Override the send function
  res.send = function (body) {
    // Transform the response by removing model names and costs
    const transformedBody = transformResponse(body);

    // Call the original send function with the transformed body
    originalSend.call(this, transformedBody);
  };

  // Proceed to the next middleware
  next();
}

// Function to strip model names and costs from the response
function transformResponse(response) {
  if (typeof response === 'string') {
    // Remove model names and costs from a string response
    return response.replace(/model name: \w+|cost: \d+(?:\.\d+)?/gi, '');
  } else if (typeof response === 'object' && response !== null) {
    // If response is an object, iterate and remove unwanted properties
    for (const key in response) {
      if (Object.prototype.hasOwnProperty.call(response, key)) {
        if (key.toLowerCase().includes('modelname') || key.toLowerCase() === 'cost') {
          delete response[key];
        }
      }
    }
    return JSON.stringify(response);
  }
  return response;
}
