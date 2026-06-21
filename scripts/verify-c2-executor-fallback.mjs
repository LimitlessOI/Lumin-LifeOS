/**
 * SYNOPSIS: Constants for API paths
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

// Constants for API paths
const C2_HALT_API_PATH = '/api/v1/lifeos/builderos/command-control/halt';
const KERNEL_HEALTH_API_PATH = '/api/v1/kernel/health';

/**
 * Performs a GET request to the specified URL with an 'x-command-key' header.
 * Throws an error if the network request fails or the response status is not OK (2xx).
 *
 * @param {string} url - The full URL to fetch.
 * @param {string} commandKey - The value for the 'x-command-key' header.
 * @returns {Promise<object>} The parsed JSON response body.
 * @throws {Error} If the fetch operation fails or the HTTP response is not OK.
 */
async function fetchWithCommandKey(url, commandKey) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-command-key': commandKey,
      'Accept': 'application/json', // Standard practice for API calls
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch ${url}. Status: ${response.status}, Body: ${errorBody}`);
  }

  return response.json();
}

/**
 * Executes a proof to verify the C2 Executor fallback mechanism by checking
 * the command-control halt status and the kernel health.
 *
 * This function fetches data from two API endpoints:
 * 1. GET /api/v1/lifeos/builderos/command-control/halt
 * 2. GET /api/v1/kernel/health
 * Both requests include an 'x-command-key' header for authentication.
 *
 * If both fetches are successful, it returns an object containing the
 * aggregated status. If any fetch fails, the error is propagated.
 *
 * @param {object} params - The parameters for executing the proof.
 * @param {string} params.baseUrl - The base URL for the LifeOS API (e.g., 'https://api.lifeos.com').
 * @param {string} params.commandKey - The command key required for API authentication.
 * @returns {Promise<{ ok: true, c2_halt_active: boolean, kernel_status: string, checked_at: string }>}
 *   An object indicating the success of the check, the C2 halt status,
 *   kernel status, and the timestamp of the check.
 * @throws {Error} If there is a network error or an API returns a non-OK status.
 */
export async function runC2ExecutorFallbackProof({ baseUrl, commandKey }) {
  const checked_at = new Date().toISOString();

  // Construct full URLs for the API endpoints
  const c2HaltUrl = `${baseUrl}${C2_HALT_API_PATH}`;
  const kernelHealthUrl = `${baseUrl}${KERNEL_HEALTH_API_PATH}`;

  // Perform both fetches concurrently to improve efficiency.
  // If any promise in Promise.all rejects, Promise.all itself rejects.
  const [haltData, healthData] = await Promise.all([
    fetchWithCommandKey(c2HaltUrl, commandKey),
    fetchWithCommandKey(kernelHealthUrl, commandKey),
  ]);

  // Extract the specific data points required from the successful responses
  const c2_halt_active = haltData.active;
  const kernel_status = healthData.kernel_status;

  // Return the specified object on successful data retrieval,
  // adhering to the 'ok: true' literal in the specification.
  return {
    ok: true,
    c2_halt_active: c2_halt_active,
    kernel_status: kernel_status,
    checked_at: checked_at,
  };
}