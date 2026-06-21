/**
 * SYNOPSIS: Exports runGAP008GapVerification — scripts/verify-gap-008-gap.mjs.
 */
/*
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * - Verifies GAP-008 by checking the health status of Kernel and BuilderOS Control Plane.
 * - This gap relates to potential bypasses of the useful-work-guard by CI/scheduler AI paths,
 * - indicating an incomplete audit of these critical system components.
 */

/*
 * Fetches JSON data from a specified URL with an x-command-key header.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The value for the x-command-key header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }
  return response.json();
}

/*
 * Executes the GAP-008 verification by fetching health statuses of Kernel and BuilderOS Control Plane.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the apiEPs (e.g., "http://localhost:3000").
 * @param {string} params.commandKey - The x-command-key header value for auth.
 * @returns {Promise<object>} A promise that resolves to an audit result object.
 *   On success: { ok: true, gap_id, gap_description, gap_priority, gap_status, resolution_required, kernel_status, token_accounting, checked_at }
 *   On failure: { ok: false, error: string }
 */
export async function runGAP008GapVerification({ baseUrl, commandKey }) {
  try {
    const [kernelData, controlPlaneData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey)
    ]);

    return {
      ok: true,
      gap_id: 'GAP-008',
      gap_description: "CI / scheduler AI paths may bypass useful-work-guard (audit incomplete)",
      gap_priority: "P1",
      gap_status: "1-week",
      resolution_required: true,
      kernel_status: kernelData.health?.status || 'unknown',
      token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
      checked_at: new Date().toISOString()
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}