// src/integrations/boldtrail.js (FULL)
import axios from "axios";

/**
 * BoldTrail integration notes (evidence-based):
 * - Inside Real Estate's "BoldTrail Public API" documentation hub points to kvCORE Public API v2.
 * - Base URL: https://api.kvcore.com (docs). Auth: Authorization: Bearer <JWT>.
 * - There is no public evidence of an "AI assistant API" endpoint in the public docs.
 *
 * Therefore:
 * - We support kvCORE v2 public API for CRM data flows (contacts/users/etc).
 * - We keep a "legacy" BoldTrail base URL override for private/vendor deployments if needed.
 * - We do NOT guess AI endpoints; we return fallback unless explicitly enabled and confirmed.
 */

function getConfig() {
  const token = (process.env.BOLDTRAIL_API_KEY || process.env.KVCORE_API_TOKEN || "").trim();
  const baseUrl = (process.env.BOLDTRAIL_API_URL || "https://api.kvcore.com").trim().replace(/\/$/, "");
  const apiPrefix = (process.env.KVCORE_API_PREFIX || "/v2/public").trim().replace(/\/$/, "");

  return {
    token,
    baseUrl,
    apiPrefix,
    aiEnabled: ["1", "true", "yes"].includes(String(process.env.BOLDTRAIL_AI_ENABLED || "").toLowerCase()),
  };
}

function authHeaders() {
  const { token } = getConfig();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isBoldTrailAPIAvailable() {
  const { token } = getConfig();
  return !!token;
}

async function request(method, path, body = null, options = {}) {
  const { baseUrl, apiPrefix } = getConfig();
  const url = `${baseUrl}${path.startsWith("/") ? "" : "/"}${path.startsWith(apiPrefix) ? path : `${apiPrefix}${path.startsWith("/") ? "" : "/"}${path}`}`;

  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(options.headers || {}),
  };

  try {
    const res = await axios.request({
      url,
      method,
      headers,
      data: body ? body : undefined,
      timeout: options.timeoutMs || 10000,
      validateStatus: () => true,
    });

    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      data: res.data,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err.message,
    };
  }
}

/**
 * Probe the configured kvCORE/BoldTrail API.
 * This is safe to call from a status endpoint and does not leak secrets.
 */
export async function probeBoldTrailApi() {
  const cfg = getConfig();
  if (!cfg.token) {
    return { ok: false, configured: false, reason: "missing_token" };
  }

  // We don't know which endpoints are permitted by the token scopes.
  // The safest universal probe is to attempt a small GET on a common resource.
  const candidates = [
    "/contacts?limit=1",
    "/users?limit=1",
    "/me",
  ];

  for (const candidate of candidates) {
    const r = await request("GET", candidate, null, { timeoutMs: 6000 });
    if (r.ok) {
      return {
        ok: true,
        configured: true,
        baseUrl: cfg.baseUrl,
        apiPrefix: cfg.apiPrefix,
        probe: candidate,
        status: r.status,
      };
    }

    // If unauthorized, config is likely correct but token/scopes are wrong.
    if (r.status === 401 || r.status === 403) {
      return {
        ok: false,
        configured: true,
        baseUrl: cfg.baseUrl,
        apiPrefix: cfg.apiPrefix,
        probe: candidate,
        status: r.status,
        reason: "unauthorized_or_forbidden",
      };
    }
  }

  return {
    ok: false,
    configured: true,
    baseUrl: cfg.baseUrl,
    apiPrefix: cfg.apiPrefix,
    reason: "no_known_probe_succeeded",
  };
}

/**
 * CRM primitives (best-effort; endpoint shapes depend on kvCORE API schema).
 * These functions fail soft (return ok:false) and never throw.
 */
export async function listContacts({ limit = 25, page = 1 } = {}) {
  if (!isBoldTrailAPIAvailable()) return { ok: false, reason: "missing_token" };
  return await request("GET", `/contacts?limit=${encodeURIComponent(limit)}&page=${encodeURIComponent(page)}`);
}

