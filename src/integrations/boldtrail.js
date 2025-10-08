// src/integrations/boldtrail.js
import axios from "axios";

/**
 * Safe BoldTrail wrapper.
 * If KEY is missing, functions no-op and return simple objects so the app never crashes.
 */
const BASE = process.env.BOLDTRAIL_API_URL || "https://api.boldtrail.io";
const KEY  = process.env.BOLDTRAIL_API_KEY || "";

function authHeaders() {
  if (!KEY) return {};
  return { Authorization: `Bearer ${KEY}` };
}

/**
 * createLead({ phone, intent, area, timeline, duration, source })
 * Returns { id, note } even when no key is present.
 */
export async function createLead(data) {
  if (!KEY) return { id: null, note: "no_api_key" };
  try {
    const res = await axios.post(
      `${BASE}/v1/leads`,
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
      { headers: authHeaders() }
    );
    return { id: res.data?.id || null, note: "ok" };
  } catch (err) {
    console.error("BoldTrail.createLead error:", err?.response?.data || err.message);
    return { id: null, note: "error" };
  }
}

/**
 * appendTranscript(leadId, text)
 */
export async function appendTranscript(leadId, text) {
  if (!KEY || !leadId || !text) return { ok: false, note: "skipped" };
  try {
    await axios.post(
      `${BASE}/v1/leads/${encodeURIComponent(leadId)}/notes`,
      { text: String(text) },
      { headers: authHeaders() }
    );
    return { ok: true };
  } catch (err) {
    console.error("BoldTrail.appendTranscript error:", err?.response?.data || err.message);
    return { ok: false };
  }
}

/**
 * tagLead(leadId, tag)
 */
export async function tagLead(leadId, tag) {
  if (!KEY || !leadId || !tag) return { ok: false, note: "skipped" };
  try {
    await axios.post(
      `${BASE}/v1/leads/${encodeURIComponent(leadId)}/tags`,
      { tag: String(tag) },
      { headers: authHeaders() }
    );
    return { ok: true };
  } catch (err) {
    console.error("BoldTrail.tagLead error:", err?.response?.data || err.message);
    return { ok: false };
  }
}
