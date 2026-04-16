/**
 * services/relationship-intelligence.js
 *
 * Module B: Relationship Intelligence
 *
 * Computes relationship health scores from available data, crafts genuine apologies,
 * forecasts difficult emotional periods from historical patterns, and facilitates
 * family values articulation and tracking.
 *
 * Exports:
 *   createRelationshipIntelligence({ pool, callAI, logger })
 *     → computeRelationshipHealth, getRelationshipHealth,
 *        craftApology, getForecast, getCurrentForecast,
 *        setFamilyValue, reviewFamilyValues
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createRelationshipIntelligence({ pool, callAI, logger }) {

  // ── computeRelationshipHealth ──────────────────────────────────────────────

  async function computeRelationshipHealth({ userId, relationshipLabel, periodDays = 30 }) {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    // Gather evidence from adjacent tables
    let commitmentData = [];
    let debriefData    = [];
    let outreachData   = [];

    try {
      const { rows } = await pool.query(`
        SELECT title, status, committed_to, due_at, kept_at, broken_at
        FROM commitments
        WHERE user_id = $1
          AND created_at >= $2
          AND (
            LOWER(committed_to) ILIKE $3
            OR LOWER(title) ILIKE $3
          )
        LIMIT 50
      `, [userId, since, `%${relationshipLabel.toLowerCase()}%`]);
      commitmentData = rows;
    } catch { /* table may not have this column pattern */ }

    try {
      const { rows } = await pool.query(`
        SELECT conversation_context, ai_insights, created_at
        FROM conversation_debriefs
        WHERE user_id = $1
          AND created_at >= $2
          AND LOWER(conversation_context) ILIKE $3
        LIMIT 20
      `, [userId, since, `%${relationshipLabel.toLowerCase()}%`]);
      debriefData = rows;
    } catch { /* table may not exist yet */ }

    try {
      const { rows } = await pool.query(`
        SELECT task_type, contact_name, status, created_at
        FROM outreach_tasks
        WHERE user_id = $1
          AND created_at >= $2
          AND LOWER(contact_name) ILIKE $3
        LIMIT 20
      `, [userId, since, `%${relationshipLabel.toLowerCase()}%`]);
      outreachData = rows;
    } catch { /* table may not exist yet */ }

    // Build context for AI estimation
    const dataContext = [
      commitmentData.length > 0
        ? `Commitments involving ${relationshipLabel} (last ${periodDays} days):\n` +
          commitmentData.map(c =>
            `- "${c.title}" → status: ${c.status}, committed_to: ${c.committed_to}`
          ).join('\n')
        : `No commitment data found for ${relationshipLabel}.`,

      debriefData.length > 0
        ? `Conversation debriefs mentioning ${relationshipLabel}:\n` +
          debriefData.map(d => `- ${d.conversation_context}`).join('\n')
        : `No debriefs found for ${relationshipLabel}.`,

      outreachData.length > 0
        ? `Outreach tasks to/about ${relationshipLabel}:\n` +
          outreachData.map(o => `- type: ${o.task_type}, status: ${o.status}`).join('\n')
        : `No outreach tasks found for ${relationshipLabel}.`,
    ].join('\n\n');

    const prompt = `Based on the following data about a person's relationship with "${relationshipLabel}" over the last ${periodDays} days, estimate four relationship health metrics. Use only the data provided — do not fabricate specifics, but do make reasonable inferences.

DATA:
${dataContext}

Estimate these four metrics and return ONLY a JSON object:
{
  "initiation_ratio": <number — who reaches out more; >1 means user initiates more, 1.0 = balanced, estimate from data>,
  "repair_speed_hours": <number — average hours to repair after conflict; null if no conflict evidence>,
  "commitment_followthrough": <number 0-1 — ratio of promises kept based on commitment data>,
  "deposit_withdrawal_ratio": <number — positive interactions / negative; estimate from tone of debriefs>,
  "health_score": <number 0-10 — composite score>,
  "notes": "<1-2 sentence observation about the relationship pattern>"
}

Return ONLY the JSON. No markdown fences, no explanation.`;

    let metrics = {
      initiation_ratio:          1.0,
      repair_speed_hours:        null,
      commitment_followthrough:  null,
      deposit_withdrawal_ratio:  null,
      health_score:              5.0,
      notes:                     'Insufficient data for accurate assessment.',
    };

    try {
      const raw  = await callAI(prompt);
      const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
      metrics = { ...metrics, ...parsed };
    } catch (err) {
      logger?.warn({ err }, 'relationship-intelligence: AI metric estimation failed, using defaults');
    }

    const periodStart = new Date(since).toISOString();
    const periodEnd   = new Date().toISOString();

    const { rows } = await pool.query(`
      INSERT INTO relationship_health_log
        (user_id, relationship_label, period_start, period_end,
         initiation_ratio, repair_speed_hours, commitment_followthrough,
         deposit_withdrawal_ratio, health_score, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      userId,
      relationshipLabel,
      periodStart,
      periodEnd,
      metrics.initiation_ratio         ?? null,
      metrics.repair_speed_hours       ?? null,
      metrics.commitment_followthrough ?? null,
      metrics.deposit_withdrawal_ratio ?? null,
      metrics.health_score             ?? 5.0,
      metrics.notes                    || null,
    ]);

    return rows[0];
  }

  // ── getRelationshipHealth ──────────────────────────────────────────────────

  async function getRelationshipHealth({ userId, relationshipLabel }) {
    const { rows } = await pool.query(`
      SELECT * FROM relationship_health_log
      WHERE user_id = $1
        AND LOWER(relationship_label) = LOWER($2)
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId, relationshipLabel]);
    return rows;
  }

  // ── craftApology ──────────────────────────────────────────────────────────

  async function craftApology({ userId, relationshipLabel, incidentDescription }) {
    const prompt = `This person needs to apologize to "${relationshipLabel}" for this incident:

"${incidentDescription}"

Write a genuine apology — not a deflection apology, not "I'm sorry you felt that way." A real apology has four parts:

1. Clear acknowledgment of the impact on the other person (not just the action — the impact)
2. No "but" — no justification, no context that softens responsibility
3. What you understand now that you didn't before
4. What will specifically change — a concrete behavioral commitment

Write the apology as a first-person message ready to be spoken or sent.

Then assess it and return ONLY a JSON object:
{
  "apology_text": "<the full apology text>",
  "quality_score": <number 0-10>,
  "components": {
    "impact_acknowledged": <true/false>,
    "no_but": <true/false>,
    "understanding_stated": <true/false>,
    "change_committed": <true/false>
  }
}

Return ONLY the JSON. No markdown fences, no explanation.`;

    const raw  = await callAI(prompt);
    const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';

    let parsed;
    try {
      const clean  = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const jsonStr = clean.match(/\{[\s\S]*\}/)?.[0] || clean;
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      throw new Error(`AI returned invalid JSON for apology: ${err.message}`);
    }

    const { rows } = await pool.query(`
      INSERT INTO apology_log
        (user_id, relationship_label, incident_description, apology_text,
         quality_score, components, outcome)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,'pending')
      RETURNING *
    `, [
      userId,
      relationshipLabel,
      incidentDescription,
      parsed.apology_text,
      parsed.quality_score ?? null,
      JSON.stringify(parsed.components || {}),
    ]);

    return {
      ...rows[0],
      apologyText:  parsed.apology_text,
      qualityScore: parsed.quality_score,
      components:   parsed.components,
    };
  }

  // ── getForecast ────────────────────────────────────────────────────────────

  async function getForecast({ userId, weeksAhead = 8 }) {
    const since18Months = new Date(Date.now() - 548 * 24 * 60 * 60 * 1000).toISOString();

    // Pull historical mood/energy signals
    let joyHistory       = [];
    let integrityHistory = [];
    let wearableHistory  = [];

    try {
      const { rows } = await pool.query(`
        SELECT DATE_TRUNC('week', checked_in_at) AS week_start,
               AVG(score) AS avg_score
        FROM joy_score_log
        WHERE user_id = $1 AND checked_in_at >= $2
        GROUP BY 1 ORDER BY 1
      `, [userId, since18Months]);
      joyHistory = rows;
    } catch { /* table may not exist yet */ }

    try {
      const { rows } = await pool.query(`
        SELECT DATE_TRUNC('week', computed_at) AS week_start,
               AVG(score) AS avg_score
        FROM integrity_score_log
        WHERE user_id = $1 AND computed_at >= $2
        GROUP BY 1 ORDER BY 1
      `, [userId, since18Months]);
      integrityHistory = rows;
    } catch { /* table may not exist yet */ }

    try {
      const { rows } = await pool.query(`
        SELECT DATE_TRUNC('week', recorded_at) AS week_start,
               AVG(hrv_ms) AS avg_hrv,
               AVG(sleep_hours) AS avg_sleep
        FROM wearable_data
        WHERE user_id = $1 AND recorded_at >= $2
        GROUP BY 1 ORDER BY 1
      `, [userId, since18Months]);
      wearableHistory = rows;
    } catch { /* table may not exist yet */ }

    const hasData = joyHistory.length > 0 || integrityHistory.length > 0 || wearableHistory.length > 0;

    const historySummary = hasData
      ? [
          joyHistory.length > 0
            ? `Joy score weekly averages (most recent 12 weeks):\n` +
              joyHistory.slice(-12).map(r =>
                `  Week of ${r.week_start?.toISOString?.()?.slice(0,10) || r.week_start}: ${parseFloat(r.avg_score).toFixed(1)}`
              ).join('\n')
            : 'No joy score history available.',

          integrityHistory.length > 0
            ? `Integrity score weekly averages (most recent 12 weeks):\n` +
              integrityHistory.slice(-12).map(r =>
                `  Week of ${r.week_start?.toISOString?.()?.slice(0,10) || r.week_start}: ${parseFloat(r.avg_score).toFixed(1)}`
              ).join('\n')
            : 'No integrity score history available.',

          wearableHistory.length > 0
            ? `HRV/Sleep weekly averages (most recent 12 weeks):\n` +
              wearableHistory.slice(-12).map(r =>
                `  Week of ${r.week_start?.toISOString?.()?.slice(0,10) || r.week_start}: HRV ${parseFloat(r.avg_hrv || 0).toFixed(0)}ms, sleep ${parseFloat(r.avg_sleep || 0).toFixed(1)}h`
              ).join('\n')
            : 'No wearable history available.',
        ].join('\n\n')
      : 'No historical data available yet. Forecasts will improve as more data is collected.';

    const forecastWeeks = [];
    for (let i = 0; i < weeksAhead; i++) {
      const start = new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000);
      forecastWeeks.push({
        week: i + 1,
        start: start.toISOString().slice(0, 10),
        end:   new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });
    }

    const prompt = `Based on 18 months of a person's behavioral and physiological data, forecast their emotional/energy state for the next ${weeksAhead} weeks.

HISTORICAL DATA:
${historySummary}

WEEKS TO FORECAST:
${forecastWeeks.map(w => `Week ${w.week}: ${w.start} to ${w.end}`).join('\n')}

For each week, predict:
- predicted_state: one of "high_energy" | "moderate" | "low_energy" | "reactive"
- confidence: 0-1 (higher if there's clear historical pattern, lower if data is sparse)
- reasons: 2-3 specific reasons for the prediction (based on patterns observed)
- recommendations: 2-3 concrete actions to prepare for or leverage this period

Return ONLY a JSON array (one object per week):
[
  {
    "week": 1,
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD",
    "predicted_state": "moderate",
    "confidence": 0.6,
    "reasons": ["reason 1", "reason 2"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  }
]

Return ONLY the JSON array. No markdown, no explanation.`;

    let forecastsFromAI = [];
    try {
      const raw   = await callAI(prompt);
      const text  = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const match = clean.match(/\[[\s\S]*\]/);
      forecastsFromAI = match ? JSON.parse(match[0]) : [];
    } catch (err) {
      logger?.warn({ err }, 'relationship-intelligence: forecast AI parse failed');
      // Generate generic forecasts as fallback
      forecastsFromAI = forecastWeeks.map(w => ({
        week: w.week,
        start: w.start,
        end:   w.end,
        predicted_state: 'moderate',
        confidence:      0.3,
        reasons:         ['Insufficient historical data for accurate prediction'],
        recommendations: ['Continue tracking to improve forecast accuracy'],
      }));
    }

    // Persist each forecast
    const savedForecasts = [];
    for (const f of forecastsFromAI) {
      try {
        const { rows } = await pool.query(`
          INSERT INTO weather_forecasts
            (user_id, forecast_period_start, forecast_period_end,
             predicted_state, confidence, reasons, recommendations)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          RETURNING *
        `, [
          userId,
          f.start,
          f.end,
          f.predicted_state || 'moderate',
          f.confidence      || 0.5,
          f.reasons         || [],
          f.recommendations || [],
        ]);
        savedForecasts.push(rows[0]);
      } catch (err) {
        logger?.warn({ err, forecast: f }, 'relationship-intelligence: failed to save forecast row');
      }
    }

    return savedForecasts;
  }

  // ── getCurrentForecast ─────────────────────────────────────────────────────

  async function getCurrentForecast(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM weather_forecasts
      WHERE user_id = $1
        AND forecast_period_start >= NOW()
      ORDER BY forecast_period_start ASC
      LIMIT 8
    `, [userId]);
    return rows;
  }

  // ── setFamilyValue ─────────────────────────────────────────────────────────

  async function setFamilyValue({ userId, valueName, description, howWeLiveThis }) {
    const { rows } = await pool.query(`
      INSERT INTO family_values (user_id, value_name, description, how_we_live_this)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, valueName, description || null, howWeLiveThis || null]);
    return rows[0];
  }

  // ── reviewFamilyValues ─────────────────────────────────────────────────────

  async function reviewFamilyValues({ userId }) {
    const { rows: values } = await pool.query(
      'SELECT * FROM family_values WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );

    if (values.length === 0) {
      return { values: [], familyStateNarrative: null };
    }

    // Pull recent data signals for health scoring
    let recentIntegrity = null;
    let recentJoy       = null;
    let recentDebriefs  = [];

    try {
      const { rows } = await pool.query(`
        SELECT AVG(score) AS avg_score
        FROM integrity_score_log
        WHERE user_id = $1 AND computed_at >= NOW() - INTERVAL '30 days'
      `, [userId]);
      recentIntegrity = rows[0]?.avg_score ? parseFloat(rows[0].avg_score) : null;
    } catch { /* table may not exist */ }

    try {
      const { rows } = await pool.query(`
        SELECT AVG(score) AS avg_score
        FROM joy_score_log
        WHERE user_id = $1 AND checked_in_at >= NOW() - INTERVAL '30 days'
      `, [userId]);
      recentJoy = rows[0]?.avg_score ? parseFloat(rows[0].avg_score) : null;
    } catch { /* table may not exist */ }

    try {
      const { rows } = await pool.query(`
        SELECT conversation_context, ai_insights
        FROM conversation_debriefs
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC LIMIT 5
      `, [userId]);
      recentDebriefs = rows;
    } catch { /* table may not exist */ }

    const valuesContext = values.map(v =>
      `• ${v.value_name}: ${v.description || '(no description)'}\n  How we live this: ${v.how_we_live_this || '(not defined)'}\n  Current health score: ${v.health_score}/10`
    ).join('\n\n');

    const signalsContext = [
      recentIntegrity !== null ? `Average integrity score (last 30 days): ${recentIntegrity.toFixed(1)}/100` : null,
      recentJoy       !== null ? `Average joy score (last 30 days): ${recentJoy.toFixed(1)}/10` : null,
      recentDebriefs.length > 0
        ? `Recent conversation themes:\n${recentDebriefs.map(d => `  - ${d.conversation_context}`).join('\n')}`
        : null,
    ].filter(Boolean).join('\n');

    const prompt = `This family has articulated the following shared values:

${valuesContext}

${signalsContext ? `Recent data signals:\n${signalsContext}` : 'Limited data signals available.'}

Assess the current "state of the family." For each value, estimate a health score (0-10) based on available evidence. Then write a 2-3 paragraph honest narrative about how this family is doing — what they are living well, what the gap is between stated values and actual behavior, and one specific invitation for this period.

Return ONLY a JSON object:
{
  "value_health_scores": {
    "<value_name>": <score 0-10>
  },
  "family_state_narrative": "<2-3 paragraph honest narrative>"
}

Return ONLY the JSON. No markdown fences, no explanation.`;

    let familyStateNarrative = null;
    const updatedValues = [...values];

    try {
      const raw   = await callAI(prompt);
      const text  = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        familyStateNarrative = parsed.family_state_narrative || null;

        // Update health scores for each value
        const healthScores = parsed.value_health_scores || {};
        for (const value of updatedValues) {
          const newScore = healthScores[value.value_name];
          if (typeof newScore === 'number') {
            await pool.query(
              'UPDATE family_values SET health_score = $1, last_reviewed = NOW() WHERE id = $2',
              [newScore, value.id]
            );
            value.health_score = newScore;
          }
        }
      }
    } catch (err) {
      logger?.warn({ err }, 'relationship-intelligence: family values review AI failed');
    }

    return { values: updatedValues, familyStateNarrative };
  }

  return {
    computeRelationshipHealth,
    getRelationshipHealth,
    craftApology,
    getForecast,
    getCurrentForecast,
    setFamilyValue,
    reviewFamilyValues,
  };
}
