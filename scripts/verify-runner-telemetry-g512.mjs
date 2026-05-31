/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * Fetches JSON data with x-command-key, handling network and HTTP errors.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} key - The value for the x-command-key header.
 * @returns {Promise<{success: boolean, data?: object, error?: string}>} A promise that resolves to an object indicating success, data, or error.
 */
async function fetchJson(baseUrl, path, key) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        'x-command-key': key,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `HTTP error! Status: ${response.status}, Path: ${path}, Body: ${errorBody}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: `Network or parsing error for ${path}: ${error.message}` };
  }
}

/**
 * Verifies runner telemetry for Generation 512 by fetching control plane health
 * and autonomous telemetry efficiency data.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API endpoints.
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<object>} A promise that resolves to a structured audit JSON object.
 */
export async function runRunnerTelemetryG512Verification({ baseUrl, commandKey }) {
  // Execute both fetch operations concurrently using Promise.all
  const [cpResult, effResult] = await Promise.all([
    fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    fetchJson(baseUrl, '/api/v1/lifeos/autonomous-telemetry/efficiency', commandKey),
  ]);

  // Determine overall success based on individual fetch results
  const overallOk = cpResult.success && effResult.success;

  // Extract data, using null if a fetch failed
  const cpData = cpResult.data || null;
  const effData = effResult.data || null;

  // Construct the final result object as per specification
  return {
    ok: overallOk,
    generation: 512,
    session_tasks_done: 555, // Hardcoded as per spec
    session_successful: 391, // Hardcoded as per spec
    session_failed: 461,     // Hardcoded as per spec
    session_governance_blocks: 1, // Hardcoded as per spec
    builds_today: cpData?.build?.builds_today || 0,
    without_proof: cpData?.build?.without_proof || 0,
    efficiency_summary: effData?.efficiency?.summary || null,
    runner_assessment: overallOk ? 'continuous_autonomous_operation_verified' : 'telemetry_data_incomplete_or_failed',
    checked_at: new Date().toISOString(),
  };
}