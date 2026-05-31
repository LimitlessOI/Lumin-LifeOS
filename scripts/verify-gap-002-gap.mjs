/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * A simple utility to wrap an async promise in a try/catch block,
 * returning an array [error, result] similar to Node.js callbacks.
 * @param {Promise<any>} promise The promise to execute.
 * @returns {Promise<[Error | null, any | null]>} An array containing an error or the result.
 */
const tryCatch = async (promise) => {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error, null];
  }
};

/**
 * Fetches JSON data from a specified URL with an x-command-key header.
 * @param {string} baseUrl The base URL for the API.
 * @param {string} path The API endpoint path.
 * @param {string} key The value for the x-command-key header.
 * @returns {Promise<object>} The JSON response data.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
const fetchJson = async (baseUrl, path, key) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'x-command-key': key,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }
  return response.json();
};

/**
 * Verifies GAP-002 by checking the health status of the kernel and control plane.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the LifeOS API.
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<object>} An audit result object indicating success or failure and relevant GAP details.
 */
export async function runGAP002GapVerification({ baseUrl, commandKey }) {
  const [error, results] = await tryCatch(
    Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey)
    ])
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  const [kernelData] = results; // controlPlaneData is fetched but not used in the return object per spec.

  return {
    ok: true,
    gap_id: 'GAP-002',
    gap_description: "No unified Decision Ledger — kernel authority stub only",
    gap_priority: "P0",
    gap_status: "foundational",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString()
  };
}