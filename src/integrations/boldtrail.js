// src/integrations/boldtrail.js (FULL)
import axios from "axios";

const BASE = process.env.BOLDTRAIL_API_URL || "https://api.boldtrail.io";
const KEY  = process.env.BOLDTRAIL_API_KEY || "";

function authHeaders() { return KEY ? { Authorization: `Bearer ${KEY}` } : {}; }

export async function createLead(data = {}) {
  if (!KEY) return { id: null, note: "no_api_key" };
  try {
    const res = await axios.post(`${BASE}/v1/leads`, {
      phone: data.phone || "",
      meta: {
        intent:   data.intent   || "",
        area:     data.area     || "",
        timeline: data.timeline || "",
        duration: data.duration || 0,
        source:   data.source   || "LifeOS",
      },
    }, { headers: authHeaders() });
    return { id: res.data?.id || null, note: "ok" };
  } catch (err) {
    console.error("BoldTrail.createLead error:", err?.response?.data || err.message);
    return { id: null, note: "error" };
  }
}

export async function appendTranscript(leadId, text) {
  if (!KEY || !leadId || !text) return { ok: false, note: "skipped" };
  try {
    await axios.post(`${BASE}/v1/leads/${encodeURIComponent(leadId)}/notes`,
      { text: String(text) }, { headers: authHeaders() });
    return { ok: true };
  } catch (err) {
    console.error("BoldTrail.appendTranscript error:", err?.response?.data || err.message);
    return { ok: false };
  }
}

export async function tagLead(leadId, tag) {
  if (!KEY || !leadId || !tag) return { ok: false, note: "skipped" };
  try {
    await axios.post(`${BASE}/v1/leads/${encodeURIComponent(leadId)}/tags`,
      { tag: String(tag) }, { headers: authHeaders() });
    return { ok: true };
  } catch (err) {
    console.error("BoldTrail.tagLead error:", err?.response?.data || err.message);
    return { ok: false };
  }
}
