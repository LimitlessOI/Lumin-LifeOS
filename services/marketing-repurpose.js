// SYNOPSIS: SocialMediaOS content repurposing helper for turning one source piece into multiple output formats.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set([
  'linkedin_carousel',
  'short_clips',
  'email_segments',
]);

function normalizeFormats(formats) {
  const input = Array.isArray(formats) && formats.length > 0 ? formats : ['linkedin_carousel', 'short_clips', 'email_segments'];
  return [...new Set(input)].filter((format) => KNOWN_FORMATS.has(format));
}

function safeString(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function buildSourcePieceText(piece) {
  if (typeof piece === 'string') return piece.trim();
  if (!piece || typeof piece !== 'object') return '';

  const parts = [];
  if (piece.title) parts.push(`Title: ${safeString(piece.title)}`);
  if (piece.body) parts.push(`Body: ${safeString(piece.body)}`);
  if (piece.url) parts.push(`URL: ${safeString(piece.url)}`);
  if (piece.author) parts.push(`Author: ${safeString(piece.author)}`);
  if (piece.platform) parts.push(`Platform: ${safeString(piece.platform)}`);
  if (piece.format) parts.push(`Format: ${safeString(piece.format)}`);
  if (piece.content_text) parts.push(`Content: ${safeString(piece.content_text)}`);
  if (piece.metadata) parts.push(`Metadata: ${safeString(piece.metadata)}`);

  if (parts.length === 0) return safeString(piece).trim();
  return parts.join('\n');
}

function extractTextBlock(text) {
  const cleaned = safeString(text).trim();
  if (!cleaned) return [];
  const fenced = cleaned.match(/```(?:json|js|javascript)?\s*([\s\S]*?)```/i);
  return [fenced ? fenced[1].trim() : cleaned];
}

function parseMaybeJson(text) {
  const raw = safeString(text).trim();
  if (!raw) return null;

  const candidates = [];
  const fenced = raw.match(/```(?:json|js|javascript)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  candidates.push(raw);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      const firstBrace = candidate.indexOf('{');
      const lastBrace = candidate.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const slice = candidate.slice(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(slice);
        } catch {
          // continue
        }
      }
    }
  }
  return null;
}

function normalizeArrayOutput(value) {
  if (Array.isArray(value)) return value.map((item) => safeString(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const lines = trimmed
      .split(/\r?\n+/)
      .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
      .filter(Boolean);
    return lines.length > 1 ? lines : [trimmed];
  }
  if (value && typeof value === 'object') {
    const preferredKeys = ['slides', 'items', 'segments', 'clips', 'output', 'content'];
    for (const key of preferredKeys) {
      if (key in value) {
        const arr = normalizeArrayOutput(value[key]);
        if (arr.length) return arr;
      }
    }
    return Object.values(value).map((item) => safeString(item).trim()).filter(Boolean);
  }
  return [];
}

function parseFormatOutput(format, modelText) {
  const parsed = parseMaybeJson(modelText);
  if (parsed && typeof parsed === 'object') {
    const arr = normalizeArrayOutput(parsed);
    if (arr.length) return arr;
  }

  const text = safeString(modelText).trim();
  if (!text) return [];

  if (format === 'linkedin_carousel') {
    const lines = text.split(/\r?\n+/).map((line) => line.trim()).filter(Boolean);
    const slides = lines.map((line) => line.replace(/^\s*(?:slide|slides?)\s*\d+\s*[:.-]?\s*/i, '').trim()).filter(Boolean);
    return slides.length ? slides : extractTextBlock(text);
  }

  if (format === 'short_clips') {
    return text
      .split(/\r?\n+/)
      .map((line) => line.replace(/^\s*[-*•\d.)]+\s*/, '').trim())
      .filter(Boolean);
  }

  if (format === 'email_segments') {
    return text
      .split(/\n{2,}/)
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  return extractTextBlock(text);
}

async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] }) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'callCouncilMember must be a function' };
    }

    const requestedFormats = normalizeFormats(formats);
    const sourceText = buildSourcePieceText(piece);

    if (!sourceText) {
      return { ok: false, error: 'piece is empty or unsupported' };
    }

    const outputs = {};

    for (const format of requestedFormats) {
      const prompt = [
        'Repurpose the source piece into the requested format.',
        `FORMAT: ${format}`,
        'Return only the transformed content for this format.',
        'If the format is a list-based format, keep items concise and ready to publish.',
        'SOURCE PIECE:',
        sourceText,
      ].join('\n');

      const modelText = await callCouncilMember('content_repurposer', prompt, { format });
      const parsed = parseFormatOutput(format, modelText);

      if (format === 'linkedin_carousel') outputs.linkedin_carousel = parsed;
      if (format === 'short_clips') outputs.short_clips = parsed;
      if (format === 'email_segments') outputs.email_segments = parsed;
    }

    return { ok: true, outputs };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : safeString(error),
    };
  }
}

export { repurposePiece };
export default repurposePiece;

/*
ASSUMPTIONS:
- The source piece can be supplied as a string or an object with common content fields such as title/body/content_text/url/metadata.
- callCouncilMember returns plain text or JSON-like text that may need defensive parsing.
*/