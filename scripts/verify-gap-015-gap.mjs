/**
 * SYNOPSIS: Exports runGAP015GapVerification — scripts/verify-gap-015-gap.mjs.
 */
/*
- @ssot docs/products/builderos/PRODUCT_HOME.md
- - Verifies GAP-015: "No trust coverage map (OIL + build + token joint view)"
-   by checking the health status of Kernel and BuilderOS Control Plane.
 */
const tryCatch = async (promise) => {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error, null];
  }
};
const fetchJson = async (baseUrl, path, commandKey) => {
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
};
export async function runGAP015GapVerification({ baseUrl, commandKey }) {
  if (!baseUrl || !commandKey) {
    return { ok: false, error: 'baseUrl and commandKey are required.' };
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
  const [kernelData, controlPlaneData] = results; // controlPlaneData is fetched but not used in the final return object per spec.
  return {
    ok: true,
    gap_id: 'GAP-015',
    gap_description: "No trust coverage map (OIL + build + token joint view)",
    gap_priority: "P1",
    gap_status: "1-day",
    resolution_required: true,
    kernel_status: kernelData.health?.status || 'unknown',
    token_accounting: kernelData.health?.token_accounting?.status || 'unknown',
    checked_at: new Date().toISOString(),
  };
}