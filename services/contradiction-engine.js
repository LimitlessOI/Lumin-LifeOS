/**
 * services/contradiction-engine.js
 *
 * LifeOS Identity Intelligence — Contradiction Engine
 *
 * Four capabilities:
 *  - scan()                   — detect gaps between stated values and actual behavior
 *  - getContradictions()      — query logged contradictions
 *  - acknowledgeContradiction() — user responds to a surfaced contradiction
 *  - runBeliefArchaeology()   — surface the limiting belief behind a repeated pattern
 *  - getBeliefs()             — query active belief patterns
 *  - updateBelief()           — mark a belief as updated/resolved
 *  - runIdentityStressTest()  — 90-day stress test of Be/Do/Have identity
 *  - getLatestStressTest()    — fetch most recent identity review
 *  - runHonestWitnessSession() — brutally honest 90-day data read-back
 *  - getWitnessSessions()     — query past witness sessions
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createContradictionEngine({ pool, callAI, logger }) {

  // ── Contradiction Engine ──────────────────────────────────────────────────

  /**
   * scan(userId)
   * Pulls 30 days of behavioral data and calls AI to surface genuine
   * contradictions between stated values and actual patterns.
   * Inserts contradictions with score > 4 into contradiction_log.
   */
  async function scan(userId) {
    // 1. Load identity statement
    const { rows: userRows } = await pool.query(
      'SELECT be_statement, do_statement, have_vision FROM lifeos_users WHERE id = $1',
      [userId]
    );
    const user = userRows[0];
    if (!user) throw new Error('User not found');

    const identity = [
      user.be_statement ? `BE: ${user.be_statement}` : null,
      user.do_statement ? `DO: ${user.do_statement}` : null,
      user.have_vision  ? `HAVE: ${user.have_vision}` : null,
    ].filter(Boolean).join('\n');

    if (!identity.trim()) {
      return [];  // No identity declared — nothing to contradict
    }

    // 2. Load commitment category breakdown (last 30 days)
    const { rows: commitRows } = await pool.query(`
      SELECT
        COALESCE(source, 'general') AS category,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'kept') AS kept,
        COUNT(*) FILTER (WHERE status = 'broken') AS broken,
        COUNT(*) FILTER (WHERE status = 'open' AND due_at < NOW()) AS overdue
      FROM commitments
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY source
      ORDER BY total DESC
    `, [userId]);

    // 3. Load outreach task timing (last 14 days)
    const { rows: outreachRows } = await pool.query(`
      SELECT
        channel,
        EXTRACT(HOUR FROM created_at) AS hour_of_day,
        status,
        created_at::DATE AS day
      FROM outreach_tasks
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '14 days'
      ORDER BY created_at DESC
      LIMIT 100
    `, [userId]).catch(() => ({ rows: [] }));

    // Count late-night work activity (after 9pm)
    const lateNightWork = outreachRows.filter(r => r.hour_of_day >= 21).length;
    const lateNightDays = new Set(
      outreachRows.filter(r => r.hour_of_day >= 21).map(r => r.day)
    ).size;

    // 4. Load joy check-ins (last 30 days)
    const { rows: joyRows } = await pool.query(`
      SELECT score, notes, checkin_date
      FROM joy_checkins
      WHERE user_id = $1
        AND checkin_date >= NOW() - INTERVAL '30 days'
      ORDER BY checkin_date DESC
    `, [userId]).catch(() => ({ rows: [] }));

    const lowJoyCheckins = joyRows.filter(r => r.score <= 4);

    // 5. Assemble behavioral data summary
    const behaviorSummary = [
      commitRows.length > 0
        ? `Commitments (30 days): ${JSON.stringify(commitRows)}`
        : 'No commitment data available.',
      lateNightDays > 0
        ? `Late-night work activity (after 9pm): ${lateNightWork} events across ${lateNightDays} of the last 14 evenings`
        : null,
      lowJoyCheckins.length > 0
        ? `Low joy check-ins (score ≤ 4): ${lowJoyCheckins.length} in 30 days. Notes: ${lowJoyCheckins.slice(0, 5).map(r => r.notes).filter(Boolean).join('; ')}`
        : null,
    ].filter(Boolean).join('\n\n');

    // 6. Call AI
    const prompt = `This person has stated the following identity and values:

${identity}

Here is their actual behavioral data for the last 30 days:

${behaviorSummary}

Identify up to 3 genuine contradictions between their stated values and actual patterns. Only surface real contradictions — not minor misses, not moral judgments, not coaching suggestions. Look for systemic gaps where what they say matters most is not reflected in how they actually spend time and energy.

For each contradiction:
- state_value: the specific thing they said matters (quote from their identity if possible)
- observed_pattern: what the data actually shows
- contradiction_score: severity from 0-10 (only include if > 4)
- question_to_ask: phrase it as a gentle, honest question — not an accusation. Something that invites reflection, not shame.

Return a JSON array only. No explanation text. Format:
[{"stated_value": "...", "observed_pattern": "...", "contradiction_score": 7.5, "question_to_ask": "..."}]

If there are no genuine contradictions, return an empty array: []`;

    let contradictions = [];
    try {
      const raw = await callAI(prompt);
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const jsonStart = cleaned.indexOf('[');
      const jsonEnd = cleaned.lastIndexOf(']');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        contradictions = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
      }
    } catch (err) {
      logger.error({ err }, '[contradiction-engine] AI parse failed in scan()');
      return [];
    }

    if (!Array.isArray(contradictions)) return [];

    // 7. Insert high-score contradictions
    const inserted = [];
    for (const c of contradictions) {
      if (!c.stated_value || !c.observed_pattern) continue;
      const score = parseFloat(c.contradiction_score) || 0;
      if (score <= 4) continue;

      const { rows } = await pool.query(`
        INSERT INTO contradiction_log
          (user_id, stated_value, observed_pattern, contradiction_score)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [userId, c.stated_value, c.observed_pattern, score]);

      inserted.push({ ...rows[0], question_to_ask: c.question_to_ask });
    }

    return inserted;
  }

  /**
   * getContradictions(userId, { acknowledged })
   * Fetch contradiction_log rows for a user.
   * acknowledged param is optional — if provided, filters by that state.
   */
  async function getContradictions(userId, { acknowledged } = {}) {
    let query = `
      SELECT * FROM contradiction_log
      WHERE user_id = $1
    `;
    const params = [userId];

    if (acknowledged !== undefined) {
      params.push(acknowledged);
      query += ` AND acknowledged = $${params.length}`;
    }

    query += ' ORDER BY contradiction_score DESC, surfaced_at DESC';

    const { rows } = await pool.query(query, params);
    return rows;
  }

  /**
   * acknowledgeContradiction({ contradictionId, userId, response })
   * Mark a contradiction as acknowledged, optionally recording the user's response.
   */
  async function acknowledgeContradiction({ contradictionId, userId, response }) {
    const { rows } = await pool.query(`
      UPDATE contradiction_log
      SET acknowledged    = TRUE,
          acknowledged_at = NOW(),
          user_response   = $3
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [contradictionId, userId, response || null]);
    return rows[0] || null;
  }

  // ── Belief Archaeology ────────────────────────────────────────────────────

  /**
   * runBeliefArchaeology({ userId, patternDescription })
   * Given a specific repeated behavior, surfaces the limiting belief running underneath it.
   * Upserts into belief_patterns (increments frequency if a very similar belief already exists).
   */
  async function runBeliefArchaeology({ userId, patternDescription }) {
    if (!callAI) throw new Error('callAI not available');

    const prompt = `This person has repeated this pattern: "${patternDescription}"

What is the most likely limiting belief operating underneath this behavior? This is not about willpower or discipline — it is about the story running below the surface. What does this person believe about themselves, about what they deserve, about what is possible, or about what is safe that would make this behavior make complete sense?

Return JSON only. No explanation text. Format:
{"belief_statement": "...", "question": "...", "trigger_pattern": "..."}

belief_statement: the underlying story/belief (specific, personal, not generic)
question: a single question that might help them see this belief operating (gentle, curious, not accusatory)
trigger_pattern: a short phrase describing what behavior triggers this belief pattern`;

    let result;
    try {
      const raw = await callAI(prompt);
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found');
      result = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    } catch (err) {
      logger.error({ err }, '[contradiction-engine] AI parse failed in runBeliefArchaeology()');
      throw err;
    }

    // Check for an existing similar belief (same trigger_pattern — fuzzy match by ILIKE)
    const { rows: existing } = await pool.query(`
      SELECT id, frequency FROM belief_patterns
      WHERE user_id = $1
        AND trigger_pattern ILIKE $2
        AND status IN ('active', 'examining')
      LIMIT 1
    `, [userId, `%${(result.trigger_pattern || patternDescription).substring(0, 30)}%`]);

    let belief;
    if (existing.length > 0) {
      // Increment frequency
      const { rows } = await pool.query(`
        UPDATE belief_patterns
        SET frequency  = frequency + 1,
            last_seen  = NOW()
        WHERE id = $1
        RETURNING *
      `, [existing[0].id]);
      belief = rows[0];
    } else {
      // Insert new
      const { rows } = await pool.query(`
        INSERT INTO belief_patterns
          (user_id, trigger_pattern, belief_statement)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [userId, result.trigger_pattern || patternDescription, result.belief_statement]);
      belief = rows[0];
    }

    return { belief, question: result.question };
  }

  /**
   * getBeliefs(userId)
   * Returns active belief_patterns ordered by frequency descending.
   */
  async function getBeliefs(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM belief_patterns
      WHERE user_id = $1
      ORDER BY
        CASE status WHEN 'active' THEN 0 WHEN 'examining' THEN 1 ELSE 2 END,
        frequency DESC,
        last_seen DESC
    `, [userId]);
    return rows;
  }

  /**
   * updateBelief({ beliefId, updatedBelief })
   * Record the belief that replaced the old one. Sets status to 'updated'.
   */
  async function updateBelief({ beliefId, updatedBelief }) {
    const { rows } = await pool.query(`
      UPDATE belief_patterns
      SET status         = 'updated',
          updated_belief = $2
      WHERE id = $1
      RETURNING *
    `, [beliefId, updatedBelief]);
    return rows[0] || null;
  }

  // ── Identity Stress Test ──────────────────────────────────────────────────

  /**
   * runIdentityStressTest(userId)
   * Pulls Be/Do/Have + 90-day trend data, calls AI to stress-test the stated identity
   * against actual behavioral evidence. Inserts into identity_reviews.
   */
  async function runIdentityStressTest(userId) {
    if (!callAI) throw new Error('callAI not available');

    // 1. Identity profile
    const { rows: userRows } = await pool.query(
      'SELECT be_statement, do_statement, have_vision FROM lifeos_users WHERE id = $1',
      [userId]
    );
    const user = userRows[0];
    if (!user) throw new Error('User not found');

    // 2. Integrity score trend (last 90 days)
    const { rows: integrityRows } = await pool.query(`
      SELECT score, computed_at
      FROM integrity_score_log
      WHERE user_id = $1
        AND computed_at >= NOW() - INTERVAL '90 days'
      ORDER BY computed_at ASC
    `, [userId]).catch(() => ({ rows: [] }));

    const integrityTrend = integrityRows.length > 0
      ? `Start: ${integrityRows[0].score}, End: ${integrityRows[integrityRows.length - 1].score}, Points: ${integrityRows.length}`
      : 'No integrity data';

    // 3. Joy score trend (last 90 days)
    const { rows: joyRows } = await pool.query(`
      SELECT score, checkin_date
      FROM joy_checkins
      WHERE user_id = $1
        AND checkin_date >= NOW() - INTERVAL '90 days'
      ORDER BY checkin_date ASC
    `, [userId]).catch(() => ({ rows: [] }));

    const avgJoy = joyRows.length > 0
      ? (joyRows.reduce((s, r) => s + Number(r.score), 0) / joyRows.length).toFixed(1)
      : null;
    const joyTrend = avgJoy
      ? `Average joy score over 90 days: ${avgJoy}/10 (${joyRows.length} check-ins)`
      : 'No joy data';

    // 4. Commitment breakdown (last 90 days)
    const { rows: commitRows } = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'kept') AS kept,
        COUNT(*) FILTER (WHERE status = 'broken') AS broken
      FROM commitments
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '90 days'
    `, [userId]).catch(() => ({ rows: [{ total: 0, kept: 0, broken: 0 }] }));

    const commitSummary = commitRows[0];
    const keepRate = commitSummary.total > 0
      ? `${commitSummary.kept}/${commitSummary.total} kept (${Math.round(commitSummary.kept / commitSummary.total * 100)}%)`
      : 'No commitment data';

    // 5. Build prompt
    const identity = [
      user.be_statement ? `BE: ${user.be_statement}` : null,
      user.do_statement ? `DO: ${user.do_statement}` : null,
      user.have_vision  ? `HAVE: ${user.have_vision}` : null,
    ].filter(Boolean).join('\n') || 'No identity declared';

    const prompt = `This person has stated the following identity (Be/Do/Have):

${identity}

Here is their behavioral data for the last 90 days:
- Integrity Score trend: ${integrityTrend}
- Joy Score: ${joyTrend}
- Commitments: ${keepRate}

Your job is to stress-test their stated identity against the data. Not to undermine them — to help them own it more deeply or evolve it consciously. Look for places where the data suggests they may be performing the identity (presenting it, aspiring to it) rather than actually being it.

Be honest. Be specific. Be kind. This person asked for this.

Return JSON only. Format:
{
  "gaps": [
    {"area": "...", "observation": "...", "question": "..."}
  ],
  "strength_areas": ["...", "..."],
  "overall_authenticity_score": 7.5
}

gaps: up to 3 specific areas where data and stated identity diverge (area = which part of their identity, observation = what the data shows, question = one honest question to sit with)
strength_areas: up to 4 areas where they ARE living the stated identity — where behavior matches declaration
overall_authenticity_score: 0-10, how aligned their actual behavior is with their stated identity based on available data`;

    let stressTestResults;
    try {
      const raw = await callAI(prompt);
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found');
      stressTestResults = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    } catch (err) {
      logger.error({ err }, '[contradiction-engine] AI parse failed in runIdentityStressTest()');
      throw err;
    }

    // 6. Insert into identity_reviews
    const { rows } = await pool.query(`
      INSERT INTO identity_reviews
        (user_id, be_statement, do_statement, have_statement, stress_test_results)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      userId,
      user.be_statement || null,
      user.do_statement || null,
      user.have_vision  || null,
      JSON.stringify(stressTestResults),
    ]);

    return rows[0];
  }

  /**
   * getLatestStressTest(userId)
   * Returns the most recent identity_reviews row for this user.
   */
  async function getLatestStressTest(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM identity_reviews
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);
    return rows[0] || null;
  }

  // ── Honest Witness ────────────────────────────────────────────────────────

  /**
   * runHonestWitnessSession(userId)
   * Reads 90 days of data — commitments, goals, joy, integrity, contradictions —
   * and delivers an unvarnished three-part witness: what you said, what you did, the gap.
   * No coaching. No softening. Just data.
   */
  async function runHonestWitnessSession(userId) {
    if (!callAI) throw new Error('callAI not available');

    // 1. Load stated goals from profile
    const { rows: userRows } = await pool.query(
      'SELECT be_statement, do_statement, have_vision FROM lifeos_users WHERE id = $1',
      [userId]
    );
    const user = userRows[0];
    if (!user) throw new Error('User not found');

    // 2. Commitments (last 90 days)
    const { rows: commitRows } = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'kept') AS kept,
        COUNT(*) FILTER (WHERE status = 'broken') AS broken,
        COUNT(*) FILTER (WHERE status = 'open' AND due_at < NOW()) AS overdue
      FROM commitments
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '90 days'
    `, [userId]).catch(() => ({ rows: [{ total: 0, kept: 0, broken: 0, overdue: 0 }] }));

    // 3. Recurring contradictions (unacknowledged)
    const { rows: contradictionRows } = await pool.query(`
      SELECT stated_value, observed_pattern, contradiction_score
      FROM contradiction_log
      WHERE user_id = $1
        AND surfaced_at >= NOW() - INTERVAL '90 days'
      ORDER BY contradiction_score DESC
      LIMIT 5
    `, [userId]).catch(() => ({ rows: [] }));

    // 4. Integrity scores
    const { rows: intRows } = await pool.query(`
      SELECT score, computed_at
      FROM integrity_score_log
      WHERE user_id = $1
        AND computed_at >= NOW() - INTERVAL '90 days'
      ORDER BY computed_at ASC
    `, [userId]).catch(() => ({ rows: [] }));

    // 5. Joy scores
    const { rows: joyRows } = await pool.query(`
      SELECT score, checkin_date
      FROM joy_checkins
      WHERE user_id = $1
        AND checkin_date >= NOW() - INTERVAL '90 days'
      ORDER BY checkin_date ASC
    `, [userId]).catch(() => ({ rows: [] }));

    // 6. Assemble data narrative
    const statedGoals = [
      user.be_statement ? `They said they wanted to BE: ${user.be_statement}` : null,
      user.do_statement ? `They said they would DO: ${user.do_statement}` : null,
      user.have_vision  ? `They said they wanted to HAVE: ${user.have_vision}` : null,
    ].filter(Boolean).join('\n') || 'No stated goals recorded.';

    const c = commitRows[0];
    const keepPct = c.total > 0 ? Math.round(c.kept / c.total * 100) : 0;
    const commitNarrative = `Commitments made: ${c.total}. Kept: ${c.kept} (${keepPct}%). Broken: ${c.broken}. Overdue: ${c.overdue}.`;

    const intNarrative = intRows.length > 0
      ? `Integrity score: started at ${intRows[0].score}, ended at ${intRows[intRows.length - 1].score} (${intRows.length} readings over 90 days).`
      : 'No integrity score data.';

    const joyNarrative = joyRows.length > 0
      ? `Joy check-ins: ${joyRows.length} over 90 days. Average: ${(joyRows.reduce((s, r) => s + Number(r.score), 0) / joyRows.length).toFixed(1)}/10.`
      : 'No joy data.';

    const contradictionNarrative = contradictionRows.length > 0
      ? `Surfaced contradictions (${contradictionRows.length}): ${contradictionRows.map(r => `"${r.stated_value}" vs actual: "${r.observed_pattern}" (score: ${r.contradiction_score})`).join('; ')}`
      : 'No contradictions surfaced.';

    // 7. Build prompt
    const prompt = `You are the honest witness. No coaching. No softening. No suggestions. No "perhaps consider." No "you might want to." Your only job is to read back what the data shows — exactly as it is.

