/**
 * services/decision-intelligence.js
 *
 * Decision Intelligence layer — Ideas 5-8
 *
 * Core capabilities:
 *  - logDecision()             — Decision Archaeology: log a decision with full biometric context
 *  - recordOutcome()           — Record how a decision turned out; feeds energy pattern learning
 *  - getDecisions()            — Retrieve decision history with optional category filter
 *  - analyzeDecisionPatterns() — AI synthesis of when/how this person makes their best decisions
 *  - getSecondOpinion()        — The Second Opinion Engine: steelman opposing position before deciding
 *  - detectBiases()            — Cognitive Bias Detection: pattern match on last 15 decisions
 *  - getBiasReport()           — Retrieve stored bias detections for user
 *  - getEnergyProfile()        — The Energy Calendar: per-hour cognitive state from decision data
 *  - updateEnergyPatterns()    — Internal: running-average energy quality after each outcome
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createDecisionIntelligence({ pool, callAI, logger }) {
  const log = logger || console;

  // ── logDecision ────────────────────────────────────────────────────────────

  async function logDecision({ userId, title, category, decisionMade, alternativesConsidered, emotionalState }) {
    // Assemble context_at_time from live data — each source is best-effort
    let integrityScore = null;
    let joyScore = null;
    let sleepMinutes = null;
    let hrv = null;

    try {
      const { rows } = await pool.query(
        `SELECT total_score FROM integrity_score_log
         WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 1`,
        [userId]
      );
      integrityScore = rows[0]?.total_score ?? null;
    } catch (err) {
      log.warn({ err }, 'decision-intelligence: could not read integrity_score_log');
    }

    try {
      const { rows } = await pool.query(
        `SELECT avg_joy_7d FROM joy_score_log
         WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 1`,
        [userId]
      );
      joyScore = rows[0]?.avg_joy_7d ?? null;
    } catch (err) {
      log.warn({ err }, 'decision-intelligence: could not read joy_score_log');
    }

    try {
      // wearable_data: sleep_minutes (sum of stage minutes) and hrv
      const { rows } = await pool.query(
        `SELECT
           (COALESCE((data->>'deep_sleep_min')::int,0)
          + COALESCE((data->>'light_sleep_min')::int,0)
          + COALESCE((data->>'rem_sleep_min')::int,0)) AS sleep_minutes,
           (data->>'hrv')::numeric AS hrv
         FROM wearable_data
         WHERE user_id = $1
         ORDER BY recorded_at DESC LIMIT 1`,
        [userId]
      );
      sleepMinutes = rows[0]?.sleep_minutes ?? null;
      hrv          = rows[0]?.hrv ?? null;
    } catch (err) {
      log.warn({ err }, 'decision-intelligence: could not read wearable_data');
    }

    const hourOfDay = new Date().getHours();

    const contextAtTime = {
      integrity_score: integrityScore,
      joy_score:       joyScore,
      sleep_minutes:   sleepMinutes,
      hrv:             hrv,
      hour_of_day:     hourOfDay,
      emotional_state: emotionalState || null,
    };

    const { rows } = await pool.query(`
      INSERT INTO decisions
        (user_id, title, category, decision_made, alternatives_considered, context_at_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      userId,
      title,
      category || 'other',
      decisionMade || null,
      alternativesConsidered || [],
      JSON.stringify(contextAtTime),
    ]);

    return rows[0];
  }

  // ── recordOutcome ──────────────────────────────────────────────────────────

  async function recordOutcome({ decisionId, userId, outcome, outcomeRating }) {
    const { rows } = await pool.query(`
      UPDATE decisions
      SET outcome = $3, outcome_at = NOW(), outcome_rating = $4
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [decisionId, userId, outcome, outcomeRating]);

    const updated = rows[0] || null;

    if (updated) {
      // Feed energy pattern learning from this outcome
      try {
        await updateEnergyPatterns(userId, updated);
      } catch (err) {
        log.warn({ err }, 'decision-intelligence: updateEnergyPatterns failed (non-fatal)');
      }
    }

    return updated;
  }

  // ── getDecisions ───────────────────────────────────────────────────────────

  async function getDecisions({ userId, category, limit = 20 }) {
    const params = [userId];
    let categoryClause = '';

    if (category) {
      params.push(category);
      categoryClause = `AND category = $${params.length}`;
    }

    params.push(limit);
    const { rows } = await pool.query(`
      SELECT * FROM decisions
      WHERE user_id = $1 ${categoryClause}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `, params);

    return rows;
  }

  // ── analyzeDecisionPatterns ────────────────────────────────────────────────

  async function analyzeDecisionPatterns(userId) {
    if (!callAI) return 'AI unavailable.';

    const { rows: decisions } = await pool.query(`
      SELECT title, category, decision_made, context_at_time,
             outcome, outcome_rating, created_at
      FROM decisions
      WHERE user_id = $1 AND outcome IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);

    if (decisions.length === 0) {
      return 'Not enough decisions with recorded outcomes yet. Log outcomes for your past decisions to enable pattern analysis.';
    }

    const decisionSummary = decisions.map((d, i) => {
      const ctx = d.context_at_time || {};
      return `${i + 1}. "${d.title}" (${d.category || 'other'})
   Context: integrity=${ctx.integrity_score ?? '?'}, joy=${ctx.joy_score ?? '?'}, sleep=${ctx.sleep_minutes ? Math.round(ctx.sleep_minutes / 60) + 'h' : '?'}, HRV=${ctx.hrv ?? '?'}, hour=${ctx.hour_of_day ?? '?'}:00, emotional state=${ctx.emotional_state || 'not recorded'}
   Decided: ${d.decision_made || '(not recorded)'}
   Outcome: ${d.outcome} (rating: ${d.outcome_rating}/10)`;
    }).join('\n\n');

    const prompt = `Analyze this person's decision history. What patterns do you see? When do they make their best decisions? When do they make their worst? What does this suggest about the conditions they need for good decision-making? Be specific — reference the actual decisions and contexts.

Decision history:
${decisionSummary}

Provide a clear, honest analysis. Be direct. Reference specific decisions by their titles. State what the data actually shows, not what sounds encouraging.`;

    const raw = await callAI(prompt);
    return typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
  }

  // ── getSecondOpinion ───────────────────────────────────────────────────────

  async function getSecondOpinion({ userId, decisionDescription, decisionId }) {
    if (!callAI) throw new Error('AI unavailable');

    const prompt = `This person is considering: ${decisionDescription}

You are their most trusted, completely honest advisor. You have NO stake in what they decide. Your job is to make sure they've genuinely thought this through.

Provide:
(1) The 3 strongest arguments AGAINST this decision.
(2) The risks they may not have fully considered.
(3) Three specific questions worth sitting with before deciding.

Be direct. Be honest. You are not trying to talk them out of it — you're ensuring the decision is made with clear eyes.

Return your response as JSON with this exact shape:
{
  "steelman_against": "A single paragraph or numbered list of the 3 strongest arguments against this decision",
  "risks_not_considered": ["risk 1", "risk 2", "risk 3"],
  "questions_to_sit_with": ["Question 1?", "Question 2?", "Question 3?"]
}

Return ONLY the JSON — no preamble, no explanation outside the JSON.`;

    const raw = await callAI(prompt);
    const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';

    let steelmanAgainst = '';
    let questionsSitWith = [];
    let risksNotConsidered = [];

    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        steelmanAgainst    = parsed.steelman_against || '';
        questionsSitWith   = Array.isArray(parsed.questions_to_sit_with) ? parsed.questions_to_sit_with : [];
        risksNotConsidered = Array.isArray(parsed.risks_not_considered) ? parsed.risks_not_considered : [];
      }
    } catch {
      // Fallback: use raw text as steelman if JSON parse fails
      steelmanAgainst = text.trim();
    }

    const { rows } = await pool.query(`
      INSERT INTO second_opinions
        (user_id, decision_id, decision_description, steelman_against,
         questions_to_sit_with, risks_not_considered)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      userId,
      decisionId || null,
      decisionDescription,
      steelmanAgainst,
      questionsSitWith,
      risksNotConsidered,
    ]);

    // Mark the linked decision as having used a second opinion
    if (decisionId) {
      try {
        await pool.query(
          `UPDATE decisions SET second_opinion_used = TRUE WHERE id = $1 AND user_id = $2`,
          [decisionId, userId]
        );
      } catch (err) {
        log.warn({ err }, 'decision-intelligence: failed to flag second_opinion_used (non-fatal)');
      }
    }

    return {
      id:                  rows[0].id,
      steelmanAgainst,
      questionsSitWith,
      risksNotConsidered,
      createdAt:           rows[0].created_at,
    };
  }

  // ── detectBiases ──────────────────────────────────────────────────────────

  async function detectBiases(userId) {
    if (!callAI) throw new Error('AI unavailable');

    const { rows: decisions } = await pool.query(`
      SELECT id, title, category, decision_made, alternatives_considered,
             context_at_time, outcome, outcome_rating, second_opinion_used, created_at
      FROM decisions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 15
    `, [userId]);

    if (decisions.length < 3) {
      return [];
    }

    const decisionSummary = decisions.map((d, i) => {
      const ctx = d.context_at_time || {};
      const alts = Array.isArray(d.alternatives_considered) ? d.alternatives_considered.join(', ') : 'none recorded';
      return `${i + 1}. [id:${d.id}] "${d.title}" (${d.category || 'other'})
   Decided: ${d.decision_made || '(not recorded)'}
   Alternatives considered: ${alts}
   Context: integrity=${ctx.integrity_score ?? '?'}, hour=${ctx.hour_of_day ?? '?'}:00, emotional=${ctx.emotional_state || '?'}
   Outcome: ${d.outcome || 'not yet recorded'}${d.outcome_rating ? ` (${d.outcome_rating}/10)` : ''}
   Used second opinion: ${d.second_opinion_used}`;
    }).join('\n\n');

    const prompt = `Review this person's decision history and identify any recurring cognitive biases. Look specifically for:
- confirmation bias (seeking confirming evidence, not fully weighing contradicting information)
- sunk cost (continuing because of past investment, not future value)
- optimism bias (underestimating risks or difficulty)
- anchoring (over-relying on the first piece of information encountered)
- availability bias (overweighting recent or emotionally memorable events)
- status quo bias (defaulting to the current state without evaluating alternatives)
- recency bias (overweighting what just happened vs longer patterns)

For each bias found: describe the specific pattern with examples from their decisions. Estimate frequency. State how it has affected outcomes where data exists.

Decision history:
${decisionSummary}

Return JSON array. If no bias found, return [].
Format: [{"bias_type": "confirmation", "description": "...", "decision_ids": [3, 7], "frequency": 2}]

Return ONLY the JSON array — no explanation outside the JSON.`;

    const raw = await callAI(prompt);
    const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';

    let biases = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        biases = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      log.warn('decision-intelligence: could not parse bias detection JSON');
      return [];
    }

    const validTypes = ['confirmation','sunk_cost','optimism','anchoring','availability','status_quo','recency'];
    const stored = [];

    for (const bias of biases) {
      if (!bias.bias_type || !validTypes.includes(bias.bias_type)) continue;
      if (!bias.description) continue;

      const freq = parseInt(bias.frequency) || 1;
      if (freq < 2) continue; // Only store recurring patterns

      try {
        const { rows } = await pool.query(`
          INSERT INTO bias_detections (user_id, bias_type, description, decision_ids, frequency, last_seen)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (user_id, bias_type)
          DO UPDATE SET
            description  = EXCLUDED.description,
            decision_ids = EXCLUDED.decision_ids,
            frequency    = GREATEST(bias_detections.frequency, EXCLUDED.frequency),
            last_seen    = NOW()
          RETURNING *
        `, [
          userId,
          bias.bias_type,
          bias.description,
          Array.isArray(bias.decision_ids) ? bias.decision_ids : [],
          freq,
        ]);
        stored.push(rows[0]);
      } catch (err) {
        // bias_detections may not have a unique constraint yet; fall back to plain insert
        try {
          const { rows } = await pool.query(`
            INSERT INTO bias_detections (user_id, bias_type, description, decision_ids, frequency)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [userId, bias.bias_type, bias.description,
              Array.isArray(bias.decision_ids) ? bias.decision_ids : [], freq]);
          stored.push(rows[0]);
        } catch (innerErr) {
          log.warn({ innerErr }, 'decision-intelligence: failed to store bias detection');
        }
      }
    }

    return stored;
  }

  // ── getBiasReport ──────────────────────────────────────────────────────────

  async function getBiasReport(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM bias_detections
      WHERE user_id = $1
      ORDER BY frequency DESC, last_seen DESC
    `, [userId]);
    return rows;
  }

  // ── getEnergyProfile ──────────────────────────────────────────────────────

  async function getEnergyProfile(userId) {
    const { rows: patterns } = await pool.query(`
      SELECT * FROM energy_patterns
      WHERE user_id = $1
      ORDER BY hour_of_day ASC
    `, [userId]);

    const peakHours    = patterns.filter(p => p.cognitive_state === 'peak').map(p => p.hour_of_day);
    const lowHours     = patterns.filter(p => p.cognitive_state === 'low' || p.cognitive_state === 'reactive').map(p => p.hour_of_day);
    const bestDecision = patterns
      .filter(p => p.avg_decision_quality !== null && p.sample_count > 0)
      .sort((a, b) => parseFloat(b.avg_decision_quality) - parseFloat(a.avg_decision_quality))
      .slice(0, 3)
      .map(p => p.hour_of_day);

    const totalSamples = patterns.reduce((sum, p) => sum + (p.sample_count || 0), 0);

    // Estimate time span from first decision
    let timespanDays = null;
    try {
      const { rows } = await pool.query(
        `SELECT EXTRACT(DAY FROM NOW() - MIN(created_at))::int AS days FROM decisions WHERE user_id = $1`,
        [userId]
      );
      timespanDays = rows[0]?.days ?? null;
    } catch { /* non-fatal */ }

    return {
      patterns,
      summary: {
        peak_hours:             peakHours,
        low_hours:              lowHours,
        best_decision_hours:    bestDecision,
        total_decisions_tracked: totalSamples,
        timespan_days:          timespanDays,
      },
    };
  }

  // ── updateEnergyPatterns (internal) ───────────────────────────────────────

  async function updateEnergyPatterns(userId, decision) {
    const ctx = decision.context_at_time || {};
    const hourOfDay = ctx.hour_of_day ?? new Date(decision.created_at).getHours();
    const outcomeRating = parseFloat(decision.outcome_rating);

    if (isNaN(outcomeRating) || hourOfDay === null || hourOfDay === undefined) return;

    // Running average: new_avg = (old_avg * old_count + new_value) / (old_count + 1)
    // UPSERT with running average calculation
    const { rows } = await pool.query(`
      INSERT INTO energy_patterns (user_id, hour_of_day, avg_decision_quality, sample_count, updated_at)
      VALUES ($1, $2, $3, 1, NOW())
      ON CONFLICT (user_id, hour_of_day)
      DO UPDATE SET
        avg_decision_quality = (
          energy_patterns.avg_decision_quality * energy_patterns.sample_count + $3
        ) / (energy_patterns.sample_count + 1),
        sample_count = energy_patterns.sample_count + 1,
        updated_at   = NOW()
      RETURNING *
    `, [userId, hourOfDay, outcomeRating]);

    const updated = rows[0];
    if (!updated) return;

    // Classify cognitive_state from avg_decision_quality
    const avg = parseFloat(updated.avg_decision_quality);
    let cognitiveState = 'neutral';
    if      (avg > 7)  cognitiveState = 'peak';
    else if (avg >= 5) cognitiveState = 'good';
    else if (avg >= 3) cognitiveState = 'neutral';
    else               cognitiveState = 'low';

    await pool.query(
      `UPDATE energy_patterns SET cognitive_state = $3 WHERE user_id = $1 AND hour_of_day = $2`,
      [userId, hourOfDay, cognitiveState]
    );
  }

  // ── getSecondOpinions ─────────────────────────────────────────────────────

  async function getSecondOpinions(userId, { limit = 20 } = {}) {
    const { rows } = await pool.query(`
      SELECT * FROM second_opinions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return rows;
  }

  // ── acknowledgeSecondOpinion ───────────────────────────────────────────────

  async function markProceedingAfterSecondOpinion(secondOpinionId, userId) {
    const { rows } = await pool.query(`
      UPDATE second_opinions
      SET user_proceeded = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [secondOpinionId, userId]);
    return rows[0] || null;
  }

  // ── acknowledgeBias ────────────────────────────────────────────────────────

  async function acknowledgeBias(biasId, userId) {
    const { rows } = await pool.query(`
      UPDATE bias_detections
      SET acknowledged = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [biasId, userId]);
    return rows[0] || null;
  }

  return {
    logDecision,
    recordOutcome,
    getDecisions,
    analyzeDecisionPatterns,
    getSecondOpinion,
    detectBiases,
    getBiasReport,
    getEnergyProfile,
    updateEnergyPatterns,
    getSecondOpinions,
    markProceedingAfterSecondOpinion,
    acknowledgeBias,
  };
}
