/**
 * SYNOPSIS: Fetches JSON data from a given URL path with a command key header.
 */
/*
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Fetches JSON data from a given URL path with a command key header.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The command key for auth.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
    const url = `${baseUrl}${path}`;
    try {
        const response = await fetch(url, {
            headers: {
                'x-command-key': commandKey,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Path: ${path}, Body: ${errorBody}`);
        }
        return await response.json();
    } catch (error) {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
}

/**
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The command key for auth.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the LifeOS API.
 * @param {string} params.commandKey - The command key for API auth.
 */
export async function runOC003StatusVerification({ baseUrl, commandKey }) {
    if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
        return { ok: false, error: 'Invalid or missing baseUrl parameter.' };
    }
    if (!commandKey || typeof commandKey !== 'string' || commandKey.trim() === '') {
        return { ok: false, error: 'Invalid or missing commandKey parameter.' };
    }
    try {
        const [kernelData, cpData] = await Promise.all([
            fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
            fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey)
        ]);
        return {
            ok: true,
            contradiction_id: 'OC-003',
            title: "`canMarkBuildDone()` not wired into `buildAndCommit()`",
            current_status: "PARTIAL",
            resolution_needed: true,
            kernel_status: kernelData.health?.status || 'unknown',
            control_plane_status: cpData.status || 'unknown',
            builds_today: cpData.build?.builds_today || 0,
            checked_at: new Date().toISOString()
        };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}