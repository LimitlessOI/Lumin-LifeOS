// SYNOPSIS: Score a script against the Earned Attention Script Framework blocks.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const BLOCKS = [
  { key: '0-15s', start: 0, end: 15, label: '0-15s hook' },
  { key: '15-30s', start: 15, end: 30, label: '15-30s prove' },
  { key: '30-60s', start: 30, end: 60, label: '30-60s value' },
  { key: '1-2min', start: 60, end: 120, label: '1-2min deepen' },
  { key: '2-5min', start: 120, end: 300, label: '2-5min substance' },
  { key: '5min+', start: 300, end: Infinity, label: '5min+ payoff' },
];

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function countWords(text) {
  const t = normalizeText(text);
  if (!t) return 0;
  const matches = t.match(/\b[\p{L}\p{N}'-]+\b/gu);
  return matches ? matches.length : 0;
}

function estimateSecondsByWords(wordCount) {
  if (!wordCount) return 0;
  return Math.max(1, Math.round(wordCount / 2.5));
}

function splitIntoSentences(text) {
  const t = normalizeText(text);
  if (!t) return [];
  const parts = t.split(/(?<=[.!?])\s+|\n+/g).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [t];
}

function extractJson(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;

  const candidates = [];
  candidates.push(raw);

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(raw.slice(firstBrace, lastBrace + 1));
  }

  const firstBracket = raw.indexOf('[');
  const lastBracket = raw.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    candidates.push(raw.slice(firstBracket, lastBracket + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

function parseModelText(text) {
  const parsed = extractJson(text);
  if (parsed && typeof parsed === 'object') return { ok: true, data: parsed };
  return { ok: false, reason: 'unparseable_model_output', raw: String(text ?? '') };
}

function buildPrompt(scriptText) {
  return [
    'You score a script against the Earned Attention Script Framework.',
    'Return ONLY valid JSON with shape:',
    '{',
    '  "blocks": [',
    '    {"block":"0-15s hook","delivered":true|false,"plantsNextHook":true|false,"note":"..."}',
    '  ],',
    '  "overall": {',
    '    "retentionRisk":"low"|"med"|"high",',
    '    "weakestBlock":"...",',
    '    "notes":["..."]',
    '  }',
    '}',
    'Rules:',
    '- Evaluate these blocks in order: 0-15s hook, 15-30s prove, 30-60s value, 1-2min deepen, 2-5min substance, 5min+ payoff.',
    '- "delivered" means the block clearly accomplishes its expected job.',
    '- "plantsNextHook" means the block creates curiosity or continuity into the next block.',
    '- "weakestBlock" must be one of the block labels.',
    '- Keep notes concise and grounded in the script.',
    '',
    'SCRIPT:',
    scriptText,
  ].join('\n');
}

function heuristicScore(scriptText) {
  const text = normalizeText(scriptText);
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const totalWords = words.length;
  const approxSeconds = estimateSecondsByWords(totalWords);
  const sentences = splitIntoSentences(text);

  const blockWordTargets = [
    38, // 0-15s
    38, // 15-30s
    75, // 30-60s
    150, // 1-2min
    375, // 2-5min
    250, // 5min+
  ];

  let cursor = 0;
  const blocks = BLOCKS.map((b, idx) => {
    const target = blockWordTargets[idx];
    const slice = words.slice(cursor, cursor + target).join(' ');
    cursor += target;
    const sliceWordCount = countWords(slice);
    const delivered = sliceWordCount >= Math.max(10, Math.round(target * 0.55)) || totalWords > b.start * 2;
    const plantsNextHook = idx < BLOCKS.length - 1
      ? /(\?|subscribe|next|coming up|in a second|here's why|watch|stay|but|however|and then|we'll|you'll see)/i.test(slice)
      : /(\?|subscribe|follow|part two|next time|more)/i.test(slice);

    return {
      block: b.label,
      delivered,
      plantsNextHook,
      note: slice
        ? `Heuristic pass based on ${sliceWordCount} words sampled from this block; script length is about ${approxSeconds}s total.`
        : 'No clear content detected in this block.',
    };
  });

  const deliveredCount = blocks.filter((b) => b.delivered).length;
  const weakest = blocks.find((b) => !b.delivered) || blocks[Math.max(0, blocks.length - 1)];
  const retentionRisk = deliveredCount >= 5 ? 'low' : deliveredCount >= 3 ? 'med' : 'high';

  return {
    blocks,
    overall: {
      retentionRisk,
      weakestBlock: weakest.block,
      notes: [
        `Estimated length: ~${approxSeconds}s from ${totalWords} words.`,
        deliveredCount < 6 ? 'Some blocks appear under-developed or missing based on length and signal density.' : 'All blocks appear substantially delivered.',
      ],
    },
  };
}

function normalizeModelResult(result) {
  if (!result || typeof result !== 'object') {
    return { ok: false, error: { reason: 'invalid_model_result' } };
  }

  const blocks = Array.isArray(result.blocks) ? result.blocks : [];
  const normalizedBlocks = BLOCKS.map((template) => {
    const found = blocks.find((b) => b && b.block === template.label) || {};
    return {
      block: template.label,
      delivered: Boolean(found.delivered),
      plantsNextHook: Boolean(found.plantsNextHook),
      note: String(found.note ?? '').trim(),
    };
  });

  const overall = result.overall && typeof result.overall === 'object' ? result.overall : {};
  const retentionRisk = ['low', 'med', 'high'].includes(overall.retentionRisk) ? overall.retentionRisk : 'med';
  const weakestBlock = BLOCKS.some((b) => b.label === overall.weakestBlock)
    ? overall.weakestBlock
    : normalizedBlocks.find((b) => !b.delivered)?.block || normalizedBlocks[0].block;

  const notes = Array.isArray(overall.notes) ? overall.notes.map((n) => String(n)) : [];

  return {
    ok: true,
    data: {
      blocks: normalizedBlocks,
      overall: {
        retentionRisk,
        weakestBlock,
        notes,
      },
    },
  };
}

export async function scoreEarnedAttention({ callCouncilMember, scriptText }) {
  try {
    const script = normalizeText(scriptText);
    if (!script) {
      return {
        ok: true,
        blocks: BLOCKS.map((b) => ({
          block: b.label,
          delivered: false,
          plantsNextHook: false,
          note: 'Empty script.',
        })),
        overall: {
          retentionRisk: 'high',
          weakestBlock: '0-15s hook',
          notes: ['No script text provided.'],
        },
      };
    }

    if (typeof callCouncilMember !== 'function') {
      const scored = heuristicScore(script);
      return { ok: true, ...scored, notes: scored.overall.notes };
    }

    const prompt = buildPrompt(script);
    let modelText;
    try {
      modelText = await callCouncilMember('content-intelligence', prompt, { temperature: 0.2 });
    } catch (error) {
      const scored = heuristicScore(script);
      return {
        ok: true,
        ...scored,
        notes: [
          `Model call failed; used heuristic fallback.`,
          ...(scored.overall.notes || []),
        ],
      };
    }

    const parsed = parseModelText(modelText);
    if (!parsed.ok) {
      const scored = heuristicScore(script);
      return {
        ok: true,
        ...scored,
        notes: [
          'Model output unparseable; used heuristic fallback.',
          ...(scored.overall.notes || []),
        ],
      };
    }

    const normalized = normalizeModelResult(parsed.data);
    if (!normalized.ok) {
      const scored = heuristicScore(script);
      return { ok: true, ...scored };
    }

    return {
      ok: true,
      ...normalized.data,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        reason: 'scoreEarnedAttention_failed',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export default scoreEarnedAttention;