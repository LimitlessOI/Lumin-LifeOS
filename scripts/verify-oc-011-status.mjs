/**
 * SYNOPSIS: Exports runOC011StatusVerification — scripts/verify-oc-011-status.mjs.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * A generic try-catch wrapper for async functions.
 * @param {Function} fn The async function to execute.
 * @returns {Promise<{data: any, error: Error | null}>} An object containing either data or an error.
 */
async function tryCatch(fn) {
    try {
        const data = await fn();
        return { data, error: null };
    } catch (e) {
        return { data: null, error: e };
    }
}

/**
 * Fetches JSON data from a given URL path with a command key header.
 * @param {string} baseUrl The base URL for the API.
 * @param {string} path The API endpoint path.
 * @param {string} key The x-command-key header value.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, key) {
    const url = `${baseUrl}${path}`;
    const headers = {
        'x-command-key': key,
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
 * Verifies the status of Kernel and Control Plane services for OC-011.
 * @param {object} params - The parameters for verification.
 * @param {string} params.baseUrl - The base URL for the API endpoints.
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<object>} An audit status object.
 */
export async function runOC011StatusVerification({ baseUrl, commandKey }) {
    // Define the fetch operations to be executed concurrently
    const fetchKernelHealth = () => fetchJson(baseUrl, '/api/v1/kernel/health', commandKey);
    const fetchControlPlaneHealth = () => fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey);

    // Execute fetches concurrently using Promise.all and wrap each with tryCatch
    const [kernelResult, controlPlaneResult] = await Promise.all([
        tryCatch(fetchKernelHealth),
        tryCatch(fetchControlPlaneHealth)
    ]);

    // Check for any errors from the fetch operations
    if (kernelResult.error || controlPlaneResult.error) {
        const errorMessage = kernelResult.error?.message || controlPlaneResult.error?.message || 'Unknown fetch error';
        return { ok: false, error: errorMessage };
    }

    // Extract data from successful results
    const kernelData = kernelResult.data;
    const cpData = controlPlaneResult.data;

    // Return the structured success object with status details
    return {
        ok: true,
        contradiction_id: 'OC-011',
        title: "Memory / lessons not auto-captured from builder",
        current_status: "OPEN",
        resolution_needed: true,
        kernel_status: kernelData.health?.status || 'unknown',
        control_plane_status: cpData.status || 'unknown',
        builds_today: cpData.build?.builds_today || 0,
        checked_at: new Date().toISOString()
    };
}