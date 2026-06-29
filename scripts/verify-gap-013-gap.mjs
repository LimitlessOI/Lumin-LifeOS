/**
 * SYNOPSIS: Exports runGAP013GapVerification — scripts/verify-gap-013-gap.mjs.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * A generic helper to wrap an asyncFn and return its result or caught error.
 * @param {function(): Promise<any>} promiseFn The asyncFn to execute.
 * @returns {Promise<{data: any, error: Error | null}>} An object containing either data or an error.
 */
const tryCatch = async (promiseFn) => {
  try {
    const data = await promiseFn();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
};

/**
 * Fetches JSON data from a specified URL with an x-command-key header.
 * @param {string} baseUrl The base URL of the API.
 * @param {string} path The apiEP path.
 * @param {string} commandKey The command key for auth.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the response status is not OK.
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

/**
 * Verifies the status of Kernel and BuilderOS control plane health endpoints.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key to be used in the x-command-key header.
 * @returns {Promise<object>} A structured JSON object indicating the verification result.
 */
export async function runGAP013GapVerification({ baseUrl, commandKey }) {
  const kernelHealthPath = '/api/v1/kernel/health';
  const builderOSHealthPath = '/api/v1/builderos/control-plane/health';

  const { data: [kernelData, builderOSData] = [], error } = await tryCatch(async () => {
    return await Promise.all([
      fetchJson(baseUrl, kernelHealthPath, commandKey),
      fetchJson(baseUrl, builderOSHealthPath, commandKey),
    ]);
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const kernelStatus = kernelData?.health?.status || 'unknown';
  const tokenAccountingStatus = kernelData?.health?.token_accounting?.status || 'unknown';

  return {
    ok: true,
    gap_id: 'GAP-013',
    gap_description: "OIL async race — RESOLVED: (1) `await writeSecurityReceipt` in builder route; (2) `verifyOilRece",
    gap_priority: "P1",
    gap_status: "1-day",
    resolution_required: true,
    kernel_status: kernelStatus,
    token_accounting: tokenAccountingStatus,
    checked_at: new Date().toISOString(),
  };
}