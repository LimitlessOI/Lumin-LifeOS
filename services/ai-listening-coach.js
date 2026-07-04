/**
 * SYNOPSIS: Exports createAiListeningCoach — services/ai-listening-coach.js.
 */
export function createAiListeningCoach({ callCouncilMember }) {
  const ANALYSIS_TASK = 'Analyze practice sessions for pitch accuracy, rhythm, dynamics, and technique issues';

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }

  function clampScore(value) {
    const n = toNumber(value);
    if (n === null) return null;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function buildPrompt(session) {
    return [
      'You are analyzing a music practice session.',
      `Focus on: pitch accuracy, rhythm, dynamics, and technique issues.`,
      `Return concise coaching feedback and actionable next steps.`,
      `If specific session data is missing, note the limitation briefly.`,
      '',
      'Session data:',
      JSON.stringify(session || {}, null, 2),
    ].join('\n');
  }

  async function analyzeSession(session) {
    const prompt = buildPrompt(session);
    const response = await callCouncilMember('openai', prompt, { taskType: 'general' });

    const rawText =
      typeof response === 'string'
        ? response
        : response?.text || response?.content || response?.message || response?.output || null;

    let parsed = null;
    if (rawText && typeof rawText === 'string') {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }
    }

    const pitchAccuracy = clampScore(parsed?.pitchAccuracy ?? parsed?.pitch_accuracy ?? response?.pitchAccuracy);
    const rhythm = clampScore(parsed?.rhythm ?? response?.rhythm);
    const dynamics = clampScore(parsed?.dynamics ?? response?.dynamics);
    const technique = clampScore(parsed?.technique ?? response?.technique);

    const issues = Array.isArray(parsed?.issues)
      ? parsed.issues.map((issue) => normalizeText(issue)).filter(Boolean)
      : Array.isArray(response?.issues)
        ? response.issues.map((issue) => normalizeText(issue)).filter(Boolean)
        : [];

    const strengths = Array.isArray(parsed?.strengths)
      ? parsed.strengths.map((item) => normalizeText(item)).filter(Boolean)
      : Array.isArray(response?.strengths)
        ? response.strengths.map((item) => normalizeText(item)).filter(Boolean)
        : [];

    const nextSteps = Array.isArray(parsed?.nextSteps)
      ? parsed.nextSteps.map((step) => normalizeText(step)).filter(Boolean)
      : Array.isArray(response?.nextSteps)
        ? response.nextSteps.map((step) => normalizeText(step)).filter(Boolean)
        : [];

    return {
      taskType: ANALYSIS_TASK,
      pitchAccuracy,
      rhythm,
      dynamics,
      technique,
      issues,
      strengths,
      nextSteps,
      summary:
        normalizeText(parsed?.summary ?? response?.summary) ||
        normalizeText(rawText) ||
        null,
      raw: response ?? null,
    };
  }

  return {
    analyzeSession,
  };
}