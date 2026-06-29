/**
 * SYNOPSIS: Exports runGAP023GapVerification — scripts/verify-gap-023-gap.mjs.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Fetches JSON data from a specified API path.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The x-command-key header value.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
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
}

/**
 * Runs the GAP-023 verification by fetching health statuses from kernel and control plane.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key to be used in the x-command-key header.
 * @returns {Promise<object>} A structured JSON object indicating the verification result.
 */
export async function runGAP023GapVerification({ baseUrl, commandKey }) {
  try {
    const [kernelData, controlPlaneData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ]);
    return {
      ok: true,
      gap_id: 'GAP-023',
      gap_description: "Governed loop health preflight optional — not default wired to control plane fetch",
      gap_priority: "P2",
      gap_status: "1-day",
      resolution_required: true,
      kernel_status: kernelData.health?.status || 'unknown',
      token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
      checked_at: new Date().toISOString(),
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}