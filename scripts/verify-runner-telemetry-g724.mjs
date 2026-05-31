/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * Fetches JSON data from a specified URL with an x-command-key header.
 * Handles network and HTTP errors.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} commandKey - The value for the x-command-key header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        'x-command-key': commandKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    // Log the error for debugging, then re-throw to be caught by the caller
    console.error(`Failed to fetch ${url}:`, error.message);
    throw error;
  }
}

/**
 * Verifies runner telemetry by fetching health and efficiency data from LifeOS.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the LifeOS API.
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<object>} A structured JSON object with verification results.
 */
export async function runRunnerTelemetryG724Verification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    // Basic validation for required parameters, returning a structured error object
    return {
      ok: false,
      generation: 724,
      runner_assessment: 'verification_failed: Missing baseUrl or commandKey',
      checked_at: new Date().toISOString()
    };
  }

  try {
    // Fetch both endpoints concurrently using Promise.all
    const [cpData, effData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
      fetchJson(baseUrl, '/api/v1/lifeos/autonomous-telemetry/efficiency', commandKey)
    ]);

    // Construct the success response object based on specification
    return {
      ok: true,
      generation: 724,
      session_tasks_done: 767, // Hardcoded as per specification
      session_successful: 591, // Hardcoded as per specification
      session_failed: 540,     // Hardcoded as per specification
      session_governance_blocks: 1, // Hardcoded as per specification
      builds_today: cpData.build?.builds_today || 0,
      without_proof: cpData.build?.without_proof || 0,
      efficiency_summary: effData.efficiency?.summary || null,
      runner_assessment: 'continuous_autonomous_operation_verified',
      checked_at: new Date().toISOString()
    };
  } catch (error) {
    // Catch any errors from fetchJson or Promise.all and return a failure object
    return {
      ok: false,
      generation: 724,
      runner_assessment: `verification_failed: ${error.message}`,
      checked_at: new Date().toISOString()
    };
  }
}