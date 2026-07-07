// SYNOPSIS: SocialMediaOS content repurposing helper for transforming a source piece into requested downstream formats.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set(['linkedin_carousel', 'short_clips', 'email_segments']);

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {}

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {}
  }

  const firstObj = trimmed.indexOf('{');
  const lastObj = trimmed.lastIndexOf('}');
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    try {
      return JSON.parse(trimmed.slice(firstObj, lastObj + 1));
    } catch {}
  }

  return null;
}

function normalizePiece(piece) {
  if (piece == null) return { text: '' };
  if (typeof piece === 'string') return { text: piece };
  if (typeof piece === 'object') {
    const text =
      typeof piece.body === 'string'
        ? piece.body
        : typeof piece.content_text === 'string'
          ? piece.content_text
          : typeof piece.text === 'string'
            ? piece.text
            : typeof piece.title === 'string'
              ? piece.title
              : '';
    return { ...piece, text };
  }
  return { text: String(piece) };
}

function buildPrompt(format, sourcePiece) {
  const title = sourcePiece.title ? `Title: ${sourcePiece.title}\n` : '';
  const body = sourcePiece.body ? `Body:\n${sourcePiece.body}\n` : '';
  const contentText = sourcePiece.content_text ? `Content text:\n${sourcePiece.content_text}\n` : '';
  const url = sourcePiece.url ? `URL: ${sourcePiece.url}\n` : '';
  const author = sourcePiece.author ? `Author: ${sourcePiece.author}\n` : '';

  if (format === 'linkedin_carousel') {
    return [
      'Transform the source piece into a LinkedIn carousel outline.',
      'Return JSON only with a top-level object: {"slides":["slide 1","slide 2", ...]}.',
      'Create concise slides optimized for LinkedIn carousel readability.',
      'Aim for 6-10 slides if the content supports it.',
      'Each slide should be one short block of text, with optional emoji if appropriate.',
      'Do not include markdown fences or commentary.',
      '',
      title + author + url + body + contentText,
    ].join('\n');
  }

  if (format === 'short_clips') {
    return [
      'Transform the source piece into short clip ideas/scripts.',
      'Return JSON only with a top-level object: {"clips":["clip 1","clip 2", ...]}.',
      'Each clip should be short, punchy, and production-friendly.',
      'Prefer hooks, takeaway lines, and scene/action beats.',
      'Do not include markdown fences or commentary.',
      '',
      title + author + url + body + contentText,
    ].join('\n');
  }

  if (format === 'email_segments') {
    return [
      'Transform the source piece into email marketing segments.',
      'Return JSON only with a top-level object: {"segments":["segment 1","segment 2", ...]}.',
      'Each segment should be a self-contained email block or section with a clear purpose.',
      'Prefer subject-line hooks, intro, body, and CTA structure when useful.',
      'Do not include markdown fences or commentary.',
      '',
      title + author + url + body + contentText,
    ].join('\n');
  }

  return '';
}

function coerceArrayFromParsed(parsed, format) {
  if (!parsed || typeof parsed !== 'object') return [];
  const candidates =
    format === 'linkedin_carousel'
      ? [parsed.slides, parsed.carousel, parsed.output, parsed.items]
      : format === 'short_clips'
        ? [parsed.clips, parsed.short_clips, parsed.output, parsed.items]
        : [parsed.segments, parsed.email_segments, parsed.output, parsed.items];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => {
          if (item == null) return '';
          if (typeof item === 'string') return item.trim();
          if (typeof item === 'object') {
            if (typeof item.text === 'string') return item.text.trim();
            if (typeof item.content === 'string') return item.content.trim();
            if (typeof item.body === 'string') return item.body.trim();
            return JSON.stringify(item);
          }
          return String(item).trim();
        })
        .filter(Boolean);
    }
  }

  if (typeof parsed === 'string') {
    return parsed
      .split(/\n{2,}|\n-\s+|\n\d+\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

function fallbackByFormat(format, sourcePiece) {
  const text = sourcePiece.text || '';
  const title = sourcePiece.title || 'Source piece';
  const trimmed = text.trim();

  if (format === 'linkedin_carousel') {
    const chunks = trimmed
      ? trimmed
          .split(/\n{2,}/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const slides = [
      title,
      chunks[0] || trimmed.slice(0, 180) || 'Key idea',
      chunks[1] || 'Main takeaway',
      chunks[2] || 'Practical application',
      chunks[3] || 'Next step',
    ].filter(Boolean);
    return slides.slice(0, 10);
  }

  if (format === 'short_clips') {
    const lines = trimmed
      ? trimmed
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const clips = [
      lines[0] || trimmed.slice(0, 140) || title,
      lines[1] || 'Hook + takeaway',
      lines[2] || 'Visual beat / CTA',
    ].filter(Boolean);
    return clips.slice(0, 8);
  }

  if (format === 'email_segments') {
    const parts = trimmed
      ? trimmed
          .split(/\n{2,}/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const segments = [
      `Subject: ${title}`,
      parts[0] || trimmed.slice(0, 220) || 'Intro segment',
      parts[1] || 'Body segment',
      parts[2] || 'CTA segment',
    ].filter(Boolean);
    return segments.slice(0, 8);
  }

  return [];
}

export async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] } = {}) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'callCouncilMember must be a function' };
    }

    const sourcePiece = normalizePiece(piece);
    const requestedFormats = Array.isArray(formats) ? formats : [formats];
    const validFormats = [...new Set(requestedFormats)].filter((format) => KNOWN_FORMATS.has(format));

    const outputs = {};

    for (const format of validFormats) {
      const prompt = buildPrompt(format, sourcePiece);
      let raw = '';
      try {
        raw = await callCouncilMember('content_repurposer', prompt, { format, source: 'repurposePiece' });
      } catch (error) {
        raw = '';
      }

      const parsed = safeJsonParse(raw);
      const items = coerceArrayFromParsed(parsed, format);
      outputs[format] = items.length ? items : fallbackByFormat(format, sourcePiece);
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