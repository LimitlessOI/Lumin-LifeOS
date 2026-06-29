/**
 * SYNOPSIS: Read-only audit module for summarizing Ollama provider token usage via internal API.
 */
import 'dotenv/config';
import { URL } from 'node:url';
import { Pool } from 'pg';

/**
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Read-only audit module for summarizing Ollama provider token usage via internal API.
 * @throws {Error} If any required envVar is missing or invalid.
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
 * Validates required envVars.
 * @returns {object} An object containing validated envVars.
 * @throws {Error} If any required envVar is missing or invalid.
 */
function validateEnv() {
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  const commandCenterKey = process.env.COMMAND_CENTER_KEY;
  const databaseUrl = process.env.DATABASE_URL; // Added for pg Pool

  if (!publicBaseUrl) {
    throw new Error('Missing required envVar: PUBLIC_BASE_URL');
  }
  if (!commandCenterKey) {
    throw new Error('Missing required envVar: COMMAND_CENTER_KEY');
  }
  if (!databaseUrl) {
    throw new Error('Missing required envVar: DATABASE_URL');
  }

  try {
    new URL(publicBaseUrl); // Validate URL format
  } catch (e) {
    throw new Error(`Invalid PUBLIC_BASE_URL format: ${e.message}`);
  }
  try {
    new URL(databaseUrl); // Validate DATABASE_URL format (though pg Pool handles this)
  } catch (e) {
    // This is a common pattern for DB URLs, but not strictly a web URL.
    // We'll allow it to pass if it's not a valid web URL, as pg handles it.
  }

  return { publicBaseUrl, commandCenterKey, databaseUrl };
}

/**
 * Fetches JSON data from a specified internal API path.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The x-command-key for auth.
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
 * Runs a read-only audit to summarize Ollama provider token usage from the database.
 * This module queries AI performance data from the database and aggregates token usage specifically for the 'ollama' provider.
 * @param {Pool} pool - The PostgreSQL connection pool.
 * @returns {Promise<object>} A structured JSON object with audit results.
 */
export async function runAudit(pool) {
  try {
    // The original validateEnv and fetchJson are no longer used for the core data fetching
    // as the audit now directly queries the database via pg Pool.
    // validateEnv() is still called by main() to ensure DATABASE_URL is present.

    const query = `
      SELECT provider, input_tokens, output_tokens
      FROM ai_performance_metrics
      WHERE provider = 'ollama';
    `;
    const result = await pool.query(query);
    const performanceData = result.rows;

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
      // Log a warning if the DB response structure is not as expected
      console.warn('Database query for ai_performance_metrics did not return an array of records. Processing skipped.');
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

/**
 * Main entry point for the Ollama token audit.
 * Initializes the PostgreSQL connection pool, runs the audit, and cleans up the pool.
 * @returns {Promise<object>} A structured JSON object with audit results or error details.
 */
export async function main() {
  let pool;
  try {
    // Validate environment variables, including DATABASE_URL
    const { databaseUrl } = validateEnv();

    // Initialize pg Pool
    pool = new Pool({
      connectionString: databaseUrl,
    });

    // Run the audit using the pool
    const auditResult = await runAudit(pool);
    return auditResult;
  } catch (error) {
    return shapeError(error);
  } finally {
    if (pool) {
      await pool.end(); // Ensure the pool is closed
    }
  }
}