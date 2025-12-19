// src/integrations/boldtrail.js (FULL)
import axios from "axios";

const BASE = process.env.BOLDTRAIL_API_URL || "https://api.boldtrail.io";
const KEY  = process.env.BOLDTRAIL_API_KEY || "";

function authHeaders() { return KEY ? { Authorization: `Bearer ${KEY}` } : {}; }

/**
 * Check if BoldTrail API is available
 */
export function isBoldTrailAPIAvailable() {
  return !!KEY && KEY.trim() !== "";
}

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

/**
 * Use BoldTrail's AI to draft an email
 * Falls back gracefully if endpoint doesn't exist
 */
export async function draftEmailWithBoldTrailAI(params) {
  if (!KEY) return { ok: false, fallback: true, reason: "no_api_key" };
  
  try {
    // Try BoldTrail's AI email endpoint (common patterns: /v1/ai/email, /v1/emails/draft, /v1/ai/draft-email)
    const endpoints = [
      `${BASE}/v1/ai/email/draft`,
      `${BASE}/v1/emails/draft`,
      `${BASE}/v1/ai/draft-email`,
      `${BASE}/v1/ai/email`,
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await axios.post(
          endpoint,
          {
            agent_tone: params.agent_tone || "professional and friendly",
            draft_type: params.draft_type,
            recipient_name: params.recipient_name,
            recipient_email: params.recipient_email,
            context: params.context_data || {},
          },
          { 
            headers: authHeaders(),
            timeout: 10000 // 10 second timeout
          }
        );

        if (res.data && (res.data.subject || res.data.content || res.data.email)) {
          return {
            ok: true,
            source: "boldtrail_ai",
            subject: res.data.subject || res.data.email?.subject || "",
            content: res.data.content || res.data.email?.body || res.data.email || "",
          };
        }
      } catch (endpointError) {
        // Try next endpoint
        continue;
      }
    }

    // If all endpoints fail, return fallback
    return { ok: false, fallback: true, reason: "endpoint_not_found" };
  } catch (err) {
    console.warn("BoldTrail AI email draft not available, using fallback:", err.message);
    return { ok: false, fallback: true, reason: err.message };
  }
}

/**
 * Use BoldTrail's AI to plan/showings route
 * Falls back gracefully if endpoint doesn't exist
 */
export async function planShowingsWithBoldTrailAI(params) {
  if (!KEY) return { ok: false, fallback: true, reason: "no_api_key" };
  
  try {
    // Try BoldTrail's AI showing planning endpoint
    const endpoints = [
      `${BASE}/v1/ai/showings/plan`,
      `${BASE}/v1/showings/plan`,
      `${BASE}/v1/ai/route-optimize`,
      `${BASE}/v1/route/optimize`,
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await axios.post(
          endpoint,
          {
            properties: params.properties,
            client_name: params.client_name,
            client_email: params.client_email,
            client_phone: params.client_phone,
            preferences: params.preferences || {},
          },
          { 
            headers: authHeaders(),
            timeout: 10000
          }
        );

        if (res.data && (res.data.showings || res.data.route || res.data.optimized_route)) {
          return {
            ok: true,
            source: "boldtrail_ai",
            showings: res.data.showings || res.data.route || res.data.optimized_route || [],
            estimated_drive_time: res.data.estimated_drive_time,
            total_distance: res.data.total_distance,
          };
        }
      } catch (endpointError) {
        // Try next endpoint
        continue;
      }
    }

    return { ok: false, fallback: true, reason: "endpoint_not_found" };
  } catch (err) {
    console.warn("BoldTrail AI showing planning not available, using fallback:", err.message);
    return { ok: false, fallback: true, reason: err.message };
  }
}
