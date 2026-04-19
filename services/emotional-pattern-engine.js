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

  // ──────────────────────────────────────────────────────────────────────────
  // Daily emotional check-in (Amendment 21 Layer 5 — "name the weather")
  //
  // One row per user per calendar date; subsequent submissions for the same
  // date UPSERT. This is the primary data source that feeds joy score,
  // emotional-pattern-engine, early-warning notifications, and truth-delivery
  // calibration, so the table is treated as a daily ritual surface rather
  // than a journal.
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Upsert today's emotional check-in for a user. If a row already exists for
   * today, the row is overwritten with the new values — we keep ONE daily
   * reading, not an append log.
   *
   * @param {{
   *   userId: number,
   *   weather: string,
   *   intensity: number,
   *   valence?: number|null,
   *   depletionTags?: string[],
   *   note?: string|null,
   *   somaticNote?: string|null,
   *   source?: string,
   * }} input
   * @returns {Promise<object>} the upserted row
   */
  async function logDailyCheckin({
    userId,
    weather,
    intensity,
    valence = null,
    depletionTags = [],
    note = null,
    somaticNote = null,
    source = 'overlay',
  }) {
    if (!userId) throw new Error('userId required');
    if (!weather || typeof weather !== 'string') throw new Error('weather (string) required');
    if (!Number.isFinite(intensity) || intensity < 1 || intensity > 10) {
      throw new Error('intensity must be an integer between 1 and 10');
    }

    const cleanedTags = Array.isArray(depletionTags)
      ? depletionTags.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim().toLowerCase())
      : [];

    const { rows } = await pool.query(
      `
      INSERT INTO daily_emotional_checkins
        (user_id, checkin_date, weather, intensity, valence, depletion_tags, note, somatic_note, source)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, checkin_date) DO UPDATE
        SET weather        = EXCLUDED.weather,
            intensity      = EXCLUDED.intensity,
            valence        = EXCLUDED.valence,
            depletion_tags = EXCLUDED.depletion_tags,
            note           = EXCLUDED.note,
            somatic_note   = EXCLUDED.somatic_note,
            source         = EXCLUDED.source,
            updated_at     = NOW()
      RETURNING *
      `,
      [
        userId,
        weather.trim().slice(0, 120),
        Math.round(intensity),
        Number.isFinite(valence) ? Math.max(-5, Math.min(5, Math.round(valence))) : null,
        cleanedTags,
        note ? String(note).slice(0, 2000) : null,
        somaticNote ? String(somaticNote).slice(0, 500) : null,
        source || 'overlay',
      ]
    );

    return rows[0];
  }

  /**
   * Return today's check-in for the user, or null if none yet.
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  async function getTodayCheckin(userId) {
    if (!userId) return null;
    const { rows } = await pool.query(
      `SELECT * FROM daily_emotional_checkins
       WHERE user_id = $1 AND checkin_date = CURRENT_DATE
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  /**
   * Return the most recent N daily check-ins, newest first.
   * @param {number} userId
   * @param {{ limit?: number, days?: number }} [opts]
   * @returns {Promise<object[]>}
   */
  async function getRecentCheckins(userId, { limit = 14, days = 30 } = {}) {
    if (!userId) return [];
    const { rows } = await pool.query(
      `SELECT * FROM daily_emotional_checkins
       WHERE user_id = $1
         AND checkin_date >= CURRENT_DATE - ($2::int || ' days')::interval
       ORDER BY checkin_date DESC
       LIMIT $3`,
      [userId, Math.max(1, Math.min(365, days)), Math.max(1, Math.min(90, limit))]
    );
    return rows;
  }

  /**
   * Compute a lightweight 14-day emotional trend summary. No AI call —
   * pure SQL aggregation. Used by the Mirror + the scoreboard.
   *
   * @param {number} userId
   * @returns {Promise<{
   *   days_logged: number,
   *   avg_intensity: number|null,
   *   avg_valence: number|null,
   *   trend: 'up'|'down'|'flat'|'insufficient_data',
   *   most_common_weather: string|null,
   *   top_depletion_tag: string|null,
   * }>}
   */
  async function getTrend(userId) {
    if (!userId) {
      return {
        days_logged: 0,
        avg_intensity: null,
        avg_valence: null,
        trend: 'insufficient_data',
        most_common_weather: null,
        top_depletion_tag: null,
      };
    }

    const { rows } = await pool.query(
      `SELECT checkin_date, intensity, valence, weather, depletion_tags
       FROM daily_emotional_checkins
       WHERE user_id = $1
         AND checkin_date >= CURRENT_DATE - INTERVAL '14 days'
       ORDER BY checkin_date ASC`,
      [userId]
    );

    if (!rows.length) {
      return {
        days_logged: 0,
        avg_intensity: null,
        avg_valence: null,
        trend: 'insufficient_data',
        most_common_weather: null,
        top_depletion_tag: null,
      };
    }

    const intensities = rows.map(r => Number(r.intensity)).filter(Number.isFinite);
    const valences    = rows.map(r => Number(r.valence)).filter(Number.isFinite);
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    // Trend: compare the last 7 days avg valence to the prior 7 days avg valence.
    let trend = 'insufficient_data';
    if (rows.length >= 4) {
      const half = Math.floor(rows.length / 2);
      const earlyV = avg(rows.slice(0, half).map(r => Number(r.valence)).filter(Number.isFinite));
      const lateV  = avg(rows.slice(half).map(r => Number(r.valence)).filter(Number.isFinite));
      if (earlyV == null || lateV == null) {
        trend = 'flat';
      } else if (lateV - earlyV > 0.5) trend = 'up';
      else if (earlyV - lateV > 0.5)   trend = 'down';
      else                              trend = 'flat';
    }

    // Most common weather
    const wCounts = new Map();
    for (const r of rows) {
      const w = (r.weather || '').toLowerCase().trim();
      if (!w) continue;
      wCounts.set(w, (wCounts.get(w) || 0) + 1);
    }
    const mostCommonWeather = [...wCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Top depletion tag
    const tagCounts = new Map();
    for (const r of rows) {
      for (const t of (r.depletion_tags || [])) {
        const key = String(t).toLowerCase().trim();
        if (!key) continue;
        tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
      }
    }
    const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      days_logged: rows.length,
      avg_intensity: avg(intensities) != null ? Number(avg(intensities).toFixed(2)) : null,
      avg_valence:   avg(valences)    != null ? Number(avg(valences).toFixed(2))    : null,
      trend,
      most_common_weather: mostCommonWeather,
      top_depletion_tag:   topTag,
    };
  }

  return {
    analyzePatterns,
    getPatterns,
    earlyWarning,
    logDailyCheckin,
    getTodayCheckin,
    getRecentCheckins,
    getTrend,
  };
}
