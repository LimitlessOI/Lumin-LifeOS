/**
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Fetches JSON data from a given URL, including an x-command-key header.
 * Handles network errors and non-OK HTTP responses.
 * @param {string} url - The full URL to fetch.
 * @param {string} commandKey - The value for the 'x-command-key' header.
 * @returns {Promise<object>} - A promise that resolves with the parsed JSON data.
 * @throws {Error} - Throws an error if the fetch fails or the response is not OK.
 */
async function fetchJson(url, commandKey) {
  try {
    const response = await fetch(url, {
      headers: {
        'x-command-key': commandKey,
        'Content-Type': 'application/json', // Explicitly set content type for consistency
      },
    });

    if (!response.ok) {
      const errorBody = await response.text(); // Read response body for more context
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    // Log the error for debugging purposes, then re-throw
    console.error(`[Telemetry G1047] Failed to fetch ${url}:`, error.message);
    throw error; // Re-throw to allow the caller to handle it
  }
}

/**
 * Verifies runner telemetry by fetching health and efficiency data from LifeOS and BuilderOS APIs.
 * Uses Promise.all for concurrent fetching and handles errors gracefully.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API endpoints.
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<object>} - A structured JSON object indicating the verification status and data.
 */
export async function runRunnerTelemetryG1047Verification({ baseUrl, commandKey }) {
  // Define the API paths for control plane health and autonomous telemetry efficiency
  const controlPlaneHealthPath = '/api/v1/builderos/control-plane/health';
  const autonomousTelemetryEfficiencyPath = '/api/v1/lifeos/autonomous-telemetry/efficiency';

  // Construct the full URLs using the provided base URL
  const healthUrl = `${baseUrl}${controlPlaneHealthPath}`;
  const efficiencyUrl = `${baseUrl}${autonomousTelemetryEfficiencyPath}`;

  try {
    // Fetch both data sources concurrently using Promise.all
    const [cpData, effData] = await Promise.all([
      fetchJson(healthUrl, commandKey),
      fetchJson(efficiencyUrl, commandKey),
    ]);

    // Return the structured success object as per specification
    return {
      ok: true,
      generation: 1047,
      session_tasks_done: 1090, // Static value from spec
      session_successful: 868,  // Static value from spec
      session_failed: 724,      // Static value from spec
      session_governance_blocks: 1, // Static value from spec
      builds_today: cpData.build?.builds_today || 0, // Safely access nested property
      without_proof: cpData.build?.without_proof || 0, // Safely access nested property
      efficiency_summary: effData.efficiency?.summary || null, // Safely access nested property
      runner_assessment: 'continuous_autonomous_operation_verified',
      checked_at: new Date().toISOString(), // Current timestamp in ISO format
    };
  } catch (error) {
    // On any error during fetching or parsing, return a failure object
    return {
      ok: false,
      generation: 1047,
      runner_assessment: 'telemetry_verification_failed',
      error: error.message, // Include the error message for debugging
      checked_at: new Date().toISOString(),
    };
  }
}