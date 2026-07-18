// SYNOPSIS: Generate a universe of title variations for a given SocialMediaOS topic, score them, and return the top 5.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
  const stripped = text
    .replace(/^\s*```(?:json|js|javascript|text)?\s*/im, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const candidates = [stripped];

  const firstArray = stripped.indexOf('[');
  const lastArray = stripped.lastIndexOf(']');
  if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
    candidates.push(stripped.slice(firstArray, lastArray + 1));
  }

  const firstObj = stripped.indexOf('{');
  const lastObj = stripped.lastIndexOf('}');
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    candidates.push(stripped.slice(firstObj, lastObj + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return null;
}

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function coerceTitleItem(item, index) {
  if (typeof item === 'string') {
    return {
      text: normalizeText(item),
      score: 0,
      rationale: '',
      _index: index,
    };
  }

  if (!item || typeof item !== 'object') {
    return {
      text: '',
      score: 0,
      rationale: '',
      _index: index,
    };
  }

  const text = normalizeText(item.text ?? item.title ?? item.name ?? '');
  const scoreNum = Number(item.score);
  const score = Number.isFinite(scoreNum) ? Math.max(0, Math.min(100, Math.round(scoreNum))) : 0;
  const rationale = normalizeText(item.rationale ?? item.reason ?? '');
  return { text, score, rationale, _index: index };
}

function dedupeTitles(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.text.toLowerCase();
    if (!item.text || seen.has(key)) continue;
    seen.add(key);
    out.push({
      text: item.text,
      score: item.score,
      rationale: item.rationale,
    });
  }
  return out;
}

function fallbackTop5(titles) {
  return titles.slice(0, 5);
}

export async function generateTitleUniverse({ callCouncilMember, topic, transcript, count = 50 } = {}) {
  try {
    const safeCount = Number.isFinite(Number(count)) ? Math.max(1, Math.min(100, Math.floor(Number(count)))) : 50;
    const normalizedTopic = normalizeText(topic);
    const normalizedTranscript = normalizeText(transcript);

    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'missing_callCouncilMember' };
    }

    if (!normalizedTopic) {
      return { ok: false, error: 'missing_topic' };
    }

    const prompt = [
      `Create exactly ${safeCount} distinct title variations for the topic below.`,
      `Return your result as JSON only: an array of objects with keys text (string), score (integer 0-100), and rationale (one short sentence).`,
      `The score must be a single integer, not an object.`,
      `Each title must be distinct, concise, and relevant.`,
      `Topic: ${normalizedTopic}`,
      normalizedTranscript ? `Transcript context: ${normalizedTranscript}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await callCouncilMember('gemini_flash', prompt, { maxOutputTokens: 2000 });

    const parsed = safeJsonParse(raw);
    let titlesSource = null;

    if (Array.isArray(parsed)) {
      titlesSource = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.titles)) titlesSource = parsed.titles;
      else if (Array.isArray(parsed.items)) titlesSource = parsed.items;
      else if (Array.isArray(parsed.data)) titlesSource = parsed.data;
    }

    if (!titlesSource) {
      return { ok: false, reason: 'unparseable_model_output', raw };
    }

    const cleaned = dedupeTitles(
      titlesSource
        .map(coerceTitleItem)
        .filter((item) => item.text)
    ).slice(0, safeCount);

    const sorted = [...cleaned].sort((a, b) => b.score - a.score || a.text.localeCompare(b.text));
    const top5 = fallbackTop5(sorted);

    return {
      ok: true,
      titles: sorted,
      top5,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default generateTitleUniverse;