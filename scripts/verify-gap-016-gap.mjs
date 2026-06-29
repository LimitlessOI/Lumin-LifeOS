/**
 * SYNOPSIS: Exports runGAP016GapVerification — scripts/verify-gap-016-gap.mjs.
 */
/*
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/*
 * A helper function to wrap an async promise in a tryCatch block,
 * returning an object indicating success or failure.
 * @param {Promise<any>} promise The promise to execute.
 * @returns {Promise<{success: true, data: any} | {success: false, error: Error}>}
 */
const tryCatch = async (promise) => {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

/*
 * Fetches JSON data from a specified URL with a command key header.
 * @param {string} baseUrl The base URL of the API.
 * @param {string} path The apiEP path.
 * @param {string} commandKey The value for the 'x-command-key' header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the response is not OK.
 */
const fetchJson = async (baseUrl, path, commandKey) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'x-command-key': commandKey,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }
  return response.json();
};

/*
 * Verifies the health status of Kernel and BuilderOS Control Plane.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} A structured JSON object with verification results.
 */
export async function runGAP016GapVerification({ baseUrl, commandKey }) {
  const kernelHealthPromise = fetchJson(baseUrl, '/api/v1/kernel/health', commandKey);
  const builderosHealthPromise = fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey);

  const [kernelResult, builderosResult] = await Promise.all([
    tryCatch(kernelHealthPromise),
    tryCatch(builderosHealthPromise),
  ]);

  if (!kernelResult.success) {
    return { ok: false, error: `Kernel health check failed: ${kernelResult.error.message}` };
  }
  if (!builderosResult.success) {
    return { ok: false, error: `BuilderOS control plane health check failed: ${builderosResult.error.message}` };
  }

  const kernelData = kernelResult.data;

  return {
    ok: true,
    gap_id: 'GAP-016',
    gap_description: "CCL hook placeholder only — no compiler, no round-trip",
    gap_priority: "P3",
    gap_status: "future research",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString(),
  };
}