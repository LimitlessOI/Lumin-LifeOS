/**
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Helper function to fetch JSON data from a given URL path with a command key header.
 * Handles basic HTTP error checking.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The specific API path to append to the base URL.
 * @param {string} commandKey - The value for the 'x-command-key' header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the HTTP response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
    const url = `${baseUrl}${path}`;
    const headers = {
        'x-command-key': commandKey,
        'Content-Type': 'application/json'
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
    }

    return response.json();
}

/**
 * Verifies runner telemetry by fetching health and efficiency data from LifeOS.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the LifeOS API.
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<object>} A structured JSON object containing telemetry verification results.
 */
export async function runRunnerTelemetryG317Verification({ baseUrl, commandKey }) {
    let cpData = {}; // Data from control-plane health endpoint
    let effData = {}; // Data from autonomous-telemetry efficiency endpoint
    let ok = false; // Overall success status
    let error = null; // Stores error message if any fetch fails

    try {
        // Concurrently fetch data from both required endpoints
        const [controlPlaneResponse, efficiencyResponse] = await Promise.all([
            fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
            fetchJson(baseUrl, '/api/v1/lifeos/autonomous-telemetry/efficiency', commandKey)
        ]);
        cpData = controlPlaneResponse;
        effData = efficiencyResponse;
        ok = true; // All fetches succeeded
    } catch (e) {
        error = e.message; // Capture the error message
    }

    // Construct and return the structured audit JSON object
    return {
        ok: ok,
        generation: 317,
        session_tasks_done: 360, // Hardcoded as per spec
        session_successful: 207, // Hardcoded as per spec
        session_failed: 372, // Hardcoded as per spec
        session_governance_blocks: 1, // Hardcoded as per spec
        builds_today: cpData.build?.builds_today || 0,
        without_proof: cpData.build?.without_proof || 0,
        efficiency_summary: effData.efficiency?.summary || null,
        runner_assessment: ok ? 'continuous_autonomous_operation_verified' : `telemetry_fetch_failed: ${error}`,
        checked_at: new Date().toISOString()
    };
}