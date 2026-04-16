/**
 * services/communication-profile.js
 *
 * Communication Profile — personalized delivery intelligence.
 *
 * Learns what actually works for each specific person from longitudinal data:
 * sleep, HRV, joy scores, integrity trends, conflict history, and engagement
 * signals. Feeds weighted style preferences into the response variety engine
 * so style selection is driven by what has produced real connection with THIS
 * person, in THIS context — not random variety.
 *
 * Used by: response-variety.js, communication-coach.js
 *
 * Exports:
 *   createCommunicationProfile({ pool, callAI, logger }) → CommunicationProfile
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

// ── Style dimension option sets (must stay in sync with response-variety.js) ──

const OPENING_OPTIONS  = ['question', 'observation', 'reflection', 'short_acknowledgment', 'direct', 'sit_with_it', 'name_the_feeling'];
const LENGTH_OPTIONS   = ['very_short', 'short', 'medium', 'expansive'];
const TONE_OPTIONS     = ['warm_direct', 'quietly_present', 'curious', 'gently_challenging', 'matter_of_fact'];
const QUESTION_OPTIONS = ['no_question', 'one_question', 'implicit'];

// ── Weighted random selection ─────────────────────────────────────────────────

/**
 * Select one option from a list using a weight map.
 * Options with higher weights are selected proportionally more often.
 * Falls back to uniform random if weights are missing or malformed.
 *
 * @param {string[]} options   — array of option id strings
 * @param {object}  weights   — { optionId: 0.0–1.0, ... }
 * @returns {string}
 */
