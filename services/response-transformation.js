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
