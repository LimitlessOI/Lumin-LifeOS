/**
 * SYNOPSIS: A utility function to wrap an async promise in a try-catch block,
 */
async function fetchJson(baseUrl, path, commandKey) {
  const url = new URL(path, baseUrl).toString();
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
 * A utility function to wrap an async promise in a try-catch block,
 * returning an array [error, result].
 * @param {Promise<any>} promise - The promise to execute.
 * @returns {Promise<[Error | null, any | null]>} An array containing either an error or the result.
 */
async function tryCatch(promise) {
  try {
    const result = await promise;
    return [null, result];
  } catch (e) {
    return [e, null];
  }
}

/**
 * Verifies GAP-003 by fetching health statuses from Kernel and BuilderOS Control Plane.
 * @param {object} params - The parameters for verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key to be used in the x-command-key header.
 * @returns {Promise<object>} An object indicating the verification status and relevant data.
 */
export async function runGAP003GapVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'Missing baseUrl or commandKey' };
  }

  const [error, results] = await tryCatch(
    Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ])
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  const [kernelData] = results; // controlPlaneData is fetched but not used in the return object per spec.

  return {
    ok: true,
    gap_id: 'GAP-003',
    gap_description: "Live build receipt — C2 job `da7e9c4d` + `1cf7aa3f` both committed; `oil.verified: true`, `token",
    gap_priority: "P0",
    gap_status: "1-day",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString(),
  };
}