/**
 * SYNOPSIS: Fetches JSON data from a specified URL path with an x-command-key header.
 */
/*
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * This module provides functionality to verify the status of BuilderOS and Kernel
 * health endpoints to audit the product boundary contradiction OC-008.
 */

/**
 * Fetches JSON data from a specified URL path with an x-command-key header.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API path to fetch.
 * @param {string} commandKey - The value for the x-command-key header.
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
 * Runs a status verification for BuilderOS and LifeOS Kernel health endpoints.
 * This audit checks the operational status of key components related to the
 * BuilderOS product boundary contradiction (OC-008).
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} An object indicating the verification result,
 *   including health statuses and build metrics on success, or an error on failure.
 */
export async function runOC008StatusVerification({ baseUrl, commandKey }) {
  try {
    const [kernelData, cpData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ]);
    return {
      ok: true,
      contradiction_id: 'OC-008',
      title: "BuilderOS ≠ LifeOS product boundary",
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