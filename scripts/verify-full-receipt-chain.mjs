/**
 * SYNOPSIS: Exports runFullReceiptChainVerification — scripts/verify-full-receipt-chain.mjs.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Safely fetches JSON from a given URL, handling network errors and non-OK responses.
 * Returns a specified default value on failure, logging the error.
 * @param {string} url - The URL to fetch.
 * @param {object} [options={}] - Fetch options (e.g., headers).
 * @param {object} [defaultValue={}] - The value to return if fetching or parsing fails.
 * @returns {Promise<object>} The fetched JSON data or the default value.
 */
async function safeFetchJson(url, options = {}, defaultValue = {}) {
    try {
        const response = await fetch(url, options);
        // Check if the HTTP response status is not OK (e.g., 404, 500)
        if (!response.ok) {
            console.error(`Failed to fetch data from ${url}: HTTP Status ${response.status} ${response.statusText}`);
            return defaultValue; // Return default on non-OK HTTP status
        }
        // Attempt to parse the response body as JSON
        return await response.json();
    } catch (error) {
        // Catch network errors or JSON parsing errors
        console.error(`An error occurred during fetch or JSON parsing for ${url}:`, error);
        return defaultValue; // Return default on error
    }
}

/**
 * Verifies the full receipt chain by checking the health of Kernel and Control Plane,
 * and the status of kernel verification.
 * @param {object} params - The parameters for verification.
 * @param {string} params.baseUrl - The base URL for the API endpoints.
 * @param {string} params.commandKey - The command key for authentication with kernel verification.
 * @returns {Promise<object>} An object containing the aggregated verification results.
 */
export async function runFullReceiptChainVerification({ baseUrl, commandKey }) {
    // Construct the full URLs for each required API endpoint
    const kernelHealthUrl = new URL('/api/v1/kernel/health', baseUrl).toString();
    const cpHealthUrl = new URL('/api/v1/builderos/control-plane/health', baseUrl).toString();
    const kernelVerifyUrl = new URL('/api/v1/kernel/verify', baseUrl).toString();

    // Execute all fetch requests concurrently using Promise.all
    // Each fetch uses safeFetchJson to handle errors and provide default structures
    const [kernelHealth, cpHealth, kernelVerify] = await Promise.all([
        safeFetchJson(kernelHealthUrl, {}, { health: { status: 'unknown', token_accounting: { status: 'unknown' } } }),
        safeFetchJson(cpHealthUrl, {}, { status: 'unknown', build: { builds_today: 0, without_proof: 0 } }),
        safeFetchJson(kernelVerifyUrl, { headers: { 'x-command-key': commandKey } }, { status: 'UNKNOWN' })
    ]);

    // Extract and compute necessary status flags and values
    const kernelVerifyPass = kernelVerify.status === 'PASS';
    const withoutProof = cpHealth.build?.without_proof || 0;

    // Return the aggregated status object as per specification
    return {
        ok: true, // Indicates the verification process itself completed successfully
        kernel_verify_pass: kernelVerifyPass,
        kernel_status: kernelHealth.health?.status || 'unknown',
        token_accounting_status: kernelHealth.health?.token_accounting?.status || 'unknown',
        control_plane_status: cpHealth.status || 'unknown',
        builds_today: cpHealth.build?.builds_today || 0,
        without_proof: withoutProof,
        receipt_chain_complete: kernelVerifyPass && withoutProof === 0,
        checked_at: new Date().toISOString() // Timestamp of when the check was performed
    };
}