This person, over the last 90 days:

STATED GOALS:
${statedGoals}

WHAT THE DATA SHOWS:
${commitNarrative}
${intNarrative}
${joyNarrative}
${contradictionNarrative}

Write exactly three paragraphs:

Paragraph 1 — "What you said you wanted":
Restate exactly what they declared they wanted. Use their words where possible. No interpretation. No evaluation. Just what they said.

Paragraph 2 — "What you did":
Describe exactly what the data shows happened. Specific numbers. No softening. No "you tried." Just what occurred.

Paragraph 3 — "The gap":
State the gap between paragraph 1 and paragraph 2 clearly and factually. Do not suggest what they should do. Do not offer hope or encouragement. Do not judge. Just name what is true. The user will decide what to do with this.

This is not coaching. This is witnessing. The absence of judgment IS the gift.`;

    let witnessText;
    try {
      witnessText = await callAI(prompt);
    } catch (err) {
      logger.error({ err }, '[contradiction-engine] AI call failed in runHonestWitnessSession()');
      throw err;
    }

    // 8. Parse the three paragraphs
    const paragraphs = witnessText.trim().split(/\n{2,}/);
    const said_wanted   = paragraphs[0] || witnessText;
    const what_happened = paragraphs[1] || '';
    const gap_analysis  = paragraphs[2] || '';

    const periodStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const periodEnd   = new Date();

    // 9. Insert session
    const { rows } = await pool.query(`
      INSERT INTO honest_witness_sessions
        (user_id, period_start, period_end, said_wanted, what_happened, gap_analysis)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, periodStart, periodEnd, said_wanted, what_happened, gap_analysis]);

    return { session: rows[0], witnessText };
  }

  /**
   * getWitnessSessions(userId)
   * Returns the 10 most recent honest witness sessions for this user.
   */
  async function getWitnessSessions(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM honest_witness_sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);
    return rows;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    // Contradiction Engine
    scan,
    getContradictions,
    acknowledgeContradiction,

    // Belief Archaeology
    runBeliefArchaeology,
    getBeliefs,
    updateBelief,

    // Identity Stress Test
    runIdentityStressTest,
    getLatestStressTest,

    // Honest Witness
    runHonestWitnessSession,
    getWitnessSessions,
  };
}
