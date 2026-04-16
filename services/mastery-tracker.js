/**
 * services/mastery-tracker.js
 *
 * Module A: Growth & Mastery
 *
 * Tracks deliberate skill development (10,000 Hours), extracts and retrieves personal
 * wisdom from life experiences, and designs specific deliberate practice protocols.
 *
 * Exports:
 *   createMasteryTracker({ pool, callAI, logger })
 *     → createSkill, logPracticeSession, getProgressCoaching, designPracticeProtocol,
 *        extractWisdom, searchWisdom, getAllWisdom, getSkills
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

// Plateau detection: last N sessions evaluated for quality
const PLATEAU_SESSION_WINDOW    = 5;
const PLATEAU_QUALITY_THRESHOLD = 6;    // quality_rating < 6 counts as low
const PLATEAU_MIN_SPACING_DAYS  = 3;    // sessions must be at least 3 days apart

export function createMasteryTracker({ pool, callAI, logger }) {

  // ── createSkill ────────────────────────────────────────────────────────────

  async function createSkill({ userId, skillName, goal }) {
    const { rows } = await pool.query(`
      INSERT INTO skill_tracks (user_id, skill_name, goal)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, skillName, goal || null]);
    return rows[0];
  }

  // ── logPracticeSession ─────────────────────────────────────────────────────

  async function logPracticeSession({ userId, skillTrackId, durationMinutes, qualityRating, notes }) {
    // Load current track
    const { rows: trackRows } = await pool.query(
      'SELECT * FROM skill_tracks WHERE id = $1 AND user_id = $2',
      [skillTrackId, userId]
    );
    if (!trackRows.length) throw new Error('Skill track not found');
    const track = trackRows[0];

    const session = {
      date:         new Date().toISOString(),
      duration_min: durationMinutes,
      quality_rating: qualityRating,
      notes:        notes || null,
    };

    const sessions = Array.isArray(track.sessions) ? track.sessions : [];
    sessions.push(session);

    const addedHours     = durationMinutes / 60;
    const newTotalHours  = parseFloat(track.total_hours || 0) + addedHours;

    // Plateau detection: last PLATEAU_SESSION_WINDOW sessions, all low quality,
    // each spaced at least PLATEAU_MIN_SPACING_DAYS apart
    let plateauDetected      = track.plateau_detected || false;
    let plateauDetectedAt    = track.plateau_detected_at || null;
    let currentPhase         = track.current_phase || 'foundation';

    if (!plateauDetected && sessions.length >= PLATEAU_SESSION_WINDOW) {
      const lastN = sessions.slice(-PLATEAU_SESSION_WINDOW);
      const allLowQuality = lastN.every(s => s.quality_rating < PLATEAU_QUALITY_THRESHOLD);

      if (allLowQuality) {
        // Check spacing: consecutive sessions at least PLATEAU_MIN_SPACING_DAYS apart
        let widelySpaced = true;
        for (let i = 1; i < lastN.length; i++) {
          const prev = new Date(lastN[i - 1].date).getTime();
          const curr = new Date(lastN[i].date).getTime();
          const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
          if (diffDays < PLATEAU_MIN_SPACING_DAYS) {
            widelySpaced = false;
            break;
          }
        }
        if (widelySpaced) {
          plateauDetected   = true;
          plateauDetectedAt = new Date().toISOString();
          currentPhase      = 'plateau';
          logger?.info({ skillTrackId, userId }, 'mastery-tracker: plateau detected');
        }
      }
    }

    // Auto-advance phase based on hours if not plateaued
    if (!plateauDetected) {
      if (newTotalHours >= 1000) currentPhase = 'mastery';
      else if (newTotalHours >= 200) currentPhase = 'breakthrough';
      else if (newTotalHours >= 20)  currentPhase = 'building';
      else                           currentPhase = 'foundation';
    }

    const { rows: updated } = await pool.query(`
      UPDATE skill_tracks
      SET sessions            = $1::jsonb,
          total_hours         = $2,
          plateau_detected    = $3,
          plateau_detected_at = $4,
          current_phase       = $5,
          updated_at          = NOW()
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [
      JSON.stringify(sessions),
      newTotalHours,
      plateauDetected,
      plateauDetectedAt,
      currentPhase,
      skillTrackId,
      userId,
    ]);

    return { track: updated[0], plateauDetected };
  }

  // ── getProgressCoaching ────────────────────────────────────────────────────

  async function getProgressCoaching({ skillTrackId, userId }) {
    const { rows } = await pool.query(
      'SELECT * FROM skill_tracks WHERE id = $1 AND user_id = $2',
      [skillTrackId, userId]
    );
    if (!rows.length) throw new Error('Skill track not found');
    const track = rows[0];

    const sessions       = Array.isArray(track.sessions) ? track.sessions : [];
    const recentSessions = sessions.slice(-10);

    const sessionSummary = recentSessions.map((s, i) =>
      `Session ${i + 1}: ${s.duration_min}min, quality ${s.quality_rating}/10` +
      (s.notes ? `, notes: "${s.notes}"` : '')
    ).join('\n');

    const plateauNote = track.plateau_detected
      ? `\n\nIMPORTANT: They appear to be plateauing — last ${PLATEAU_SESSION_WINDOW} sessions show low quality ratings spread over time.`
      : '';

    const prompt = `This person is learning: ${track.skill_name}.
Goal: ${track.goal || 'not specified'}.
Total practice time: ${parseFloat(track.total_hours).toFixed(1)} hours.
Current phase: ${track.current_phase}.
${plateauNote}

Last ${recentSessions.length} sessions:
${sessionSummary || 'No sessions recorded yet.'}

Based on research on skill acquisition, what should they focus on next? If they are plateauing, what specific practice change would break through their current plateau? What does mastery at this skill actually require? Be specific and practical — not "practice more" but concrete drills, approaches, or mindset shifts appropriate to their current phase.`;

    const coaching = await callAI(prompt);
    return typeof coaching === 'string' ? coaching : coaching?.content || coaching?.text || '';
  }

  // ── designPracticeProtocol ─────────────────────────────────────────────────

  async function designPracticeProtocol({ userId, goal, skillTrackId }) {
    const prompt = `This person wants to become: ${goal}

Design a deliberate practice protocol. Identify the 3 specific capacities they need to build to achieve this goal. For each capacity, provide:
1. practice_design — a specific, concrete drill or exercise (not vague advice like "practice more")
2. measurement — how to objectively track progress on this capacity
3. frequency_per_week — how many times per week to practice

Return ONLY a JSON object in this exact shape:
{
  "goal": "${goal}",
  "capacities": [
    {
      "capacity": "name of this capacity",
      "practice_design": "concrete drill or exercise",
      "measurement": "how to measure progress",
      "frequency_per_week": 3
    }
  ]
}

Return ONLY the JSON. No explanation, no markdown fences.`;

    const raw    = await callAI(prompt);
    const text   = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';

    let protocol;
    try {
      // Strip any accidental markdown fences
      const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      protocol = JSON.parse(clean);
    } catch {
      // Fallback: extract JSON object from response
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI did not return valid JSON for practice protocol');
      protocol = JSON.parse(match[0]);
    }

    const { rows } = await pool.query(`
      INSERT INTO practice_protocols (user_id, goal, skill_track_id, capacities)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING *
    `, [
      userId,
      goal,
      skillTrackId || null,
      JSON.stringify(protocol.capacities || []),
    ]);

    return { ...rows[0], goal: protocol.goal, capacities: protocol.capacities };
  }

  // ── extractWisdom ──────────────────────────────────────────────────────────

  async function extractWisdom({ userId, experienceDescription }) {
    const prompt = `This person had this life experience:

"${experienceDescription}"

Extract the timeless principle or insight from this experience. State it as a portable wisdom statement — specific enough to be useful in a similar future situation, universal enough to transcend this specific event.

Return ONLY a JSON object in this exact shape:
{
  "title": "short memorable name for this wisdom (max 60 chars)",
  "principle": "the core insight stated as a principle",
  "applicable_situations": ["situation 1", "situation 2", "situation 3"],
  "tags": ["tag1", "tag2", "tag3"]
}

Return ONLY the JSON. No explanation, no markdown fences.`;

    const raw  = await callAI(prompt);
    const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';

    let parsed;
    try {
      const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI did not return valid JSON for wisdom extraction');
      parsed = JSON.parse(match[0]);
    }

    const { rows } = await pool.query(`
      INSERT INTO wisdom_entries (user_id, title, principle, context, tags, applicable_situations)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      userId,
      parsed.title || 'Untitled Wisdom',
      parsed.principle,
      experienceDescription,
      parsed.tags || [],
      parsed.applicable_situations || [],
    ]);

    return rows[0];
  }

  // ── searchWisdom ───────────────────────────────────────────────────────────

  async function searchWisdom({ userId, situation }) {
    // Direct text search first
    const searchTerm = `%${situation}%`;
    const { rows: directMatches } = await pool.query(`
      SELECT * FROM wisdom_entries
      WHERE user_id = $1
        AND (
          principle ILIKE $2
          OR context ILIKE $2
          OR title ILIKE $2
          OR $3 = ANY(applicable_situations)
        )
      ORDER BY created_at DESC
    `, [userId, searchTerm, situation]);

    // If direct match is weak (< 2 results), use AI for semantic matching
    let semanticMatches = [];
    if (directMatches.length < 2 && callAI) {
      const { rows: allWisdom } = await pool.query(
        'SELECT * FROM wisdom_entries WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      if (allWisdom.length > 0) {
        const wisdomList = allWisdom.map((w, i) =>
          `[${i}] "${w.title}": ${w.principle}`
        ).join('\n');

        const prompt = `A person is facing this situation: "${situation}"

Here is their personal wisdom library:
${wisdomList}

Which entries (by index number) are most relevant to their current situation? Identify up to 3. Consider semantic relevance, not just keyword matching.

Return ONLY a JSON array of index numbers, e.g.: [0, 2]
Return [] if none are relevant. No explanation.`;

        try {
          const raw    = await callAI(prompt);
          const text   = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
          const match  = text.match(/\[[\s\S]*?\]/);
          if (match) {
            const indices = JSON.parse(match[0]);
            semanticMatches = indices
              .filter(i => typeof i === 'number' && i < allWisdom.length)
              .map(i => allWisdom[i])
              .filter(w => !directMatches.some(d => d.id === w.id));
          }
        } catch {
          // Semantic search failed silently — direct matches still returned
        }
      }
    }

    const combined = [...directMatches, ...semanticMatches];

    // Increment times_surfaced for each result
    if (combined.length > 0) {
      const ids = combined.map(w => w.id);
      await pool.query(
        `UPDATE wisdom_entries SET times_surfaced = times_surfaced + 1 WHERE id = ANY($1)`,
        [ids]
      );
    }

    return { directMatches, semanticMatches, all: combined };
  }

  // ── getAllWisdom ───────────────────────────────────────────────────────────

  async function getAllWisdom({ userId }) {
    const { rows } = await pool.query(
      'SELECT * FROM wisdom_entries WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  // ── getSkills ──────────────────────────────────────────────────────────────

  async function getSkills({ userId }) {
    const { rows } = await pool.query(
      'SELECT * FROM skill_tracks WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );

    return rows.map(track => {
      const sessions    = Array.isArray(track.sessions) ? track.sessions : [];
      const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
      return {
        ...track,
        session_count: sessions.length,
        last_session:  lastSession,
      };
    });
  }

  // ── getProtocols ───────────────────────────────────────────────────────────

  async function getProtocols({ userId }) {
    const { rows } = await pool.query(
      'SELECT * FROM practice_protocols WHERE user_id = $1 AND active = TRUE ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  return {
    createSkill,
    logPracticeSession,
    getProgressCoaching,
    designPracticeProtocol,
    extractWisdom,
    searchWisdom,
    getAllWisdom,
    getSkills,
    getProtocols,
  };
}
