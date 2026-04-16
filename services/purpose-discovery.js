/**
 * services/purpose-discovery.js
 *
 * Synthesizes purpose profile from all observed data.
 * Combines: twin profile, joy patterns, energy observations,
 * inner work effectiveness, twin purpose signals.
 *
 * Exports: createPurposeDiscovery({ pool, callAI })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createPurposeDiscovery({ pool, callAI }) {
  // ── synthesize ──────────────────────────────────────────────────────────────
  /**
   * Run a full purpose synthesis for a user.
   * Pulls energy observations, joy check-ins, twin profile, inner work data,
   * sends to AI, and upserts the result into purpose_profiles.
   */
  async function synthesize(userId) {
    // Gather all data sources in parallel, tolerate missing tables gracefully
    const [energyRes, joyRes, twinRes, innerRes] = await Promise.allSettled([
      pool.query(
        `SELECT activity, energy_effect, flow_state, notes
           FROM energy_observations
          WHERE user_id = $1
            AND observed_at >= CURRENT_DATE - INTERVAL '90 days'
          ORDER BY observed_at DESC`,
        [userId]
      ),
      pool.query(
        `SELECT joy_sources, joy_drains, checkin_date
           FROM joy_checkins
          WHERE user_id = $1
            AND checkin_date >= CURRENT_DATE - INTERVAL '90 days'
          ORDER BY checkin_date DESC`,
        [userId]
      ),
      pool.query(
        `SELECT purpose_signals, core_values, life_priorities, current_chapter
           FROM adam_profile
          WHERE user_id = $1
          ORDER BY updated_at DESC
          LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT practice_name, effectiveness_score, notes
           FROM inner_work_effectiveness
          WHERE user_id = $1
          ORDER BY effectiveness_score DESC
          LIMIT 10`,
        [userId]
      ),
    ]);

    const energyRows    = energyRes.status    === 'fulfilled' ? energyRes.value.rows    : [];
    const joyRows       = joyRes.status       === 'fulfilled' ? joyRes.value.rows       : [];
    const twinRows      = twinRes.status      === 'fulfilled' ? twinRes.value.rows      : [];
    const innerRows     = innerRes.status     === 'fulfilled' ? innerRes.value.rows     : [];

    const twinProfile = twinRows[0] || {};

    // Build data summary for the AI prompt
    const energySummary = energyRows.length
      ? energyRows.slice(0, 30).map(r =>
          `- [${r.energy_effect}${r.flow_state ? ', FLOW' : ''}] ${r.activity}${r.notes ? ': ' + r.notes : ''}`
        ).join('\n')
      : '(no energy observations recorded)';

    const joySummary = joyRows.length
      ? joyRows.slice(0, 20).map(r => {
          const parts = [];
          if (r.joy_sources?.length) parts.push('Sources: ' + r.joy_sources.join(', '));
          if (r.joy_drains?.length)  parts.push('Drains: '  + r.joy_drains.join(', '));
          return parts.join(' | ');
        }).join('\n')
      : '(no joy check-ins recorded)';

    const innerSummary = innerRows.length
      ? innerRows.map(r => `- ${r.practice_name} (score: ${r.effectiveness_score})`).join('\n')
      : '(no inner work data)';

    const twinSummary = Object.keys(twinProfile).length
      ? JSON.stringify(twinProfile, null, 2)
      : '(no twin profile data)';

    const prompt = `You are synthesizing a purpose profile for a person based on their observed life data.

ENERGY OBSERVATIONS (last 90 days):
${energySummary}

JOY CHECK-INS (last 90 days):
${joySummary}

INNER WORK PRACTICES:
${innerSummary}

TWIN PROFILE SIGNALS:
${twinSummary}

Based on what this data reveals, identify:
(1) A one-sentence purpose statement starting with "I am here to..."
(2) Top 5 energy sources — specific activities or states that generate energy for this person
(3) Top 5 energy drains — specific things that deplete them
(4) Top 3 core strengths — what they do better than most people (be specific, not generic)
(5) Top 2 growth edges — where they are being called to grow (honest, not flattering)
(6) 3 specific economic paths that align with their energy and strengths — be concrete (not "consulting" but "executive coaching for real estate team leaders")

Return ONLY valid JSON with this exact structure:
{
  "purpose_statement": "I am here to ...",
  "energy_sources": ["...", "...", "...", "...", "..."],
  "energy_drains": ["...", "...", "...", "...", "..."],
  "core_strengths": ["...", "...", "..."],
  "growth_edges": ["...", "..."],
  "economic_paths": [
    {"title": "...", "description": "...", "market_demand": "high|medium|low", "effort": "high|medium|low", "revenue_potential": "..."},
    {"title": "...", "description": "...", "market_demand": "high|medium|low", "effort": "high|medium|low", "revenue_potential": "..."},
    {"title": "...", "description": "...", "market_demand": "high|medium|low", "effort": "high|medium|low", "revenue_potential": "..."}
  ]
}`;

    if (!callAI) throw new Error('callAI is required for purpose synthesis');
    const raw = await callAI(prompt);

    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      throw new Error('AI did not return valid JSON for purpose synthesis');
    }

    // Upsert into purpose_profiles
    const { rows } = await pool.query(
      `INSERT INTO purpose_profiles
         (user_id, purpose_statement, energy_sources, energy_drains,
          core_strengths, growth_edges, economic_paths,
          last_synthesized_at, synthesis_version, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 1, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         purpose_statement   = EXCLUDED.purpose_statement,
         energy_sources      = EXCLUDED.energy_sources,
         energy_drains       = EXCLUDED.energy_drains,
         core_strengths      = EXCLUDED.core_strengths,
         growth_edges        = EXCLUDED.growth_edges,
         economic_paths      = EXCLUDED.economic_paths,
         last_synthesized_at = NOW(),
         synthesis_version   = purpose_profiles.synthesis_version + 1,
         updated_at          = NOW()
       RETURNING *`,
      [
        userId,
        parsed.purpose_statement,
        parsed.energy_sources      || [],
        parsed.energy_drains       || [],
        parsed.core_strengths      || [],
        parsed.growth_edges        || [],
        JSON.stringify(parsed.economic_paths || []),
      ]
    );

    return rows[0];
  }

  // ── logEnergyObservation ────────────────────────────────────────────────────
  async function logEnergyObservation({ userId, activity, energyEffect, flowState = false, notes = null, source = 'manual' }) {
    const { rows } = await pool.query(
      `INSERT INTO energy_observations
         (user_id, activity, energy_effect, flow_state, notes, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, activity, energyEffect, flowState, notes, source]
    );
    return rows[0];
  }

  // ── getProfile ──────────────────────────────────────────────────────────────
  async function getProfile(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM purpose_profiles WHERE user_id = $1',
      [userId]
    );
    return rows[0] || null;
  }

  // ── getEnergyObservations ───────────────────────────────────────────────────
  async function getEnergyObservations(userId, { days = 90 } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM energy_observations
        WHERE user_id = $1
          AND observed_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL
        ORDER BY observed_at DESC`,
      [userId, days]
    );
    return rows;
  }

  return { synthesize, logEnergyObservation, getProfile, getEnergyObservations };
}
