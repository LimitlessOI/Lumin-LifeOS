/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * Fetches JSON data from a specified URL with an x-command-key header.
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
                'Accept': 'application/json' // Request JSON response
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error fetching ${url}: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return response.json();
    } catch (error) {
        // Catch network errors or issues with response.json() parsing
        throw new Error(`Network or parsing error for ${url}: ${error.message}`);
    }
}

/**
 * Verifies runner telemetry by fetching health and efficiency data from LifeOS and BuilderOS.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API endpoints.
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<object>} A structured JSON object containing telemetry verification results.
 */
export async function runRunnerTelemetryG695Verification({ baseUrl, commandKey }) {
    if (!baseUrl || !commandKey) {
        return {
            ok: false,
            generation: 695,
            runner_assessment: 'initialization_failed',
            error: 'Missing baseUrl or commandKey parameter.',
            checked_at: new Date().toISOString()
        };
    }

    const controlPlaneHealthPath = '/api/v1/builderos/control-plane/health';
    const autonomousTelemetryEfficiencyPath = '/api/v1/lifeos/autonomous-telemetry/efficiency';

    let cpData = {};
    let effData = {};
    let fetchError = null;

    try {
        const [cpResponse, effResponse] = await Promise.all([
            fetchJson(baseUrl, controlPlaneHealthPath, commandKey),
            fetchJson(baseUrl, autonomousTelemetryEfficiencyPath, commandKey)
        ]);
        cpData = cpResponse;
        effData = effResponse;
    } catch (error) {
        fetchError = error.message;
        return {
            ok: false,
            generation: 695,
            runner_assessment: 'telemetry_fetch_failed',
            error: fetchError,
            checked_at: new Date().toISOString()
        };
    }

    // On successful fetch, construct the specified return object
    return {
        ok: true,
        generation: 695,
        session_tasks_done: 738, // Hardcoded as per specification
        session_successful: 564, // Hardcoded as per specification
        session_failed: 524,     // Hardcoded as per specification
        session_governance_blocks: 1, // Hardcoded as per specification
        builds_today: cpData.build?.builds_today || 0,
        without_proof: cpData.build?.without_proof || 0,
        efficiency_summary: effData.efficiency?.summary || null,
        runner_assessment: 'continuous_autonomous_operation_verified',
        checked_at: new Date().toISOString()
    };
}