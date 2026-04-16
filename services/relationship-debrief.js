/**
 * services/relationship-debrief.js
 *
 * AI-powered post-conversation debrief.
 * Takes what the user says happened, returns insight and repair path.
 * Delivered in their calibrated truth_style.
 *
 * Exports:
 *   createRelationshipDebrief({ pool, callAI }) → RelationshipDebrief
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createRelationshipDebrief({ pool, callAI }) {

  /**
   * Parse the AI response text into structured debrief sections.
   * Attempts paragraph-based parsing with graceful fallback.
   * @param {string} text
   * @returns {{ what_was_said, underlying_need, emotional_tone, repair_path }}
   */
  function parseDebriefSections(text) {
    const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);

    return {
      what_was_said:   paragraphs[0] || null,
      underlying_need: paragraphs[1] || null,
      emotional_tone:  paragraphs[2] || null,
      repair_path:     paragraphs[3] || null,
    };
  }

  /**
   * Create an AI-powered conversation debrief for a user.
   * @param {object} p
   * @param {number} p.userId
   * @param {string} p.conversationContext  — what the user says happened
   * @param {string} [p.whatWasSaid]        — optional verbatim exchange
   * @returns {Promise<object>} Full conversation_debriefs row
   */
  async function createDebrief({ userId, conversationContext, whatWasSaid }) {
    // 1. Get user profile for truth_style calibration
    const { rows: userRows } = await pool.query(
      'SELECT display_name, truth_style FROM lifeos_users WHERE id = $1',
      [userId]
    );
    const user = userRows[0] || {};
    const truthStyle = user.truth_style || 'direct';
    const name = user.display_name || 'this person';

    // 2. Build and run the AI prompt
    const prompt = [
      `${name} wants to debrief a recent conversation.`,
      `Context: ${conversationContext}`,
      whatWasSaid ? `What was said: ${whatWasSaid}` : '',
      '',
      'In 4 distinct paragraphs (separated by blank lines):',
      '(1) What the surface-level exchange was — what happened at face value.',
      '(2) What each person was likely actually needing underneath it — the deeper emotional need driving each side.',
      '(3) The emotional tone and what it signals — what the energy in this exchange reveals.',
      '(4) One specific repair path — a concrete action to take, with exact language if helpful.',
      '',
      `Calibrate to truth_style: ${truthStyle}. Be specific and honest, not generic or platitudinous.`,
    ].filter(l => l !== undefined).join('\n');

    let aiText = '';
    if (callAI) {
      try {
        aiText = await callAI(prompt);
      } catch (_err) {
        aiText = '';
      }
    }

    // 3. Parse sections
    const sections = parseDebriefSections(aiText);

    // 4. Save to DB
    const { rows } = await pool.query(`
      INSERT INTO conversation_debriefs
        (user_id, conversation_context, what_was_said,
         underlying_need, emotional_tone, ai_insight, repair_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      userId,
      conversationContext,
      whatWasSaid || null,
      sections.underlying_need,
      sections.emotional_tone,
      sections.what_was_said,
      sections.repair_path,
    ]);

    return rows[0];
  }

  /**
   * Return recent debriefs for a user.
   * @param {number} userId
   * @param {object} [opts]
   * @param {number} [opts.days=30]
   * @returns {Promise<Array>}
   */
  async function getDebriefs(userId, { days = 30 } = {}) {
    const { rows } = await pool.query(`
      SELECT *
      FROM conversation_debriefs
      WHERE user_id = $1
        AND debrief_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
      ORDER BY debrief_date DESC, created_at DESC
    `, [userId, days]);
    return rows;
  }

  /**
   * Mark a debrief as acknowledged by the user.
   * @param {number} debriefId
   * @returns {Promise<object|null>}
   */
  async function acknowledgeDebrief(debriefId) {
    const { rows } = await pool.query(`
      UPDATE conversation_debriefs
      SET user_acknowledged = TRUE
      WHERE id = $1
      RETURNING *
    `, [debriefId]);
    return rows[0] || null;
  }

  return {
    createDebrief,
    getDebriefs,
    acknowledgeDebrief,
  };
}
