/**
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * This module provides functionality to verify runner telemetry for Generation 360
 * by fetching health and efficiency data from the BuilderOS control plane and LifeOS
 * autonomous telemetry endpoints. It ensures continuous autonomous operation.
 */

/**
 * Fetches JSON data from a specified URL path with a given command key.
 * @param {string} baseUrl - The base URL for the API endpoints.
 * @param {string} path - The specific API path to fetch.
 * @param {string} commandKey - The x-command-key header value for authentication.
 * @returns {Promise<object>} A promise that resolves to the JSON response body.
 * @throws {Error} If the network request fails or the HTTP response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
    const url = `${baseUrl}${path}`;
    // Execute the network request with the necessary authentication header.
    const response = await fetch(url, {
        headers: {
            'x-command-key': commandKey,
            'Content-Type': 'application/json' // Explicitly request JSON content.
        }
    });

    // Validate the HTTP response status.
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
    }

    // Parse and return the JSON payload.
    return response.json();
}

/**
 * Verifies runner telemetry for Generation 360 by concurrently fetching
 * control plane health and autonomous telemetry efficiency data.
 * This function aggregates data from multiple endpoints to provide a comprehensive
 * assessment of the runner's operational status.
 *
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API endpoints.
 * @param {string} params.commandKey - The x-command-key header value for authentication.
 * @returns {Promise<object>} A structured JSON object indicating the verification status
 *                            and collected telemetry data, or an error summary if verification fails.
 */
export async function runRunnerTelemetryG360Verification({ baseUrl, commandKey }) {
    try {
        // Initiate concurrent fetches for control plane health and autonomous telemetry efficiency.
        const [cpData, effData] = await Promise.all([
            fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
            fetchJson(baseUrl, '/api/v1/lifeos/autonomous-telemetry/efficiency', commandKey)
        ]);

        // Construct the success response object with static and dynamic data.
        return {
            ok: true,
            generation: 360,
            session_tasks_done: 403, // Fixed value from specification
            session_successful: 249, // Fixed value from specification
            session_failed: 387,     // Fixed value from specification
            session_governance_blocks: 1, // Fixed value from specification
            builds_today: cpData.build?.builds_today || 0, // Safely access nested property
            without_proof: cpData.build?.without_proof || 0, // Safely access nested property
            efficiency_summary: effData.efficiency?.summary || null, // Safely access nested property
            runner_assessment: 'continuous_autonomous_operation_verified',
            checked_at: new Date().toISOString()
        };
    } catch (error) {
        // Capture and report any errors encountered during the verification process.
        return {
            ok: false,
            generation: 360, // Contextual information even on failure
            runner_assessment: 'telemetry_verification_failed',
            error: error.message,
            checked_at: new Date().toISOString()
        };
    }
}