/**
 * SYNOPSIS: Exports runOC015StatusVerification — scripts/verify-oc-015-status.mjs.
 */
/*
- @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
/*
- Fetches JSON data from a specified URL path with an x-command-key header.
- @param {string} baseUrl - The base URL of the API.
- @param {string} path - The apiEP path.
- @param {string} commandKey - The command key for auth.
- @returns {Promise<object>} The parsed JSON response.
- @throws {Error} If the network request fails or the response is not OK.
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
/*
- Verifies the status of OC-015 by checking kernel and control plane health.
- @param {object} params - The parameters for the verification.
- @param {string} params.baseUrl - The base URL for API calls.
- @param {string} params.commandKey - The command key for auth.
- @returns {Promise<object>} A structured JSON object indicating the verification result.
 */
export async function runOC015StatusVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'Missing baseUrl or commandKey.' };
  }
  try {
    const [kernelData, cpData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ]);
    return {
      ok: true,
      contradiction_id: 'OC-015',
      title: "`proof_status` stuck at `exception` — `canMarkBuildDone` ordering issue",
      current_status: "OPEN",
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