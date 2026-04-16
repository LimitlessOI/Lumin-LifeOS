/**
 * services/tone-intelligence.js
 *
 * Analyzes emotional tone and context from conversation text.
 * Used by the debrief system to understand what was really happening.
 *
 * Phase 1: text analysis only.
 * Phase 2 (planned): audio via Whisper.
 *
 * Exports:
 *   createToneIntelligence({ callAI }) → ToneIntelligence
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createToneIntelligence({ callAI }) {

  /**
   * Safely parse JSON from AI output, returning null on failure.
   * @param {string} text
   * @returns {object|null}
   */
  function safeParseJSON(text) {
    if (!text) return null;
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      // Try to find a JSON object within the text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch (_) { return null; }
      }
      return null;
    }
  }

  /**
   * Analyze the emotional tone of a single message.
   * @param {string} text
   * @returns {Promise<object|null>} JSON: { primary_emotion, secondary_emotions, intensity,
   *   defensive, vulnerable, needs_expressed, needs_hidden, one_line_summary }
   */
  async function analyzeTone(text) {
    if (!callAI || !text) return null;

    const prompt = [
      'Analyze the emotional tone of this message. Return ONLY a JSON object with no extra text.',
      'Required fields:',
      '  primary_emotion: string',
      '  secondary_emotions: string[]',
      '  intensity: integer 1-10',
      '  defensive: boolean',
      '  vulnerable: boolean',
      '  needs_expressed: string[]  (needs explicitly stated)',
      '  needs_hidden: string[]     (needs implied but not said)',
      '  one_line_summary: string',
      '',
      `Text: ${text}`,
    ].join('\n');

    try {
      const raw = await callAI(prompt);
      return safeParseJSON(raw);
    } catch (_) {
      return null;
    }
  }

  /**
   * Analyze the dynamic between two messages in an exchange.
   * @param {string} messageA
   * @param {string} messageB
   * @returns {Promise<object|null>} JSON: { power_balance, pattern, both_needs, stuck_point, opening }
   */
  async function analyzePairDynamic(messageA, messageB) {
    if (!callAI || !messageA || !messageB) return null;

    const prompt = [
      'Two people are having this exchange. Analyze the dynamic between them.',
      'Return ONLY a JSON object with no extra text.',
      'Required fields:',
      '  power_balance: "equal" | "a_dominant" | "b_dominant"',
      '  pattern: string (e.g. "pursue-withdraw", "demand-defend", "stonewalling")',
      '  both_needs: string (what both people actually need from this exchange)',
      '  stuck_point: string (what is keeping this from resolving)',
      '  opening: string (what could shift this — the smallest possible intervention)',
      '',
      `Person A: ${messageA}`,
      '',
      `Person B: ${messageB}`,
    ].join('\n');

    try {
      const raw = await callAI(prompt);
      return safeParseJSON(raw);
    } catch (_) {
      return null;
    }
  }

  /**
   * Identify recurring emotional patterns from an array of texts over time.
   * @param {string[]} texts
   * @returns {Promise<Array>} Array of pattern objects: { pattern, trigger, response }
   */
  async function extractEmotionalPattern(texts) {
    if (!callAI || !texts || texts.length === 0) return [];

    const combined = texts
      .slice(0, 30) // cap to avoid token explosion
      .map((t, i) => `[${i + 1}] ${t}`)
      .join('\n\n');

    const prompt = [
      'Given these messages from the same person over time, identify their top 3 recurring emotional patterns.',
      'Return ONLY a JSON array of 3 objects (no extra text), each with:',
      '  pattern: string (short name for the pattern)',
      '  trigger: string (what tends to activate this pattern)',
      '  response: string (what the person does when this pattern activates)',
      '',
      combined,
    ].join('\n');

    try {
      const raw = await callAI(prompt);
      const cleaned = raw
        ? raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
        : '';
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) return [];
      return JSON.parse(match[0]);
    } catch (_) {
      return [];
    }
  }

  return {
    analyzeTone,
    analyzePairDynamic,
    extractEmotionalPattern,
  };
}
