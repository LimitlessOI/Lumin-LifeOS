/**
 * SYNOPSIS: Fetches JSON data from a given URL path with an x-command-key header.
 * Fetches JSON data from a given URL path with an x-command-key header.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API path relative to the base URL.
 * @param {string} commandKey - The value for the x-command-key header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
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
}

/**
 * Verifies the health status of Kernel and BuilderOS Control Plane.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} An object indicating the verification result.
 */
export async function runGAP001GapVerification({ baseUrl, commandKey }) {
  try {
    const [kernelData, controlPlaneData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ]);
    return {
      ok: true,
      gap_id: 'GAP-001',
      gap_description: '`builder-council-review.js` — 8 direct provider fetches bypass kernel + token ledger',
      gap_priority: 'P0',
      gap_status: '1-day',
      resolution_required: true,
      kernel_status: kernelData.health?.status || 'unknown',
      token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
      checked_at: new Date().toISOString(),
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}