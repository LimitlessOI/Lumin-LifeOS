/**
 * SYNOPSIS: Fetches JSON data from a given URL path with a command key header.
 */
/*
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
/**
 * Fetches JSON data from a given URL path with a command key header.
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
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }
  return response.json();
}

/**
 * Verifies the status of Kernel and Control Plane for OC-001 contradiction.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the LifeOS API.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} An object indicating the verification result.
 */
export async function runOC001StatusVerification({ baseUrl, commandKey }) {
  try {
    const [kernelData, cpData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ]);

    return {
      ok: true,
      contradiction_id: 'OC-001',
      title: "Am 44 vs Am 46 “supreme” layer tension",
      current_status: "PARTIAL",
      resolution_needed: true,
      kernel_status: kernelData.health?.status || 'unknown',
      control_plane_status: cpData.status || 'unknown',
      builds_today: cpData.build?.builds_today || 0,
      checked_at: new Date().toISOString(),
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}