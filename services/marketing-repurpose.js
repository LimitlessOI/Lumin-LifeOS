// SYNOPSIS: Repurpose a source piece into multiple marketing formats using only the injected AI hook.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set(['linkedin_carousel', 'short_clips', 'email_segments']);

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  const starts = [firstBrace, firstBracket].filter((n) => n >= 0);
  if (starts.length > 0) {
    const start = Math.min(...starts);
    candidates.push(trimmed.slice(start));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return null;
}

function toArrayOfStrings(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === 'string') return [item];
        if (item && typeof item === 'object') {
          const preferred =
            item.text ??
            item.copy ??
            item.content ??
            item.slide ??
            item.body ??
            item.segment ??
            item.caption ??
            item.title;
          return typeof preferred === 'string' ? [preferred] : [];
        }
        return [];
      })
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const lines = trimmed
      .split(/\n+/)
      .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean);
    return lines.length > 1 ? lines : [trimmed];
  }

  return [];
}

function normalizeSourcePiece(piece) {
  if (piece == null) return '';
  if (typeof piece === 'string') return piece.trim();
  if (typeof piece !== 'object') return String(piece).trim();

  const fields = [
    piece.body,
    piece.content_text,
    piece.text,
    piece.title,
    piece.summary,
    piece.description,
    piece.extracted_data,
  ];

  const parts = fields
    .flatMap((v) => {
      if (typeof v === 'string') return [v.trim()];
      if (v && typeof v === 'object') {
        const parsed = safeJsonParse(JSON.stringify(v));
        return parsed ? [JSON.stringify(parsed)] : [];
      }
      return [];
    })
    .filter(Boolean);

  return parts.join('\n\n').trim();
}

function extractFormattedOutput(format, modelText) {
  const parsed = safeJsonParse(modelText);
  if (parsed && typeof parsed === 'object') {
    if (format === 'linkedin_carousel') {
      const slides =
        parsed.slides ??
        parsed.carousel ??
        parsed.linkedin_carousel ??
        parsed.output ??
        parsed.items ??
        parsed.content;
      const arr = toArrayOfStrings(slides);
      if (arr.length) return arr;
    }
    if (format === 'short_clips') {
      const clips = parsed.clips ?? parsed.short_clips ?? parsed.output ?? parsed.items ?? parsed.content;
      const arr = toArrayOfStrings(clips);
      if (arr.length) return arr;
    }
    if (format === 'email_segments') {
      const segments =
        parsed.segments ??
        parsed.email_segments ??
        parsed.output ??
        parsed.items ??
        parsed.content;
      const arr = toArrayOfStrings(segments);
      if (arr.length) return arr;
    }
  }

  const fallback = toArrayOfStrings(modelText);
  return fallback;
}

async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] }) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'callCouncilMember must be a function' };
    }

    const requested = [...new Set(Array.isArray(formats) ? formats : [])].filter((f) => KNOWN_FORMATS.has(f));
    const source = normalizeSourcePiece(piece);

    if (!source) {
      return { ok: false, error: 'piece is empty or unsupported' };
    }

    const outputs = {};

    for (const format of requested) {
      const role = 'marketing_content_repurerposer';
      const prompt = [
        `Repurpose the source piece into ${format}.`,
        'Return only the transformed content.',
        'Be concise and production-ready.',
        'If asked for a carousel, provide slide-by-slide copy.',
        'If asked for short clips, provide short standalone clip concepts or captions.',
        'If asked for email segments, provide segmented email copy.',
        '',
        'SOURCE PIECE:',
        source,
      ].join('\n');

      const modelText = await callCouncilMember(role, prompt, { format });
      const items = extractFormattedOutput(format, modelText);

      if (format === 'linkedin_carousel') outputs.linkedin_carousel = items;
      if (format === 'short_clips') outputs.short_clips = items;
      if (format === 'email_segments') outputs.email_segments = items;
    }

    return { ok: true, outputs };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export { repurposePiece };
export default repurposePiece;