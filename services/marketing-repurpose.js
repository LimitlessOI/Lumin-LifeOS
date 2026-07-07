// SYNOPSIS: Repurpose a source piece into downstream SocialMediaOS formats via the council member AI hook.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set(['linkedin_carousel', 'short_clips', 'email_segments']);

function safeText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizePiece(piece) {
  if (piece == null) return '';
  if (typeof piece === 'string') return piece.trim();
  if (typeof piece === 'object') {
    const parts = [];
    if (piece.title) parts.push(`Title: ${safeText(piece.title)}`);
    if (piece.body) parts.push(`Body: ${safeText(piece.body)}`);
    if (piece.content_text) parts.push(`Content: ${safeText(piece.content_text)}`);
    if (piece.url) parts.push(`URL: ${safeText(piece.url)}`);
    if (piece.author) parts.push(`Author: ${safeText(piece.author)}`);
    if (piece.published_at) parts.push(`Published at: ${safeText(piece.published_at)}`);
    if (piece.metadata) parts.push(`Metadata: ${safeText(piece.metadata)}`);
    if (parts.length > 0) return parts.join('\n');
    try {
      return JSON.stringify(piece);
    } catch {
      return String(piece);
    }
  }
  return String(piece);
}

function extractJsonCandidate(text) {
  const raw = safeText(text).trim();
  if (!raw) return null;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();

  const firstObj = raw.indexOf('{');
  const lastObj = raw.lastIndexOf('}');
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    return raw.slice(firstObj, lastObj + 1).trim();
  }

  const firstArr = raw.indexOf('[');
  const lastArr = raw.lastIndexOf(']');
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    return raw.slice(firstArr, lastArr + 1).trim();
  }

  return raw;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function parseFormatOutput(format, modelText) {
  const fallback = ensureArray(modelText).map((v) => safeText(v)).filter(Boolean);
  const candidate = extractJsonCandidate(modelText);
  if (!candidate) return fallback;

  try {
    const parsed = JSON.parse(candidate);

    if (format === 'linkedin_carousel') {
      if (Array.isArray(parsed)) return parsed.map((v) => safeText(v)).filter(Boolean);
      if (Array.isArray(parsed.slides)) return parsed.slides.map((v) => safeText(v)).filter(Boolean);
      if (typeof parsed === 'object' && parsed) {
        const slides = parsed.slides || parsed.carousel || parsed.output;
        if (Array.isArray(slides)) return slides.map((v) => safeText(v)).filter(Boolean);
      }
    }

    if (format === 'short_clips') {
      if (Array.isArray(parsed)) return parsed.map((v) => safeText(v)).filter(Boolean);
      if (Array.isArray(parsed.clips)) return parsed.clips.map((v) => safeText(v)).filter(Boolean);
      if (typeof parsed === 'object' && parsed) {
        const clips = parsed.clips || parsed.output;
        if (Array.isArray(clips)) return clips.map((v) => safeText(v)).filter(Boolean);
      }
    }

    if (format === 'email_segments') {
      if (Array.isArray(parsed)) return parsed.map((v) => safeText(v)).filter(Boolean);
      if (Array.isArray(parsed.segments)) return parsed.segments.map((v) => safeText(v)).filter(Boolean);
      if (typeof parsed === 'object' && parsed) {
        const segments = parsed.segments || parsed.emails || parsed.output;
        if (Array.isArray(segments)) return segments.map((v) => safeText(v)).filter(Boolean);
      }
    }

    if (typeof parsed === 'string') return [parsed].filter(Boolean);
    if (Array.isArray(parsed)) return parsed.map((v) => safeText(v)).filter(Boolean);
    if (parsed && typeof parsed === 'object') {
      const values = Object.values(parsed)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .map((v) => safeText(v))
        .filter(Boolean);
      if (values.length > 0) return values;
    }
  } catch {
    // fall through to heuristic parsing
  }

  const lines = safeText(modelText)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 0) return lines;
  return fallback;
}

function buildPrompt(format, pieceText) {
  if (format === 'linkedin_carousel') {
    return [
      'Transform the source piece into a LinkedIn carousel.',
      'Return JSON only as an array of concise slide strings in order.',
      'Keep the carousel punchy, educational, and faithful to the source.',
      'Prefer 6-10 slides.',
      '',
      'SOURCE PIECE:',
      pieceText,
    ].join('\n');
  }

  if (format === 'short_clips') {
    return [
      'Transform the source piece into short-form clip concepts.',
      'Return JSON only as an array of concise clip strings in order.',
      'Each item should be a clip hook, angle, or script beat suitable for short video.',
      'Prefer 3-8 clips.',
      '',
      'SOURCE PIECE:',
      pieceText,
    ].join('\n');
  }

  if (format === 'email_segments') {
    return [
      'Transform the source piece into email segments.',
      'Return JSON only as an array of concise email segment strings in order.',
      'Each item should be a distinct email angle, section, or segment suitable for reuse.',
      'Prefer 3-6 segments.',
      '',
      'SOURCE PIECE:',
      pieceText,
    ].join('\n');
  }

  return pieceText;
}

export async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] } = {}) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'callCouncilMember is required' };
    }

    const requestedFormats = Array.from(new Set(ensureArray(formats).filter((format) => KNOWN_FORMATS.has(format))));
    const sourcePiece = normalizePiece(piece);

    const outputs = {};

    for (const format of requestedFormats) {
      try {
        const prompt = buildPrompt(format, sourcePiece);
        const modelText = await callCouncilMember('content_repurposer', prompt, { format });
        outputs[format] = parseFormatOutput(format, modelText);
      } catch (error) {
        outputs[format] = [];
      }
    }

    return { ok: true, outputs };
  } catch (error) {
    return {
      ok: false,
      error: safeText(error?.message || error),
    };
  }
}

export default repurposePiece;

// ASSUMPTIONS: The AI hook returns either JSON text or plain text that can be heuristically split into lines; unknown formats are ignored.