/**
 * SYNOPSIS: BoldTrail / kvCORE Public API v2 client for CRM data flows.
 * @ssot docs/projects/AMENDMENT_11_BOLDTRAIL_REALESTATE.md
 *
 * Inside Real Estate Public API → kvCORE v2. Base URL: https://api.kvcore.com
 * Auth: Authorization: Bearer JWT. No public AI assistant API — CRM data flows only.
 */
import axios from "axios";

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
  return listContactsFiltered({ limit, page });
}

export async function listContactsFiltered({
  limit = 25,
  page = 1,
  status = null,
  assignedAgentId = null,
  leadTypes = null,
} = {}) {
  if (!isBoldTrailAPIAvailable()) return { ok: false, reason: "missing_token" };

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("page", String(page));
  if (status != null && status !== "") params.set("filter[status]", String(status));
  if (assignedAgentId != null && assignedAgentId !== "") {
    params.set("filter[assigned_agent_id]", String(assignedAgentId));
  }
  if (Array.isArray(leadTypes)) {
    for (const leadType of leadTypes) {
      if (leadType) params.append("filter[leadtype][]", String(leadType));
    }
  }

  return await request("GET", `/contacts?${params.toString()}`);
}

export function extractContactsFromResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.contacts)) return data.contacts;
  if (data.data && Array.isArray(data.data.contacts)) return data.data.contacts;
  if (data.data && Array.isArray(data.data.data)) return data.data.data;
  return [];
}

export function normalizeBoldTrailContact(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.id ?? raw.contact_id ?? raw.contactId;
  if (id == null) return null;

  const first = String(raw.first_name || raw.firstName || "").trim();
  const last = String(raw.last_name || raw.lastName || "").trim();
  const name = String(raw.name || "").trim()
    || [first, last].filter(Boolean).join(" ")
    || String(raw.email || raw.phone || `Contact ${id}`).trim();

  const statusRaw = raw.status ?? raw.lead_status ?? raw.leadStatus;
  const statusNum = statusRaw == null || statusRaw === "" ? null : Number(statusRaw);

  return {
    id: String(id),
    name,
    email: String(raw.email || "").trim() || null,
    phone: String(raw.phone || raw.cell_phone || raw.mobile || "").trim() || null,
    status: Number.isFinite(statusNum) ? statusNum : null,
    status_label: statusLabelFromCode(statusNum),
    assigned_agent_id: raw.assigned_agent_id ?? raw.assignedAgentId ?? null,
    source: String(raw.source || raw.lead_source || "").trim() || null,
    updated_at: raw.updated_at || raw.updatedAt || raw.last_activity || null,
  };
}

function statusLabelFromCode(code) {
  const map = {
    0: "new",
    1: "client",
    2: "closed",
    3: "sphere",
    4: "active",
    5: "pending",
    6: "pending",
    7: "prospect",
  };
  if (code == null || !Number.isFinite(code)) return "unknown";
  return map[code] || "unknown";
}

function splitName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export function extractCreatedContactId(data) {
  if (!data || typeof data !== "object") return null;
  const candidates = [
    data.id,
    data.contact_id,
    data.contactId,
    data.data?.id,
    data.data?.contact_id,
    data.contact?.id,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c);
  }
  return null;
}

export async function findContactByEmail(email) {
  if (!isBoldTrailAPIAvailable() || !email) return null;
  const normalized = String(email).trim().toLowerCase();
  const attempts = [
    `/contacts?limit=10&filter[email]=${encodeURIComponent(normalized)}`,
    `/contacts?limit=50&page=1`,
  ];
  for (const path of attempts) {
    const r = await request("GET", path);
    if (!r.ok) continue;
    const rows = extractContactsFromResponse(r.data)
      .map(normalizeBoldTrailContact)
      .filter(Boolean);
    const hit = rows.find((c) => String(c.email || "").toLowerCase() === normalized);
    if (hit) return hit;
  }
  return null;
}

function buildKvCoreContactPayload(contact = {}) {
  const split = splitName(contact.name);
  const payload = {
    first_name: contact.first_name || split.first || undefined,
    last_name: contact.last_name || split.last || undefined,
    email: contact.email || undefined,
    cell_phone_1: contact.phone || contact.cell_phone_1 || undefined,
    phone: contact.phone || undefined,
    source: contact.source || "LifeOS",
    note: contact.note || undefined,
    tags: Array.isArray(contact.tags) ? contact.tags : undefined,
    lead_status: contact.lead_status ?? contact.status ?? undefined,
    lead_type: contact.lead_type || undefined,
    meta: contact.meta || undefined,
  };
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }
  return payload;
}

export async function createOrUpdateContact(contact = {}) {
  if (!isBoldTrailAPIAvailable()) return { ok: false, reason: "missing_token" };

  const payload = buildKvCoreContactPayload(contact);
  const attempts = [
    { method: "POST", path: "/contact" },
    { method: "POST", path: "/contacts" },
    { method: "PUT", path: "/contact" },
  ];

  let last = null;
  for (const attempt of attempts) {
    const r = await request(attempt.method, attempt.path, payload);
    last = { ...r, endpoint: attempt.path, method: attempt.method };
    if (r.ok) {
      return {
        ...last,
        contact_id: extractCreatedContactId(r.data),
      };
    }
    if (r.status === 405 || r.status === 404) continue;
    return last;
  }
  return last || { ok: false, reason: "create_failed" };
}

export async function addContactNote(contactId, text) {
  if (!isBoldTrailAPIAvailable()) return { ok: false, reason: "missing_token" };
  if (!contactId || !text) return { ok: false, reason: "missing_params" };
  const noteBody = { note: String(text), text: String(text) };
  const id = encodeURIComponent(contactId);
  const attempts = [
    { method: "POST", path: `/contact/${id}/action/note`, body: noteBody },
    { method: "PUT", path: `/contact/${id}/action/note`, body: noteBody },
    { method: "POST", path: `/contacts/${id}/notes`, body: noteBody },
    { method: "POST", path: `/contact/${id}/notes`, body: noteBody },
  ];
  for (const attempt of attempts) {
    const r = await request(attempt.method, attempt.path, attempt.body);
    if (r.ok) return { ...r, endpoint: attempt.path, method: attempt.method };
    if (r.status === 405 || r.status === 404) continue;
    return r;
  }
  return { ok: false, reason: "note_failed" };
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
