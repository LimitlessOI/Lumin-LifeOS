/**
 * services/parenting-coach.js
 *
 * After-the-moment parenting coaching.
 * Never in front of the child. Delivered when the parent is ready.
 * Produces: age-appropriate context, repair path, generational pattern note.
 *
 * Exports:
 *   createParentingCoach({ pool, callAI }) → ParentingCoach
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createParentingCoach({ pool, callAI }) {

  /**
   * Safely parse JSON from AI output, returning null on failure.
   * @param {string} text
   * @returns {object|null}
   */
  function safeParseJSON(text) {
    if (!text) return null;
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try { return JSON.parse(cleaned); } catch (_) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try { return JSON.parse(match[0]); } catch (_) { return null; }
    }
  }

  /**
   * Debrief a difficult parenting moment with AI coaching.
   * @param {object} p
   * @param {number} p.userId
   * @param {string} p.childName
   * @param {number} [p.childAge]
   * @param {string} p.whatHappened
   * @param {string} [p.userResponse]
   * @param {string} [p.whatUserFelt]
   * @returns {Promise<object>} Full parenting_moments row
   */
  async function debrief({ userId, childName, childAge, whatHappened, userResponse, whatUserFelt }) {
    const prompt = [
      'A parent wants to debrief a difficult moment with their child.',
      `Child: ${childName || 'their child'}${childAge ? `, age ${childAge}` : ''}.`,
      `What happened: ${whatHappened}`,
      userResponse ? `What the parent did/said: ${userResponse}` : '',
      whatUserFelt ? `What the parent felt: ${whatUserFelt}` : '',
      '',
      'Provide coaching in this exact JSON format (return ONLY the JSON object, no extra text):',
      '{',
      '  "developmental_context": "What is developmentally normal/expected for a child this age in this situation.",',
      '  "child_need": "What the child was likely needing underneath the behavior.",',
      '  "repair_path": "Exactly what to say and do to repair with this child — specific language.",',
      '  "generational_note": "Does this parental response pattern mirror anything that may have been done to the parent? Be compassionate but honest."',
      '}',
      '',
      'Be specific. Avoid generic advice. Be compassionate but honest.',
    ].filter(l => l !== undefined).join('\n');

    let aiResult = null;
    if (callAI) {
      try {
        const raw = await callAI(prompt);
        aiResult = safeParseJSON(raw);
      } catch (_) {
        aiResult = null;
      }
    }

    const { rows } = await pool.query(`
      INSERT INTO parenting_moments
        (user_id, child_name, child_age_years, what_happened, user_response,
         what_user_felt, debrief_text, repair_path, generational_note)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      userId,
      childName    || null,
      childAge     || null,
      whatHappened,
      userResponse || null,
      whatUserFelt || null,
      aiResult?.developmental_context || null,
      aiResult?.repair_path           || null,
      aiResult?.generational_note     || null,
    ]);

    // Attach parsed AI fields to result for caller convenience
    const row = rows[0];
    if (aiResult) {
      row.developmental_context = aiResult.developmental_context || null;
      row.child_need             = aiResult.child_need            || null;
    }
    return row;
  }

  /**
   * Log a repair action and mark the parenting moment as repaired.
   * @param {object} p
   * @param {number} p.userId
   * @param {number} p.parentingMomentId
   * @param {string} p.whatIDid
   * @param {string} [p.howItLanded]
   * @param {string} [p.outcome]  'healed'|'partial'|'not_yet'|'rejected'
   * @returns {Promise<object>} The repair_actions row
   */
  async function logRepair({ userId, parentingMomentId, whatIDid, howItLanded, outcome }) {
    const { rows } = await pool.query(`
      INSERT INTO repair_actions
        (user_id, context, linked_moment_id, what_i_did, how_it_landed, outcome)
      VALUES ($1, 'parenting', $2, $3, $4, $5)
      RETURNING *
    `, [userId, parentingMomentId || null, whatIDid, howItLanded || null, outcome || null]);

    // Mark the parenting moment as repaired
    if (parentingMomentId) {
      await pool.query(`
        UPDATE parenting_moments
        SET repair_done = TRUE, repair_done_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [parentingMomentId, userId]);
    }

    return rows[0];
  }

  /**
   * Return recent parenting moments for a user.
   * @param {number} userId
   * @param {object} [opts]
   * @param {number} [opts.days=60]
   * @returns {Promise<Array>}
   */
  async function getMoments(userId, { days = 60 } = {}) {
    const { rows } = await pool.query(`
      SELECT * FROM parenting_moments
      WHERE user_id = $1
        AND moment_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
      ORDER BY moment_date DESC, created_at DESC
    `, [userId, days]);
    return rows;
  }

  /**
   * Compute the repair rate for a user.
   * Percentage of moments where repair was attempted and outcome was 'healed' or 'partial'.
   * @param {number} userId
   * @returns {Promise<{ total: number, repaired: number, rate: number }>}
   */
  async function getRepairRate(userId) {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE TRUE)::int                               AS total,
        COUNT(*) FILTER (WHERE repair_done = TRUE)::int                 AS repaired,
        COUNT(*) FILTER (WHERE ra.outcome IN ('healed','partial'))::int AS successful
      FROM parenting_moments pm
      LEFT JOIN repair_actions ra
        ON ra.linked_moment_id = pm.id AND ra.context = 'parenting' AND ra.user_id = $1
      WHERE pm.user_id = $1
    `, [userId]);

    const r = rows[0] || { total: 0, repaired: 0, successful: 0 };
    const rate = r.total > 0 ? Math.round((r.successful / r.total) * 100) : 0;
    return { total: r.total, repaired: r.repaired, successful: r.successful, rate };
  }

  return {
    debrief,
    logRepair,
    getMoments,
    getRepairRate,
  };
}
