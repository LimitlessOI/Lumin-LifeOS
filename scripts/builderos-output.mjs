/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * This module provides read-only audit capabilities for the LifeOS platform.
 * It fetches data from specified internal apiEPs to assess system status
 * and identify potential issues without performing any mutations or direct db access.
 */

/**
 * Validates that a required envVar is set.
 * @param {string} varName The name of the envVar to validate.
 * @returns {string} The value of the envVar.
 * @throws {Error} If the envVar is not set.
 */
function validateEnv(varName) {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`Environment variable ${varName} is not set.`);
  }
  return value;
}

/**
 * Fetches JSON data from a specified URL with an auth key.
 * @param {string} baseUrl The base URL for the API.
 * @param {string} path The API path relative to the base URL.
 * @param {string} key The command key for auth (x-command-key header).
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, key) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        'x-command-key': key,
        'Accept': 'application/json'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Path: ${path}, Response: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch from ${url}: ${error.message}`);
  }
}

/**
 * Shapes an error object for consistent reporting.
 * @param {Error} error The error object.
 * @returns {object} A structured error object.
 */
function shapeError(error) {
  return {
    message: error.message,
    stack: error.stack ? error.stack.split('\n')[0] : 'No stack trace available'
  };
}

/**
 * Runs a read-only audit of the LifeOS system by querying specified apiEPs.
 * @param {string} publicBaseUrl The base URL for public API access.
 * @returns {Promise<object>} A structured JSON object containing the audit results.
 */
export async function runAudit(publicBaseUrl) {
  const generated_at = new Date().toISOString();
  let ok = true;
  const auditResults = {};
  const problems = [];

  try {
    const commandKey = validateEnv('COMMAND_CENTER_KEY');

    // Audit AI Performance endpoint
    try {
      const aiPerformance = await fetchJson(publicBaseUrl, '/api/v1/lifeos/admin/ai/performance', commandKey);
      auditResults.aiPerformance = { status: 'OK', data: aiPerformance };
      if (!aiPerformance || Object.keys(aiPerformance).length === 0) {
        ok = false;
        problems.push('AI Performance data is empty or malformed.');
      }
    } catch (error) {
      ok = false;
      auditResults.aiPerformance = { status: 'ERROR', error: shapeError(error) };
      problems.push(`Failed to retrieve AI Performance: ${error.message}`);
    }

    // Audit Autonomous Telemetry Metrics endpoint
    try {
      const telemetryMetrics = await fetchJson(publicBaseUrl, '/api/v1/lifeos/autonomous-telemetry/metrics', commandKey);
      auditResults.telemetryMetrics = { status: 'OK', data: telemetryMetrics };
      if (!telemetryMetrics || Object.keys(telemetryMetrics).length === 0) {
        ok = false;
        problems.push('Autonomous Telemetry Metrics data is empty or malformed.');
      }
    } catch (error) {
      ok = false;
      auditResults.telemetryMetrics = { status: 'ERROR', error: shapeError(error) };
      problems.push(`Failed to retrieve Autonomous Telemetry Metrics: ${error.message}`);
    }

  } catch (envError) {
    ok = false;
    problems.push(`Environment setup error: ${envError.message}`);
    auditResults.envValidation = { status: 'ERROR', error: shapeError(envError) };
  }

  const summary = problems.length > 0
    ? `Audit completed with ${problems.length} identified problem(s).`
    : 'Audit completed successfully with no immediate problems detected.';

  return {
    ok,
    summary,
    generated_at,
    details: auditResults,
    problems
  };
}