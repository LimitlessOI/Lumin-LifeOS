// SYNOPSIS: SocialMediaOS content repurposing helper for turning one source piece into platform-specific outputs.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set(['linkedin_carousel', 'short_clips', 'email_segments']);

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.unshift(fenced[1].trim());

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

function normalizeSlideItem(item, idx) {
  if (item == null) return null;
  if (typeof item === 'string') {
    const text = item.trim();
    return text ? { slide: idx + 1, text } : null;
  }
  if (typeof item === 'object') {
    const text = String(item.text ?? item.content ?? item.body ?? item.copy ?? item.slide ?? '').trim();
    const title = String(item.title ?? item.heading ?? '').trim();
    if (!text && !title) return null;
    return {
      slide: idx + 1,
      ...(title ? { title } : {}),
      ...(text ? { text } : {}),
    };
  }
  return null;
}

function normalizeGenericItem(item) {
  if (item == null) return null;
  if (typeof item === 'string') {
    const text = item.trim();
    return text ? text : null;
  }
  if (typeof item === 'object') {
    const text = String(item.text ?? item.content ?? item.body ?? item.copy ?? '').trim();
    if (!text) return null;
    return { ...item, text };
  }
  return null;
}

function extractFromParsed(parsed, format) {
  const direct = parsed?.[format];
  if (Array.isArray(direct)) return direct;
  if (typeof direct === 'string') return [direct];

  const outputs = parsed?.outputs;
  const nested = outputs?.[format];
  if (Array.isArray(nested)) return nested;
  if (typeof nested === 'string') return [nested];

  if (format === 'linkedin_carousel') {
    const slides = parsed?.slides ?? outputs?.slides;
    if (Array.isArray(slides)) return slides;
  }

  if (format === 'short_clips') {
    const clips = parsed?.clips ?? outputs?.clips;
    if (Array.isArray(clips)) return clips;
  }

  if (format === 'email_segments') {
    const segments = parsed?.segments ?? outputs?.segments;
    if (Array.isArray(segments)) return segments;
  }

  return [];
}

async function callFormat(callCouncilMember, format, piece) {
  const prompt = [
    `Transform the source piece into ${format}.`,
    `Return only JSON.`,
    `Source piece:`,
    JSON.stringify(piece ?? {}, null, 2),
    format === 'linkedin_carousel'
      ? `JSON shape: {"linkedin_carousel":[{"title":"...","text":"..."}, ...]}`
      : format === 'short_clips'
        ? `JSON shape: {"short_clips":["...", "..."]}`
        : `JSON shape: {"email_segments":["...", "..."]}`,
  ].join('\n');

  const raw = await callCouncilMember('content_strategist', prompt, { format });
  const parsed = safeJsonParse(raw);

  if (parsed) {
    const items = extractFromParsed(parsed, format);
    return items;
  }

  if (typeof raw === 'string' && raw.trim()) {
    if (format === 'linkedin_carousel') {
      return raw
        .split(/\n{2,}|(?:^|\n)\s*(?:\d+\.|-)\s*/g)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return raw
      .split(/\n+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

export async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] } = {}) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'callCouncilMember must be a function' };
    }

    const requestedFormats = [...new Set(toArray(formats).filter((f) => KNOWN_FORMATS.has(f)))];
    const outputs = {};

    for (const format of requestedFormats) {
      const rawItems = await callFormat(callCouncilMember, format, piece);

      if (format === 'linkedin_carousel') {
        outputs[format] = rawItems
          .map(normalizeSlideItem)
          .filter(Boolean);
        continue;
      }

      outputs[format] = rawItems
        .map(normalizeGenericItem)
        .filter((v) => v != null);
    }

    return { ok: true, outputs };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error?.message ?? String(error),
      },
    };
  }
}

export default repurposePiece;