// SYNOPSIS: Repurpose a source piece into multiple SocialMediaOS content formats using only the injected AI hook.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set(['linkedin_carousel', 'short_clips', 'email_segments']);

function normalizeFormats(formats) {
  const input = Array.isArray(formats) ? formats : ['linkedin_carousel', 'short_clips', 'email_segments'];
  return [...new Set(input)].filter((format) => KNOWN_FORMATS.has(format));
}

function compactText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    candidates.push(trimmed.slice(firstBracket, lastBracket + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }

  return null;
}

function toArrayOfStrings(value) {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item.trim() : compactText(item).trim())).filter(Boolean);
  }

  if (typeof value === 'string') {
    const parsed = safeJsonParse(value);
    if (Array.isArray(parsed)) return toArrayOfStrings(parsed);
    if (parsed && typeof parsed === 'object') return toArrayOfStrings(parsed);
    return value
      .split(/\n{2,}|\n(?=\s*(?:[-*•]|\d+[.)]|\d+\s*[:\-]))/g)
      .map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)]|\d+\s*[:\-])\s*/, '').trim())
      .filter(Boolean);
  }

  if (value && typeof value === 'object') {
    const preferredKeys = ['slides', 'items', 'steps', 'segments', 'clips', 'bullets', 'points', 'output', 'content', 'text'];
    for (const key of preferredKeys) {
      if (key in value) {
        const arr = toArrayOfStrings(value[key]);
        if (arr.length) return arr;
      }
    }
    const values = Object.values(value).flatMap((v) => toArrayOfStrings(v));
    return values.filter(Boolean);
  }

  return [];
}

function extractFormatPayload(parsed, format) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return toArrayOfStrings(parsed);
  if (typeof parsed === 'string') return toArrayOfStrings(parsed);

  if (parsed && typeof parsed === 'object') {
    const candidates = [
      parsed[format],
      parsed.output?.[format],
      parsed.outputs?.[format],
      parsed.result?.[format],
      parsed.data?.[format],
      parsed.content?.[format]
    ];

    for (const candidate of candidates) {
      const arr = toArrayOfStrings(candidate);
      if (arr.length) return arr;
    }

    const generic = toArrayOfStrings(parsed);
    if (generic.length) return generic;
  }

  return [];
}

async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] } = {}) {
  try {
    if (typeof callCouncilMember !== 'function') {
      throw new Error('callCouncilMember must be a function');
    }

    const validFormats = normalizeFormats(formats);
    const sourcePiece = piece && typeof piece === 'object' ? piece : { text: compactText(piece) };

    const sourceText = compactText(
      sourcePiece.body ??
        sourcePiece.content_text ??
        sourcePiece.content ??
        sourcePiece.text ??
        sourcePiece.summary ??
        sourcePiece.title ??
        piece
    );

    if (!sourceText) {
      throw new Error('piece must contain source text');
    }

    const basePayload = {
      piece: sourcePiece,
      source_text: sourceText,
      requested_formats: validFormats
    };

    const outputs = {};

    for (const format of validFormats) {
      const prompt = [
        `Transform the source piece into the requested format: ${format}.`,
        'Return only the content for that format.',
        'Be concise, practical, and audience-appropriate.',
        'If the format is carousel or segments, return an ordered list structure.',
        'If the format is short_clips, return a list of clip ideas or clip scripts.',
        '',
        'SOURCE PIECE:',
        sourceText,
        '',
        'SOURCE OBJECT:',
        JSON.stringify(basePayload)
      ].join('\n');

      const raw = await callCouncilMember('content_strategist', prompt, { format });
      const parsed = safeJsonParse(raw);
      const items = extractFormatPayload(parsed, format);
      outputs[format] = items.length ? items : toArrayOfStrings(raw);
    }

    return { ok: true, outputs };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

export { repurposePiece };
export default repurposePiece;