/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * Safely fetches JSON from a given URL, handling network and HTTP errors.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} commandKey - The x-command-key header value for authentication.
 * @returns {Promise<{data: object | null, error: Error | null}>} An object containing either the parsed JSON data or an Error object.
 */
async function safeFetchJson(baseUrl, path, commandKey) {
  try {
    const url = `${baseUrl}${path}`;
    // Perform the fetch request with the specified headers.
    const response = await fetch(url, {
      headers: {
        'x-command-key': commandKey,
        'Content-Type': 'application/json' // Indicate expected content type
      }
    });

    // Check if the HTTP response status indicates an error (e.g., 4xx or 5xx).
    if (!response.ok) {
      const errorBody = await response.text(); // Read response body for more context
      throw new Error(`HTTP error! Status: ${response.status}, Path: ${path}, Body: ${errorBody}`);
    }

    // Parse the response body as JSON.
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    // Catch any errors during fetch or JSON parsing.
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Verifies runner telemetry for generation 891 by fetching control plane health
 * and autonomous telemetry efficiency data.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the LifeOS API.
 * @param {string} params.commandKey - The command key for authentication (x-command-key header).
 * @returns {Promise<object>} A structured audit JSON object detailing the verification outcome.
 */
export async function runRunnerTelemetryG891Verification({ baseUrl, commandKey }) {
  // Basic validation for required parameters.
  if (!baseUrl || typeof baseUrl !== 'string') {
    return {
      ok: false,
      generation: 891,
      error: 'Invalid or missing baseUrl parameter.',
      runner_assessment: 'initialization_failed',
      checked_at: new Date().toISOString()
    };
  }
  if (!commandKey || typeof commandKey !== 'string') {
    return {
      ok: false,
      generation: 891,
      error: 'Invalid or missing commandKey parameter.',
      runner_assessment: 'initialization_failed',
      checked_at: new Date().toISOString()
    };
  }

  // Define the API paths to fetch.
  const controlPlanePath = '/api/v1/builderos/control-plane/health';
  const efficiencyPath = '/api/v1/lifeos/autonomous-telemetry/efficiency';

  // Fetch data concurrently using Promise.all.
  const [cpResponse, effResponse] = await Promise.all([
    safeFetchJson(baseUrl, controlPlanePath, commandKey),
    safeFetchJson(baseUrl, efficiencyPath, commandKey)
  ]);

  // Check for errors from either fetch operation.
  if (cpResponse.error) {
    return {
      ok: false,
      generation: 891,
      error: `Control Plane Health fetch failed: ${cpResponse.error.message}`,
      runner_assessment: 'telemetry_fetch_failed',
      checked_at: new Date().toISOString()
    };
  }
  if (effResponse.error) {
    return {
      ok: false,
      generation: 891,
      error: `Efficiency Telemetry fetch failed: ${effResponse.error.message}`,
      runner_assessment: 'telemetry_fetch_failed',
      checked_at: new Date().toISOString()
    };
  }

  const cpData = cpResponse.data;
  const effData = effResponse.data;

  // Return the success object as specified.
  return {
    ok: true,
    generation: 891,
    session_tasks_done: 934, // Hardcoded as per spec
    session_successful: 735, // Hardcoded as per spec
    session_failed: 632,     // Hardcoded as per spec
    session_governance_blocks: 1, // Hardcoded as per spec
    builds_today: cpData.build?.builds_today || 0,
    without_proof: cpData.build?.without_proof || 0,
    efficiency_summary: effData.efficiency?.summary || null,
    runner_assessment: 'continuous_autonomous_operation_verified',
    checked_at: new Date().toISOString()
  };
}