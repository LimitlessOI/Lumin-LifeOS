/**
 * SYNOPSIS: This module fetches manifest data from the LifeOS platform via internal APIs and performs
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * @file scripts/builderos-governance-manifest-audit.mjs
 * @module builderos-governance-manifest-audit
 * @description Zone 1 read-only audit module for reporting AMENDMENT manifest.json validation counts.
 * This module fetches manifest data from the LifeOS platform via internal APIs and performs
 * structural validation, returning counts of valid and invalid entries.
 */

/**
 * Validates required environment variables.
 * @returns {{PUBLIC_BASE_URL: string, COMMAND_CENTER_KEY: string}} The validated environment variables.
 * @throws {Error} If any required environment variable is not set.
 */
function validateEnv() {
  const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
  const COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY;

  if (!PUBLIC_BASE_URL) {
    throw new Error('Environment variable PUBLIC_BASE_URL is not set.');
  }
  if (!COMMAND_CENTER_KEY) {
    throw new Error('Environment variable COMMAND_CENTER_KEY is not set.');
  }
  return { PUBLIC_BASE_URL, COMMAND_CENTER_KEY };
}

/**
 * Creates a structured error response for audit failures.
 * @param {string} message - A concise error message.
 * @param {object} [details={}] - Additional details about the error.
 * @returns {object} A structured JSON object representing the audit failure.
 */
function createErrorResponse(message, details = {}) {
  return {
    ok: false,
    summary: `Audit failed: ${message}`,
    generated_at: new Date().toISOString(),
    details: {
      error: message,
      ...details,
    },
  };
}

/**
 * Fetches JSON data from a specified URL using the provided command key.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} key - The x-command-key for authentication.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or returns a non-OK status.
 */
async function fetchJson(baseUrl, path, key) {
  const url = new URL(path, baseUrl).toString();
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': key,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch from ${url}: ${error.message}`);
  }
}

/**
 * Performs basic structural validation on an individual amendment entry.
 * @param {object} amendment - The amendment object to validate.
 * @returns {{ok: boolean, reason?: string}} Validation result.
 */
function validateAmendmentEntry(amendment) {
  if (typeof amendment !== 'object' || amendment === null) {
    return { ok: false, reason: 'Entry is not an object.' };
  }
  if (typeof amendment.id !== 'string' || amendment.id.trim() === '') {
    return { ok: false, reason: 'Missing or invalid "id" property (must be non-empty string).' };
  }
  if (typeof amendment.name !== 'string' || amendment.name.trim() === '') {
    return { ok: false, reason: 'Missing or invalid "name" property (must be non-empty string).' };
  }
  const validStatuses = ['pending', 'approved', 'rejected', 'draft']; // Added 'draft' as a common status
  if (typeof amendment.status !== 'string' || !validStatuses.includes(amendment.status.toLowerCase())) {
    return { ok: false, reason: `Missing or invalid "status" property (must be one of: ${validStatuses.join(', ')}).` };
  }
  return { ok: true };
}

/**
 * Executes a read-only audit of amendment manifest validation counts.
 * Fetches amendment manifest data from the LifeOS platform and validates each entry,
 * returning counts of valid and invalid amendments.
 * @returns {Promise<object>} A structured JSON object containing the audit results.
 */
export async function runAudit() {
  try {
    const { PUBLIC_BASE_URL, COMMAND_CENTER_KEY } = validateEnv();

    // Inferred API path for amendment manifests based on task description
    const manifestApiPath = '/api/v1/lifeos/admin/manifests/amendments';
    const manifestData = await fetchJson(PUBLIC_BASE_URL, manifestApiPath, COMMAND_CENTER_KEY);

    if (!manifestData || !Array.isArray(manifestData.amendments)) {
      return createErrorResponse(
        'Manifest data is malformed or missing the expected "amendments" array.',
        { manifestDataReceived: manifestData }
      );
    }

    let validCount = 0;
    let invalidCount = 0;
    const invalidEntriesDetails = [];

    for (const amendment of manifestData.amendments) {
      const validationResult = validateAmendmentEntry(amendment);
      if (validationResult.ok) {
        validCount++;
      } else {
        invalidCount++;
        invalidEntriesDetails.push({
          amendment_data: amendment,
          validation_reason: validationResult.reason,
        });
      }
    }

    const totalEntries = validCount + invalidCount;
    const auditSummary = `Processed ${totalEntries} amendment entries. ${validCount} valid, ${invalidCount} invalid.`;

    return {
      ok: invalidCount === 0,
      summary: auditSummary,
      generated_at: new Date().toISOString(),
      details: {
        total_amendments_audited: totalEntries,
        valid_amendments_count: validCount,
        invalid_amendments_count: invalidCount,
        invalid_amendment_details: invalidEntriesDetails,
        manifest_source_api_path: manifestApiPath,
      },
    };

  } catch (error) {
    return createErrorResponse(error.message, { stack: error.stack });
  }
}