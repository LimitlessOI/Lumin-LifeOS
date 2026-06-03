/*
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
/**
 * Fetches JSON data from a given URL with a command key header.
 * Handles network errors and non-2xx HTTP responses.
 * @param {string} url - The full URL to fetch.
 * @param {string} commandKey - The value for the 'x-command-key' header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(url, commandKey) {
  if (!url || !commandKey) {
    throw new Error('URL and commandKey must be provided for fetchJson.');
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
  }
  return response.json();
}

/**
 * Verifies the status of GAP-004 by checking kernel and control plane health endpoints.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the apiEPs.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} An object indicating the verification result.
 */
export async function runGAP004GapVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'baseUrl and commandKey must be provided.' };
  }
  try {
    const kernelHealthUrl = `${baseUrl}/api/v1/kernel/health`;
    const controlPlaneHealthUrl = `${baseUrl}/api/v1/builderos/control-plane/health`;
    const [kernelData, controlPlaneData] = await Promise.all([
      fetchJson(kernelHealthUrl, commandKey),
      fetchJson(controlPlaneHealthUrl, commandKey),
    ]);
    return {
      ok: true,
      gap_id: 'GAP-004',
      gap_description: "TOKEN_ACCOUNTING_STRICT never proven fail-closed on deploy",
      gap_priority: "P0",
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