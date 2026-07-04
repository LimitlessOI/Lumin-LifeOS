/**
 * SYNOPSIS: Detect and classify commitment language in transcripts.
 * WIRED: service factory only; pair with route layer from existing factory pattern.
 * @ssot docs/products/WORD_KEEPER/WORD_KEEPER_HOME.md
 */

const DEFAULT_CLASSIFIER_MODEL = 'claude';

function normalizeText(value) {
  return String(value || '').trim();
}

function buildCommitmentPrompt(transcript, context = {}) {
  const payload = {
    transcript,
    context: {
      speaker: context.speaker || null,
      source: context.source || null,
      sessionId: context.sessionId || null,
      timestamp: context.timestamp || null,
    },
  };

  return [
    'Detect and classify commitment language in the transcript.',
    'Return strict JSON only with keys:',
    'commitment_detected (boolean),',
    'confidence (number 0 to 1),',
    'commitment_type (string: explicit_promise | intention | obligation | agreement | follow_through | schedule_commitment | uncertain | none),',
    'summary (string),',
    'evidence (array of strings),',
    'actionable_next_step (string|null).',
    '',
    'Rules:',
    '- Focus on future-oriented promises, obligations, agreements, and explicit follow-through.',
    '- If the text is merely a wish, idea, or vague intent, set commitment_detected false unless there is a concrete commitment.',
    '- Keep summary concise.',
    '- Evidence should quote exact phrases from the transcript when possible.',
    '',
    'INPUT:',
    JSON.stringify(payload),
  ].join('\n');
}

function safeParseJson(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  const text = String(raw).trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function coerceResult(result, transcript) {
  const obj = result && typeof result === 'object' ? result : {};
  const detected = Boolean(obj.commitment_detected);
  const confidenceNum = Number(obj.confidence);
  const commitmentType = normalizeText(obj.commitment_type) || (detected ? 'uncertain' : 'none');

  return {
    commitment_detected: detected,
    confidence: Number.isFinite(confidenceNum) ? Math.max(0, Math.min(1, confidenceNum)) : (detected ? 0.5 : 0.2),
    commitment_type: commitmentType,
    summary: normalizeText(obj.summary) || (detected ? 'Commitment language detected.' : 'No commitment language detected.'),
    evidence: Array.isArray(obj.evidence)
      ? obj.evidence.map((v) => normalizeText(v)).filter(Boolean)
      : [],
    actionable_next_step: obj.actionable_next_step == null ? null : normalizeText(obj.actionable_next_step) || null,
    transcript: normalizeText(transcript),
    raw: obj,
  };
}

export function createCommitmentClassifier({ callCouncilMember }) {
  if (typeof callCouncilMember !== 'function') {
    throw new TypeError('callCouncilMember_required');
  }

  async function classifyCommitment(transcript, context = {}) {
    const text = normalizeText(transcript);
    if (!text) {
      const err = new Error('transcript_required');
      err.status = 400;
      throw err;
    }

    const prompt = buildCommitmentPrompt(text, context);
    const response = await callCouncilMember(
      DEFAULT_CLASSIFIER_MODEL,
      prompt,
      { taskType: 'general' },
    );

    const parsed =
      safeParseJson(response?.content) ??
      safeParseJson(response?.text) ??
      safeParseJson(response) ??
      null;

    return coerceResult(parsed, text);
  }

  return {
    classifyCommitment,
  };
}