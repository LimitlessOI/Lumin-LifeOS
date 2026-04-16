/**
 * services/health-extensions.js
 *
 * Module A: Health Extensions — Ideas 16–17
 *
 * Idea 16: Food as Medicine AI — personalized nutrition insights tied to actual
 *          biometric data over 90 days, not generic advice.
 *
 * Idea 17: Pre-Disease Early Warning — learns the user's personal baseline and
 *          alerts them when their current pattern resembles one that preceded a
 *          prior health challenge.
 *
 * Also houses mapMonetizationPaths (Idea 18), Legacy Project CRUD (Idea 19), and
 * Death Meditation (Idea 20) because all five depend on health/purpose data and
 * share the same DB tables added in 20260329_lifeos_community.sql.
 *
 * Exports: createHealthExtensions({ pool, callAI, logger })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

'use strict';

/**
 * @param {{ pool: import('pg').Pool, callAI: Function, logger: import('pino').Logger }} opts
 */
export function createHealthExtensions({ pool, callAI, logger }) {

  // ── Internal helpers ───────────────────────────────────────────────────────

  /**
   * Extract a plain string from whatever callAI returns.
   * @param {*} raw
   * @returns {string}
   */
  function textOf(raw) {
    if (typeof raw === 'string') return raw;
    return raw?.content ?? raw?.text ?? '';
  }

  /**
   * Safely parse a JSON array from AI output.
   * @param {string} text
   * @returns {Array}
   */
  function parseJsonArray(text) {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try { return JSON.parse(match[0]); } catch { return []; }
  }

  /**
   * Safely parse a JSON object from AI output.
   * @param {string} text
   * @returns {object|null}
   */
  function parseJsonObject(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }

  // ── IDEA 16: Food as Medicine AI ──────────────────────────────────────────

  /**
   * Pull 90-day biometric data and generate personalized food-as-medicine insights.
   * Inserts one row per insight into food_insights.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>}
   */
  async function analyzeFoodPatterns(userId) {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [wearableRes, checkinRes] = await Promise.allSettled([
      pool.query(
        `SELECT metric, AVG(value)::float AS avg_val, MIN(value)::float AS min_val, MAX(value)::float AS max_val
           FROM wearable_data
          WHERE user_id = $1
            AND recorded_at >= $2
            AND metric IN ('hrv','energy','glucose','heart_rate','sleep_deep_min','sleep_rem_min')
          GROUP BY metric`,
        [userId, cutoff]
      ),
      pool.query(
        `SELECT
           AVG(sleep_hours)::float   AS avg_sleep,
           AVG(energy_score)::float  AS avg_energy,
           AVG(mood_score)::float    AS avg_mood,
           COUNT(*)::int             AS days_logged
           FROM health_checkins
          WHERE user_id = $1
            AND created_at >= $2`,
        [userId, cutoff]
      ),
    ]);

    const wearableRows = wearableRes.status === 'fulfilled' ? wearableRes.value.rows : [];
    const checkinRow   = checkinRes.status  === 'fulfilled' ? checkinRes.value.rows[0] : {};

    const wearableSummary = wearableRows.map(r =>
      `${r.metric}: avg=${r.avg_val?.toFixed(1)}, min=${r.min_val?.toFixed(1)}, max=${r.max_val?.toFixed(1)}`
    ).join('\n') || '(no wearable data)';

    const checkinSummary = checkinRow?.days_logged
      ? `${checkinRow.days_logged} days logged — avg sleep ${checkinRow.avg_sleep?.toFixed(1)}h, avg energy ${checkinRow.avg_energy?.toFixed(1)}/10, avg mood ${checkinRow.avg_mood?.toFixed(1)}/10`
      : '(no health check-in data)';

    const prompt = `You are a functional nutrition researcher reviewing a person's 90-day biometric data to find patterns that suggest specific nutritional interventions.

WEARABLE METRICS (90-day averages):
${wearableSummary}

SELF-REPORTED (90-day averages):
${checkinSummary}

Based on this data, what 3-5 nutritional patterns or correlations do you observe? For each:
- What food pattern, timing, or category likely explains part of what you see?
- What is the observed correlation in this data?
- What is your specific recommendation (food, supplement, timing, removal)?
- How strong is the evidence (observational/moderate/strong)?

Return ONLY a valid JSON array. Each element:
{
  "food_pattern": "...",
  "observed_correlation": "...",
  "recommendation": "...",
  "evidence_quality": "observational|moderate|strong"
}

Be evidence-based. Acknowledge when this is observational. Never diagnose. No generic advice.`;

    let insights = [];
    try {
      const raw = textOf(await callAI(prompt));
      insights = parseJsonArray(raw);
    } catch (err) {
      logger?.warn({ err, userId }, '[health-extensions] analyzeFoodPatterns: AI call failed');
      return [];
    }

    const saved = [];
    for (const ins of insights) {
      if (!ins.food_pattern && !ins.recommendation) continue;
      try {
        const { rows } = await pool.query(
          `INSERT INTO food_insights
             (user_id, food_pattern, observed_correlation, recommendation, evidence_quality)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [userId, ins.food_pattern ?? '', ins.observed_correlation ?? '', ins.recommendation ?? '', ins.evidence_quality ?? 'observational']
        );
        saved.push(rows[0]);
      } catch (err) {
        logger?.warn({ err, ins }, '[health-extensions] failed to save food insight');
      }
    }

    logger?.info({ userId, saved: saved.length }, '[health-extensions] analyzeFoodPatterns complete');
    return saved;
  }

  // ── IDEA 17: Pre-Disease Early Warning ────────────────────────────────────

  /**
   * Compare the user's current 30-day pattern to their full 18-month history.
   * If a matching precursor pattern is found, inserts a health_warnings row.
   * @param {number|string} userId
   * @returns {Promise<{ warning: boolean, warningRecord: object|null, message: string }>}
   */
  async function runPreDiseaseCheck(userId) {
    const now      = new Date();
    const cut30    = new Date(now - 30  * 24 * 60 * 60 * 1000).toISOString();
    const cut540   = new Date(now - 540 * 24 * 60 * 60 * 1000).toISOString(); // ~18 months

    const [current30, history18, checkins30, sessions30] = await Promise.allSettled([
      pool.query(
        `SELECT metric, AVG(value)::float AS avg_val
           FROM wearable_data
          WHERE user_id = $1 AND recorded_at >= $2
            AND metric IN ('hrv','heart_rate','sleep_deep_min','sleep_rem_min','sleep_awake_min')
          GROUP BY metric`,
        [userId, cut30]
      ),
      pool.query(
        `SELECT
           DATE_TRUNC('week', recorded_at) AS week,
           metric,
           AVG(value)::float AS avg_val
           FROM wearable_data
          WHERE user_id = $1 AND recorded_at >= $2 AND recorded_at < $3
            AND metric IN ('hrv','heart_rate','sleep_deep_min','sleep_rem_min','sleep_awake_min')
          GROUP BY week, metric
          ORDER BY week ASC`,
        [userId, cut540, cut30]
      ),
      pool.query(
        `SELECT
           AVG(sleep_hours)::float  AS avg_sleep,
           AVG(energy_score)::float AS avg_energy,
           AVG(mood_score)::float   AS avg_mood
           FROM health_checkins
          WHERE user_id = $1 AND created_at >= $2`,
        [userId, cut30]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS conflict_count
           FROM coaching_sessions
          WHERE user_id = $1 AND created_at >= $2`,
        [userId, cut30]
      ),
    ]);

    const currentMetrics  = current30.status    === 'fulfilled' ? current30.value.rows    : [];
    const historicalWeeks = history18.status    === 'fulfilled' ? history18.value.rows    : [];
    const checkin         = checkins30.status   === 'fulfilled' ? checkins30.value.rows[0] : {};
    const conflictCount   = sessions30.status   === 'fulfilled' ? sessions30.value.rows[0]?.conflict_count ?? 0 : 0;

    // Summarise for the AI
    const currentSummary = currentMetrics.map(r => `${r.metric}: ${r.avg_val?.toFixed(1)}`).join(', ') || '(no current wearable data)';
    const historySample  = historicalWeeks.slice(-40).map(r => `week ${r.week?.toISOString().slice(0,10)} ${r.metric}: ${r.avg_val?.toFixed(1)}`).join('\n') || '(no historical data)';
    const checkinSummary = checkin?.avg_sleep
      ? `sleep ${checkin.avg_sleep?.toFixed(1)}h, energy ${checkin.avg_energy?.toFixed(1)}/10, mood ${checkin.avg_mood?.toFixed(1)}/10`
      : '(no check-in data)';

    const prompt = `You are a health pattern analyst. Compare this person's current 30-day biometric and behavioral pattern to their historical 18-month data to detect early warning signs.

CURRENT 30-DAY AVERAGES:
Wearables: ${currentSummary}
Self-reported: ${checkinSummary}
Coaching/conflict sessions this month: ${conflictCount}

HISTORICAL DATA (weekly, oldest to newest):
${historySample}

Do you see a pattern in the current data that resembles a pattern that historically preceded a health challenge for this person?

If YES:
- Describe the pattern match clearly
- Estimate how far in advance this signal has appeared in the past (if detectable)
- List specific interventions that might help: sleep, movement, nutrition, stress reduction, social connection
- Urgency: low / moderate / high

If NO match: say so clearly and briefly.

Return ONLY a JSON object:
{
  "warning_found": true|false,
  "warning_type": "...",
  "pattern_description": "...",
  "historical_match": "...",
  "recommended_actions": ["...", "..."],
  "urgency": "low|moderate|high",
  "message": "..."
}

Never diagnose. Pattern-match only.`;

    let parsed = null;
    try {
      const raw = textOf(await callAI(prompt));
      parsed = parseJsonObject(raw);
    } catch (err) {
      logger?.warn({ err, userId }, '[health-extensions] runPreDiseaseCheck: AI call failed');
      return { warning: false, warningRecord: null, message: 'Pattern check could not be completed.' };
    }

    if (!parsed || !parsed.warning_found) {
      return { warning: false, warningRecord: null, message: parsed?.message ?? 'No concerning patterns detected in the current data.' };
    }

    let warningRecord = null;
    try {
      const { rows } = await pool.query(
        `INSERT INTO health_warnings
           (user_id, warning_type, pattern_description, historical_match, recommended_actions, urgency)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          userId,
          parsed.warning_type         ?? 'pattern_shift',
          parsed.pattern_description  ?? '',
          parsed.historical_match     ?? '',
          parsed.recommended_actions  ?? [],
          parsed.urgency              ?? 'moderate',
        ]
      );
      warningRecord = rows[0];
    } catch (err) {
      logger?.warn({ err }, '[health-extensions] failed to save health warning');
    }

    logger?.info({ userId, urgency: parsed.urgency }, '[health-extensions] pre-disease warning generated');
    return { warning: true, warningRecord, message: parsed.message ?? parsed.pattern_description ?? '' };
  }

  /**
   * Fetch outstanding (unresolved) health warnings for a user.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>}
   */
  async function getHealthWarnings(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM health_warnings
        WHERE user_id = $1 AND resolved = FALSE
        ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  // ── IDEA 18: Purpose Monetization Mapping ─────────────────────────────────

  /**
   * Generate 4 concrete monetization paths from the user's purpose profile and strengths.
   * Inserts one row per path into monetization_paths.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>}
   */
  async function mapMonetizationPaths(userId) {
    const [purposeRes, energyRes, masteryRes] = await Promise.allSettled([
      pool.query(
        `SELECT purpose_statement, core_strengths, energy_sources, growth_edges, economic_paths
           FROM purpose_profiles WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT activity, energy_effect, flow_state
           FROM energy_observations
          WHERE user_id = $1
            AND energy_effect IN ('high','very_high')
            AND observed_at >= CURRENT_DATE - INTERVAL '90 days'
          ORDER BY observed_at DESC LIMIT 20`,
        [userId]
      ),
      pool.query(
        `SELECT skill_name, mastery_level, evidence
           FROM skill_tracks
          WHERE user_id = $1
          ORDER BY mastery_level DESC LIMIT 10`,
        [userId]
      ),
    ]);

    const purpose    = purposeRes.status === 'fulfilled' ? purposeRes.value.rows[0] : null;
    const energyRows = energyRes.status  === 'fulfilled' ? energyRes.value.rows      : [];
    const skills     = masteryRes.status === 'fulfilled' ? masteryRes.value.rows      : [];

    const purposeSummary = purpose
      ? `Purpose: ${purpose.purpose_statement}\nStrengths: ${(purpose.core_strengths || []).join(', ')}\nEnergy sources: ${(purpose.energy_sources || []).join(', ')}`
      : '(no purpose profile yet — use observed data below)';

    const energySummary = energyRows.length
      ? energyRows.map(r => `${r.activity}${r.flow_state ? ' [FLOW]' : ''}`).join(', ')
      : '(no energy observations)';

    const skillsSummary = skills.length
      ? skills.map(r => `${r.skill_name} (level: ${r.mastery_level})`).join(', ')
      : '(no skill data)';

    const prompt = `You are an economic path architect. This person has a specific purpose profile and demonstrated strengths. Design 4 concrete monetization paths for them.

PURPOSE PROFILE:
${purposeSummary}

FLOW STATE ACTIVITIES:
${energySummary}

DEMONSTRATED SKILLS:
${skillsSummary}

Design 4 specific ways this person could earn income aligned with their purpose and strengths. Be concrete — not "become a consultant" but "offer 90-minute clarity intensives for burned-out executives who want to reconnect with their work before quitting." Not "create content" but "write a weekly 1,000-word essay for founders in [specific niche] charged at $X/month."

For each path return:
{
  "path_title": "...",
  "description": "...",
  "first_90_days": "...",
  "estimated_monthly_income": "...",
  "required_skills": ["...", "..."],
  "confidence": "high|medium|low"
}

Return ONLY a valid JSON array of 4 objects. Realistic income estimates only. No hype.`;

    let paths = [];
    try {
      const raw = textOf(await callAI(prompt));
      paths = parseJsonArray(raw);
    } catch (err) {
      logger?.warn({ err, userId }, '[health-extensions] mapMonetizationPaths: AI call failed');
      return [];
    }

    const saved = [];
    for (const p of paths) {
      if (!p.path_title) continue;
      try {
        const { rows } = await pool.query(
          `INSERT INTO monetization_paths
             (user_id, path_title, description, first_90_days, estimated_monthly_income, required_skills, confidence)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [userId, p.path_title, p.description ?? '', p.first_90_days ?? '', p.estimated_monthly_income ?? '', p.required_skills ?? [], p.confidence ?? 'medium']
        );
        saved.push(rows[0]);
      } catch (err) {
        logger?.warn({ err, p }, '[health-extensions] failed to save monetization path');
      }
    }

    logger?.info({ userId, saved: saved.length }, '[health-extensions] mapMonetizationPaths complete');
    return saved;
  }

  /**
   * Fetch stored monetization paths for a user.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>}
   */
  async function getMonetizationPaths(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM monetization_paths WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  // ── IDEA 19: The Legacy Project ────────────────────────────────────────────

  /**
   * Create a new legacy project for a user.
   * @param {{ userId, title, description, whyItMatters, impactVision }} params
   * @returns {Promise<object>}
   */
  async function createLegacyProject({ userId, title, description, whyItMatters, impactVision }) {
    const { rows } = await pool.query(
      `INSERT INTO legacy_projects (user_id, title, description, why_it_matters, impact_vision)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, title, description ?? null, whyItMatters ?? null, impactVision ?? null]
    );
    return rows[0];
  }

  /**
   * Add or update a milestone on a legacy project. Recalculates progress_pct.
   * @param {{ projectId, userId, milestone, completed }} params
   * @returns {Promise<object>}
   */
  async function updateLegacyMilestone({ projectId, userId, milestone, completed }) {
    const { rows: [project] } = await pool.query(
      'SELECT * FROM legacy_projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );
    if (!project) throw new Error('Legacy project not found or access denied');

    const milestones = Array.isArray(project.milestones) ? project.milestones : [];

    // Find existing milestone by text or append new one
    const existingIdx = milestones.findIndex(m => m.text === milestone);
    if (existingIdx >= 0) {
      milestones[existingIdx].completed = !!completed;
      milestones[existingIdx].updated_at = new Date().toISOString();
    } else {
      milestones.push({ text: milestone, completed: !!completed, added_at: new Date().toISOString() });
    }

    const total     = milestones.length;
    const done      = milestones.filter(m => m.completed).length;
    const progress  = total > 0 ? parseFloat(((done / total) * 100).toFixed(2)) : 0;

    const { rows } = await pool.query(
      `UPDATE legacy_projects
          SET milestones   = $1::jsonb,
              progress_pct = $2,
              updated_at   = NOW()
        WHERE id = $3
       RETURNING *`,
      [JSON.stringify(milestones), progress, projectId]
    );
    return rows[0];
  }

  /**
   * Fetch active legacy projects for a user.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>}
   */
  async function getLegacyProjects(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM legacy_projects
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  // ── IDEA 20: The Death Meditation ─────────────────────────────────────────

  /**
   * Run the death meditation. First call (no reflection) returns prompts.
   * Second call (with reflection) extracts insights and saves the session.
   * @param {{ userId: number|string, reflection?: string }} params
   * @returns {Promise<{ prompts: string|null, session: object|null }>}
   */
  async function runDeathMeditation({ userId, reflection }) {
    const promptPrompt = `You are guiding someone through a brief death meditation — not morbid, clarifying. The purpose is to cut through noise and reveal what actually matters to this person.

Write 3 short, powerful questions for them to sit with:
1. Something about how they would feel about the life they've been living if today were the last day.
2. Something about which of their current commitments and goals would actually matter from that vantage point.
3. Something about what they would want to have been said about them — how they showed up in the world.

Warm but unflinching. Not a wall of text — each question should be one or two sentences at most. No lecture. No life advice. Just the questions.`;

    let prompts = null;
    try {
      prompts = textOf(await callAI(promptPrompt)).trim();
    } catch (err) {
      logger?.warn({ err, userId }, '[health-extensions] runDeathMeditation: prompts generation failed');
      prompts = 'If today were your last day, how would you feel about how you\'ve been living?\n\nOf all your current commitments and goals, which ones would still matter from that vantage point?\n\nWhat would you want to be said about you — not your achievements, but who you were?';
    }

    // If no reflection yet, return just the prompts
    if (!reflection?.trim()) {
      return { prompts, session: null };
    }

    // Extract insights from the reflection
    const extractPrompt = `Someone just completed a death meditation and wrote this reflection:

"${reflection}"

Extract from their reflection:
1. commitments_that_matter — which specific commitments or goals came through as genuinely important (array of strings)
2. what_would_be_said — one sentence capturing what they want to be known for (string)
3. insights — the most important insight they had (1-2 sentences, in their voice)

Return ONLY a JSON object:
{
  "commitments_that_matter": ["...", "..."],
  "what_would_be_said": "...",
  "insights": "..."
}`;

    let extracted = { commitments_that_matter: [], what_would_be_said: '', insights: '' };
    try {
      const raw = textOf(await callAI(extractPrompt));
      const parsed = parseJsonObject(raw);
      if (parsed) extracted = parsed;
    } catch (err) {
      logger?.warn({ err, userId }, '[health-extensions] runDeathMeditation: insight extraction failed');
    }

    let session = null;
    try {
      const { rows } = await pool.query(
        `INSERT INTO death_meditation_sessions
           (user_id, prompt_used, user_reflection, commitments_that_matter, what_would_be_said, insights)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          userId,
          prompts,
          reflection,
          extracted.commitments_that_matter ?? [],
          extracted.what_would_be_said ?? '',
          extracted.insights ?? '',
        ]
      );
      session = rows[0];
    } catch (err) {
      logger?.warn({ err }, '[health-extensions] failed to save death meditation session');
    }

    return { prompts, session };
  }

  /**
   * Fetch past death meditation sessions for a user.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>}
   */
  async function getDeathMeditationSessions(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM death_meditation_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10`,
      [userId]
    );
    return rows;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    analyzeFoodPatterns,
    runPreDiseaseCheck,
    getHealthWarnings,
    mapMonetizationPaths,
    getMonetizationPaths,
    createLegacyProject,
    updateLegacyMilestone,
    getLegacyProjects,
    runDeathMeditation,
    getDeathMeditationSessions,
  };
}
