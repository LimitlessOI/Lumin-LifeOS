/**
 * services/emotional-pattern-engine.js
 *
 * Identifies and tracks recurring emotional patterns for a user.
 * Analyzes conversation debriefs, parenting moments, and check-ins.
 * Surfaces patterns before they complete — gives the user a chance to interrupt them.
 *
 * Exports:
 *   createEmotionalPatternEngine({ pool, callAI }) → EmotionalPatternEngine
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createEmotionalPatternEngine({ pool, callAI }) {

  /**
   * Safely parse a JSON array from AI output.
   * @param {string} text
   * @returns {Array}
   */
  function safeParseArray(text) {
    if (!text) return [];
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) return [];
      try { return JSON.parse(match[0]); } catch (_) { return []; }
    }
  }

  /**
   * Analyze the last 30 days of emotional data and upsert recurring patterns.
   * @param {number} userId
   * @returns {Promise<Array>} patterns array
   */
  async function analyzePatterns(userId) {
    // Pull last 30 days of emotional data
    const [debriefs, moments, joyDrains] = await Promise.all([
      pool.query(`
        SELECT emotional_tone, underlying_need
        FROM conversation_debriefs
        WHERE user_id = $1
          AND debrief_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY debrief_date DESC
        LIMIT 30
      `, [userId]),

      pool.query(`
        SELECT what_happened, user_response, what_user_felt
        FROM parenting_moments
        WHERE user_id = $1
          AND moment_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY moment_date DESC
        LIMIT 30
      `, [userId]),

      pool.query(`
        SELECT joy_drains
        FROM joy_checkins
        WHERE user_id = $1
          AND checkin_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY checkin_date DESC
        LIMIT 30
      `, [userId]).catch(() => ({ rows: [] })),
    ]);

    if (!callAI) return [];

    // Build a compact emotional data summary
    const parts = [];

    if (debriefs.rows.length) {
      parts.push('CONVERSATION DEBRIEFS (emotional tones and needs):');
      debriefs.rows.forEach((r, i) => {
        if (r.emotional_tone || r.underlying_need) {
          parts.push(`[${i + 1}] Tone: ${r.emotional_tone || 'n/a'} | Need: ${r.underlying_need || 'n/a'}`);
        }
      });
    }

    if (moments.rows.length) {
      parts.push('\nPARENTING MOMENTS (what happened, response, feeling):');
      moments.rows.forEach((r, i) => {
        parts.push(`[${i + 1}] What happened: ${r.what_happened || 'n/a'} | Response: ${r.user_response || 'n/a'} | Felt: ${r.what_user_felt || 'n/a'}`);
      });
    }

    const drainTexts = joyDrains.rows.map(r => r.joy_drains).filter(Boolean);
    if (drainTexts.length) {
      parts.push('\nJOY DRAINS:');
      drainTexts.forEach((t, i) => parts.push(`[${i + 1}] ${t}`));
    }

    if (!parts.length) return [];

    const prompt = [
      'Based on this person\'s emotional data from the past 30 days, identify 3-5 recurring emotional patterns.',
      'Return ONLY a JSON array (no extra text). Each object must have:',
      '  pattern_name: string (snake_case, e.g. "defensive_when_criticized")',
      '  trigger_description: string',
      '  response_description: string',
      '  frequency: "rare" | "occasional" | "frequent"',
      '',
      parts.join('\n'),
    ].join('\n');

    let rawPatterns = [];
    try {
      const raw = await callAI(prompt);
      rawPatterns = safeParseArray(raw);
    } catch (_) {
      return [];
    }

    if (!rawPatterns.length) return [];

    // Upsert each pattern
    const today = new Date().toISOString().slice(0, 10);
    for (const p of rawPatterns) {
      if (!p.pattern_name) continue;
      await pool.query(`
        INSERT INTO emotional_patterns
          (user_id, pattern_name, trigger_description, response_description,
           frequency, first_observed, last_observed, times_observed)
        VALUES ($1, $2, $3, $4, $5, $6::date, $6::date, 1)
        ON CONFLICT (user_id, pattern_name) DO UPDATE
          SET trigger_description  = EXCLUDED.trigger_description,
              response_description = EXCLUDED.response_description,
              frequency            = EXCLUDED.frequency,
              last_observed        = $6::date,
              times_observed       = emotional_patterns.times_observed + 1
      `, [userId, p.pattern_name, p.trigger_description || null, p.response_description || null, p.frequency || 'occasional', today]);
    }

    return rawPatterns;
  }

  /**
   * Return all patterns for a user, ordered by times_observed DESC.
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async function getPatterns(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM emotional_patterns
      WHERE user_id = $1
      ORDER BY times_observed DESC, last_observed DESC
    `, [userId]);
    return rows;
  }

  /**
   * Check if any known patterns are being triggered by the given text.
   * Uses keyword matching against trigger_descriptions.
   * @param {number} userId
   * @param {string} currentText
   * @returns {Promise<{ warning: boolean, patterns: Array }>}
   */
  async function earlyWarning(userId, currentText) {
    if (!currentText) return { warning: false, patterns: [] };

    const patterns = await getPatterns(userId);
    if (!patterns.length) return { warning: false, patterns: [] };

    const lowerText = currentText.toLowerCase();

    const matched = patterns.filter(p => {
      if (!p.trigger_description) return false;
      // Extract keywords from trigger description (words > 3 chars)
      const keywords = p.trigger_description
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 3);
      return keywords.some(kw => lowerText.includes(kw));
    });

    return { warning: matched.length > 0, patterns: matched };
  }

  return {
    analyzePatterns,
    getPatterns,
    earlyWarning,
  };
}
