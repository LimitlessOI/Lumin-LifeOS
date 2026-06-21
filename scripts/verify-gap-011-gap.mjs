/**
 * SYNOPSIS: A utility function to wrap an async operation in a try-catch block.
 * A utility function to wrap an async operation in a try-catch block.
 * @param {Promise<any>} promise - The promise to execute.
 * @returns {Promise<[Error | null, any | null]>} A promise that resolves to an array
 *   containing either an error and null, or null and the successful result.
 */
const tryCatch = async (promise) => {
  try {
    const result = await promise;
    return [null, result];
  } catch (e) {
    return [e, null];
  }
};

/**
 * Fetches JSON data from a specified URL path.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The x-command-key header value.
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

/**
 * Runs the GAP-011 verification process.
 * Fetches health status from Kernel and BuilderOS Control Plane concurrently.
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for API requests.
 * @param {string} params.commandKey - The command key for auth.
 * @returns {Promise<object>} A promise that resolves to a structured audit JSON object.
 */
export async function runGAP011GapVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'baseUrl and commandKey are required.' };
  }

  const [error, results] = await tryCatch(
    Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey)
    ])
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  const [kernelData, _controlPlaneData] = results; // _controlPlaneData is fetched but not used in the return object as per spec.

  return {
    ok: true,
    gap_id: 'GAP-011',
    gap_description: "Scripts (builder-daemon, build-task, memory-import) unmetered offline AI",
    gap_priority: "P2",
    gap_status: "1-week",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString(),
  };
}