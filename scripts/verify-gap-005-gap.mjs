/**
 * SYNOPSIS: Fetches JSON data from a given URL path with a command key header.
 * Fetches JSON data from a given URL path with a command key header.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The apiEP path.
 * @param {string} commandKey - The x-command-key header value.
 * @returns {Promise<object>} The JSON response data.
 * @throws {Error} If baseUrl or commandKey are missing, or if the fetch request fails.
 */
async function fetchJson(baseUrl, path, commandKey) {
  if (!baseUrl) throw new Error('baseUrl is required for fetchJson.');
  if (!commandKey) throw new Error('commandKey is required for fetchJson.');
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

export async function runGAP005GapVerification({ baseUrl, commandKey }) {
  if (!baseUrl) {
    return { ok: false, error: 'baseUrl parameter is missing.' };
  }
  if (!commandKey) {
    return { ok: false, error: 'commandKey parameter is missing.' };
  }

  const kernelHealthPromise = tryCatch(() => fetchJson(baseUrl, '/api/v1/kernel/health', commandKey));
  const controlPlaneHealthPromise = tryCatch(() => fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey));

  const [kernelResult, controlPlaneResult] = await Promise.all([
    kernelHealthPromise,
    controlPlaneHealthPromise
  ]);

  if (!kernelResult.ok) {
    return { ok: false, error: `Kernel health check failed: ${kernelResult.error}` };
  }
  if (!controlPlaneResult.ok) {
    return { ok: false, error: `Control plane health check failed: ${controlPlaneResult.error}` };
  }

  const kernelData = kernelResult.data;

  return {
    ok: true,
    gap_id: 'GAP-005',
    gap_description: "Zero token rows / 24h — 52 total rows, 18 today (2026-05-31); last write `06:59:26 UTC`",
    gap_priority: "P1",
    gap_status: "1-day",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString()
  };
}