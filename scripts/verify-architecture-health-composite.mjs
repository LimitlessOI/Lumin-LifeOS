/**
 * SYNOPSIS: Exports runArchitectureHealthComposite — scripts/verify-architecture-health-composite.mjs.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * Fetches health status from a given URL with a command key header.
 * @param {string} url - The URL to fetch.
 * @param {string} commandKey - The x-command-key header value.
 * @returns {Promise<object>} The JSON response or an error object.
 */
async function fetchHealth(url, commandKey) {
    try {
        const response = await fetch(url, {
            headers: {
                'x-command-key': commandKey,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            console.error(`HTTP error fetching ${url}: ${response.status} ${response.statusText}`);
            return { status: 'RED' }; // Treat non-OK HTTP as RED
        }
        return await response.json();
    } catch (error) {
        console.error(`Network error fetching ${url}:`, error.message);
        return { status: 'RED' }; // Treat network errors as RED
    }
}

/**
 * Computes a score based on a given status string.
 * @param {string | boolean | undefined} status - The status string (e.g., 'GREEN', 'YELLOW', 'RED') or boolean.
 * @returns {number} The score for the status.
 */
function getStatusScore(status) {
    if (status === 'GREEN') return 33;
    if (status === 'YELLOW') return 17;
    return 0; // Covers 'RED', undefined, null, or boolean true/false
}

/**
 * Runs a composite architecture health check.
 * @param {object} params - Parameters for the health check.
 * @param {string} params.baseUrl - The base URL for API endpoints.
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<object>} An object containing the composite health status and score.
 */
export async function runArchitectureHealthComposite({ baseUrl, commandKey }) {
    const kernelUrl = `${baseUrl}/api/v1/kernel/health`;
    const controlPlaneUrl = `${baseUrl}/api/v1/builderos/control-plane/health`;
    const tokensUrl = `${baseUrl}/api/v1/tokens/unified/health`;

    const [kernelHealth, cpHealth, tokenHealth] = await Promise.all([
        fetchHealth(kernelUrl, commandKey),
        fetchHealth(controlPlaneUrl, commandKey),
        fetchHealth(tokensUrl, commandKey)
    ]);

    let score = 0;

    const kernel_status = kernelHealth.health?.status;
    score += getStatusScore(kernel_status);

    const control_plane_status = cpHealth.status;
    score += getStatusScore(control_plane_status);

    const token_accounting_status = tokenHealth.token_accounting?.status || (tokenHealth.tracking_active ? 'GREEN' : 'RED');
    score += getStatusScore(token_accounting_status);

    let composite_grade = 'RED';
    if (score >= 80) {
        composite_grade = 'GREEN';
    } else if (score >= 40) {
        composite_grade = 'YELLOW';
    }

    return {
        ok: true,
        kernel_status,
        control_plane_status,
        token_accounting_status,
        composite_score: score,
        composite_grade,
        top_gaps: [
            'GAP-001: builder-council-review bypass P0',
            'GAP-002: No Decision Ledger',
            'OC-015: proof_status always exception'
        ],
        checked_at: new Date().toISOString()
    };
}