export async function createOrUpdateContact(contact = {}) {
  if (!isBoldTrailAPIAvailable()) return { ok: false, reason: "missing_token" };
  // kvCORE typically matches on email/phone; exact schema varies, so we pass a conservative payload.
  const payload = {
    name: contact.name || undefined,
    first_name: contact.first_name || undefined,
    last_name: contact.last_name || undefined,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    source: contact.source || "LifeOS",
    meta: contact.meta || undefined,
  };
  return await request("POST", "/contacts", payload);
}

export async function addContactNote(contactId, text) {
  if (!isBoldTrailAPIAvailable()) return { ok: false, reason: "missing_token" };
  if (!contactId || !text) return { ok: false, reason: "missing_params" };
  return await request("POST", `/contacts/${encodeURIComponent(contactId)}/notes`, { text: String(text) });
}

export async function tagContact(contactId, tag) {
  if (!isBoldTrailAPIAvailable()) return { ok: false, reason: "missing_token" };
  if (!contactId || !tag) return { ok: false, reason: "missing_params" };
  return await request("POST", `/contacts/${encodeURIComponent(contactId)}/tags`, { tag: String(tag) });
}

/**
 * Legacy lead functions (kept for backward compatibility with older internal flows).
 * These will only work if BOLDTRAIL_API_URL points to a private deployment that supports /v1/leads.
 */
export async function createLead(data = {}) {
  const token = (process.env.BOLDTRAIL_API_KEY || "").trim();
  const base = (process.env.BOLDTRAIL_LEGACY_API_URL || process.env.BOLDTRAIL_API_URL || "").trim().replace(/\/$/, "");
  if (!token || !base) return { id: null, note: "no_api_key_or_base" };

  try {
    const res = await axios.post(
      `${base}/v1/leads`,
      {
        phone: data.phone || "",
        meta: {
          intent: data.intent || "",
          area: data.area || "",
          timeline: data.timeline || "",
          duration: data.duration || 0,
          source: data.source || "LifeOS",
        },
      },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );
    return { id: res.data?.id || null, note: "ok" };
  } catch (err) {
    console.error("BoldTrail.createLead error:", err?.response?.data || err.message);
    return { id: null, note: "error" };
  }
}

export async function appendTranscript(leadId, text) {
  const token = (process.env.BOLDTRAIL_API_KEY || "").trim();
  const base = (process.env.BOLDTRAIL_LEGACY_API_URL || process.env.BOLDTRAIL_API_URL || "").trim().replace(/\/$/, "");
  if (!token || !base || !leadId || !text) return { ok: false, note: "skipped" };
  try {
    await axios.post(
      `${base}/v1/leads/${encodeURIComponent(leadId)}/notes`,
      { text: String(text) },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );
    return { ok: true };
  } catch (err) {
    console.error("BoldTrail.appendTranscript error:", err?.response?.data || err.message);
    return { ok: false };
  }
}

export async function tagLead(leadId, tag) {
  const token = (process.env.BOLDTRAIL_API_KEY || "").trim();
  const base = (process.env.BOLDTRAIL_LEGACY_API_URL || process.env.BOLDTRAIL_API_URL || "").trim().replace(/\/$/, "");
  if (!token || !base || !leadId || !tag) return { ok: false, note: "skipped" };
  try {
    await axios.post(
      `${base}/v1/leads/${encodeURIComponent(leadId)}/tags`,
      { tag: String(tag) },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );
    return { ok: true };
  } catch (err) {
    console.error("BoldTrail.tagLead error:", err?.response?.data || err.message);
    return { ok: false };
  }
}

/**
 * AI “inside BoldTrail”
 * Public docs do not expose AI endpoints; so default is always fallback.
 * If you later confirm/whitelist a real endpoint, we can add it behind BOLDTRAIL_AI_ENABLED.
 */
export async function draftEmailWithBoldTrailAI() {
  const { aiEnabled } = getConfig();
  return { ok: false, fallback: true, reason: aiEnabled ? "no_public_ai_api" : "ai_disabled" };
}

export async function planShowingsWithBoldTrailAI() {
  const { aiEnabled } = getConfig();
  return { ok: false, fallback: true, reason: aiEnabled ? "no_public_ai_api" : "ai_disabled" };
}
