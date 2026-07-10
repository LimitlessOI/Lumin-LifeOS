// SYNOPSIS: SocialMediaOS Earned Attention script scorer.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const BLOCKS = [
  { key: 'hook', label: '0-15s hook', start: 0, end: 15 },
  { key: 'prove', label: '15-30s prove', start: 15, end: 30 },
  { key: 'value', label: '30-60s value', start: 30, end: 60 },
  { key: 'deepen', label: '1-2min deepen', start: 60, end: 120 },
  { key: 'substance', label: '2-5min substance', start: 120, end: 300 },
  { key: 'payoff', label: '5min+ payoff', start: 300, end: Infinity },
];

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const candidates = [];
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  if (firstBrace >= 0) candidates.push(trimmed.slice(firstBrace));
  if (firstBracket >= 0) candidates.push(trimmed.slice(firstBracket));
  candidates.unshift(trimmed);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }

  return null;
}

function normalizeText(v) {
  return typeof v === 'string' ? v : '';
}

function splitScriptIntoBlocks(scriptText) {
  const text = normalizeText(scriptText);
  const lower = text.toLowerCase();

  const markers = [
    { key: 'hook', patterns: [/hook/i, /0\s*[-–]?\s*15\ss/i, /first\s*15/i] },
    { key: 'prove', patterns: [/prove/i, /15\s*[-–]?\s*30\ss/i] },
    { key: 'value', patterns: [/value/i, /30\s*[-–]?\s*60\ss/i] },
    { key: 'deepen', patterns: [/deepen/i, /1\s*[-–]?\s*2\smin/i] },
    { key: 'substance', patterns: [/substance/i, /2\s*[-–]?\s*5\smin/i] },
    { key: 'payoff', patterns: [/payoff/i, /5\s*\+?\smin/i] },
  ];

  const found = [];
  for (const marker of markers) {
    for (const pattern of marker.patterns) {
      const m = lower.match(pattern);
      if (m) {
        found.push({ key: marker.key, index: m.index ?? -1, length: m[0].length });
        break;
      }
    }
  }
  found.sort((a, b) => a.index - b.index);

  if (found.length >= 2) {
    const segments = [];
    for (let i = 0; i < found.length; i++) {
      const cur = found[i];
      const next = found[i + 1];
      const start = Math.max(0, cur.index);
      const end = next ? Math.max(start, next.index) : text.length;
      segments.push({ key: cur.key, text: text.slice(start, end).trim() });
    }
    return segments;
  }

  const parts = text
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const chunkSize = Math.max(1, Math.ceil(parts.length / BLOCKS.length));
    return BLOCKS.map((b, idx) => ({
      key: b.key,
      text: parts.slice(idx * chunkSize, (idx + 1) * chunkSize).join('\n\n').trim(),
    }));
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!sentences.length) return BLOCKS.map((b) => ({ key: b.key, text: '' }));

  const chunkSize = Math.max(1, Math.ceil(sentences.length / BLOCKS.length));
  const segments = BLOCKS.map((b, idx) => ({
    key: b.key,
    text: sentences.slice(idx * chunkSize, (idx + 1) * chunkSize).join(' ').trim(),
  }));

  while (segments.length < BLOCKS.length) segments.push({ key: BLOCKS[segments.length].key, text: '' });
  return segments.slice(0, BLOCKS.length);
}