function weightedPick(options, weights) {
  if (!options.length) return null;

  // Assign each option a weight; default to 0.5 if not in weights map
  const scored = options.map(id => ({
    id,
    w: typeof weights[id] === 'number' ? Math.max(0.01, weights[id]) : 0.5,
  }));

  const total = scored.reduce((sum, s) => sum + s.w, 0);
  let rand = Math.random() * total;

  for (const s of scored) {
    rand -= s.w;
    if (rand <= 0) return s.id;
  }

  // Fallback (floating point edge case)
  return scored[scored.length - 1].id;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createCommunicationProfile({ pool, callAI, logger }) {

  // ── getOrCreate ─────────────────────────────────────────────────────────────

  /**
   * Return the communication profile for a user, creating it if absent.
   * @param {number|string} userId
   * @returns {Promise<object>} profile row
   */
  async function getOrCreate(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM communication_profiles WHERE user_id = $1',
      [userId]
    );
    if (rows[0]) return rows[0];

    const { rows: newRows } = await pool.query(`
      INSERT INTO communication_profiles (user_id)
      VALUES ($1)
      RETURNING *
    `, [userId]);

    return newRows[0];
  }

  // ── getRealTimeContext ──────────────────────────────────────────────────────

  /**
   * Assemble the current-moment context for this user from all live data sources.
   * Each piece is fetched with an individual try/catch so a missing table or
   * data gap never fails the whole call.
   *
   * @param {number|string} userId
   * @returns {Promise<{
   *   joyScore: number|null,
   *   integrityScore: number|null,
   *   sleepMinutes: number|null,
   *   hrv: number|null,
   *   hourOfDay: number,
   *   recentConflicts: number
   * }>}
   */
  async function getRealTimeContext(userId) {
    const context = {
      joyScore:        null,
      integrityScore:  null,
      sleepMinutes:    null,
      hrv:             null,
      hourOfDay:       new Date().getHours(),
      recentConflicts: 0,
    };

    // Joy score — latest row from joy_score_log
    try {
      const { rows } = await pool.query(`
        SELECT avg_joy_7d
          FROM joy_score_log
         WHERE user_id = $1
         ORDER BY score_date DESC
         LIMIT 1
      `, [userId]);
      if (rows[0]?.avg_joy_7d != null) {
        context.joyScore = parseFloat(rows[0].avg_joy_7d);
      }
    } catch { /* non-fatal */ }

    // Integrity score — latest row from integrity_score_log
    try {
      const { rows } = await pool.query(`
        SELECT total_score
          FROM integrity_score_log
         WHERE user_id = $1
         ORDER BY score_date DESC
         LIMIT 1
      `, [userId]);
      if (rows[0]?.total_score != null) {
        context.integrityScore = parseFloat(rows[0].total_score);
      }
    } catch { /* non-fatal */ }

    // Sleep — sum sleep stage minutes from wearable_data for the most recent night.
    // Sleep stage metrics: sleep_deep_min, sleep_rem_min, sleep_awake_min (and implicitly sleep_light_min if stored).
    // We grab the most recent recorded_at date and sum all sleep-related minutes for that day.
    try {
      const { rows } = await pool.query(`
        SELECT COALESCE(SUM(value), 0) AS total_sleep_min
          FROM wearable_data
         WHERE user_id = $1
           AND metric IN ('sleep_deep_min', 'sleep_rem_min', 'sleep_awake_min', 'sleep_light_min')
           AND DATE(recorded_at) = (
             SELECT DATE(recorded_at)
               FROM wearable_data
              WHERE user_id = $1
                AND metric IN ('sleep_deep_min', 'sleep_rem_min', 'sleep_awake_min', 'sleep_light_min')
              ORDER BY recorded_at DESC
              LIMIT 1
           )
      `, [userId]);
      const mins = parseFloat(rows[0]?.total_sleep_min);
      if (!isNaN(mins) && mins > 0) {
        context.sleepMinutes = Math.round(mins);
      }
    } catch { /* non-fatal */ }

    // HRV — most recent value from wearable_data
    try {
      const { rows } = await pool.query(`
        SELECT value
          FROM wearable_data
         WHERE user_id = $1
           AND metric = 'hrv'
         ORDER BY recorded_at DESC
         LIMIT 1
      `, [userId]);
      if (rows[0]?.value != null) {
        context.hrv = Math.round(parseFloat(rows[0].value));
      }
    } catch { /* non-fatal */ }

    // Recent conflicts — coaching sessions of conflict/clarity types in last 7 days
    try {
      const { rows } = await pool.query(`
        SELECT COUNT(*) AS cnt
          FROM coaching_sessions
         WHERE user_id = $1
           AND session_type IN ('individual_clarity', 'post_conflict')
           AND created_at >= NOW() - INTERVAL '7 days'
      `, [userId]);
      context.recentConflicts = parseInt(rows[0]?.cnt || 0);
    } catch { /* non-fatal */ }

    return context;
  }

  // ── assessCurrentState ──────────────────────────────────────────────────────

  /**
   * Assess the user's current receptivity state based on real-time context
   * and their personalized thresholds from the profile.
   *
   * @param {number|string} userId
   * @returns {Promise<{
   *   context: object,
   *   receptivity: 'high'|'moderate'|'low'|'very_low',
   *   reasons: string[],
   *   recommended_approach: string
   * }>}
   */
  async function assessCurrentState(userId) {
    const [context, profile] = await Promise.all([
      getRealTimeContext(userId),
      getOrCreate(userId),
    ]);

    const reasons = [];
    let receptivity = 'high';

    const sleepThreshold     = profile.low_sleep_threshold    || 360;
    const hrvThreshold       = profile.low_hrv_threshold      || 40;
    const joyThreshold       = parseFloat(profile.low_joy_threshold)       || 4.0;
    const integrityThreshold = parseFloat(profile.low_integrity_threshold) || 50.0;

    // very_low triggers — physiological signals first
    if (context.sleepMinutes != null && context.sleepMinutes < sleepThreshold) {
      const hours = Math.round(context.sleepMinutes / 6) / 10;
      reasons.push(`low sleep (${hours}h)`);
      receptivity = 'very_low';
    }
    if (context.hrv != null && context.hrv < hrvThreshold) {
      reasons.push(`low HRV (${context.hrv})`);
      receptivity = 'very_low';
    }

    // low triggers — emotional/integrity signals
    if (receptivity !== 'very_low') {
      if (context.joyScore != null && context.joyScore < joyThreshold) {
        reasons.push(`joy score ${context.joyScore.toFixed(1)} (below threshold ${joyThreshold})`);
        receptivity = 'low';
      }
      if (context.integrityScore != null && context.integrityScore < integrityThreshold) {
        reasons.push(`integrity score ${context.integrityScore} (below threshold ${integrityThreshold})`);
        if (receptivity === 'high') receptivity = 'low';
      }
    }

    // moderate — mild signals
    if (receptivity === 'high') {
      if (context.recentConflicts >= 2) {
        reasons.push(`${context.recentConflicts} conflict sessions in last 7 days`);
        receptivity = 'moderate';
      }
    }

    // Build recommended approach string
    let recommended_approach;
    if (receptivity === 'very_low') {
      recommended_approach = 'gentle, validation-first — avoid directness today; use flooded approach; keep very short';
    } else if (receptivity === 'low') {
      recommended_approach = 'soft entry with validation before any challenge; avoid accountability framing today';
    } else if (receptivity === 'moderate') {
      recommended_approach = 'warm and curious; hold back on challenging questions; prefer observation over direct';
    } else {
      recommended_approach = 'full range available — direct and engaged communication welcomed';
    }

    return { context, receptivity, reasons, recommended_approach };
  }

  // ── getWeightedStyles ───────────────────────────────────────────────────────

  /**
   * Pick one style per dimension using the user's learned weights.
   * Options with higher weights are selected proportionally more often.
   *
   * @param {number|string} userId
   * @returns {Promise<{ opening: string, length: string, tone: string, question_ending: string }>}
   */
  async function getWeightedStyles(userId) {
    const profile = await getOrCreate(userId);

    const openingWeights  = profile.opening_weights  || {};
    const lengthWeights   = profile.length_weights   || {};
    const toneWeights     = profile.tone_weights     || {};
    const questionWeights = profile.question_weights || {};

    return {
      opening:         weightedPick(OPENING_OPTIONS,  openingWeights),
      length:          weightedPick(LENGTH_OPTIONS,   lengthWeights),
      tone:            weightedPick(TONE_OPTIONS,     toneWeights),
      question_ending: weightedPick(QUESTION_OPTIONS, questionWeights),
    };
  }

  // ── pickStylesWithContext ───────────────────────────────────────────────────

  /**
   * Pick styles using learned weights, then apply contextual overrides
   * based on the user's real-time receptivity state.
   *
   * @param {number|string} userId
   * @returns {Promise<{
   *   styles: { opening: string, length: string, tone: string, question_ending: string },
   *   context: object,
   *   receptivity: string
   * }>}
   */
  async function pickStylesWithContext(userId) {
    const [styles, stateAssessment] = await Promise.all([
      getWeightedStyles(userId),
      assessCurrentState(userId),
    ]);

    const { context, receptivity } = stateAssessment;
    const profile = await getOrCreate(userId);
    const difficultHours = profile.difficult_hours || [];

    // Apply contextual overrides
    const result = { ...styles };

    if (receptivity === 'very_low') {
      // Force the most gentle, brief approach
      result.tone            = 'quietly_present';
      result.length          = 'very_short';
      result.opening         = 'sit_with_it';
      result.question_ending = 'no_question';
    } else if (receptivity === 'low') {
      // Weight heavily toward validation — override toward gentle options
      // Only override if the selected style would be counterproductive
      const challengingTones = ['gently_challenging', 'matter_of_fact'];
      if (challengingTones.includes(result.tone)) {
        result.tone = weightedPick(
          ['warm_direct', 'quietly_present', 'curious'],
          { warm_direct: 0.4, quietly_present: 0.6, curious: 0.4 }
        );
      }
      if (result.opening === 'direct') {
        result.opening = weightedPick(
          ['reflection', 'name_the_feeling', 'short_acknowledgment'],
          { reflection: 0.5, name_the_feeling: 0.6, short_acknowledgment: 0.4 }
        );
      }
    }

    // Difficult hours override — reduce length and avoid complex questions
    if (difficultHours.includes(context.hourOfDay)) {
      if (result.length === 'expansive') result.length = 'medium';
      if (result.length === 'medium')    result.length = 'short';
      if (result.question_ending === 'one_question') result.question_ending = 'implicit';
    }

    return { styles: result, context, receptivity };
  }

  // ── recordEngagement ────────────────────────────────────────────────────────

  /**
   * Record an engagement observation and update learned weights.
   *
   * @param {{
   *   userId: number|string,
   *   sessionId?: number,
   *   context: string,
   *   styles: { opening: string, length: string, tone: string, question_ending: string },
   *   contextAtTime: object,
   *   engagementSignal: string,
   *   responseLength: number
   * }} params
   * @returns {Promise<void>}
   */
  async function recordEngagement({ userId, sessionId, context, styles, contextAtTime, engagementSignal, responseLength }) {
    try {
      await pool.query(`
        INSERT INTO communication_engagements
          (user_id, session_id, context,
           opening_style, length_style, tone_register, question_ending,
           joy_score_at_time, integrity_score_at_time, sleep_minutes_last_night,
           hrv_at_time, hour_of_day,
           engagement_signal, response_length)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `, [
        userId,
        sessionId || null,
        context,
        styles?.opening         || null,
        styles?.length          || null,
        styles?.tone            || null,
        styles?.question_ending || null,
        contextAtTime?.joyScore        != null ? contextAtTime.joyScore        : null,
        contextAtTime?.integrityScore  != null ? contextAtTime.integrityScore  : null,
        contextAtTime?.sleepMinutes    != null ? contextAtTime.sleepMinutes    : null,
        contextAtTime?.hrv             != null ? contextAtTime.hrv             : null,
        contextAtTime?.hourOfDay       != null ? contextAtTime.hourOfDay       : new Date().getHours(),
        engagementSignal || null,
        responseLength   != null ? responseLength : null,
      ]);
    } catch (err) {
      logger?.warn?.(`[COMM-PROFILE] recordEngagement insert failed: ${err.message}`);
    }

    // Always attempt weight update, even if insert above failed
    try {
      await updateWeights(userId, styles, engagementSignal, responseLength, contextAtTime?.hourOfDay ?? new Date().getHours());
    } catch (err) {
      logger?.warn?.(`[COMM-PROFILE] updateWeights failed: ${err.message}`);
    }
  }

  // ── updateWeights ───────────────────────────────────────────────────────────

  /**
   * Adjust learned style weights based on engagement signal.
   * Positive engagement → boost used styles.
   * Negative engagement → reduce used styles.
   * Also updates best_hours/difficult_hours arrays.
   *
   * @param {number|string} userId
   * @param {{ opening: string, length: string, tone: string, question_ending: string }} styles
   * @param {string} engagementSignal
   * @param {number} responseLength
   * @param {number} hourOfDay
   * @returns {Promise<void>}
   */
  async function updateWeights(userId, styles, engagementSignal, responseLength, hourOfDay) {
    const profile = await getOrCreate(userId);

    const positiveSignals = new Set(['acknowledged', 'continued', 'reengaged']);
    const negativeSignals = new Set(['session_ended_early', 'ignored']);

    const longResponse  = typeof responseLength === 'number' && responseLength > 50;
    const shortResponse = typeof responseLength === 'number' && responseLength < 10;

    const isPositive = positiveSignals.has(engagementSignal) || longResponse;
    const isNegative = negativeSignals.has(engagementSignal) || (shortResponse && !isPositive);

    if (!isPositive && !isNegative) return; // neutral signal — no weight change

    const delta   = isPositive ? 0.05 : -0.05;
    const capMax  = 1.0;
    const capMin  = 0.1;

    // Build updated weight objects
    const dimMap = {
      opening:         { col: 'opening_weights',  key: styles?.opening,         current: profile.opening_weights  || {} },
      length:          { col: 'length_weights',   key: styles?.length,          current: profile.length_weights   || {} },
      tone:            { col: 'tone_weights',      key: styles?.tone,            current: profile.tone_weights     || {} },
      question_ending: { col: 'question_weights',  key: styles?.question_ending, current: profile.question_weights || {} },
    };

    for (const { col, key, current } of Object.values(dimMap)) {
      if (!key) continue;
      const prev    = typeof current[key] === 'number' ? current[key] : 0.5;
      const updated = Math.min(capMax, Math.max(capMin, prev + delta));
      const newObj  = { ...current, [key]: Math.round(updated * 1000) / 1000 };

      await pool.query(`
        UPDATE communication_profiles
           SET ${col} = $1::jsonb
         WHERE user_id = $2
      `, [JSON.stringify(newObj), userId]);
    }

    // Update best_hours / difficult_hours
    if (hourOfDay != null) {
      const bestHours      = profile.best_hours      || [];
      const difficultHours = profile.difficult_hours || [];

      if (isPositive && !bestHours.includes(hourOfDay)) {
        const newBest = [...bestHours, hourOfDay].slice(-12); // keep last 12 recorded hours
        await pool.query(
          'UPDATE communication_profiles SET best_hours = $1 WHERE user_id = $2',
          [newBest, userId]
        );
      } else if (isNegative && !difficultHours.includes(hourOfDay)) {
        const newDifficult = [...difficultHours, hourOfDay].slice(-12);
        await pool.query(
          'UPDATE communication_profiles SET difficult_hours = $1 WHERE user_id = $2',
          [newDifficult, userId]
        );
      }
    }
  }

  // ── generateProfileSummary ──────────────────────────────────────────────────

  /**
   * Generate (or refresh) an AI-authored plain-English summary of this user's
   * communication profile. Skips if summary was generated less than 7 days ago.
   *
   * @param {number|string} userId
   * @returns {Promise<string|null>} the summary string, or null if skipped/unavailable
   */
  async function generateProfileSummary(userId) {
    if (!callAI) return null;

    const profile = await getOrCreate(userId);

    // Skip if summary is fresh (less than 7 days old)
    if (profile.last_summary_at) {
      const daysSince = (Date.now() - new Date(profile.last_summary_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return profile.profile_summary || null;
    }

    // Pull last 50 engagement records
    const { rows: engagements } = await pool.query(`
      SELECT opening_style, length_style, tone_register, question_ending,
             joy_score_at_time, integrity_score_at_time, sleep_minutes_last_night,
             hrv_at_time, hour_of_day, engagement_signal, response_length
        FROM communication_engagements
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50
    `, [userId]);

    if (engagements.length < 5) return null; // not enough signal yet

    // Summarize the engagement data for the AI prompt
    const positiveEngagements = engagements.filter(e =>
      ['acknowledged', 'continued', 'reengaged'].includes(e.engagement_signal) || (e.response_length > 50)
    );
    const negativeEngagements = engagements.filter(e =>
      ['session_ended_early', 'ignored'].includes(e.engagement_signal) || (e.response_length < 10)
    );

    const summarizeStyles = (rows) => {
      if (!rows.length) return '(none)';
      const counts = {};
      for (const r of rows) {
        const combo = `opening:${r.opening_style} length:${r.length_style} tone:${r.tone_register}`;
        counts[combo] = (counts[combo] || 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => `${k} (${v}x)`)
        .join('; ');
    };

    const sleepRows = engagements.filter(e => e.sleep_minutes_last_night != null);
    const avgSleep  = sleepRows.length
      ? Math.round(sleepRows.reduce((s, r) => s + r.sleep_minutes_last_night, 0) / sleepRows.length)
      : null;

    const bestHoursList      = (profile.best_hours      || []).join(', ') || 'unknown';
    const difficultHoursList = (profile.difficult_hours || []).join(', ') || 'unknown';

    const summaryPrompt = [
      `Generate a 2-3 sentence communication profile summary for a LifeOS user based on their engagement data.`,
      '',
      `Total engagement records: ${engagements.length}`,
      `Positive engagements (${positiveEngagements.length}): ${summarizeStyles(positiveEngagements)}`,
      `Negative engagements (${negativeEngagements.length}): ${summarizeStyles(negativeEngagements)}`,
      `Average sleep at time of engagement: ${avgSleep != null ? `${Math.round(avgSleep / 60 * 10) / 10}h` : 'unknown'}`,
      `Best hours of day: ${bestHoursList}`,
      `Difficult hours of day: ${difficultHoursList}`,
      `Style weights (opening): ${JSON.stringify(profile.opening_weights || {})}`,
      `Style weights (tone): ${JSON.stringify(profile.tone_weights || {})}`,
      '',
      'Write the summary as if describing communication patterns observed about this specific person.',
      'Example format: "Adam responds best to direct, concise communication in the morning hours (7-10am). When his joy score is below 4 or he\'s had poor sleep, he needs soft entry and validation before any challenge. He disengages quickly from long responses and engages most with specific, curious questions rather than open-ended ones."',
      'Be specific, not generic. Do not use the example literally — synthesize from the actual data above.',
    ].join('\n');

    let summary = null;
    try {
      const raw = await callAI(
        'You are a communication intelligence analyst. Your job is to synthesize engagement data into honest, specific communication profile summaries.',
        summaryPrompt
      );
      summary = (typeof raw === 'string' ? raw : raw?.content || '').trim() || null;
    } catch (err) {
      logger?.warn?.(`[COMM-PROFILE] Summary generation failed: ${err.message}`);
      return null;
    }

    if (summary) {
      await pool.query(`
        UPDATE communication_profiles
           SET profile_summary   = $1,
               last_summary_at   = NOW()
         WHERE user_id = $2
      `, [summary, userId]).catch(err => {
        logger?.warn?.(`[COMM-PROFILE] Failed to save summary: ${err.message}`);
      });
    }

    return summary;
  }

  // ── getProfileForPrompt ─────────────────────────────────────────────────────

  /**
   * Returns a compact string ready to prepend to any AI system prompt,
   * giving the AI the personalized communication context for this user.
   *
   * @param {number|string} userId
   * @returns {Promise<string>}
   */
  async function getProfileForPrompt(userId) {
    try {
      const [profile, stateAssessment] = await Promise.all([
        getOrCreate(userId),
        assessCurrentState(userId),
      ]);

      const { receptivity, reasons, recommended_approach } = stateAssessment;

      const reasonStr  = reasons.length ? ` Signals: ${reasons.join(', ')}.` : '';
      const summaryStr = profile.profile_summary
        ? `ABOUT THIS PERSON: ${profile.profile_summary}`
        : 'ABOUT THIS PERSON: Not enough data yet for a full profile — use context signals below.';

      return `${summaryStr} Current state: ${receptivity} receptivity.${reasonStr} Approach: ${recommended_approach}.`;
    } catch {
      return '';
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    getOrCreate,
    getRealTimeContext,
    assessCurrentState,
    getWeightedStyles,
    pickStylesWithContext,
    recordEngagement,
    updateWeights,
    generateProfileSummary,
    getProfileForPrompt,
  };
}
