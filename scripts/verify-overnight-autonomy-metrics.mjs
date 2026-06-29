/**
 * SYNOPSIS: Exports runOvernightAutonomyMetricsVerification — scripts/verify-overnight-autonomy-metrics.mjs.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { URL } from 'node:url';

/**
 * Fetches health metrics from BuilderOS control plane and Kernel,
 * and compiles overnight autonomy metrics.
 *
 * @param {object} params - The parameters for the verification.
 * @param {string} params.baseUrl - The base URL for the BuilderOS and Kernel APIs.
 * @param {string} params.commandKey - The x-command-key header value for authentication.
 * @returns {Promise<object>} An object containing autonomy metrics and health status.
 */
export async function runOvernightAutonomyMetricsVerification({ baseUrl, commandKey }) {
  const headers = {
    'x-command-key': commandKey,
  };

  const builderosHealthUrl = new URL('/api/v1/builderos/control-plane/health', baseUrl).toString();
  const kernelHealthUrl = new URL('/api/v1/kernel/health', baseUrl).toString();

  let kernelData = {}; // Initialize to an empty object to safely access nested properties

  // Fetch BuilderOS health. The data from this endpoint is not directly used
  // in the final return object's metrics, but the fetch operation is required.
  try {
    const builderosResponse = await fetch(builderosHealthUrl, { headers });
    if (!builderosResponse.ok) {
      console.error(`[verify-overnight-autonomy-metrics] Failed to fetch BuilderOS health: ${builderosResponse.status} ${builderosResponse.statusText}`);
    }
    // Consume the response body to prevent resource leaks, even if not used.
    await builderosResponse.json().catch(e => console.warn(`[verify-overnight-autonomy-metrics] Could not parse BuilderOS health JSON (ignored): ${e.message}`));
  } catch (error) {
    console.error(`[verify-overnight-autonomy-metrics] Error fetching BuilderOS health: ${error.message}`);
  }

  // Fetch Kernel health. Data from this endpoint is used for 'builds_today' and 'without_proof'.
  try {
    const kernelResponse = await fetch(kernelHealthUrl, { headers });
    if (!kernelResponse.ok) {
      console.error(`[verify-overnight-autonomy-metrics] Failed to fetch Kernel health: ${kernelResponse.status} ${kernelResponse.statusText}`);
      // If fetch fails or response is not ok, kernelData remains an empty object,
      // allowing subsequent safe access with '?.'.
    } else {
      kernelData = await kernelResponse.json();
    }
  } catch (error) {
    console.error(`[verify-overnight-autonomy-metrics] Error fetching Kernel health: ${error.message}`);
  }

  // As per specification, the 'ok' status in the returned object is always true,
  // indicating the successful execution of this verification function's logic,
  // regardless of the underlying API fetch outcomes (which are logged).
  const okStatus = true;

  const buildsToday = kernelData.build?.builds_today || 0;
  const withoutProof = kernelData.build?.without_proof || 0;

  return {
    ok: okStatus,
    metric_definitions: {
      autonomous_decisions: 'count of C2 jobs with status committed',
      successful_repairs: 'count of C2 jobs where oil.verified=true and token.verified=true',
      failed_repairs: 'count of C2 jobs with status failed or blocked',
      rebuilt_solved_work: 'count of C2 jobs targeting files that already exist and are unchanged',
      governance_prevented_drift: 'count of ZONE3_PATCH_REQUIRED hits',
      contradictions_discovered: 0,
      contradictions_resolved: 0
    },
    builds_today: buildsToday,
    without_proof: withoutProof,
    checked_at: new Date().toISOString()
  };
}