// SYNOPSIS: Repurpose a source piece into requested social/media formats using the live council AI hook.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set(['linkedin_carousel', 'short_clips', 'email_segments']);

function safeString(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(safeString).join('\n');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function normalizeFormats(formats) {
  const input = Array.isArray(formats) ? formats : ['linkedin_carousel', 'short_clips', 'email_segments'];
  const seen = new Set();
  const result = [];
  for (const format of input) {
    if (typeof format !== 'string') continue;
    const normalized = format.trim();
    if (!KNOWN_FORMATS.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function extractBullets(text) {
  const source = safeString(text).trim();
  if (!source) return [];
  const lines = source
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = [];
  for (const line of lines) {
    const stripped = line.replace(/^(\s*[-*•]\s+|\s*\d+[\).\:-]\s+)/, '').trim();
    if (stripped) bullets.push(stripped);
  }

  if (bullets.length > 0) return bullets;

  const parts = source
    .split(/(?<=[.!?])\s+|\s*;\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : [source];
}

function splitIntoSlides(text) {
  const bullets = extractBullets(text);
  const maxSlides = 10;
  const slides = [];

  for (const bullet of bullets.slice(0, maxSlides)) {
    slides.push(bullet);
  }

  if (slides.length === 0) {
    slides.push('Hook the audience with the core idea.');
    slides.push('Expand on the strongest supporting point.');
    slides.push('End with a clear takeaway or CTA.');
  }

  return slides;
}

function parseShortClips(text) {
  const bullets = extractBullets(text);
  const maxClips = 6;
  const clips = bullets.slice(0, maxClips).map((item) => item.trim()).filter(Boolean);

  if (clips.length === 0) {
    clips.push(safeString(text).trim().slice(0, 240));
  }

  return clips;
}

function parseEmailSegments(text) {
  const bullets = extractBullets(text);
  const segments = [];
  const maxSegments = 5;

  if (bullets.length === 0) {
    const body = safeString(text).trim();
    if (body) {
      segments.push(body);
    }
    return segments.length > 0 ? segments.slice(0, maxSegments) : [''];
  }

  for (const bullet of bullets.slice(0, maxSegments)) {
    segments.push(bullet);
  }

  return segments;
}

async function repurposeForFormat(callCouncilMember, piece, format) {
  const pieceText = safeString(piece);
  const prompt = [
    `Repurpose the following source piece into a ${format}.`,
    'Return only the transformed content in a simple, parseable text format.',
    'Optimize for reuse and audience fit while preserving the core message.',
    '',
    'SOURCE PIECE:',
    pieceText,
  ].join('\n');

  const raw = await callCouncilMember('content-strategist', prompt, {
    format,
    source: 'repurposePiece',
  });

  const text = safeString(raw).trim();

  if (format === 'linkedin_carousel') return splitIntoSlides(text);
  if (format === 'short_clips') return parseShortClips(text);
  if (format === 'email_segments') return parseEmailSegments(text);
  return [];
}

export async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] }) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'callCouncilMember must be a function' };
    }

    const requestedFormats = normalizeFormats(formats);
    const outputs = {};

    for (const format of requestedFormats) {
      outputs[format] = await repurposeForFormat(callCouncilMember, piece, format);
    }

    return { ok: true, outputs };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : safeString(error),
    };
  }
}

export default repurposePiece;