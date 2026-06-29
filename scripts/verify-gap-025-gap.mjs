/**
 * SYNOPSIS: Exports runGAP025GapVerification — scripts/verify-gap-025-gap.mjs.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Helper function to fetch JSON data from a specified URL with a command key header.
 * Throws an error if the fetch operation fails or the response is not OK.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} commandKey - The value for the 'x-command-key' header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the server responds with a non-OK status.
 */
async function fetchJson(baseUrl, path, commandKey) {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
        headers: {
            'x-command-key': commandKey,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    return response.json();
}

/**
 * Verifies GAP-025 by checking the health endpoints of the Kernel and BuilderOS Control Plane.
 * This gap relates to the absence of a composite architectural health score for the Adam-facing dashboard.
 * @param {object} params - The parameters for verification.
 * @param {string} params.baseUrl - The base URL for API requests (e.g., "http://localhost:3000").
 * @param {string} params.commandKey - The command key for authentication, passed as 'x-command-key' header.
 * @returns {Promise<object>} An object indicating the verification status and details of the GAP.
 */
export async function runGAP025GapVerification({ baseUrl, commandKey }) {
    if (!baseUrl || !commandKey) {
        return { ok: false, error: 'baseUrl and commandKey are required.' };
    }

    try {
        const [kernelData, controlPlaneData] = await Promise.all([
            fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
            fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey)
        ]);

        // The spec requires specific fields from kernelData for the return object.
        // controlPlaneData is fetched as part of the verification but not directly included in the final return structure.
        return {
            ok: true,
            gap_id: 'GAP-025',
            gap_description: "No architectural health score composite for Adam-facing dashboard",
            gap_priority: "P2",
            gap_status: "foundational",
            resolution_required: true,
            kernel_status: kernelData.health?.status || 'unknown',
            token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
            checked_at: new Date().toISOString()
        };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}