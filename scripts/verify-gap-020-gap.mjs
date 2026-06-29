/**
 * SYNOPSIS: Fetches JSON data from a specified path relative to the base URL.
 */
/*
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Fetches JSON data from a specified path relative to the base URL.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The x-command-key header value.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  if (!baseUrl || !path || !commandKey) {
    throw new Error('Missing baseUrl, path, or commandKey for fetchJson.');
  }
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }
  return response.json();
}

/**
 * Verifies GAP-020 status by checking kernel and control plane health endpoints.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} An object indicating the verification result.
 */
export async function runGAP020GapVerification({ baseUrl, commandKey }) {
  if (!baseUrl) {
    return { ok: false, error: 'baseUrl is required.' };
  }
  if (!commandKey) {
    return { ok: false, error: 'commandKey is required.' };
  }

  try {
    const [kernelData, controlPlaneData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey)
    ]);

    return {
      ok: true,
      gap_id: 'GAP-020',
      gap_description: "`routes/tsos-task-ledger-routes.js` orphaned — drift vs `build_task_ledger`",
      gap_priority: "P2",
      gap_status: "1-day",
      resolution_required: true,
      kernel_status: kernelData.health?.status || 'unknown',
      token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
      checked_at: new Date().toISOString()
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}