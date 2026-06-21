/**
 * SYNOPSIS: This module provides a read-only audit function to fetch autonomous telemetry metrics
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * This module provides a read-only audit function to fetch autonomous telemetry metrics
 * summary via the internal LifeOS API. It operates within Zone 1 constraints,
 * using Node.js built-in fetch and environment variables for configuration.
 */

// Node.js built-in URL for URL manipulation
import { URL } from 'node:url';

/**
 * Validates required environment variables.
 * @returns {object} An object containing validated environment variables.
 * @throws {Error} If any required environment variable is missing.
 */
function validateEnv() {
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  const commandCenterKey = process.env.COMMAND_CENTER_KEY;

  if (!publicBaseUrl) {
    throw new Error('Environment variable PUBLIC_BASE_URL is not set.');
  }
  if (!commandCenterKey) {
    throw new Error('Environment variable COMMAND_CENTER_KEY is not set.');
  }

  return { publicBaseUrl, commandCenterKey };
}

/**
 * Fetches JSON data from a specified internal API path.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} key - The x-command-key for authentication.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or returns a non-OK status.
 */
async function fetchJson(baseUrl, path, key) {
  const url = new URL(path, baseUrl);
  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': key,
      },
    });
  } catch (networkError) {
    throw new Error(`Network error fetching ${url.toString()}: ${networkError.message}`);
  }

  if (!response.ok) {
    let errorBody = 'No response body';
    try {
      errorBody = await response.text();
    } catch (e) {
      // Ignore error if body can't be read
    }
    throw new Error(`API request to ${url.toString()} failed with status ${response.status}: ${errorBody}`);
  }

  try {
    return await response.json();
  } catch (jsonError) {
    throw new Error(`Failed to parse JSON from ${url.toString()}: ${jsonError.message}`);
  }
}

/**
 * Executes a read-only audit to fetch autonomous telemetry metrics summary.
 * @returns {Promise<object>} A structured JSON object with audit results.
 */
export async function runAudit() {
  const generated_at = new Date().toISOString();
  try {
    const { publicBaseUrl, commandCenterKey } = validateEnv();
    const apiPath = '/api/v1/lifeos/autonomous-telemetry/metrics';

    const metricsData = await fetchJson(publicBaseUrl, apiPath, commandCenterKey);

    return {
      ok: true,
      summary: {
        message: 'Successfully fetched autonomous telemetry metrics.',
        metrics: metricsData,
      },
      generated_at,
    };
  } catch (error) {
    return {
      ok: false,
      summary: {
        message: `Failed to perform autonomous telemetry metrics audit: ${error.message}`,
        error_details: error.stack,
      },
      generated_at,
    };
  }
}