function scoreSegment(segmentText, blockKey) {
  const text = normalizeText(segmentText);
  const lower = text.toLowerCase();

  const hasAny = (...patterns) => patterns.some((p) => p.test(lower));
  const wordCount = lower.split(/\s+/).filter(Boolean).length;

  let delivered = false;
  let plantsNextHook = false;
  let note = 'insufficient evidence';

  if (!text) {
    return { delivered: false, plantsNextHook: false, note: 'empty segment' };
  }

  switch (blockKey) {
    case 'hook':
      delivered = hasAny(/\b(you|your|imagine|stop|why|what if|here's|today)\b/, /\?/);
      plantsNextHook = hasAny(/\b(but|however|next|wait|and then|here's the catch|stay tuned)\b/);
      note = delivered ? 'opens with attention-grabbing framing' : 'no clear attention hook';
      break;
    case 'prove':
      delivered = hasAny(/\b(proof|result|numbers?|stats?|case study|example|here's what happened|show)\b/);
      plantsNextHook = hasAny(/\b(so|which means|that said|this matters|because)\b/);
      note = delivered ? 'includes proof or evidence' : 'proof is not explicit';
      break;
    case 'value':
      delivered = hasAny(/\b(value|steps?|framework|takeaway|learn|apply|use this|tips?)\b/) || wordCount >= 20;
      plantsNextHook = hasAny(/\b(also|next|then|more importantly|now)\b/);
      note = delivered ? 'delivers usable value' : 'value is thin';
      break;
    case 'deepen':
      delivered = hasAny(/\b(why it works|deeper|root cause|trade-off|nuance|context)\b/) || wordCount >= 35;
      plantsNextHook = hasAny(/\b(so what's next|keep going|the real issue|the key)\b/);
      note = delivered ? 'adds depth and explanation' : 'depth is limited';
      break;
    case 'substance':
      delivered = hasAny(/\b(implementation|process|system|details|mechanics|operating)\b/) || wordCount >= 50;
      plantsNextHook = hasAny(/\b(lastly|one more thing|finally|in practice|to make it work)\b/);
      note = delivered ? 'has substantial content' : 'substance is light';
      break;
    case 'payoff':
      delivered = hasAny(/\b(so what|bottom line|result|payoff|outcome|action|next step|call to action)\b/) || wordCount >= 15;
      plantsNextHook = hasAny(/\b(next time|follow for|part 2|if you want more)\b/);
      note = delivered ? 'lands the payoff or CTA' : 'payoff is not clear';
      break;
    default:
      note = 'unknown block';
  }

  return { delivered, plantsNextHook, note };
}

function computeRetentionRisk(results) {
  const deliveredCount = results.filter((r) => r.delivered).length;
  const weakestIndex = results.findIndex((r) => !r.delivered);
  if (deliveredCount >= 5) return 'low';
  if (deliveredCount >= 3) return 'med';
  return 'high';
}

export async function scoreEarnedAttention({ callCouncilMember, scriptText } = {}) {
  try {
    if (typeof callCouncilMember !== 'function') {
      return {
        ok: false,
        error: 'missing_callCouncilMember',
      };
    }

    const text = normalizeText(scriptText);
    const segments = splitScriptIntoBlocks(text);

    const blockResults = segments.map((segment, idx) => {
      const scored = scoreSegment(segment.text, BLOCKS[idx].key);
      return {
        block: BLOCKS[idx].label,
        ...scored,
      };
    });

    const weakestBlock = blockResults.find((b) => !b.delivered)?.block ?? blockResults[0]?.block ?? null;
    const retentionRisk = computeRetentionRisk(blockResults);

    const councilPrompt = [
      'Score this social media script for earned attention.',
      'Use the framework blocks: 0-15s hook, 15-30s prove, 30-60s value, 1-2min deepen, 2-5min substance, 5min+ payoff.',
      'Return only concise JSON with overall judgment and one short note per weak block.',
      '',
      `Script:\n${text}`,
    ].join('\n');

    let councilRaw = '';
    try {
      councilRaw = await callCouncilMember('gemini_flash', councilPrompt, { temperature: 0.1 });
    } catch (e) {
      councilRaw = '';
    }

    const councilParsed = safeJsonParse(councilRaw);
    const councilNotes = Array.isArray(councilParsed?.notes)
      ? councilParsed.notes.map((n) => String(n)).filter(Boolean)
      : [];

    return {
      ok: true,
      blocks: blockResults,
      overall: {
        retentionRisk,
        weakestBlock,
        notes: councilNotes.length ? councilNotes : blockResults.filter((b) => !b.delivered).map((b) => `${b.block}: ${b.note}`),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default scoreEarnedAttention;

// ASSUMPTIONS:
// - Script text is free-form and may or may not include explicit time markers; segmentation falls back to paragraph/sentence distribution.
// - The AI hook is used as a secondary advisory input, but the module remains functional without relying on its output structure.
