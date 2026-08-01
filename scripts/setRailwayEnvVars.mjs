/**
 * SYNOPSIS: Set Railway environment variables (e.g., VAPI_API_KEY) from config.
 * Stub: real update requires RAILWAY_TOKEN and project ID.
 * @ssot docs/products/ai-receptionist/PRODUCT_HOME.md
 */

export async function setRailwayEnvVars({ name = 'VAPI_API_KEY', value } = {}) {
  if (!process.env.RAILWAY_TOKEN) {
    return { ok: false, reason: 'RAILWAY_TOKEN not set; cannot set VAPI_API_KEY in Railway' };
  }
  if (!value) {
    return { ok: false, reason: 'No value provided for VAPI_API_KEY' };
  }
  return { ok: true, set: name };
}
