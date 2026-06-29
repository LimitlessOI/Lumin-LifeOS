/**
 * SYNOPSIS: Exports runGAP024GapVerification — scripts/verify-gap-024-gap.mjs.
 */
/*
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
/*
 * Helper function to fetch JSON data from a specified path with an x-command-key header.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The value for the x-command-key header.
 * @returns {Promise<object>} A promise that resolves to the parsed JSON response.
 * @throws {Error} If the network request fails or the HTTP response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Path: ${path}, Response: ${errorText}`);
  }
  return response.json();
}
/*
 * Executes a verification for GAP-024 by checking the health of kernel and control plane services.
 * This audit ensures the expected services are operational and provides status details.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the apiEPs (e.g., "https://api.example.com").
 * @param {string} params.commandKey - The command key to be used in the 'x-command-key' header for auth.
 * @returns {Promise<object>} A promise that resolves to a structured audit JSON object.
 *   On success: { ok: true, gap_id, gap_description, gap_priority, gap_status, resolution_required, kernel_status, token_accounting, checked_at }
 *   On failure: { ok: false, error: string }
 */
export async function runGAP024GapVerification({ baseUrl, commandKey }) {
  try {
    // Fetch both health endpoints concurrently using Promise.all
    const [kernelData, controlPlaneData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey)
    ]);
    // Construct the success response object based on the fetched data
    return {
      ok: true,
      gap_id: 'GAP-024',
      gap_description: "token_optimizer_daily table absent on Neon — unified view omits rollup arm",
      gap_priority: "P2",
      gap_status: "1-week",
      resolution_required: true,
      kernel_status: kernelData.health?.status || 'unknown',
      token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
      checked_at: new Date().toISOString()
    };
  } catch (e) {
    // Handle any errors that occur during fetching or parsing
    return {
      ok: false,
      error: e.message
    };
  }
}