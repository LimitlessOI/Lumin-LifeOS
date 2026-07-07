// SYNOPSIS: Repurpose one source piece into social-media and email formats using only the injected council member hook.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set(['linkedin_carousel', 'short_clips', 'email_segments']);

function normalizeFormats(formats) {
  const input = Array.isArray(formats) ? formats : ['linkedin_carousel', 'short_clips', 'email_segments'];
  return [...new Set(input)].filter((format) => KNOWN_FORMATS.has(format));
}

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const attempts = [trimmed];
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
  if (start > 0) attempts.push(trimmed.slice(start));

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return null;
}

function toPlainText(piece) {
  if (piece == null) return '';
  if (typeof piece === 'string') return piece;
  if (typeof piece === 'object') {
    return [
      piece.title,
      piece.body,
      piece.content_text,
      piece.text,
      piece.summary,
      piece.url,
    ]
      .filter(Boolean)
      .map((v) => String(v))
      .join('\n\n');
  }
  return String(piece);
}

function extractArrayLike(parsed, keys) {
  if (!parsed || typeof parsed !== 'object') return null;
  for (const key of keys) {
    const value = parsed[key];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) return [value.trim()];
  }
  return null;
}

function coerceArray(value) {
  if (Array.isArray(value)) return value.filter((item) => item != null).map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/\n{2,}|\r?\n(?=\s*[-*•\d])/).map((s) => s.trim()).filter(Boolean);
  if (value == null) return [];
  return [String(value).trim()].filter(Boolean);
}

function parseLinkedInCarousel(text) {
  const parsed = safeJsonParse(text);
  const slides =
    extractArrayLike(parsed, ['slides', 'carousel', 'linkedin_carousel', 'cards']) ??
    coerceArray(text)
      .map((line) => line.replace(/^\s*(?:slide\s*\d+[:\-]?\s*|[-*•]\s*)/i, '').trim())
      .filter(Boolean);

  return slides;
}

function parseShortClips(text) {
  const parsed = safeJsonParse(text);
  const clips =
    extractArrayLike(parsed, ['clips', 'short_clips', 'shorts', 'segments']) ??
    coerceArray(text)
      .map((line) => line.replace(/^\s*(?:clip\s*\d+[:\-]?\s*|[-*•]\s*)/i, '').trim())
      .filter(Boolean);

  return clips;
}

function parseEmailSegments(text) {
  const parsed = safeJsonParse(text);
  const segments =
    extractArrayLike(parsed, ['segments', 'email_segments', 'emails', 'newsletter_segments']) ??
    coerceArray(text)
      .map((line) => line.replace(/^\s*(?:segment\s*\d+[:\-]?\s*|[-*•]\s*)/i, '').trim())
      .filter(Boolean);

  return segments;
}

function buildPrompt(format, sourceText) {
  const base = `Repurpose the following source piece into ${format}. Return concise, production-ready output for that format only.

SOURCE PIECE:
${sourceText}`;

  if (format === 'linkedin_carousel') {
    return `${base}

Requirements:
- Return 5 to 10 slides.
- Each slide should be a short, punchy line or paragraph.
- Optimize for a LinkedIn carousel.
- Prefer strong hooks, clear progression, and a closing CTA.
- Output as JSON with a "slides" array or as plain slides separated clearly.`;
  }

  if (format === 'short_clips') {
    return `${base}

Requirements:
- Return 3 to 8 short clip ideas.
- Each clip should include a tight hook and a single core idea.
- Optimize for repurposing into short-form video clips.
- Output as JSON with a "clips" array or as plain clip entries clearly separated.`;
  }

  if (format === 'email_segments') {
    return `${base}

Requirements:
- Return 3 to 6 email segments.
- Each segment should be a useful standalone email angle, section, or excerpt.
- Optimize for email repurposing.
- Output as JSON with a "segments" array or as plain segments clearly separated.`;
  }

  return base;
}

export async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] } = {}) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'callCouncilMember is required' };
    }

    const requestedFormats = normalizeFormats(formats);
    const sourceText = toPlainText(piece);

    const outputs = {};

    for (const format of requestedFormats) {
      const prompt = buildPrompt(format, sourceText);
      const raw = await callCouncilMember('content_repurposer', prompt, { format });

      if (format === 'linkedin_carousel') {
        outputs.linkedin_carousel = parseLinkedInCarousel(raw);
      } else if (format === 'short_clips') {
        outputs.short_clips = parseShortClips(raw);
      } else if (format === 'email_segments') {
        outputs.email_segments = parseEmailSegments(raw);
      }
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