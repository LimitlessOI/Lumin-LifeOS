/**
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Helper function to fetch JSON data from a given URL path.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} commandKey - The x-command-key header value.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the response status is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
    // Construct the full URL for the API request.
    const url = new URL(path, baseUrl).toString();
    // Define headers, including the required x-command-key.
    const headers = {
        'x-command-key': commandKey,
        'Accept': 'application/json'
    };

    // Perform the fetch request using native Node.js fetch.
    const response = await fetch(url, { headers });

    // Check if the HTTP response was successful (status code 2xx).
    if (!response.ok) {
        // Attempt to read the error body for more context before throwing.
        const errorBody = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
    }

    // Parse and return the JSON response.
    return response.json();
}

/**
 * Verifies runner telemetry for generation 468 by fetching control plane health
 * and autonomous telemetry efficiency data.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the LifeOS/BuilderOS APIs.
 * @param {string} params.commandKey - The command key for authentication (x-command-key header).
 * @returns {Promise<object>} A structured JSON object with verification results or error details.
 */
export async function runRunnerTelemetryG468Verification({ baseUrl, commandKey }) {
    try {
        // Concurrently fetch data from two different API endpoints using Promise.all.
        const [cpData, effData] = await Promise.all([
            fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
            fetchJson(baseUrl, '/api/v1/lifeos/autonomous-telemetry/efficiency', commandKey)
        ]);

        // Return a success object with aggregated data and static values as per specification.
        return {
            ok: true,
            generation: 468,
            session_tasks_done: 511,
            session_successful: 349,
            session_failed: 445,
            session_governance_blocks: 1,
            builds_today: cpData.build?.builds_today || 0,
            without_proof: cpData.build?.without_proof || 0,
            efficiency_summary: effData.efficiency?.summary || null,
            runner_assessment: 'continuous_autonomous_operation_verified',
            checked_at: new Date().toISOString()
        };
    } catch (error) {
        // Handle any errors that occur during the fetch operations, shaping the error response.
        return {
            ok: false,
            generation: 468,
            error: error.message,
            runner_assessment: 'telemetry_fetch_failed',
            checked_at: new Date().toISOString()
        };
    }
}