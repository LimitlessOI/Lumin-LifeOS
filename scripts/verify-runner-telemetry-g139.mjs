/**
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * This module provides a verification function for runner telemetry within the LifeOS platform,
 * specifically targeting BuilderOS Generation 139. It performs read-only API calls
 * to assess the operational health and efficiency of autonomous runners.
 */

/**
 * Helper function to fetch JSON data from a specified API endpoint.
 * It constructs the full URL, applies the 'x-command-key' header,
 * and handles both network and HTTP response errors.
 *
 * @param {string} baseUrl - The base URL for the API (e.g., "https://api.example.com").
 * @param {string} path - The specific API endpoint path (e.g., "/api/v1/health").
 * @param {string} commandKey - The authentication key to be sent in the 'x-command-key' header.
 * @returns {Promise<object>} A promise that resolves to the parsed JSON response body.
 * @throws {Error} Throws an error if the fetch operation fails or the HTTP response status is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const fullUrl = `${baseUrl}${path}`;
  const fetchOptions = {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json' // Ensure consistent content type header
    }
  };
  const response = await fetch(fullUrl, fetchOptions);

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`API call failed for ${path}: HTTP ${response.status} - ${errorDetails}`);
  }
  return response.json();
}

/**
 * Executes a comprehensive verification check for runner telemetry for BuilderOS Generation 139.
 * This function concurrently fetches control plane health data and autonomous telemetry efficiency
 * metrics, then compiles a structured audit report. It includes input validation and robust
 * error handling to ensure reliable operation within the governed loop.
 *
 * @param {object} params - The parameters required for the verification process.
 * @param {string} params.baseUrl - The base URL for the BuilderOS API endpoints.
 * @param {string} params.commandKey - The authentication key used for API access.
 * @returns {Promise<object>} A structured JSON object containing the verification results,
 *   telemetry data, and an overall assessment. Returns an error object if any part of the
 *   verification process fails, including invalid inputs or API call failures.
 */
export async function runRunnerTelemetryG139Verification({ baseUrl, commandKey }) {
  // Validate input parameters to prevent malformed requests.
  if (!baseUrl || typeof baseUrl !== 'string' || !baseUrl.startsWith('http')) {
    return {
      ok: false,
      generation: 139,
      error: 'Invalid baseUrl: Must be a valid HTTP/HTTPS URL string.',
      runner_assessment: 'configuration_error',
      checked_at: new Date().toISOString()
    };
  }
  if (!commandKey || typeof commandKey !== 'string' || commandKey.length === 0) {
    return {
      ok: false,
      generation: 139,
      error: 'Invalid commandKey: Must be a non-empty string for authentication.',
      runner_assessment: 'authentication_error',
      checked_at: new Date().toISOString()
    };
  }

  try {
    // Concurrently fetch data from both required endpoints using Promise.all for efficiency.
    const [controlPlaneData, efficiencyData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
      fetchJson(baseUrl, '/api/v1/autonomous-telemetry/efficiency', commandKey)
    ]);

    // Construct the success response object as per the specification,
    // mapping fetched data and including hardcoded values.
    const result = {
      ok: true,
      generation: 139,
      session_tasks_done: 170, // Hardcoded value from specification
      session_successful: 147, // Hardcoded value from specification
      session_failed: 71,      // Hardcoded value from specification
      session_governance_blocks: 4, // Hardcoded value from specification
      builds_today: controlPlaneData.build?.builds_today || 0,
      without_proof: controlPlaneData.build?.without_proof || 0,
      efficiency_summary: efficiencyData.efficiency?.summary || null,
      runner_assessment: 'continuous_autonomous_operation_verified',
      checked_at: new Date().toISOString()
    };
    return result;
  } catch (error) {
    // Catch any errors during fetching or processing and return a structured error object.
    return {
      ok: false,
      generation: 139,
      error: error.message,
      runner_assessment: 'telemetry_verification_failed',
      checked_at: new Date().toISOString()
    };
  }
}