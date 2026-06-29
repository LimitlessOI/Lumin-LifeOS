/**
 * SYNOPSIS: Exports runGAP018GapVerification — scripts/verify-gap-018-gap.mjs.
 */
/*
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * - Verifies the status of critical kernel and BuilderOS control plane health endpoints
 *   to assess the operational status related to GAP-018.
 * - GAP-018: Contradiction resolution system manual only — no automated OC closure verifier.
 */

/*
 * Wraps an asynchronous function in a try-catch block to standardize errHdl.
 * @param {function(): Promise<any>} asyncFn - The asynchronous function to execute.
 * @returns {Promise<{ok: true, data: any} | {ok: false, error: string}>} The result of the function or an error object.
 */
const tryCatch = async (asyncFn) => {
  try {
    return { ok: true, data: await asyncFn() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};

/*
 * Fetches JSON data from a specified API path, including an x-command-key header.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The specific API path to fetch.
 * @param {string} commandKey - The value for the 'x-command-key' header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the response is not OK.
 */
const fetchJson = async (baseUrl, path, commandKey) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }
  return response.json();
};

/*
 * Executes GAP-018 verification by checking kernel and BuilderOS control plane health.
 * This function fetches health statuses from two critical endpoints concurrently.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for API requests (e.g., "http://localhost:3000").
 * @param {string} params.commandKey - The x-command-key header value for auth.
 * @returns {Promise<object>} A structured JSON object indicating verification status.
 */
export async function runGAP018GapVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'baseUrl and commandKey are required.' };
  }

  const kernelHealthPromise = tryCatch(() => fetchJson(baseUrl, '/api/v1/kernel/health', commandKey));
  const controlPlaneHealthPromise = tryCatch(() => fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey));

  const [kernelResult, controlPlaneResult] = await Promise.all([
    kernelHealthPromise,
    controlPlaneHealthPromise,
  ]);

  if (!kernelResult.ok) {
    return { ok: false, error: `Kernel health check failed: ${kernelResult.error}` };
  }
  if (!controlPlaneResult.ok) {
    return { ok: false, error: `Control plane health check failed: ${controlPlaneResult.error}` };
  }

  const kernelData = kernelResult.data;

  return {
    ok: true,
    gap_id: 'GAP-018',
    gap_description: "Contradiction resolution system manual only — no automated OC closure verifier",
    gap_priority: "P2",
    gap_status: "1-week",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString(),
  };
}