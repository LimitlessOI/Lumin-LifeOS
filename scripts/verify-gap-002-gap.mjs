/**
 * SYNOPSIS: A utility to wrap an async promise in a tryCatch block, returning a structured result.
 * A utility to wrap an async promise in a tryCatch block, returning a structured result.
 * @param {Promise<any>} promise The promise to execute.
 * @returns {Promise<{ok: true, data: any} | {ok: false, error: string}>}
 */
const tryCatch = async (promise) => {
  try {
    const data = await promise;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};

/**
 * Fetches JSON data from a specified URL path with an x-command-key header.
 * @param {string} baseUrl The base URL for the API.
 * @param {string} path The apiEP path.
 * @param {string} commandKey The value for the x-command-key header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
const fetchJson = async (baseUrl, path, commandKey) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'x-command-key': commandKey,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
  }
  return response.json();
};

/**
 * Runs the GAP-002 verification by checking health endpoints of Kernel and BuilderOS Control Plane.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<{ok: boolean, error?: string, gap_id?: string, gap_description?: string, gap_priority?: string, gap_status?: string, resolution_required?: boolean, kernel_status?: string, token_accounting?: string, checked_at?: string}>}
 */
export async function runGAP002GapVerification({ baseUrl, commandKey }) {
  const kernelHealthPromise = fetchJson(baseUrl, '/api/v1/kernel/health', commandKey);
  const controlPlaneHealthPromise = fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey);

  const [kernelResult, controlPlaneResult] = await Promise.all([
    tryCatch(kernelHealthPromise),
    tryCatch(controlPlaneHealthPromise),
  ]);

  if (!kernelResult.ok || !controlPlaneResult.ok) {
    const errors = [];
    if (!kernelResult.ok) errors.push(`Kernel health check failed: ${kernelResult.error}`);
    if (!controlPlaneResult.ok) errors.push(`Control plane health check failed: ${controlPlaneResult.error}`);
    return { ok: false, error: errors.join('; ') };
  }

  const kernelData = kernelResult.data;

  return {
    ok: true,
    gap_id: 'GAP-002',
    gap_description: "No unified Decision Ledger — kernel authority stub only",
    gap_priority: "P0",
    gap_status: "foundational",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString(),
  };
}