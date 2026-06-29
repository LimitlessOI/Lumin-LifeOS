/**
 * SYNOPSIS: This module provides functionality to verify the linkage between token receipts
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * This module provides functionality to verify the linkage between token receipts
 * and the build task ledger by querying the kernel's health endpoint.
 * It checks for the activity of the council ledger and reports on token accounting metrics.
 */

/**
 * Fetches JSON data from a specified URL with an optional command key header.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} path - The API endpoint path.
 * @param {string} commandKey - The command key to be sent in the x-command-key header.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the network request fails or the response is not OK.
 */
async function fetchJson(baseUrl, path, commandKey) {
  const url = new URL(path, baseUrl).toString();
  const headers = {
    'Content-Type': 'application/json',
    'x-command-key': commandKey,
  };

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
  }

  return response.json();
}

/**
 * Executes a verification check for token receipt linkage by querying the kernel health endpoint.
 * This function fetches health data, specifically focusing on token accounting metrics,
 * and reports on the status of the council ledger and potential linkage gaps.
 *
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the kernel API (e.g., 'http://localhost:3000').
 * @param {string} params.commandKey - The command key for authentication with the kernel API.
 * @returns {Promise<object>} An object containing the verification results.
 *   - ok: Boolean indicating if the verification fetch was successful.
 *   - council_ledger_active: Boolean indicating if the council ledger is active.
 *   - token_rows_today: Number of token usage log rows today.
 *   - last_ledger_write: ISO string of the last ledger write timestamp, or null.
 *   - linkage_gap: Always true, indicating a known architectural linkage gap.
 *   - linkage_gap_note: A descriptive note about the linkage gap and its fix.
 *   - checked_at: ISO string of when the check was performed.
 */
export async function runTokenReceiptLinkageVerification({ baseUrl, commandKey }) {
  const checked_at = new Date().toISOString();
  try {
    const data = await fetchJson(baseUrl, '/api/v1/kernel/health', commandKey);

    const tokenAccounting = data.health?.token_accounting;

    return {
      ok: true,
      council_ledger_active: Boolean(tokenAccounting?.council_ledger_active),
      token_rows_today: tokenAccounting?.tul_rows_today || 0,
      last_ledger_write: tokenAccounting?.last_ledger_write_at || null,
      linkage_gap: true,
      linkage_gap_note: 'token_receipt_id in build_task_ledger is null for token_recent type — kernel links by time window only, not by direct task_id join. Fix: use kernel-token-linker.js after each build',
      checked_at,
    };
  } catch (error) {
    console.error(`Error during token receipt linkage verification: ${error.message}`);
    return {
      ok: false,
      council_ledger_active: false,
      token_rows_today: 0,
      last_ledger_write: null,
      linkage_gap: true, // The gap itself is a known architectural fact, regardless of fetch success.
      linkage_gap_note: `Failed to fetch kernel health: ${error.message}`,
      checked_at,
    };
  }
}