// SYNOPSIS: Repurpose one source piece into platform-specific content variants using the injected council member only.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set(['linkedin_carousel', 'short_clips', 'email_segments']);

function safeJsonParse(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function toText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (typeof value.content === 'string') return value.content;
    if (typeof value.body === 'string') return value.body;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function normalizeSourcePiece(piece) {
  if (piece == null) return { title: '', body: '', raw: piece };
  if (typeof piece === 'string') return { title: '', body: piece, raw: piece };
  const title = toText(piece.title || piece.name || '');
  const body =
    toText(piece.body ?? piece.content ?? piece.content_text ?? piece.text ?? piece.summary ?? piece.raw_text ?? '');
  return { title, body, raw: piece };
}

function ensureArrayOutput(parsed, format) {
  if (Array.isArray(parsed)) return parsed.map((item) => toText(item)).filter((s) => s.trim().length > 0);
  if (parsed && typeof parsed === 'object') {
    const keysByFormat = {
      linkedin_carousel: ['slides', 'carousel', 'cards', 'items', 'output'],
      short_clips: ['clips', 'items', 'segments', 'output'],
      email_segments: ['segments', 'emails', 'items', 'output'],
    };
    for (const key of keysByFormat[format] || []) {
      if (Array.isArray(parsed[key])) return parsed[key].map((item) => toText(item)).filter((s) => s.trim().length > 0);
    }
    if (typeof parsed.text === 'string') return [parsed.text];
    if (typeof parsed.content === 'string') return [parsed.content];
  }
  return [];
}

function buildPrompt(format, piece) {
  const sourceTitle = piece.title ? `Title: ${piece.title}\n` : '';
  const sourceBody = piece.body ? `Body:\n${piece.body}\n` : '';
  const constraints = {
    linkedin_carousel:
      'Return ONLY JSON. Shape: {"slides":["Slide 1 text","Slide 2 text", "..."]}. Make it a strong LinkedIn carousel with a hook slide, concise progression, and a CTA slide.',
    short_clips:
      'Return ONLY JSON. Shape: {"clips":["Clip 1 text","Clip 2 text", "..."]}. Each clip should be a short, self-contained social clip script or caption with punchy framing.',
    email_segments:
      'Return ONLY JSON. Shape: {"segments":["Segment 1 text","Segment 2 text", "..."]}. Write email-ready segments that can be stitched into a sequence or newsletter blocks.',
  };

  return [
    'You are repurposing a single source piece into the requested format.',
    `Format: ${format}`,
    constraints[format],
    'Preserve the source meaning; do not add unsupported claims.',
    'If the source is sparse, use only what is supported and keep output concise.',
    '',
    sourceTitle + sourceBody,
  ].join('\n');
}

export async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] } = {}) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'callCouncilMember must be a function' };
    }

    const source = normalizeSourcePiece(piece);
    const requested = Array.isArray(formats) ? formats : [formats];
    const validFormats = [...new Set(requested)].filter((f) => KNOWN_FORMATS.has(f));

    const outputs = {};
    for (const format of validFormats) {
      try {
        const prompt = buildPrompt(format, source);
        const raw = await callCouncilMember('content_repurerposer', prompt, { format });
        const parsed = safeJsonParse(raw);
        const items = ensureArrayOutput(parsed, format);
        outputs[format] = items.length > 0 ? items : [toText(raw).trim()].filter(Boolean);
      } catch (error) {
        return {
          ok: false,
          error: `Failed to generate ${format}: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    return { ok: true, outputs };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export default repurposePiece;