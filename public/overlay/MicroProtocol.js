/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                      MicroProtocol.js (mp1)                  ║
 * ║            Envelope for MICRO / LCTP v3 Capsules             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * GOAL:
 *  - Every message in the system travels as a Micro envelope
 *    that *may* contain an LCTP v3 capsule string.
 *
 *  - UI layer: works in English (t = text).
 *  - System layer / LLM calls: work in LCTP v3 (lctp = capsule).
 *
 * STRUCTURE:
 *  {
 *    v: "mp1",         // micro protocol version
 *    r: "u|a|s",       // role: user, assistant, system
 *    c: "chat|cmd...", // channel
 *    t: "English",     // optional human text
 *    lctp: "LCTPv3|HDR:{...}|BDY:{...}|b64u:ABC...", // LCTP capsule
 *    m: {...},         // metadata
 *    ts: 1234567890    // timestamp (ms)
 *  }
 */

const MICRO_VERSION = "mp1";

/* ------------------------------------------------------------------
 * Base packet
 * ---------------------------------------------------------------- */

function createBasePacket({ role, channel, text, lctp, meta }) {
  return {
    v: MICRO_VERSION,
    r: role,
    c: channel || "chat",
    t: text ?? "",
    lctp: lctp || null,
    m: meta || {},
    ts: Date.now(),
  };
}

/* ------------------------------------------------------------------
 * LCTP hooks
 * ---------------------------------------------------------------- */

/**
 * NOTE:
 *  These are *hooks* that you will wire to your real LCTP v3
 *  encoder/decoder on the server side.
 *
 *  On the browser side we default to NO compression (pass-through).
 *  That way nothing breaks while we keep the spec clean.
 *
 *  Server.js can import this file and *override* these via DI
 *  or simply not use them and call its own encode/decode.
 */

function lctpEncodeStub(text, meta = {}) {
  // Placeholder: UI does not need full v3 bit-packing.
  // The real v3 encoder lives on the server.
  return `LCTPv3|HDR:{v:3,t:0}|BDY:{note:"ui-pass"}|b64u:${btoa(
    unescape(encodeURIComponent(text))
  )}`;
}

function lctpDecodeStub(lctpString) {
  try {
    const parts = String(lctpString || "").split("|b64u:");
    if (parts.length < 2) return { text: "", meta: { error: "no-b64u" } };

    const decoded = decodeURIComponent(escape(atob(parts[1])));
    return { text: decoded, meta: { from: "stub" } };
  } catch (e) {
    return { text: "", meta: { error: "decode-failed" } };
  }
}

/* ------------------------------------------------------------------
 * Encoders: English → Micro (+ optional LCTP capsule)
 * ---------------------------------------------------------------- */

function encodeUserText(text, options = {}) {
  const rawText = String(text ?? "").trim();

  const meta = options.meta || {};
  const channel = options.channel || "chat";

  // Decide if we want an LCTP capsule at the UI layer.
  // For now we let server be the source of truth, so we can
  // choose to omit it or use the stub.
  const lctp =
    options.withLCTP === true ? lctpEncodeStub(rawText, meta) : null;

  return createBasePacket({
    role: "u",
    channel,
    text: rawText,
    lctp,
    meta,
  });
}

function encodeAssistantText(text, options = {}) {
  const rawText = String(text ?? "").trim();

  const meta = options.meta || {};
  const channel = options.channel || "chat";

  const lctp =
    options.withLCTP === true ? lctpEncodeStub(rawText, meta) : null;

  return createBasePacket({
    role: "a",
    channel,
    text: rawText,
    lctp,
    meta,
  });
}

/* ------------------------------------------------------------------
 * Normalization / Decoders: Micro → English/meta
 * ---------------------------------------------------------------- */

function normalizePacket(raw) {
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      // treat raw string as English assistant text
      return createBasePacket({
        role: "a",
        channel: "chat",
        text: raw,
        lctp: null,
        meta: { fallback: true },
      });
    }
  }

  const obj = raw || {};
  return {
    v: obj.v || MICRO_VERSION,
    r: obj.r || "u",
    c: obj.c || "chat",
    t: obj.t ?? "",
    lctp: obj.lctp || null,
    m: obj.m || {},
    ts: obj.ts || Date.now(),
  };
}

function decodeUserMessage(raw) {
  const packet = normalizePacket(raw);
  let text = packet.t || "";
  const meta = packet.m || {};

  // If t is empty but we have an LCTP capsule, try to decode it
  if (!text && packet.lctp) {
    const res = lctpDecodeStub(packet.lctp);
    text = res.text || "";
  }

  return { text, meta, packet };
}

function decodeAssistantMessage(raw) {
  const packet = normalizePacket(raw);
  let text = packet.t || "";
  const meta = packet.m || {};

  if (!text && packet.lctp) {
    const res = lctpDecodeStub(packet.lctp);
    text = res.text || "";
  }

  return { text, meta, packet };
}

function encodeToString(packet) {
  return JSON.stringify(packet);
}

/* ------------------------------------------------------------------
 * Browser export
 * ---------------------------------------------------------------- */

const MicroProtocol = {
  MICRO_VERSION,
  createBasePacket,
  encodeUserText,
  encodeAssistantText,
  encodeToString,
  decodeUserMessage,
  decodeAssistantMessage,
  normalizePacket,
  // LCTP hooks (UI stubs)
  lctpEncodeStub,
  lctpDecodeStub,
};

if (typeof window !== "undefined") {
  window.MicroProtocol = MicroProtocol;
}

/* ------------------------------------------------------------------
 * Node / ES module export
 * ---------------------------------------------------------------- */

export {
  MICRO_VERSION,
  createBasePacket,
  encodeUserText,
  encodeAssistantText,
  encodeToString,
  decodeUserMessage,
  decodeAssistantMessage,
  normalizePacket,
  lctpEncodeStub,
  lctpDecodeStub,
};

export default MicroProtocol;
