/**
 * SYNOPSIS: - Fetches JSON data from a specified URL with an x-command-key header.
 */
/*
- @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
/**
- Fetches JSON data from a specified URL with an x-command-key header.
- @param {string} baseUrl - The base URL for the API.
- @param {string} path - The apiEP path.
- @param {string} commandKey - The command key for auth.
- @returns {Promise<object>} The parsed JSON response.
- @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  if (!baseUrl || !path || !commandKey) {
    throw new Error('Missing required fetch parameters (baseUrl, path, or commandKey).');
  }
  const url = `${baseUrl}${path}`;
  const options = {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json',
    },
  };
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
  }
  return response.json();
}

/**
- Verifies the status of OC-009 by checking kernel and control plane health.
- @param {object} params - The parameters for the verification.
- @param {string} params.baseUrl - The base URL for the LifeOS API.
- @param {string} params.commandKey - The command key for API auth.
- @returns {Promise<object>} An object indicating the verification status and details.
 */
export async function runOC009StatusVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'Missing baseUrl or commandKey in input parameters.' };
  }
  try {
    const [kernelData, cpData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ]);
    // Construct the success response object based on fetched data
    const result = {
      ok: true,
      contradiction_id: 'OC-009',
      title: "`builder-council-review.js` bypasses council / kernel",
      current_status: "BLOCKED",
      resolution_needed: true,
      kernel_status: kernelData.health?.status || 'unknown',
      control_plane_status: cpData.status || 'unknown',
      builds_today: cpData.build?.builds_today || 0,
      checked_at: new Date().toISOString(),
    };
    return result;
  } catch (e) {
    // Handle any errors during fetching or parsing
    return { ok: false, error: e.message };
  }
}