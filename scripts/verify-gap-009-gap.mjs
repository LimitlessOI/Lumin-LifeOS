/**
 * SYNOPSIS: - Fetches JSON data from a specified URL with a command key header.
 */
/*
- @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
/**
- Fetches JSON data from a specified URL with a command key header.
- Handles network and HTTP errors, throwing an error if the response is not OK.
- @param {string} baseUrl - The base URL for the API.
- @param {string} path - The apiEP path.
- @param {string} commandKey - The command key to be sent in the 'x-command-key' header.
- @returns {Promise<object>} A promise that resolves to the JSON response body.
- @throws {Error} If the fetch operation fails or the HTTP response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'x-command-key': commandKey,
    'Content-Type': 'application/json',
  };
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }
  return response.json();
}

/**
- Verifies the health status of Kernel and BuilderOS Control Plane APIs.
- Fetches health data from two endpoints concurrently using Promise.all.
- @param {object} params - The parameters for the verification.
- @param {string} params.baseUrl - The base URL for the API calls (e.g., 'http://localhost:3000').
- @param {string} params.commandKey - The command key for auth via 'x-command-key' header.
- @returns {Promise<object>} An object indicating the verification result.
-   On success: { ok: true, gap_id, gap_description, gap_priority, gap_status, resolution_required, kernel_status, token_accounting, checked_at }
-   On failure: { ok: false, error: string }
 */
export async function runGAP009GapVerification({ baseUrl, commandKey }) {
  try {
    // Basic input validation
    if (!baseUrl) {
      throw new Error('baseUrl is required for API calls.');
    }
    if (!commandKey) {
      throw new Error('commandKey is required for auth.');
    }

    // Fetch health data from both services concurrently
    const [kernelData, controlPlaneData] = await Promise.all([
      fetchJson(baseUrl, '/api/v1/kernel/health', commandKey),
      fetchJson(baseUrl, '/api/v1/builderos/control-plane/health', commandKey),
    ]);

    // Return structured success object
    return {
      ok: true,
      gap_id: 'GAP-009',
      gap_description: "TCO routes direct OpenAI/Anthropic fetch (3 hits) — product bypass",
      gap_priority: "P1",
      gap_status: "1-week",
      resolution_required: true,
      kernel_status: kernelData.health?.status || 'unknown',
      token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
      checked_at: new Date().toISOString(),
    };
  } catch (e) {
    // Return structured error object on any failure
    return { ok: false, error: e.message };
  }
}