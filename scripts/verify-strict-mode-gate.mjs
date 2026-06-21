/**
 * SYNOPSIS: Exports runStrictModeGateVerification — scripts/verify-strict-mode-gate.mjs.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * API endpoint for kernel health check.
 * @type {string}
 */
const KERNEL_HEALTH_PATH = '/api/v1/kernel/health';

/**
 * Fetches the kernel health status to verify strict mode gate.
 *
 * This function makes a GET request to the kernel health endpoint,
 * including an `x-command-key` header for authentication/authorization.
 * It then processes the response to determine the strict mode status
 * and identifies any gaps in its proven behavior.
 *
 * @param {object} options - The options for the verification.
 * @param {string} options.baseUrl - The base URL of the LifeOS kernel API (e.g., 'https://api.lifeos.com').
 * @param {string} options.commandKey - The command key to be sent in the `x-command-key` header.
 * @returns {Promise<object>} A promise that resolves to an object containing the strict mode verification results.
 *   The object includes:
 *   - `ok`: Always `true` if the verification process completed, regardless of API response success.
 *   - `strict_mode_active`: `true` if strict mode is reported as active by the kernel, `false` otherwise.
 *   - `kernel_status`: The status reported by the kernel, or 'unknown' if not available.
 *   - `strict_mode_gap`: `true` if strict mode is not active, indicating a gap.
 *   - `strict_mode_note`: A constant note about the unproven fail-closed behavior.
 *   - `unproven_behavior`: A constant note detailing the specific unproven behavior.
 *   - `checked_at`: An ISO string timestamp of when the check was performed.
 */
export async function runStrictModeGateVerification({ baseUrl, commandKey }) {
  const url = new URL(KERNEL_HEALTH_PATH, baseUrl).toString();
  let data = {};

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-command-key': commandKey,
        'Accept': 'application/json',
      },
    });

    // Attempt to parse JSON even for non-OK responses, as they might contain error details.
    try {
      data = await response.json();
    } catch (parseError) {
      // If parsing fails, log a warning and proceed with an empty data object.
      console.warn(`Failed to parse JSON response from ${url} (status: ${response.status}): ${parseError.message}`);
      data = {};
    }

    if (!response.ok) {
      // Log non-OK HTTP responses, but continue processing `data` as per spec.
      console.error(`API call to ${url} returned non-OK status: ${response.status} ${response.statusText}`);
    }

  } catch (error) {
    // Catch network errors or other issues preventing a response.
    console.error(`Error fetching kernel health from ${url}: ${error.message}`);
    // `data` remains an empty object, leading to default 'unknown' states in the return.
  }

  const strictModeActive = Boolean(data.health?.strict);
  const kernelStatus = data.health?.status || 'unknown';
  const strictModeGap = !strictModeActive;

  return {
    ok: true, // Indicates the verification process itself completed successfully.
    strict_mode_active: strictModeActive,
    kernel_status: kernelStatus,
    strict_mode_gap: strictModeGap,
    strict_mode_note: 'GAP-004: TOKEN_ACCOUNTING_STRICT=true not yet proven fail-closed on Railway deploy',
    unproven_behavior: 'No test has confirmed 409 response when token receipt is missing under strict mode',
    checked_at: new Date().toISOString(),
  };
}