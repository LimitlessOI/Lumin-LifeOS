/**
 * SYNOPSIS: Exports runGAP007GapVerification — scripts/verify-gap-007-gap.mjs.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * Fetches JSON data from a specified URL path using the provided base URL and command key.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} commandKey - The x-command-key header value.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  if (!baseUrl || !commandKey) {
    throw new Error('Base URL and command key must be provided for fetchJson.');
  }
  const url = `${baseUrl}${path}`;
  const options = {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json', // Standard practice for API calls
    },
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API call failed for ${url}: Status ${response.status}, Body: ${errorBody}`);
  }
  return response.json();
}

/**
 * Verifies GAP-007 status by checking Kernel and Control Plane health endpoints.
 * GAP-007: OCL unused — table exists, 0 rows; no operator ingest habit or automation.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the LifeOS API.
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<object>} An object indicating the verification result.
 */
export async function runGAP007GapVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'Base URL and command key are required parameters.' };
  }

  try {
    // Concurrently fetch health data from Kernel and Control Plane endpoints
    const [kernelData, controlPlaneData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ]);

    // Construct the success response object as per specification
    return {
      ok: true,
      gap_id: 'GAP-007',
      gap_description: "OCL unused — table exists, 0 rows; no operator ingest habit or automation",
      gap_priority: "P1",
      gap_status: "1-week",
      resolution_required: true,
      kernel_status: kernelData.health?.status || 'unknown',
      token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
      checked_at: new Date().toISOString(),
    };
  } catch (e) {
    // Handle any errors during the fetch operations or JSON parsing
    return { ok: false, error: e.message };
  }
}