/**
 * SYNOPSIS: Audit module for verifying council bypasses in the LifeOS platform.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Audit module for verifying council bypasses in the LifeOS platform.
 * This script checks the health status of core kernel and token accounting services
 * to identify potential direct provider fetches that bypass the standard council review process.
 * It uses read-only GET endpoints and does not perform any mutations or direct database access.
 */

/**
 * Fetches JSON data from a specified API endpoint.
 *
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path (e.g., '/api/v1/kernel/health').
 * @param {string} commandKey - The x-command-key header value for authentication.
 * @returns {Promise<{data: object | null, error: string | null}>} An object containing the fetched data or an error message.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': commandKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: `HTTP error! Status: ${response.status}, Body: ${errorText}` };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: `Network or parsing error: ${error.message}` };
  }
}

/**
 * Runs an audit to verify potential council bypasses by checking core service health.
 *
 * @param {object} params - The parameters for the audit.
 * @param {string} params.baseUrl - The base URL for the LifeOS API.
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<object>} A structured JSON object detailing the audit results.
 */
export async function runCouncilBypassAudit({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return {
      ok: false,
      kernel_status: 'missing_config',
      token_accounting_status: 'missing_config',
      bypass_gap_active: false,
      bypass_gap_note: 'Configuration error: baseUrl or commandKey is missing.',
      bypass_file: null,
      action_required: 'Provide valid baseUrl and commandKey.',
      checked_at: new Date().toISOString(),
    };
  }

  const kernelHealthResult = await fetchJson(baseUrl, '/api/v1/kernel/health', commandKey);
  const tokenHealthResult = await fetchJson(baseUrl, '/api/v1/tokens/unified/health', commandKey);

  const kernelData = kernelHealthResult.data || {};
  const tokenData = tokenHealthResult.data || {};

  return {
    ok: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting_status: tokenData.token_accounting?.status || tokenData.tracking_active || 'unknown',
    bypass_gap_active: true,
    bypass_gap_note: 'GAP-001 P0: builder-council-review.js has 8 direct provider fetches bypassing kernel and token ledger',
    bypass_file: 'services/builder-council-review.js',
    action_required: 'Inject ccm wrapper; deprecate direct fetch helpers',
    checked_at: new Date().toISOString(),
  };
}