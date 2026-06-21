/**
 * SYNOPSIS: Wraps an async function call in a try-catch block to return a structured result.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
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

/**
 * Wraps an async function call in a try-catch block to return a structured result.
 * @param {function(): Promise<any>} promiseFn - An async function that returns a Promise.
 * @returns {Promise<{ok: true, data: any} | {ok: false, error: string}>}
 */
async function tryCatch(promiseFn) {
  try {
    return { ok: true, data: await promiseFn() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Verifies GAP-006 by checking the health status of Kernel and BuilderOS Control Plane.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key to be used in the 'x-command-key' header.
 * @returns {Promise<object>} A structured JSON object indicating the verification result.
 */
export async function runGAP006GapVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'baseUrl and commandKey are required.' };
  }

  const [kernelHealthResult, controlPlaneHealthResult] = await Promise.all([
    tryCatch(() => fetchJson(baseUrl, '/api/v1/kernel/health', commandKey)),
    tryCatch(() => fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey)),
  ]);

  if (!kernelHealthResult.ok) {
    return { ok: false, error: `Kernel health check failed: ${kernelHealthResult.error}` };
  }

  if (!controlPlaneHealthResult.ok) {
    return { ok: false, error: `Control plane health check failed: ${controlPlaneHealthResult.error}` };
  }

  const kernelData = kernelHealthResult.data;

  return {
    ok: true,
    gap_id: 'GAP-006',
    gap_description: "`metered-ai-call.js` exists but not wired into any bypass path",
    gap_priority: "P1",
    gap_status: "1-day",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString(),
  };
}