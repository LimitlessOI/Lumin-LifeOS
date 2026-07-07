// SYNOPSIS: Repurpose a source piece into requested SocialMediaOS output formats using the injected council AI hook.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set(['linkedin_carousel', 'short_clips', 'email_segments']);

function normalizePiece(piece) {
  if (piece == null) return '';
  if (typeof piece === 'string') return piece.trim();
  if (typeof piece === 'object') {
    const parts = [];
    for (const key of ['title', 'body', 'content', 'text', 'summary', 'url']) {
      if (typeof piece[key] === 'string' && piece[key].trim()) parts.push(piece[key].trim());
    }
    return parts.join('\n\n').trim();
  }
  return String(piece).trim();
}

function safeParseJson(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {}

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {}
  }

  const startObj = trimmed.indexOf('{');
  const endObj = trimmed.lastIndexOf('}');
  if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
    try {
      return JSON.parse(trimmed.slice(startObj, endObj + 1));
    } catch {}
  }

  const startArr = trimmed.indexOf('[');
  const endArr = trimmed.lastIndexOf(']');
  if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
    try {
      return JSON.parse(trimmed.slice(startArr, endArr + 1));
    } catch {}
  }

  return null;
}

function ensureStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item == null) return '';
      if (typeof item === 'object') {
        if (typeof item.text === 'string') return item.text.trim();
        if (typeof item.copy === 'string') return item.copy.trim();
        if (typeof item.content === 'string') return item.content.trim();
        if (typeof item.body === 'string') return item.body.trim();
      }
      return String(item).trim();
    })
    .filter(Boolean);
}

function extractPayload(parsed, format) {
  if (parsed == null) return [];

  if (Array.isArray(parsed)) return ensureStringArray(parsed);

  if (typeof parsed !== 'object') return [];

  const candidates = [];
  switch (format) {
    case 'linkedin_carousel':
      candidates.push(parsed.slides, parsed.carousel, parsed.linkedin_carousel, parsed.output);
      break;
    case 'short_clips':
      candidates.push(parsed.clips, parsed.short_clips, parsed.video_hooks, parsed.output);
      break;
    case 'email_segments':
      candidates.push(parsed.segments, parsed.email_segments, parsed.emails, parsed.output);
      break;
    default:
      candidates.push(parsed.output, parsed.items, parsed.data);
      break;
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return ensureStringArray(candidate);
    if (typeof candidate === 'string' && candidate.trim()) return [candidate.trim()];
  }

  if (typeof parsed.text === 'string' && parsed.text.trim()) return [parsed.text.trim()];
  return [];
}

function buildPrompt(pieceText, format) {
  const formatInstructions = {
    linkedin_carousel:
      'Create a LinkedIn carousel outline with concise slide-by-slide copy. Return JSON with a slides array of 6-10 strings, each string representing one slide. Include a strong hook slide, value slides, and a closing CTA slide.',
    short_clips:
      'Create short-form video clip ideas from the source piece. Return JSON with a clips array of 3-8 strings. Each string should describe one clip with hook, core point, and suggested on-screen text or caption.',
    email_segments:
      'Create email segment copy from the source piece. Return JSON with a segments array of 3-6 strings. Each string should be a distinct email segment such as subject line, opening, body section, or CTA.',
  };

  return [
    'You are repurposing one source piece into a specific social format.',
    `FORMAT: ${format}`,
    'SOURCE PIECE:',
    pieceText,
    '',
    'REQUIREMENTS:',
    '- Preserve the source meaning and voice where possible.',
    '- Be concrete and usable for publishing.',
    '- Output valid JSON only.',
    `- Follow this schema intent: ${formatInstructions[format] || 'Return a JSON array of strings.'}`,
  ].join('\n');
}

export async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] } = {}) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'callCouncilMember must be provided as a function' };
    }

    const source = normalizePiece(piece);
    if (!source) {
      return { ok: false, error: 'piece is required' };
    }

    const requestedFormats = [...new Set((Array.isArray(formats) ? formats : [formats]).filter((f) => typeof f === 'string' && KNOWN_FORMATS.has(f)))];

    const outputs = {};

    for (const format of requestedFormats) {
      const prompt = buildPrompt(source, format);
      const raw = await callCouncilMember('content_strategist', prompt, { format, source: 'repurposePiece' });
      const parsed = safeParseJson(raw);
      const items = extractPayload(parsed, format);

      outputs[format] = items.length > 0 ? items : (typeof raw === 'string' && raw.trim() ? [raw.trim()] : []);
    }

    return { ok: true, outputs };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default repurposePiece;