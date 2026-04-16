/**
 * services/response-variety.js
 *
 * Response Variety Engine — enforces communication variety across all AI calls.
 *
 * Tracks recent response style patterns per user and injects anti-repetition
 * guidance into every AI system prompt. Prevents the formulaic opening/rhythm
 * that breaks user trust over time.
 *
 * Integrates with communication-profile.js to shift from random anti-repetition
 * toward personalized weighted selection: styles that have produced real
 * engagement with THIS person are picked more often, making variety intelligent
 * rather than merely random.
 *
 * Used by: communication-coach.js, truth-delivery.js, mediation-engine.js
 *
 * Exports:
 *   createResponseVariety({ pool, logger? }) → ResponseVariety
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createCommunicationProfile } from './communication-profile.js';

// ── Style dimensions ─────────────────────────────────────────────────────────

const OPENING_STYLES = [
  { id: 'question',           label: 'open with a genuine question — no preamble, just ask' },
  { id: 'observation',        label: 'open with a direct observation about what they said' },
  { id: 'reflection',         label: 'reflect back what you heard in your own words before doing anything else' },
  { id: 'short_acknowledgment', label: 'open with just 2-4 words of acknowledgment before continuing — e.g. "Yeah. That\'s real." or "Okay. I hear that."' },
  { id: 'direct',             label: 'skip the validation entirely and respond directly to the substance' },
  { id: 'sit_with_it',        label: 'respond as if sitting quietly with what they said — brief, unhurried, no rush to fix or analyze' },
  { id: 'name_the_feeling',   label: 'name the specific emotion you detected before anything else — not "that sounds hard" but the actual specific feeling' },
];

const LENGTH_STYLES = [
  { id: 'very_short', label: '1-3 sentences only. Resist the urge to say more.' },
  { id: 'short',      label: '2-4 sentences.' },
  { id: 'medium',     label: '4-7 sentences.' },
  { id: 'expansive',  label: 'take the space this moment needs — go deeper than usual' },
];

const TONE_REGISTERS = [
  { id: 'warm_direct',        label: 'warm but direct — say what you actually think' },
  { id: 'quietly_present',    label: 'quietly present — more listening than talking' },
  { id: 'curious',            label: 'genuinely curious — you want to understand more before saying anything definitive' },
  { id: 'gently_challenging', label: 'gently challenging — you care enough to push back slightly on what they said' },
  { id: 'matter_of_fact',     label: 'matter of fact — no emotional amplification, just clear and grounded' },
];

const QUESTION_ENDINGS = [
  { id: 'no_question', label: 'do NOT end with a question. Make a statement and let it land.' },
  { id: 'one_question', label: 'end with exactly one question if appropriate' },
  { id: 'implicit',    label: 'do not ask a question, but leave space — imply curiosity without demanding a response' },
];

const FORBIDDEN_PHRASES = [
  'what i heard you say',
  'that sounds really',
  'it sounds like',
  'i can hear that',
  'thank you for sharing',
  'that must be',
  'i understand that',
  'absolutely',
  'of course',
  'certainly',
  'great question',
  'i appreciate',
];

// ── Dimension config (for iteration) ─────────────────────────────────────────

const DIMENSIONS = {
  opening:       OPENING_STYLES,
  length:        LENGTH_STYLES,
  tone:          TONE_REGISTERS,
  question_ending: QUESTION_ENDINGS,
};

// ── Factory ───────────────────────────────────────────────────────────────────

export function createResponseVariety({ pool, logger }) {

  // Communication profile — personalized weighted style selection.
  // callAI is null here: profile is only used for style selection, not summary
  // generation (summary generation happens in wrapPromptWithVariety when callAI
  // is passed through from the calling context).
  const profile = createCommunicationProfile({ pool, callAI: null, logger });

  // ── getRecentPatterns ──────────────────────────────────────────────────────

  /**
   * Fetch the most recent style choices for a user.
   * @param {{ userId: number|string, limit?: number }} params
   * @returns {Promise<Array>}
   */
  async function getRecentPatterns({ userId, limit = 8 }) {
    try {
      const { rows } = await pool.query(`
        SELECT style_fingerprint, opening_style, length_style, tone_register, question_ending
          FROM response_variety_log
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2
      `, [userId, limit]);
      return rows;
    } catch {
      return [];
    }
  }

  // ── pickStyles ────────────────────────────────────────────────────────────

  /**
   * Pick a style combination that avoids the 3 most recent choices per dimension.
   * @param {{ userId: number|string }} params
   * @returns {Promise<{ opening: object, length: object, tone: object, question_ending: object }>}
   */
  async function pickStyles({ userId }) {
    const recent = await getRecentPatterns({ userId, limit: 8 });

    const result = {};

    for (const [dim, options] of Object.entries(DIMENSIONS)) {
      // Map: option.id → most recent index it appeared at (lower index = more recent)
      // recent[0] is most recent, recent[7] is oldest

      // Collect IDs used in the last 3 responses
      const last3 = recent.slice(0, 3);
      const colMap = {
        opening:        'opening_style',
        length:         'length_style',
        tone:           'tone_register',
        question_ending: 'question_ending',
      };
      const col = colMap[dim];
      const recentIds = new Set(last3.map(r => r[col]).filter(Boolean));

      // Eligible: options not in last 3
      const eligible = options.filter(o => !recentIds.has(o.id));

      if (eligible.length > 0) {
        // Pick randomly from eligible
        result[dim] = eligible[Math.floor(Math.random() * eligible.length)];
      } else {
        // All options were recently used — pick least recently used
        // Build a usage recency map: id → most recent position in recent[] (0 = most recent)
        const lastUsed = {};
        for (let i = 0; i < recent.length; i++) {
          const id = recent[i][col];
          if (id && lastUsed[id] === undefined) {
            lastUsed[id] = i;
          }
        }
        // Sort options by lastUsed (descending — highest index = least recently used)
        const sorted = [...options].sort((a, b) => {
          const aIdx = lastUsed[a.id] ?? recent.length; // never used = treat as oldest
          const bIdx = lastUsed[b.id] ?? recent.length;
          return bIdx - aIdx; // largest index first
        });
        result[dim] = sorted[0];
      }
    }

    return result;
  }

  // ── pickStylesForUser ─────────────────────────────────────────────────────

  /**
   * Pick styles using the communication profile's personalized weighted selection
   * (including real-time context overrides). Falls back to the existing
   * random anti-repetition logic if the profile system is unavailable.
   *
   * @param {number|string} userId
   * @returns {Promise<{ opening: object, length: object, tone: object, question_ending: object }>}
   */
  async function pickStylesForUser(userId) {
    try {
      const result = await profile.pickStylesWithContext(userId);
      // Map id strings back to style objects from DIMENSIONS so downstream
      // code that reads .label still works correctly
      const resolved = {};
      for (const [dim, options] of Object.entries(DIMENSIONS)) {
        const id = result.styles[dim === 'question_ending' ? 'question_ending' : dim];
        resolved[dim] = options.find(o => o.id === id) || options[0];
      }
      return resolved;
    } catch {
      // Fallback to original random selection when profile is unavailable
      return pickStyles({ userId });
    }
  }

  // ── recordEngagement (passthrough) ────────────────────────────────────────

  /**
   * Forward an engagement observation to the communication profile system.
   * This is a passthrough so callers only need to import response-variety.
   *
   * @param {{ userId, sessionId?, context, styles, contextAtTime, engagementSignal, responseLength }} params
   * @returns {Promise<void>}
   */
  async function recordEngagement(params) {
    try {
      // styles here are style objects with { id, label } — extract just the ids
      const styleIds = {
        opening:         params.styles?.opening?.id         || params.styles?.opening,
        length:          params.styles?.length?.id          || params.styles?.length,
        tone:            params.styles?.tone?.id            || params.styles?.tone,
        question_ending: params.styles?.question_ending?.id || params.styles?.question_ending,
      };
      await profile.recordEngagement({ ...params, styles: styleIds });
    } catch {
      // Non-fatal — engagement recording should never break the caller
    }
  }

  // ── buildVarietyInstruction ────────────────────────────────────────────────

  /**
   * Build the instruction string to append to any AI system prompt.
   * Uses personalized profile-weighted selection when a userId is available.
   * @param {{ userId: number|string }} params
   * @returns {Promise<{ instruction: string, styles: object }>}
   */
  async function buildVarietyInstruction({ userId }) {
    const styles = userId ? await pickStylesForUser(userId) : await pickStyles({ userId });

    const instruction = [
      '[RESPONSE STYLE — follow exactly]',
      `Opening: ${styles.opening.label}`,
      `Length: ${styles.length.label}`,
      `Register: ${styles.tone.label}`,
      `Ending: ${styles.question_ending.label}`,
      `FORBIDDEN phrases (never use these exact phrases): ${FORBIDDEN_PHRASES.join(', ')}`,
      'FORBIDDEN pattern: do not open two consecutive responses the same way. Do not use "What I heard you say was" or "That sounds really [adjective]" — ever.',
    ].join('\n');

    return { instruction, styles };
  }

  // ── logResponse ───────────────────────────────────────────────────────────

  /**
   * Record the styles used and a preview of the response for future anti-repetition.
   * @param {{ userId: number|string, styles: object, responsePreview: string, context?: string }} params
   * @returns {Promise<void>}
   */
  async function logResponse({ userId, styles, responsePreview, context }) {
    try {
      const fingerprint = JSON.stringify({
        opening:        styles.opening?.id,
        length:         styles.length?.id,
        tone:           styles.tone?.id,
        question_ending: styles.question_ending?.id,
      });

      await pool.query(`
        INSERT INTO response_variety_log
          (user_id, opening_style, length_style, tone_register, question_ending,
           style_fingerprint, response_preview, context)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId,
        styles.opening?.id || null,
        styles.length?.id  || null,
        styles.tone?.id    || null,
        styles.question_ending?.id || null,
        fingerprint,
        (responsePreview || '').substring(0, 100),
        context || null,
      ]);
    } catch {
      // Non-fatal — variety logging should never break the caller
    }
  }

  // ── wrapPromptWithVariety ─────────────────────────────────────────────────

  /**
   * Append variety instruction to a system prompt, and optionally prepend
   * the personalized communication profile context if callAI is provided
   * (callAI enables profile summary generation for returning users).
   *
   * Fails gracefully — if anything throws, returns the original systemPrompt unchanged.
   *
   * @param {{ userId: number|string, systemPrompt: string, userPrompt?: string, callAI?: Function }} params
   * @returns {Promise<{ systemPrompt: string, styles: object|null }>}
   */
  async function wrapPromptWithVariety({ userId, systemPrompt, userPrompt, callAI: aiForProfile }) {
    try {
      const { instruction, styles } = await buildVarietyInstruction({ userId });
      let enrichedPrompt = systemPrompt + '\n\n' + instruction;

      // Prepend personalized profile context when available
      try {
        const profiler = createCommunicationProfile({ pool, callAI: aiForProfile || null, logger });

        // Trigger background summary refresh if AI is available (non-blocking)
        if (aiForProfile && userId) {
          profiler.generateProfileSummary(userId).catch(() => { /* non-fatal */ });
        }

        const profileContext = await profiler.getProfileForPrompt(userId);
        if (profileContext) {
          enrichedPrompt = profileContext + '\n\n' + enrichedPrompt;
        }
      } catch { /* non-fatal — variety still works without profile context */ }

      return { systemPrompt: enrichedPrompt, styles };
    } catch {
      // Fail gracefully — caller proceeds with original prompt
      return { systemPrompt, styles: null };
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    getRecentPatterns,
    pickStyles,
    pickStylesForUser,
    buildVarietyInstruction,
    logResponse,
    recordEngagement,
    wrapPromptWithVariety,
  };
}
