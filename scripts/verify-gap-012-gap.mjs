/**
 * SYNOPSIS: Fetches JSON data from a given URL path with an x-command-key header.
 * Fetches JSON data from a given URL path with an x-command-key header.
 * @param {string} baseUrl - The base URL of the API.
 * @param {string} path - The apiEP path.
 * @param {string} key - The value for the x-command-key header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, key) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'x-command-key': key
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }
  return response.json();
}

/**
 * Verifies the status of Kernel and BuilderOS Control Plane health endpoints.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the API calls.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} An object indicating the verification result.
 */
export async function runGAP012GapVerification({ baseUrl, commandKey }) {
  try {
    const kernelHealthPromise = fetchJson(baseUrl, '/api/v1/kernel/health', commandKey);
    const controlPlaneHealthPromise = fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey);
    const [kernelData] = await Promise.all([
      kernelHealthPromise,
      controlPlaneHealthPromise // controlPlaneData is fetched but not used in the return object per spec
    ]);
    return {
      ok: true,
      gap_id: 'GAP-012',
      gap_description: "Kernel coverage ~70% — server-internal paths (ciMonitor, autoBuilder) use wrapped council but sc",
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