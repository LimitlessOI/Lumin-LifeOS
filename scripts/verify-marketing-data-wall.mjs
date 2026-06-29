/**
 * SYNOPSIS: The audit is considered successful if no LifeOS imports are found in marketing services.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * @module verify-marketing-data-wall
 * @description This module performs an audit to verify the "data wall" between MarketingOS and LifeOS.
 * The audit is considered successful if no LifeOS imports are found in marketing services.
 */

/**
 * Custom error class for audit-specific issues.
 */
class AuditError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AuditError';
    this.details = details;
  }
}

/**
 * Validates required envVars.
 * @param {string[]} varNames - An array of envVar names to validate.
 * @returns {object} An object containing the validated envVars.
 * @throws {AuditError} If any required envVar is missing.
 */
function validateEnv(varNames) {
  const envVars = {};
  const missingVars = [];
  for (const name of varNames) {
    if (!process.env[name]) {
      missingVars.push(name);
    } else {
      envVars[name] = process.env[name];
    }
  }
  if (missingVars.length > 0) {
    throw new AuditError(`Missing required envVars: ${missingVars.join(', ')}`);
  }
  return envVars;
}

/**
 * Fetches JSON data from a specified URL with an auth key.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The x-command-key for auth.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {AuditError} If the fetch operation fails or returns a non-OK status.
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
      throw new AuditError(`API call failed with status ${response.status} for ${url}`, {
        status: response.status,
        body: errorText,
      });
    }
    return await response.json();
  } catch (error) {
    if (error instanceof AuditError) {
      throw error; // Re-throw our custom error
    }
    throw new AuditError(`Network or parsing error fetching from ${url}: ${error.message}`, {
      originalError: error
    });
  }
}

/**
 * Runs the MarketingOS data wall audit.
 * It checks marketing services for any direct imports or dependencies on LifeOS components.
 * @returns {Promise<object>} A structured JSON object with audit results.
 */
export async function runAudit() {
  const generated_at = new Date().toISOString();
  let ok = true;
  let summary = 'MarketingOS data wall check completed.';
  const findings = [];

  try {
    const { PUBLIC_BASE_URL, COMMAND_CENTER_KEY } = validateEnv([
      'PUBLIC_BASE_URL',
      'COMMAND_CENTER_KEY',
    ]);

    const MARKETING_DEPENDENCIES_PATH = '/api/v1/marketing/service-dependencies';
    const marketingServices = await fetchJson(
      PUBLIC_BASE_URL,
      MARKETING_DEPENDENCIES_PATH,
      COMMAND_CENTER_KEY
    );

    if (!Array.isArray(marketingServices)) {
      throw new AuditError('Expected marketing service dependencies to be an array.');
    }

    for (const service of marketingServices) {
      if (typeof service !== 'object' || service === null || !service.serviceName || !Array.isArray(service.imports)) {
        console.warn('Skipping malformed service entry:', service);
        continue;
      }

      for (const importedModule of service.imports) {
        if (typeof importedModule === 'string' && importedModule.toLowerCase().includes('lifeos')) {
          ok = false;
          findings.push({
            service: service.serviceName,
            importedModule: importedModule,
            message: `Found direct LifeOS import in marketing service '${service.serviceName}'.`,
          });
        }
      }
    }

    if (!ok) {
      summary = 'FAILURE: LifeOS imports found in marketing services.';
    } else {
      summary = 'SUCCESS: No LifeOS imports found in marketing services.';
    }

  } catch (error) {
    ok = false;
    summary = `Audit failed due to an error: ${error.message}`;
    findings.push({
      type: 'error',
      message: error.message,
      details: error instanceof AuditError ? error.details : {},
    });
  }

  return {
    ok,
    summary,
    generated_at,
    findings,
  };
}