/**
 * SYNOPSIS: Exports runGAP017GapVerification — scripts/verify-gap-017-gap.mjs.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * Helper function to fetch JSON data from a given URL path.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The x-command-key header value.
 * @returns {Promise<object>} The JSON response data.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
    const url = `${baseUrl}${path}`;
    const headers = { 'x-command-key': commandKey, 'Content-Type': 'application/json' };
    const response = await fetch(url, { headers });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    return response.json();
}

/**
 * Verifies GAP-017: Founder decision chain missing — SSOT receipts not queryable as ledger.
 * Checks the health status of Kernel and BuilderOS Control Plane.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the apiEPs.
 * @param {string} params.commandKey - The command key for auth (x-command-key header).
 * @returns {Promise<object>} An audit result object indicating success or failure and relevant GAP details.
 */
export async function runGAP017GapVerification({ baseUrl, commandKey }) {
    try {
        const [kernelData] = await Promise.all([
            fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
            fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey) // Fetched as per spec, but not directly used in the success return object.
        ]);

        return {
            ok: true,
            gap_id: 'GAP-017',
            gap_description: "Founder decision chain missing — SSOT receipts not queryable as ledger",
            gap_priority: "P0",
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