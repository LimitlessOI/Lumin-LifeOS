// SYNOPSIS: Generate a 50-title universe for a marketing topic, score variations, and return the top 5.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;

  const trimmed = text.trim();
  const candidates = [];

  candidates.push(trimmed);

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) candidates.push(fenced[1].trim());

  const firstObj = trimmed.indexOf('{');
  const lastObj = trimmed.lastIndexOf('}');
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    candidates.push(trimmed.slice(firstObj, lastObj + 1));
  }

  const firstArr = trimmed.indexOf('[');
  const lastArr = trimmed.lastIndexOf(']');
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    candidates.push(trimmed.slice(firstArr, lastArr + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function coerceScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(n)));
  return clamped;
}

function dedupeTitles(titles, count) {
  const out = [];
  const seen = new Set();

  for (const item of Array.isArray(titles) ? titles : []) {
    const text = normalizeText(item && typeof item === 'object' ? item.text : item);
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      text,
      score: coerceScore(item && typeof item === 'object' ? item.score : undefined) ?? 0,
      rationale: normalizeText(item && typeof item === 'object' ? item.rationale : '')
    });

    if (out.length >= count) break;
  }

  return out;
}

function pickTop5(titles) {
  return [...titles]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.text.localeCompare(b.text))
    .slice(0, 5);
}

async function generateTitleUniverse({ callCouncilMember, topic, transcript, count = 50 } = {}) {
  try {
    const normalizedCount = Number.isFinite(Number(count)) ? Math.max(1, Math.min(100, Math.floor(Number(count)))) : 50;
    const cleanTopic = normalizeText(topic);
    const cleanTranscript = normalizeText(transcript);

    if (typeof callCouncilMember !== 'function') {
      return { ok: false, error: 'missing_callCouncilMember' };
    }

    if (!cleanTopic) {
      return { ok: false, error: 'missing_topic' };
    }

    const prompt = [
      'You are generating a "title universe" for marketing content.',
      `Topic: ${cleanTopic}`,
      cleanTranscript ? `Transcript/context: ${cleanTranscript}` : 'Transcript/context: (none)',
      '',
      `Produce exactly ${normalizedCount} DISTINCT title variations.`,
      'Then score each title from 0-100 using curiosity, clarity, and specificity.',
      'Return ONLY valid JSON, but if you include prose I will try to extract the JSON.',
      'Desired JSON shape:',
      '{ "titles": [ { "text": "Title", "score": 0, "rationale": "brief rationale" } ] }',
      'Rules:',
      '- Titles must be distinct.',
      '- Keep titles concise and usable.',
      '- Score should reflect curiosity/clarity/specificity.',
      '- rationales should be brief.'
    ].join('\n');

    const raw = await callCouncilMember('editor', prompt);

    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, reason: 'unparseable_model_output', raw };
    }

    let titles = [];
    if (Array.isArray(parsed)) {
      titles = parsed;
    } else if (Array.isArray(parsed.titles)) {
      titles = parsed.titles;
    } else if (parsed.data && Array.isArray(parsed.data.titles)) {
      titles = parsed.data.titles;
    } else {
      return { ok: false, reason: 'unparseable_model_output', raw };
    }

    const normalizedTitles = dedupeTitles(titles, normalizedCount);
    if (!normalizedTitles.length) {
      return { ok: false, reason: 'unparseable_model_output', raw };
    }

    const top5 = pickTop5(normalizedTitles);

    return {
      ok: true,
      titles: normalizedTitles,
      top5
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export { generateTitleUniverse };
export default generateTitleUniverse;