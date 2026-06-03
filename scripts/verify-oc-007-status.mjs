/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * Helper function to fetch JSON data from a given URL with a command key header.
 * Handles HTTP errors by throwing an Error with status and body.
 *
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The value for the 'x-command-key' header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the HTTP response is not ok.
 */
async function fetchJson(baseUrl, path, commandKey) {
    const url = `${baseUrl}${path}`;
    const headers = {
        'x-command-key': commandKey,
        'Content-Type': 'application/json'
    };
    const response = await fetch(url, { headers });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
    }
    return response.json();
}

/**
 * Helper function to create a consistent error response object.
 *
 * @param {Error} e - The error object.
 * @returns {{ok: false, error: string}} An object indicating failure with an error message.
 */
function createErrorResponse(e) {
    return { ok: false, error: e.message };
}

/**
 * Verifies the status of the Kernel and BuilderOS Control Plane for OC-007.
 * Fetches health data from both services concurrently and returns a structured audit report.
 * Handle fetch errors with tryCatch and return { ok: false, error: e.message } on failure.
 *
 * @param {{baseUrl: string, commandKey: string}} params - Parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} A structured JSON object indicating the verification status.
 */
export async function runOC007StatusVerification({ baseUrl, commandKey }) {
    // Validate required input parameters
    if (!baseUrl) {
        return createErrorResponse(new Error('baseUrl is required.'));
    }
    if (!commandKey) {
        return createErrorResponse(new Error('commandKey is required.'));
    }

    try {
        // Fetch data from Kernel and Control Plane concurrently
        const [kernelData, cpData] = await Promise.all([
            fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
            fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey)
        ]);

        // Return success response with aggregated status
        return {
            ok: true,
            contradiction_id: 'OC-007',
            title: "No unified Decision Ledger",
            current_status: "OPEN",
            resolution_needed: true,
            kernel_status: kernelData.health?.status || 'unknown',
            control_plane_status: cpData.status || 'unknown',
            builds_today: cpData.build?.builds_today || 0,
            checked_at: new Date().toISOString(),
        };
    } catch (e) {
        // Handle any errors during fetching or processing
        return createErrorResponse(e);
    }
}