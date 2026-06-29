/**
 * SYNOPSIS: Exports runOC006StatusVerification — scripts/verify-oc-006-status.mjs.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Fetches JSON data from a given URL with a command key header.
 * @param {string} url - The full URL to fetch.
 * @param {string} commandKey - The value for the 'x-command-key' header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the response is not OK.
 */
async function fetchJson(url, commandKey) {
  const response = await fetch(url, {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
  }
  return response.json();
}

/**
 * Verifies the status of Kernel and Control Plane services for OC-006.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the apiEPs.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} An object indicating the verification status and details.
 */
export async function runOC006StatusVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'baseUrl and commandKey are required.' };
  }

  try {
    const kernelHealthUrl = `${baseUrl}/api/v1/kernel/health`;
    const controlPlaneHealthUrl = `${baseUrl}/api/v1/builderos/control-plane/health`;

    const [kernelData, cpData] = await Promise.all([
      fetchJson(kernelHealthUrl, commandKey),
      fetchJson(controlPlaneHealthUrl, commandKey)
    ]);

    return {
      ok: true,
      contradiction_id: 'OC-006',
      title: "CCL 0% production",
      current_status: "OPEN",
      resolution_needed: true,
      kernel_status: kernelData.health?.status || 'unknown',
      control_plane_status: cpData.status || 'unknown',
      builds_today: cpData.build?.builds_today || 0,
      checked_at: new Date().toISOString()
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}