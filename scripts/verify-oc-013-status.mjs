/**
 * SYNOPSIS: Fetches JSON data from a specified API endpoint.
 * Fetches JSON data from a specified API endpoint.
 * Handles constructing the URL and setting necessary headers.
 * @param {string} baseUrl - The base URL of the API.
 * @param {string} path - The specific API path to fetch.
 * @param {string} commandKey - The command key for authentication.
 * @returns {Promise<object>} A promise that resolves to the JSON response data.
 * @throws {Error} If the network request fails or the HTTP response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  // Construct the full URL for the API request.
  const requestUrl = `${baseUrl}${path}`;
  // Define the headers for the fetch request, including the command key.
  const requestHeaders = {
    'x-command-key': commandKey,
    'Content-Type': 'application/json', // Indicate expected content type
  };

  // Execute the fetch request.
  const response = await fetch(requestUrl, {
    headers: requestHeaders,
  });

  // Check if the HTTP response was successful.
  if (!response.ok) {
    // If not successful, read the response body for more error details.
    const errorBody = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
  }

  // Parse the successful response as JSON.
  return response.json();
}

/**
 * Verifies the status of OC-013 by checking kernel and control plane health.
 * This function fetches health data from two distinct API endpoints concurrently.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key to be used in 'x-command-key' header.
 * @returns {Promise<object>} An object indicating the verification status and details.
 *   On success: { ok: true, ...status_details }
 *   On failure: { ok: false, error: string }
 */
export async function runOC013StatusVerification({ baseUrl, commandKey }) {
  try {
    // Execute both health checks concurrently using Promise.all.
    const [kernelData, cpData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ]);

    // Return success status with detailed information extracted from responses.
    return {
      ok: true,
      contradiction_id: 'OC-013',
      title: "`routes/tsos-task-ledger-routes.js` not mounted",
      current_status: "OPEN",
      resolution_needed: true,
      kernel_status: kernelData.health?.status || 'unknown',
      control_plane_status: cpData.status || 'unknown',
      builds_today: cpData.build?.builds_today || 0,
      checked_at: new Date().toISOString(),
    };
  } catch (e) {
    // Catch any errors during fetching or processing and return a failure object.
    return { ok: false, error: e.message };
  }
}