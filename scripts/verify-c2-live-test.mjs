/**
 * SYNOPSIS: Exports runC2LiveTest — scripts/verify-c2-live-test.mjs.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
export async function runC2LiveTest({ baseUrl, commandKey }) {
  try {
    // Step 1: Fetch the Command-Control Halt status
    const c2HaltUrl = `${baseUrl}/api/v1/lifeos/builderos/command-control/halt`;
    const c2HaltResponse = await fetch(c2HaltUrl, {
      headers: {
        'x-command-key': commandKey,
      },
    });

    // Check if the C2 Halt response was successful (HTTP 2xx)
    if (!c2HaltResponse.ok) {
      const errorBody = await c2HaltResponse.text();
      throw new Error(`C2 Halt check failed with status ${c2HaltResponse.status}: ${errorBody}`);
    }

    const haltJson = await c2HaltResponse.json();

    // Step 2: Fetch the Kernel Health status
    const kernelHealthUrl = `${baseUrl}/api/v1/kernel/health`;
    const kernelHealthResponse = await fetch(kernelHealthUrl, {
      headers: {
        'x-command-key': commandKey,
      },
    });

    // Check if the Kernel Health response was successful (HTTP 2xx)
    if (!kernelHealthResponse.ok) {
      const errorBody = await kernelHealthResponse.text();
      throw new Error(`Kernel Health check failed with status ${kernelHealthResponse.status}: ${errorBody}`);
    }

    const healthJson = await kernelHealthResponse.json();

    // Step 3: Return the combined results
    return {
      ok: true,
      c2_halt_active: haltJson.halt_state?.active,
      kernel_status: healthJson.status,
      checked_at: new Date().toISOString(),
    };
  } catch (e) {
    // Handle any errors that occurred during the fetch operations or JSON parsing
    return {
      ok: false,
      error: e.message,
    };
  }
}