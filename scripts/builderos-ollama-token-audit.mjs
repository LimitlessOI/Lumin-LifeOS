/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 *
 * Read-only audit module for summarizing Ollama provider token usage via internal API.
 * This module fetches AI performance data and aggregates token usage specifically for the 'ollama' provider.
 */

// Node.js built-in modules only
import { URL } from 'node:url';

/**
 * Validates required environment variables.
 * @returns {object} An object containing validated environment variables.
 * @throws {Error} If any required environment variable is missing or invalid.
 */
function validateEnv() {
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  const commandCenterKey = process.env.COMMAND_CENTER_KEY;

  if (!publicBaseUrl) {
    throw new Error('Missing required environment variable: PUBLIC_BASE_URL');
  }
  if (!commandCenterKey) {
    throw new Error('Missing required environment variable: COMMAND_CENTER_KEY');
  }

  try {
    new URL(publicBaseUrl); // Validate URL format
  } catch (e) {
    throw new Error(`Invalid PUBLIC_BASE_URL format: ${e.message}`);
  }

  return { publicBaseUrl, commandCenterKey };
}

/**
 * Fetches JSON data from a specified internal API path.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} commandKey - The x-command-key for authentication.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or returns a non-OK status.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const url = new URL(path, baseUrl);
  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': commandKey,
      },
    });
  } catch (error) {
    throw new Error(`Network error fetching ${url.toString()}: ${error.message}`);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status} from ${url.toString()}: ${errorBody}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${url.toString()}: ${error.message}`);
  }
}

/**
 * Shapes an error into a consistent audit result format.
 * @param {Error} error - The error object.
 * @returns {object} A structured error audit result.
 */
function shapeError(error) {
  return {
    ok: false,
    summary: `Audit failed: ${error.message}`,
    generated_at: new Date().toISOString(),
    error_details: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  };
}

/**
 * Runs a read-only audit to summarize Ollama provider token usage.
 * It fetches AI performance data and aggregates token counts for the 'ollama' provider.
 * @returns {Promise<object>} A structured JSON object with audit results.
 */
export async function runAudit() {
  try {
    const { publicBaseUrl, commandCenterKey } = validateEnv();

    const performanceData = await fetchJson(
      publicBaseUrl,
      '/api/v1/lifeos/admin/ai/performance', // Assumed endpoint for AI performance metrics
      commandCenterKey
    );

    let totalOllamaInputTokens = 0;
    let totalOllamaOutputTokens = 0;
    let ollamaUsageRecords = 0;

    if (Array.isArray(performanceData)) {
      for (const record of performanceData) {
        // Assuming each record has a 'provider' field and 'input_tokens', 'output_tokens'
        if (record.provider === 'ollama') {
          totalOllamaInputTokens += record.input_tokens || 0;
          totalOllamaOutputTokens += record.output_tokens || 0;
          ollamaUsageRecords++;
        }
      }
    } else {
      // Log a warning if the API response structure is not as expected
      console.warn('API /api/v1/lifeos/admin/ai/performance did not return an array. Processing skipped.');
    }

    const totalOllamaTokens = totalOllamaInputTokens + totalOllamaOutputTokens;

    return {
      ok: true,
      summary: `Ollama token usage audit completed. Found ${ollamaUsageRecords} Ollama usage records.`,
      generated_at: new Date().toISOString(),
      details: {
        ollama: {
          total_input_tokens: totalOllamaInputTokens,
          total_output_tokens: totalOllamaOutputTokens,
          total_tokens: totalOllamaTokens,
          usage_records_count: ollamaUsageRecords,
        },
      },
    };
  } catch (error) {
    return shapeError(error);
  }
}