/**
 * SYNOPSIS: Fetches JSON data from a specified URL with an x-command-key header.
 */
/*
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Fetches JSON data from a specified URL with an x-command-key header.
 * Throws an error if the HTTP response is not OK.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The command key for auth.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the HTTP response is not OK.
 */
const fetchJson = async (baseUrl, path, commandKey) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json' // Standard practice for JSON APIs
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    // Include URL in error message for better debugging
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText} for URL: ${url}`);
  }
  return response.json();
};

/**
 * Verifies the status of Kernel and BuilderOS control plane health endpoints
 * to assess model governance score gaps (GAP-019).
 * Fetches data concurrently using Promise.all and handles potential fetch errors.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the LifeOS API.
 * @param {string} params.commandKey - The command key for API auth.
 * @returns {Promise<object>} A structured JSON object indicating the verification result.
 *   On success: { ok: true, gap_id, gap_description, gap_priority, gap_status, resolution_required, kernel_status, token_accounting, checked_at }
 *   On failure: { ok: false, error: string }
 */
export async function runGAP019GapVerification({ baseUrl, commandKey }) {
  // The specification requires fetching two health endpoints concurrently.
  // We use Promise.all to execute these requests in parallel.
  try {
    const [kernelData, controlPlaneData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey)
    ]);

    // The 'controlPlaneData' is fetched as required but its content is not
    // explicitly used in the final return object structure for GAP-019,
    // which primarily focuses on 'kernelData' for status reporting.
    return {
      ok: true,
      gap_id: 'GAP-019',
      gap_description: "Model governance score — model-performance exists but not joined to token/build ledger",
      gap_priority: "P2",
      gap_status: "1-week",
      resolution_required: true,
      kernel_status: kernelData.health?.status || 'unknown',
      token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
      checked_at: new Date().toISOString()
    };
  } catch (e) {
    // If any fetch operation fails (e.g., network error, non-2xx HTTP status),
    // catch the error and return a standardized failure object.
    return { ok: false, error: e.message };
  }
}