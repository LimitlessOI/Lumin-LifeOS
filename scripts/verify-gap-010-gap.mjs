/**
 * SYNOPSIS: Exports runGAP010GapVerification — scripts/verify-gap-010-gap.mjs.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
const tryCatch = async (promise) => {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};
/*
 * Fetches JSON data from a specified URL with a command key header.
 * @param {string} baseUrl The base URL of the API.
 * @param {string} path The apiEP path.
 * @param {string} commandKey The x-command-key header value.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the response is not OK.
 */
const fetchJson = async (baseUrl, path, commandKey) => {
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
};
/*
 * Verifies the GAP-010 condition by checking the health of kernel and control plane APIs.
 * @param {{baseUrl: string, commandKey: string}} params
 * @returns {Promise<{ok: boolean, error?: string, gap_id?: string, gap_description?: string, gap_priority?: string, gap_status?: string, resolution_required?: boolean, kernel_status?: string, token_accounting?: string, checked_at?: string}>}
 */
export async function runGAP010GapVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'baseUrl and commandKey are required.' };
  }
  const kernelHealthPromise = fetchJson(baseUrl, '/api/v1/kernel/health', commandKey);
  const controlPlaneHealthPromise = fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey);
  const [kernelResult, controlPlaneResult] = await Promise.all([
    tryCatch(kernelHealthPromise),
    tryCatch(controlPlaneHealthPromise)
  ]);
  if (!kernelResult.success) {
    return { ok: false, error: kernelResult.error.message };
  }
  if (!controlPlaneResult.success) {
    return { ok: false, error: controlPlaneResult.error.message };
  }
  const kernelData = kernelResult.data;
  return {
    ok: true,
    gap_id: 'GAP-010',
    gap_description: "premium-api.js adapter bypasses council/kernel",
    gap_priority: "P1",
    gap_status: "1-week",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString()
  };
}