// SYNOPSIS: SocialMediaOS Earned Attention script scorer.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const BLOCKS = [
  { key: 'hook', label: '0-15s hook', min: 0, max: 15 },
  { key: 'prove', label: '15-30s prove', min: 15, max: 30 },
  { key: 'value', label: '30-60s value', min: 30, max: 60 },
  { key: 'deepen', label: '1-2min deepen', min: 60, max: 120 },
  { key: 'substance', label: '2-5min substance', min: 120, max: 300 },
  { key: 'payoff', label: '5min+ payoff', min: 300, max: Infinity },
];

function normalizeText(scriptText) {
  return String(scriptText ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function segmentScript(scriptText) {
  const text = normalizeText(scriptText);
  if (!text) return [];

  const lines = text.split('\n');
  const chunks = [];
  let current = [];

  for (const line of lines) {
    if (/^\s*(?:\d+[\).\:-]|[-*•])\s+/.test(line) && current.length) {
      chunks.push(current.join('\n').trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) chunks.push(current.join('\n').trim());

  if (chunks.length > 1) return chunks.filter(Boolean);

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) return [text];

  const approxTarget = Math.max(1, Math.ceil(sentences.length / BLOCKS.length));
  const segmented = [];
  for (let i = 0; i < sentences.length; i += approxTarget) {
    segmented.push(sentences.slice(i, i + approxTarget).join(' ').trim());
  }
  return segmented.filter(Boolean);
}

function extractJsonObject(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;

  const candidates = [];
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) candidates.push(text.slice(first, last + 1));
  candidates.push(text);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

function asBoolean(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(s)) return true;
    if (['false', 'no', 'n', '0'].includes(s)) return false;
  }
  return false;
}

function parseAssessment(raw) {
  const parsed = extractJsonObject(raw);
  if (!parsed) return { ok: false, reason: 'unparseable_model_output', raw };

  return {
    ok: true,
    parsed,
  };
}

function buildPrompt(block) {
  return [
    'You are scoring one script block in the Earned Attention Script Framework.',
    `Framework block: ${block.label}`,
    'Return ONLY valid JSON with keys:',
    '{',
    '  "delivered": boolean,',
    '  "plantsNextHook": boolean,',
    '  "note": string',
    '}',
    'Criteria:',
    '- delivered = this block accomplishes its intended job for the audience',
    '- plantsNextHook = it creates curiosity/continuity that naturally leads to the next block',
    '- note = concise reason grounded in the provided text',
  ].join('\n');
}

function makeFallbackAssessment(blockText, block) {
  const hasText = Boolean(blockText && blockText.trim());
  const length = blockText.trim().length;
  const delivered = hasText && length > 20;
  const plantsNextHook = hasText && /\?|\bnext\b|\bbut\b|\byet\b|\bhowever\b|\bthen\b/i.test(blockText);
  return {
    delivered,
    plantsNextHook,
    note: hasText
      ? 'Heuristic fallback used because model output could not be parsed.'
      : 'Empty block.',
  };
}

function computeRetentionRisk(blockResults) {
  const blocks = BLOCKS.map((b) => {
    const found = blockResults.find((r) => r.block === b.label);
    return found || { delivered: false, plantsNextHook: false };
  });

  const failed = blocks.filter((b) => !b.delivered).length;
  const weakContinuity = blocks.filter((b) => !b.plantsNextHook).length;

  if (failed >= 3 || weakContinuity >= 4) return 'high';
  if (failed >= 1 || weakContinuity >= 2) return 'med';
  return 'low';
}

export async function scoreEarnedAttention({ callCouncilMember, scriptText }) {
  try {
    const text = normalizeText(scriptText);
    const segments = segmentScript(text);
    const blockResults = [];

    for (let i = 0; i < BLOCKS.length; i += 1) {
      const block = BLOCKS[i];
      const blockText = segments[i] ?? '';
      const prompt = buildPrompt(block) + '\n\nSCRIPT BLOCK TEXT:\n' + (blockText || '[empty]');

      let raw;
      try {
        raw = await callCouncilMember('socialmediaos_earned_attention_scorer', prompt, {
          temperature: 0,
        });
      } catch (error) {
        raw = null;
      }

      const assessment = raw == null ? null : parseAssessment(raw);
      const result = assessment?.ok
        ? {
            delivered: asBoolean(assessment.parsed.delivered),
            plantsNextHook: asBoolean(assessment.parsed.plantsNextHook),
            note: String(assessment.parsed.note ?? '').trim() || 'No note provided.',
          }
        : makeFallbackAssessment(blockText, block);

      blockResults.push({
        block: block.label,
        delivered: result.delivered,
        plantsNextHook: result.plantsNextHook,
        note: result.note,
      });
    }

    const weakest = blockResults.find((b) => !b.delivered) || blockResults[0] || null;
    const retentionRisk = computeRetentionRisk(blockResults);
    const notes = blockResults
      .filter((b) => b.note)
      .map((b) => `${b.block}: ${b.note}`);

    return {
      ok: true,
      blocks: blockResults,
      overall: {
        retentionRisk,
        weakestBlock: weakest ? weakest.block : null,
        notes,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export default scoreEarnedAttention;