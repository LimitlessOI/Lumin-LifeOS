/**
 * SYNOPSIS: Exports generateWellnessInsight — services/wellness-studio-ai.js.
 */
export async function generateWellnessInsight(userId, sessionContext, callCouncilMember) {
  if (typeof callCouncilMember !== 'function') {
    throw new TypeError('generateWellnessInsight requires a callCouncilMember function');
  }

  const ctx = sessionContext && typeof sessionContext === 'object' ? sessionContext : {};
  const joyScore = ctx.joy_score ?? ctx.joyScore ?? null;
  const integrityScore = ctx.integrity_score ?? ctx.integrityScore ?? null;
  const wearableSummary = ctx.wearable_summary ?? ctx.wearableSummary ?? '';
  const emotionalPattern = ctx.emotional_pattern ?? ctx.emotionalPattern ?? '';

  const prompt = [
    'You are a wellness coach generating a concise structured insight for LifeOS.',
    `User ID: ${userId ?? 'unknown'}`,
    `Joy score: ${joyScore ?? 'unknown'}`,
    `Integrity score: ${integrityScore ?? 'unknown'}`,
    `Wearable summary: ${wearableSummary || 'none provided'}`,
    `Emotional pattern: ${emotionalPattern || 'none provided'}`,
    '',
    'Return a compact JSON object with exactly these keys:',
    'insight_type',
    'content',
    'confidence_score',
    '',
    'Guidance:',
    '- insight_type should be a short categorical label such as "pattern", "recommendation", or "reflection".',
    '- content should be one to three sentences, specific to the session context.',
    '- confidence_score should be a number from 0 to 1.',
    '- Return JSON only if possible.'
  ].join('\n');

  const raw = await callCouncilMember('wellness-coach', prompt);

  return parseInsightResponse(raw);
}

function parseInsightResponse(raw) {
  const fallback = {
    insight_type: 'reflection',
    content: typeof raw === 'string' && raw.trim() ? raw.trim() : 'No insight returned.',
    confidence_score: 0.5
  };

  if (typeof raw !== 'string' || !raw.trim()) {
    return fallback;
  }

  const text = raw.trim();

  const jsonCandidate = extractJsonObject(text);
  if (jsonCandidate) {
    try {
      const parsed = JSON.parse(jsonCandidate);
      return normalizeInsight(parsed, text);
    } catch {
      // fall through to heuristic parsing
    }
  }

  return normalizeInsight(heuristicParse(text), text);
}

function extractJsonObject(text) {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

function heuristicParse(text) {
  const insightTypeMatch = text.match(/insight_type\s*[:=]\s*["']?([a-zA-Z_-]+)["']?/i);
  const contentMatch = text.match(/content\s*[:=]\s*["']?([\s\S]*?)(?:\n\w+\s*[:=]|$)/i);
  const confidenceMatch = text.match(/confidence_score\s*[:=]\s*([0-9]*\.?[0-9]+)/i);

  return {
    insight_type: insightTypeMatch?.[1],
    content: contentMatch?.[1]?.trim(),
    confidence_score: confidenceMatch ? Number(confidenceMatch[1]) : undefined
  };
}

function normalizeInsight(input, rawText) {
  const obj = input && typeof input === 'object' ? input : {};
  const insightType = normalizeInsightType(obj.insight_type ?? obj.insightType);
  const content = normalizeContent(obj.content ?? obj.summary ?? obj.insight ?? rawText);
  const confidenceScore = normalizeConfidence(obj.confidence_score ?? obj.confidenceScore);

  return {
    insight_type: insightType,
    content,
    confidence_score: confidenceScore
  };
}

function normalizeInsightType(value) {
  if (typeof value !== 'string' || !value.trim()) return 'reflection';
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeContent(value) {
  if (typeof value !== 'string') return 'No insight returned.';
  const trimmed = value.trim();
  return trimmed || 'No insight returned.';
}

function normalizeConfidence(value) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return 0.5;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
}