/**
 * SYNOPSIS: This script provides functionality to verify the status of the Kernel
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 *
 * This script provides functionality to verify the status of the Kernel
 * by fetching its health endpoint. It is designed to be part of the
 * LifeOS platform's operational tooling, ensuring the core services
 * are responsive and healthy.
 *
 * It uses Node.js built-in capabilities for HTTP requests and does not
 * rely on any external npm packages, adhering to the platform's
 * strict dependency management policies. This module leverages the
 * global `fetch` API available in modern Node.js environments for
 * making network requests.
 */

// Define constants for API paths and headers to improve readability and maintainability.
const KERNEL_HEALTH_PATH = '/api/v1/kernel/health';
const COMMAND_KEY_HEADER = 'x-command-key';
const CONTENT_TYPE_HEADER = 'Content-Type';
const APPLICATION_JSON = 'application/json';

/**
 * A simple utility function to make an HTTP GET request.
 * This function encapsulates the fetch logic, including setting headers
 * and parsing the JSON response. It handles basic network errors and
 * non-2xx HTTP statuses by throwing an error, which should be caught
 * by the caller to manage the outcome.
 *
 * @param {string} url - The full URL to make the request to.
 * @param {Object<string, string>} headers - An object containing HTTP headers.
 * @returns {Promise<Object>} A promise that resolves with the JSON response body.
 * @throws {Error} If the network request fails, the server responds with a non-2xx status,
 *   or the response body cannot be parsed as JSON.
 */
async function makeGetRequest(url, headers) {
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        // Explicitly setting Content-Type for consistency, though not strictly
        // necessary for a GET request without a body.
        [CONTENT_TYPE_HEADER]: APPLICATION_JSON,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    // Log the error for debugging purposes before re-throwing.
    console.error(`[makeGetRequest] Failed to fetch ${url}:`, error.message);
    throw error; // Re-throw to be caught by the calling function.
  }
}

/**
 * Verifies the Oil Receipt Chain by checking the Kernel's health endpoint.
 * This function constructs the request URL, adds the necessary command key header,
 * and processes the response to determine the Kernel's operational status.
 * As per specification, the 'ok' field in the return object is always true,
 * with actual operational status or error details conveyed via 'kernel_status'.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.baseUrl - The base URL of the Kernel API (e.g., "https://kernel.lifeos.com").
 * @param {string} params.commandKey - The command key for authentication.
 * @returns {Promise<{ok: boolean, kernel_status: string, checked_at: string}>}
 *   A promise that resolves to an object containing the fixed 'ok: true' status,
 *   the kernel's operational status (or an error message), and the timestamp of the check.
 */
export async function runOilReceiptChainProof({ baseUrl, commandKey }) {
  const checked_at = new Date().toISOString();
  let kernel_status = 'unknown';
  // As per the specification, the 'ok' field in the return object is always true.
  const ok = true;

  try {
    // Construct the full URL for the health endpoint.
    const requestUrl = `${baseUrl}${KERNEL_HEALTH_PATH}`;
    // Prepare headers, including the mandatory command key.
    const headers = {
      [COMMAND_KEY_HEADER]: commandKey,
    };

    // Execute the GET request using the helper function.
    const data = await makeGetRequest(requestUrl, headers);

    // Extract the kernel status from the response data, handling different possible paths.
    kernel_status = data.health?.status || data.status || 'unknown';
  } catch (error) {
    // If any error occurs during the fetch operation or JSON parsing,
    // capture the error message in the kernel_status.
    // The 'ok' field remains true as per the literal instruction.
    kernel_status = `error: ${error.message}`;
    console.error(`[runOilReceiptChainProof] Oil Receipt Chain Proof failed: ${error.message}`);
  }

  // Return the structured result object.
  return {
    ok, // Always true as per specification.
    kernel_status,
    checked_at,
  };
}