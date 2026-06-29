/**
 * SYNOPSIS: Zone 1 audit module for verifying MarketingOS Phase 1 readiness.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Zone 1 audit module for verifying MarketingOS Phase 1 readiness.
 * This script performs a suite of read-only acceptance tests against
 * the MarketingOS and SocialMediaOS APIs to ensure core functionality
 * is available and responsive.
 *
 * It uses Node's built-in fetch and relies on environment variables
 * for API base URL and command key.
 */

// Node built-ins only
import { URL } from 'node:url';

/**
 * Helper function to fetch JSON data from a given URL.
 * @param {string} baseUrl - The base URL of the API.
 * @param {string} path - The API path relative to the base URL.
 * @param {string} commandKey - The x-command-key for authentication.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or returns a non-OK status.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const fullUrl = new URL(path, baseUrl).toString();
  const headers = {
    'Content-Type': 'application/json',
    'x-command-key': commandKey,
  };

  const response = await fetch(fullUrl, { headers });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
  }

  return response.json();
}

/**
 * Validates required environment variables.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} commandKey - The command key for authentication.
 * @returns {object} An object indicating validation status and message.
 */
function validateEnv(baseUrl, commandKey) {
  if (!baseUrl || !commandKey) {
    return {
      ok: false,
      message: 'Missing required environment variables: PUBLIC_BASE_URL and/or COMMAND_CENTER_KEY.',
    };
  }
  try {
    new URL(baseUrl); // Validate if baseUrl is a valid URL
  } catch (e) {
    return {
      ok: false,
      message: `Invalid PUBLIC_BASE_URL: ${e.message}`,
    };
  }
  return { ok: true, message: 'Environment variables are valid.' };
}

/**
 * Shapes an error into a consistent format for audit results.
 * @param {string} testName - The name of the test that failed.
 * @param {Error} error - The error object.
 * @returns {object} An error result object.
 */
function shapeError(testName, error) {
  return {
    test: testName,
    ok: false,
    message: error.message,
    details: error.stack,
  };
}

/**
 * Executes the MarketingOS Phase 1 acceptance test suite.
 * @param {string} [baseUrl=process.env.PUBLIC_BASE_URL] - The base URL for the API.
 * @param {string} [commandKey=process.env.COMMAND_CENTER_KEY] - The command key for authentication.
 * @returns {Promise<object>} Structured audit JSON with ok, summary, and generated_at.
 */
export async function runAudit(
  baseUrl = process.env.PUBLIC_BASE_URL,
  commandKey = process.env.COMMAND_CENTER_KEY
) {
  const auditResults = [];
  let overallOk = true;
  const startTime = new Date();

  const envValidation = validateEnv(baseUrl, commandKey);
  if (!envValidation.ok) {
    auditResults.push({ test: 'Environment Validation', ...envValidation });
    overallOk = false;
    return {
      ok: overallOk,
      summary: 'Audit failed due to environment validation issues.',
      generated_at: startTime.toISOString(),
      results: auditResults,
    };
  }

  // Inferred acceptance tests for MarketingOS / SocialMediaOS Phase 1
  const tests = [
    { name: 'MarketingOS Status Check', path: '/api/v1/marketingos/status', validator: (data) => data && typeof data.status === 'string' },
    { name: 'MarketingOS Configuration Retrieval', path: '/api/v1/marketingos/config', validator: (data) => data && typeof data.version === 'string' },
    { name: 'SocialMediaOS Integrations List', path: '/api/v1/socialmediaos/integrations', validator: (data) => Array.isArray(data) },
    { name: 'SocialMediaOS Upcoming Schedule', path: '/api/v1/socialmediaos/schedule/upcoming', validator: (data) => Array.isArray(data) },
    { name: 'Active Marketing Campaigns', path: '/api/v1/marketingos/campaigns/active', validator: (data) => Array.isArray(data) },
    { name: 'Marketing Analytics Overview', path: '/api/v1/marketingos/analytics/overview', validator: (data) => data && typeof data.total_campaigns === 'number' },
    { name: 'Social Profile Sync Status', path: '/api/v1/socialmediaos/profiles/sync-status', validator: (data) => data && typeof data.last_sync === 'string' },
    { name: 'Audience Segments Retrieval', path: '/api/v1/marketingos/audiences/segments', validator: (data) => Array.isArray(data) },
    { name: 'SocialMediaOS Rate Limits', path: '/api/v1/socialmediaos/rate-limits', validator: (data) => data && typeof data.twitter_remaining === 'number' },
  ];

  for (const test of tests) {
    try {
      const data = await fetchJson(baseUrl, test.path, commandKey);
      const testOk = test.validator(data);
      auditResults.push({
        test: test.name,
        path: test.path,
        ok: testOk,
        message: testOk ? 'Success' : 'Validation failed for response data.',
        response_preview: JSON.stringify(data).substring(0, 200) + (JSON.stringify(data).length > 200 ? '...' : ''),
      });
      if (!testOk) {
        overallOk = false;
      }
    } catch (error) {
      auditResults.push(shapeError(test.name, error));
      overallOk = false;
    }
  }

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const summary = overallOk
    ? `All ${tests.length} MarketingOS Phase 1 acceptance tests passed successfully in ${durationMs}ms.`
    : `Some MarketingOS Phase 1 acceptance tests failed. See details for ${auditResults.filter(r => !r.ok).length} failures.`;

  return {
    ok: overallOk,
    summary: summary,
    generated_at: startTime.toISOString(),
    duration_ms: durationMs,
    results: auditResults,
  };
}