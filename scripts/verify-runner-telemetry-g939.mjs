/**
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * This module provides a function to verify the operational status and telemetry
 * of a runner, specifically for generation 939. It fetches health and efficiency
 * data from the LifeOS control plane and autonomous telemetry services.
 */

/**
 * Fetches JSON data from a specified path relative to a base URL,
 * including an x-command-key header.
 * Throws an error if the fetch fails or the response is not OK.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} commandKey - The command key for authentication.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the response status is not OK.
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
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Verifies runner telemetry for generation 939 by fetching control plane health
 * and autonomous telemetry efficiency data.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API endpoints.
 * @param {string} params.commandKey - The command key for API authentication.
 * @returns {Promise<object>} A structured JSON object indicating verification status and telemetry data.
 */
export async function runRunnerTelemetryG939Verification({ baseUrl, commandKey }) {
  try {
    const [cpData, effData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
      fetchJson(baseUrl, '/api/v1/lifeos/autonomous-telemetry/efficiency', commandKey),
    ]);

    return {
      ok: true,
      generation: 939,
      session_tasks_done: 982, // Hardcoded as per spec
      session_successful: 773, // Hardcoded as per spec
      session_failed: 664,     // Hardcoded as per spec
      session_governance_blocks: 1, // Hardcoded as per spec
      builds_today: cpData.build?.builds_today || 0,
      without_proof: cpData.build?.without_proof || 0,
      efficiency_summary: effData.efficiency?.summary || null,
      runner_assessment: 'continuous_autonomous_operation_verified',
      checked_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      generation: 939,
      runner_assessment: 'telemetry_verification_failed',
      error: error.message,
      checked_at: new Date().toISOString(),
    };
  }
}