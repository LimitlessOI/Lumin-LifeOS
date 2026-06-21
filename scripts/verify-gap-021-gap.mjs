/**
 * SYNOPSIS: Exports runGAP021GapVerification — scripts/verify-gap-021-gap.mjs.
 */
/*
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * This script verifies the status of GAP-021 by checking the health endpoints
 * of the Kernel and BuilderOS Control Plane.
 * GAP-021: Am 44 vs Am 46 supremacy text unresolved in amendments (kernel orchestrates — doc only)
 */

/*
 * A simple utility to wrap an asyncFn call in a tryCatch block.
 * @param {Function} promiseFn The asyncFn to execute.
 * @returns {Promise<{data: any, error: Error | null}>} An object containing either data or an error.
 */
async function tryCatch(promiseFn) {
  try {
    const data = await promiseFn();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

/*
 * Fetches JSON data from a specified path relative to a base URL.
 * @param {string} baseUrl The base URL for the API.
 * @param {string} path The apiEP path.
 * @param {string} commandKey The x-command-key header value.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const url = new URL(path, baseUrl);
  const response = await fetch(url.toString(), {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }
  return response.json();
}

/*
 * Runs the verification for GAP-021 by checking Kernel and BuilderOS Control Plane health.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls (e.g., 'http://localhost:3000').
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} A structured JSON object indicating the verification result.
 */
export async function runGAP021GapVerification({ baseUrl, commandKey }) {
  const { data: [kernelData, controlPlaneData], error } = await tryCatch(async () => {
    return Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ]);
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    gap_id: 'GAP-021',
    gap_description: "Am 44 vs Am 46 supremacy text unresolved in amendments (kernel orchestrates — doc only)",
    gap_priority: "P2",
    gap_status: "1-day",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString(),
  };
}