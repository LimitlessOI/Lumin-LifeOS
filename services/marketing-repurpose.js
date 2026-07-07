// SYNOPSIS: @ssot docs/products/marketingos/PRODUCT_HOME.md

const KNOWN_FORMATS = new Set(['linkedin_carousel', 'short_clips', 'email_segments']);

function safeString(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function normalizeFormats(formats) {
  const input = Array.isArray(formats) ? formats : ['linkedin_carousel', 'short_clips', 'email_segments'];
  return [...new Set(input)].filter((format) => KNOWN_FORMATS.has(format));
}

function extractJsonCandidate(text) {
  const raw = safeString(text).trim();
  if (!raw) return null;

  const directParses = [raw];
  const firstBrace = raw.indexOf('{');
  const firstBracket = raw.indexOf('[');
  if (firstBrace >= 0) directParses.push(raw.slice(firstBrace));
  if (firstBracket >= 0) directParses.push(raw.slice(firstBracket));

  for (const candidate of directParses) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function stringifyItem(item) {
  if (typeof item === 'string') return item;
  if (item == null) return '';
  if (typeof item === 'number' || typeof item === 'boolean') return String(item);
  if (typeof item === 'object') {
    const candidates = [
      item.text,
      item.copy,
      item.content,
      item.body,
      item.slide,
      item.caption,
      item.title,
      item.subject,
      item.email,
      item.segment,
      item.hook,
      item.bullet,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
    try {
      return JSON.stringify(item);
    } catch {
      return '';
    }
  }
  return '';
}

function pickSourceText(piece) {
  if (!piece || typeof piece !== 'object') return safeString(piece);
  const parts = [
    piece.title,
    piece.body,
    piece.content_text,
    piece.content,
    piece.summary,
    piece.source_text,
    piece.text,
    piece.url,
  ];
  return parts.map(safeString).filter(Boolean).join('\n\n').trim();
}

function buildPrompt(format, sourceText) {
  if (format === 'linkedin_carousel') {
    return [
      'Transform the source piece into a LinkedIn carousel.',
      'Return JSON only with a top-level object containing a slides array.',
      'Each slide should be concise, punchy, and standalone.',
      'Aim for 8-10 slides when possible.',
      'Source piece:',
      sourceText,
    ].join('\n');
  }

  if (format === 'short_clips') {
    return [
      'Transform the source piece into short clip concepts for social/video repurposing.',
      'Return JSON only with a top-level object containing a clips array.',
      'Each clip item should include a short title and concise script or talking points.',
      'Aim for 3-7 clips when possible.',
      'Source piece:',
      sourceText,
    ].join('\n');
  }

  if (format === 'email_segments') {
    return [
      'Transform the source piece into email segments.',
      'Return JSON only with a top-level object containing an emails array.',
      'Each email item should include a subject and body, concise but useful.',
      'Aim for 3-5 segments when possible.',
      'Source piece:',
      sourceText,
    ].join('\n');
  }

  return [
    'Repurpose the source piece for the requested format.',
    'Return JSON only.',
    'Source piece:',
    sourceText,
  ].join('\n');
}

function parseFormatOutput(format, modelText) {
  const parsed = extractJsonCandidate(modelText);

  if (format === 'linkedin_carousel') {
    const slides =
      asArray(parsed?.slides)
        .map(stringifyItem)
        .filter(Boolean);

    if (slides.length) return slides;

    const fallback = safeString(modelText)
      .split(/\n+/)
      .map((line) => line.replace(/^[-*•\d.\s]+/, '').trim())
      .filter(Boolean);

    return fallback.slice(0, 12);
  }

  if (format === 'short_clips') {
    const clips =
      asArray(parsed?.clips)
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            const title = safeString(item.title || item.name || item.hook).trim();
            const script = safeString(item.script || item.body || item.text || item.talking_points).trim();
            const combined = [title, script].filter(Boolean).join(' — ');
            return combined || stringifyItem(item).trim();
          }
          return stringifyItem(item).trim();
        })
        .filter(Boolean);

    if (clips.length) return clips;

    const fallback = safeString(modelText)
      .split(/\n+/)
      .map((line) => line.replace(/^[-*•\d.\s]+/, '').trim())
      .filter(Boolean);

    return fallback.slice(0, 8);
  }

  if (format === 'email_segments') {
    const emails =
      asArray(parsed?.emails)
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            const subject = safeString(item.subject || item.title || item.heading).trim();
            const body = safeString(item.body || item.content || item.text || item.copy).trim();
            if (subject || body) return [subject ? `Subject: ${subject}` : '', body].filter(Boolean).join('\n');
            return stringifyItem(item).trim();
          }
          return stringifyItem(item).trim();
        })
        .filter(Boolean);

    if (emails.length) return emails;

    const fallback = safeString(modelText)
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    return fallback.slice(0, 6);
  }

  return [];
}

export async function repurposePiece({ callCouncilMember, piece, formats = ['linkedin_carousel', 'short_clips', 'email_segments'] }) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: { message: 'callCouncilMember is required' } };
    }

    const requestedFormats = normalizeFormats(formats);
    const sourceText = pickSourceText(piece);

    const outputs = {};

    for (const format of requestedFormats) {
      const prompt = buildPrompt(format, sourceText);
      const modelText = await callCouncilMember('content_intelligence', prompt, { format, piece });
      outputs[format] = parseFormatOutput(format, modelText);
    }

    return { ok: true, outputs };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : 'repurposePiece failed',
      },
    };
  }
}

export default repurposePiece;