/**
 * SYNOPSIS: Voice Rail status probes leaf — /healthz + builder/ready + connection-proof, fetch-only.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 *
 * Extracted from voice-rail-system-direct.js so lifeos-founder-system-action can
 * run status probes without importing system-direct (which dynamically imports
 * founder-system-action back) — breaking that import cycle.
 */

async function fetchJson(baseUrl, path, commandKey) {
  const url = `${String(baseUrl || '').replace(/\/$/, '')}${path}`;
  const headers = { accept: 'application/json' };
  if (commandKey) headers['x-command-key'] = commandKey;
  try {
    const res = await fetch(url, { headers });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, path, body };
  } catch (err) {
    return { ok: false, status: 0, path, error: err.message };
  }
}

export async function runSystemDirectStatusProbes({ baseUrl, commandKey, connectionProbe }) {
  const probes = [];
  if (typeof connectionProbe === 'function') {
    try {
      const local = await connectionProbe();
      probes.push({
        method: 'INTERNAL',
        path: 'probeFounderContext',
        status: local?.sufficient ? 200 : 503,
        body: {
          connected: local?.sufficient === true,
          level: local?.context_health?.level,
          counts: local?.context_health?.counts,
        },
      });
    } catch (err) {
      probes.push({
        method: 'INTERNAL',
        path: 'probeFounderContext',
        status: 0,
        error: err.message,
      });
    }
  }
  probes.push(await fetchJson(baseUrl, '/healthz', null));
  probes.push(await fetchJson(baseUrl, '/api/v1/lifeos/builder/ready', commandKey));
  probes.push(await fetchJson(baseUrl, '/api/v1/lifeos/voice-rail/connection-proof?user=adam', commandKey));
  return probes;
}
