/**
 * SYNOPSIS: Canonical public-origin resolver for runtime, scripts, and live probes.
 */

const ENV_KEYS = [
  "PUBLIC_BASE_URL",
  "BUILDER_BASE_URL",
  "LIFERE_ALPHA_BASE_URL",
  "LUMIN_SMOKE_BASE_URL",
  "API_BASE_URL",
  "BASE_URL",
  "TC_BASE_URL",
  "RAILWAY_PUBLIC_DOMAIN",
];

export function normalizePublicBaseUrl(raw) {
  const value = String(raw || "").trim();
  if (!value || value === "<all_urls>") return "";
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, "");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return "";
  return `https://${value.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

export function resolvePublicBaseUrl(...preferred) {
  const candidates = [
    ...preferred,
    ...ENV_KEYS.map((key) => process.env[key]),
  ];
  for (const candidate of candidates) {
    const normalized = normalizePublicBaseUrl(candidate);
    if (normalized) return normalized;
  }
  return "";
}

export function resolvePublicBaseUrlOrLocalhost(port = 8080, ...preferred) {
  return resolvePublicBaseUrl(...preferred) || `http://127.0.0.1:${port}`;
}
