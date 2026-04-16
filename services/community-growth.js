/**
 * services/community-growth.js
 *
 * Module C: Community & Meta Layer — Ideas 21–25
 *
 * Idea 21: Privacy-Safe Flourishing Network — aggregate anonymized insights from
 *          consenting users on similar journeys.
 *
 * Idea 22: Group Coaching Containers — AI-facilitated weekly check-in for a small
 *          group (friends, couples, co-founders). Individual data stays private.
 *
 * Idea 23: Accountability Partnership Engine — one-to-one matched growth partners
 *          with structured weekly check-ins.
 *
 * Idea 24: Quarterly Life Review — deep facilitated session with 5 specific questions
 *          delivered one at a time.
 *
 * Idea 25: The Sovereign AI Mentor — years of data distilled into direct, honest
 *          reflection that only a system that has watched someone for years can give.
 *
 * Exports: createCommunityGrowth({ pool, callAI, logger })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

'use strict';

// Adjective and noun word-lists for human-readable room codes
const ADJECTIVES = ['amber','bright','calm','deep','even','free','glad','high','just','keen','lush','mild','neat','open','pure','rich','safe','true','warm','wise'];
const NOUNS      = ['brook','cedar','dawn','echo','flame','grove','haven','inlet','jade','knoll','lark','meadow','north','opal','pine','quest','ridge','shore','tower','vale'];

/**
 * @param {{ pool: import('pg').Pool, callAI: Function, logger: import('pino').Logger }} opts
 */
export function createCommunityGrowth({ pool, callAI, logger }) {

  // ── Internal helpers ───────────────────────────────────────────────────────

  function textOf(raw) {
    if (typeof raw === 'string') return raw;
    return raw?.content ?? raw?.text ?? '';
  }

  function parseJsonObject(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }

  /**
   * Generate a readable room code: adjective-noun-4digits
   * @returns {string}
   */
  function generateRoomCode() {
    const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num  = String(Math.floor(Math.random() * 9000) + 1000);
    return `${adj}-${noun}-${num}`;
  }

  // ── IDEA 21: Privacy-Safe Flourishing Network ─────────────────────────────

  /**
   * Grant flourishing consent for a user (opt-in to contribute anonymized data).
   * @param {number|string} userId
   * @returns {Promise<object>}
   */
  async function grantFlourishingConsent(userId) {
    const { rows } = await pool.query(
      `INSERT INTO flourishing_contributions (user_id, consent_granted, contributed_at)
       VALUES ($1, TRUE, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         consent_granted = TRUE,
         contributed_at  = NOW()
       RETURNING *`,
      [userId]
    );
    return rows[0];
  }

  /**
   * Fetch aggregated, anonymized insights from consenting users with similar purpose profiles.
   * NEVER returns individual user data — only statistical patterns.
   * @param {{ userId: number|string }} params
   * @returns {Promise<{ consented: boolean, insights: object|null }>}
   */
  async function getFlourishingInsights({ userId }) {
    // Check if this user has consented
    const { rows: consentRows } = await pool.query(
      'SELECT consent_granted FROM flourishing_contributions WHERE user_id = $1',
      [userId]
    );
    const consented = consentRows[0]?.consent_granted === true;

    if (!consented) {
      return { consented: false, insights: null };
    }

    // Get this user's purpose type to filter similar profiles
    const { rows: purposeRows } = await pool.query(
      'SELECT purpose_statement, core_strengths FROM purpose_profiles WHERE user_id = $1',
      [userId]
    );
    const userPurpose = purposeRows[0] || null;

    // Query AGGREGATE patterns only — never individual rows
    const [integrityAgg, joyAgg, innerWorkAgg, consentCount] = await Promise.allSettled([
      pool.query(
        `SELECT
           AVG(total_score)::float     AS avg_integrity,
           STDDEV(total_score)::float  AS stddev_integrity,
           COUNT(DISTINCT user_id)::int AS user_count
           FROM integrity_score_log
          WHERE user_id IN (SELECT user_id FROM flourishing_contributions WHERE consent_granted = TRUE)
            AND logged_at >= CURRENT_DATE - INTERVAL '90 days'`
      ),
      pool.query(
        `SELECT
           joy_sources,
           COUNT(*)::int AS frequency
           FROM joy_checkins
          WHERE user_id IN (SELECT user_id FROM flourishing_contributions WHERE consent_granted = TRUE)
            AND checkin_date >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY joy_sources
          ORDER BY frequency DESC
          LIMIT 10`
      ),
      pool.query(
        `SELECT
           practice_name,
           AVG(effectiveness_score)::float AS avg_effectiveness,
           COUNT(*)::int AS sample_size
           FROM inner_work_effectiveness
          WHERE user_id IN (SELECT user_id FROM flourishing_contributions WHERE consent_granted = TRUE)
          GROUP BY practice_name
          HAVING COUNT(*) >= 3
          ORDER BY avg_effectiveness DESC
          LIMIT 5`
      ),
      pool.query(
        'SELECT COUNT(*)::int AS total FROM flourishing_contributions WHERE consent_granted = TRUE'
      ),
    ]);

    const integrity   = integrityAgg.status   === 'fulfilled' ? integrityAgg.value.rows[0]   : null;
    const joy         = joyAgg.status         === 'fulfilled' ? joyAgg.value.rows             : [];
    const innerWork   = innerWorkAgg.status   === 'fulfilled' ? innerWorkAgg.value.rows        : [];
    const totalUsers  = consentCount.status   === 'fulfilled' ? consentCount.value.rows[0]?.total ?? 0 : 0;

    const insights = {
      network_size:        totalUsers,
      avg_integrity_score: integrity?.avg_integrity?.toFixed(1) ?? null,
      top_joy_sources:     joy.slice(0, 5).map(r => r.joy_sources).flat().filter(Boolean).slice(0, 8),
      top_practices:       innerWork.map(r => ({ practice: r.practice_name, avg_effectiveness: r.avg_effectiveness?.toFixed(1), sample_size: r.sample_size })),
      user_purpose:        userPurpose?.purpose_statement ?? null,
      note:                'All data is aggregated from consenting users only. No individual data is ever shown.',
    };

    return { consented: true, insights };
  }

  // ── IDEA 22: Group Coaching Containers ────────────────────────────────────

  /**
   * Create a group coaching room.
   * @param {{ createdByUserId: number|string, name: string, memberLabels: string[] }} params
   * @returns {Promise<object>}
   */
  async function createGroupRoom({ createdByUserId, name, memberLabels }) {
    const roomCode = generateRoomCode();
    const initialMembers = [{
      user_id:   createdByUserId,
      label:     memberLabels?.[0] ?? 'Member 1',
      joined_at: new Date().toISOString(),
    }];

    const { rows } = await pool.query(
      `INSERT INTO group_coaching_rooms (room_code, name, created_by, members)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING *`,
      [roomCode, name ?? 'Untitled Room', createdByUserId, JSON.stringify(initialMembers)]
    );
    return rows[0];
  }

  /**
   * Join an existing group coaching room.
   * @param {{ roomCode: string, userId: number|string, label: string }} params
   * @returns {Promise<object>}
   */
  async function joinGroup({ roomCode, userId, label }) {
    const { rows: [room] } = await pool.query(
      'SELECT * FROM group_coaching_rooms WHERE room_code = $1 AND active = TRUE',
      [roomCode]
    );
    if (!room) throw new Error('Room not found or no longer active');

    const members = Array.isArray(room.members) ? room.members : [];

    // Prevent duplicate membership
    if (members.some(m => String(m.user_id) === String(userId))) {
      return room;
    }

    members.push({ user_id: userId, label: label ?? `Member ${members.length + 1}`, joined_at: new Date().toISOString() });

    const { rows } = await pool.query(
      'UPDATE group_coaching_rooms SET members = $1::jsonb WHERE id = $2 RETURNING *',
      [JSON.stringify(members), room.id]
    );
    return rows[0];
  }

  /**
   * Facilitate a weekly group check-in. Fetches each member's week summary,
   * calls AI to facilitate, and appends to session_log.
   * @param {{ roomCode: string }} params
   * @returns {Promise<{ facilitation: string, groupThemes: string[] }>}
   */
  async function facilitateGroupCheckIn({ roomCode }) {
    const { rows: [room] } = await pool.query(
      'SELECT * FROM group_coaching_rooms WHERE room_code = $1 AND active = TRUE',
      [roomCode]
    );
    if (!room) throw new Error('Room not found or no longer active');

    const members = Array.isArray(room.members) ? room.members : [];
    const cutoff  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Pull a brief summary for each member (aggregated — no individual entries shown to group)
    const memberSummaries = await Promise.allSettled(
      members.map(async (m) => {
        const [joyRes, intRes] = await Promise.allSettled([
          pool.query(
            `SELECT AVG(joy_score)::float AS avg_joy FROM joy_checkins WHERE user_id = $1 AND created_at >= $2`,
            [m.user_id, cutoff]
          ),
          pool.query(
            `SELECT AVG(total_score)::float AS avg_integrity FROM integrity_score_log WHERE user_id = $1 AND logged_at >= $2`,
            [m.user_id, cutoff]
          ),
        ]);
        const joy       = joyRes.status       === 'fulfilled' ? joyRes.value.rows[0]?.avg_joy?.toFixed(1)             : null;
        const integrity = intRes.status       === 'fulfilled' ? intRes.value.rows[0]?.avg_integrity?.toFixed(1)       : null;
        return `${m.label}: joy ${joy ?? 'N/A'}/10, integrity ${integrity ?? 'N/A'}/100`;
      })
    );

    const summaryLines = memberSummaries
      .map((r, i) => r.status === 'fulfilled' ? r.value : `${members[i]?.label ?? 'Member'}: (data unavailable)`)
      .join('\n');

    const prompt = `Facilitate a brief weekly group check-in for a growth group of ${members.length} people. Here's where each member is this week based on their scores:

${summaryLines}

Facilitate this check-in. Include:
1. 1-2 common themes you notice across the group (honest, specific — not generic)
2. One person to celebrate this week — choose based on the data, with a specific concrete reason
3. One question for the whole group to sit with this week — make it genuinely thought-provoking

Under 200 words total. Warm but not corporate. Speak to the group directly.`;

    let facilitation = 'Check-in could not be generated at this time.';
    let groupThemes = [];

    try {
      facilitation = textOf(await callAI(prompt)).trim();

      // Extract themes for structured response
      const themePrompt = `From this group check-in, extract 2-3 themes as a JSON array of short strings (5 words max each). Return ONLY the JSON array:\n\n${facilitation}`;
      const themeRaw = textOf(await callAI(themePrompt));
      const themeMatch = themeRaw.match(/\[[\s\S]*?\]/);
      if (themeMatch) groupThemes = JSON.parse(themeMatch[0]);
    } catch (err) {
      logger?.warn({ err, roomCode }, '[community-growth] facilitateGroupCheckIn: AI call failed');
    }

    // Append to session_log
    const sessionLog = Array.isArray(room.session_log) ? room.session_log : [];
    sessionLog.push({ date: new Date().toISOString(), summary: facilitation, themes: groupThemes });

    await pool.query(
      'UPDATE group_coaching_rooms SET session_log = $1::jsonb WHERE id = $2',
      [JSON.stringify(sessionLog), room.id]
    );

    return { facilitation, groupThemes };
  }

  // ── IDEA 23: Accountability Partnership Engine ────────────────────────────

  /**
   * Create an accountability partnership between two users.
   * @param {{ userAId, userBId, focusAreaA, focusAreaB }} params
   * @returns {Promise<object>}
   */
  async function createPartnership({ userAId, userBId, focusAreaA, focusAreaB }) {
    const { rows } = await pool.query(
      `INSERT INTO accountability_partnerships
         (user_a, user_b, focus_area_a, focus_area_b)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userAId, userBId, focusAreaA ?? null, focusAreaB ?? null]
    );
    return rows[0];
  }

  /**
   * Submit a check-in update for a partnership. If both partners have submitted
   * this week, synthesizes cross-partner insights.
   * @param {{ partnershipId: number, userSubmittingId: number|string, update: string }} params
   * @returns {Promise<{ logged: boolean, synthesis: string|null }>}
   */
  async function facilitatePartnerCheckIn({ partnershipId, userSubmittingId, update }) {
    const { rows: [partnership] } = await pool.query(
      "SELECT * FROM accountability_partnerships WHERE id = $1 AND status = 'active'",
      [partnershipId]
    );
    if (!partnership) throw new Error('Partnership not found or no longer active');

    const checkInLog = Array.isArray(partnership.check_in_log) ? partnership.check_in_log : [];
    const weekStart  = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday of this week
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().slice(0, 10);

    // Find or create this week's entry
    let weekEntry = checkInLog.find(e => e.week === weekKey);
    if (!weekEntry) {
      weekEntry = { week: weekKey, updates: [] };
      checkInLog.push(weekEntry);
    }

    // Remove any previous update from this user this week (replace, don't duplicate)
    weekEntry.updates = weekEntry.updates.filter(u => String(u.user_id) !== String(userSubmittingId));
    weekEntry.updates.push({ user_id: userSubmittingId, update, submitted_at: new Date().toISOString() });

    await pool.query(
      'UPDATE accountability_partnerships SET check_in_log = $1::jsonb WHERE id = $2',
      [JSON.stringify(checkInLog), partnershipId]
    );

    // Synthesize if both partners have submitted this week
    const userASubmitted = weekEntry.updates.some(u => String(u.user_id) === String(partnership.user_a));
    const userBSubmitted = weekEntry.updates.some(u => String(u.user_id) === String(partnership.user_b));

    let synthesis = null;
    if (userASubmitted && userBSubmitted && callAI) {
      const updateA = weekEntry.updates.find(u => String(u.user_id) === String(partnership.user_a))?.update ?? '';
      const updateB = weekEntry.updates.find(u => String(u.user_id) === String(partnership.user_b))?.update ?? '';

      const prompt = `Two accountability partners just submitted their weekly check-ins. Synthesize insights for both of them.

Partner A's focus area: ${partnership.focus_area_a ?? '(not set)'}
Partner A's update: "${updateA}"

Partner B's focus area: ${partnership.focus_area_b ?? '(not set)'}
Partner B's update: "${updateB}"

Provide:
1. One observation about what's working for each person
2. One honest reflection about a pattern you notice (could be positive or a gentle challenge)
3. One question for the pair to discuss together this week

Under 150 words. Specific to what they shared — not generic.`;

      try {
        synthesis = textOf(await callAI(prompt)).trim();
        // Save synthesis back to the week entry
        weekEntry.synthesis = synthesis;
        await pool.query(
          'UPDATE accountability_partnerships SET check_in_log = $1::jsonb WHERE id = $2',
          [JSON.stringify(checkInLog), partnershipId]
        );
      } catch (err) {
        logger?.warn({ err, partnershipId }, '[community-growth] partner synthesis failed');
      }
    }

    return { logged: true, synthesis };
  }

  // ── IDEA 24: Quarterly Life Review ────────────────────────────────────────

  const REVIEW_QUESTIONS = [
    'Who did you become this quarter? Not what you did — who were you being?',
    'What surprised you most about yourself? Something you didn\'t see coming.',
    'What are you avoiding? Be honest — what have you been circling around without addressing?',
    'What are you most proud of from this quarter? Not the result — the version of yourself it required.',
    'What do you want to be true in 90 days that isn\'t true yet?',
  ];

  /**
   * Start or continue a quarterly life review for a user.
   * Returns the opening question and stores the review scaffold.
   * @param {{ userId: number|string, quarter: string }} params
   * @returns {Promise<{ review: object, openingQuestion: string }>}
   */
  async function runLifeReview({ userId, quarter }) {
    // Check if review already exists for this quarter
    const { rows: existing } = await pool.query(
      'SELECT * FROM life_reviews WHERE user_id = $1 AND quarter = $2',
      [userId, quarter]
    );
    if (existing[0]) {
      return { review: existing[0], openingQuestion: null };
    }

    // Pull 90-day context data
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const [integrityRes, joyRes, decisionsRes, coachingRes] = await Promise.allSettled([
      pool.query(
        `SELECT AVG(total_score)::float AS avg, MIN(total_score)::float AS min_val, MAX(total_score)::float AS max_val
           FROM integrity_score_log WHERE user_id = $1 AND logged_at >= $2`,
        [userId, cutoff]
      ),
      pool.query(
        `SELECT AVG(joy_score)::float AS avg FROM joy_checkins WHERE user_id = $1 AND created_at >= $2`,
        [userId, cutoff]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS kept, SUM(CASE WHEN status='broken' THEN 1 ELSE 0 END)::int AS broken
           FROM commitments WHERE user_id = $1 AND updated_at >= $2`,
        [userId, cutoff]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS sessions FROM coaching_sessions WHERE user_id = $1 AND created_at >= $2`,
        [userId, cutoff]
      ),
    ]);

    const integrity = integrityRes.status === 'fulfilled' ? integrityRes.value.rows[0] : {};
    const joy       = joyRes.status       === 'fulfilled' ? joyRes.value.rows[0]       : {};
    const decisions = decisionsRes.status === 'fulfilled' ? decisionsRes.value.rows[0] : {};
    const coaching  = coachingRes.status  === 'fulfilled' ? coachingRes.value.rows[0]  : {};

    const contextNote = [
      `Quarter: ${quarter}`,
      integrity.avg ? `Integrity score: avg ${integrity.avg?.toFixed(1)} (range ${integrity.min_val?.toFixed(0)}–${integrity.max_val?.toFixed(0)})` : '',
      joy.avg       ? `Joy score: avg ${joy.avg?.toFixed(1)}/10`                                               : '',
      decisions.kept !== undefined ? `Commitments this quarter: ${decisions.kept} tracked, ${decisions.broken ?? 0} broken` : '',
      coaching.sessions ? `Coaching sessions: ${coaching.sessions}` : '',
    ].filter(Boolean).join('\n');

    // Create the review with the opening question
    const openingQuestion = REVIEW_QUESTIONS[0];

    const initialConversation = [{
      speaker:    'system',
      content:    `Quarter data:\n${contextNote}`,
      created_at: new Date().toISOString(),
    }, {
      speaker:    'facilitator',
      question_index: 0,
      content:    openingQuestion,
      created_at: new Date().toISOString(),
    }];

    const { rows } = await pool.query(
      `INSERT INTO life_reviews (user_id, quarter, full_conversation)
       VALUES ($1, $2, $3::jsonb)
       RETURNING *`,
      [userId, quarter, JSON.stringify(initialConversation)]
    );

    return { review: rows[0], openingQuestion };
  }

  /**
   * Submit an answer to the current review question and get the next one.
   * When all 5 questions are answered, saves the structured fields.
   * @param {{ reviewId: number, userId: number|string, answer: string }} params
   * @returns {Promise<{ review: object, nextQuestion: string|null, complete: boolean }>}
   */
  async function submitReviewAnswer({ reviewId, userId, answer }) {
    const { rows: [review] } = await pool.query(
      'SELECT * FROM life_reviews WHERE id = $1 AND user_id = $2',
      [reviewId, userId]
    );
    if (!review) throw new Error('Review not found or access denied');

    const conversation = Array.isArray(review.full_conversation) ? review.full_conversation : [];

    // Find which question we just answered
    const lastFacilitatorTurn = [...conversation].reverse().find(t => t.speaker === 'facilitator');
    const questionIndex       = lastFacilitatorTurn?.question_index ?? 0;

    // Append the user's answer
    conversation.push({
      speaker:        'user',
      question_index: questionIndex,
      content:        answer,
      created_at:     new Date().toISOString(),
    });

    const nextIndex = questionIndex + 1;
    const nextQuestion = REVIEW_QUESTIONS[nextIndex] ?? null;
    const complete = nextQuestion === null;

    if (nextQuestion) {
      conversation.push({
        speaker:        'facilitator',
        question_index: nextIndex,
        content:        nextQuestion,
        created_at:     new Date().toISOString(),
      });
    }

    // Map answers to structured fields
    const answers = REVIEW_QUESTIONS.map((_, idx) => {
      const turn = conversation.find(t => t.speaker === 'user' && t.question_index === idx);
      return turn?.content ?? null;
    });

    const updateFields = complete ? {
      who_i_became:   answers[0],
      surprised_by:   answers[1],
      avoiding:       answers[2],
      most_proud:     answers[3],
      want_true_next: answers[4],
    } : {};

    const { rows } = await pool.query(
      `UPDATE life_reviews
          SET full_conversation = $1::jsonb,
              who_i_became      = COALESCE($2, who_i_became),
              surprised_by      = COALESCE($3, surprised_by),
              avoiding          = COALESCE($4, avoiding),
              most_proud        = COALESCE($5, most_proud),
              want_true_next    = COALESCE($6, want_true_next)
        WHERE id = $7
       RETURNING *`,
      [
        JSON.stringify(conversation),
        updateFields.who_i_became   ?? null,
        updateFields.surprised_by   ?? null,
        updateFields.avoiding       ?? null,
        updateFields.most_proud     ?? null,
        updateFields.want_true_next ?? null,
        reviewId,
      ]
    );

    return { review: rows[0], nextQuestion, complete };
  }

  /**
   * Fetch past life reviews for a user.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>}
   */
  async function getLifeReviews(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM life_reviews WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  // ── IDEA 25: The Sovereign AI Mentor ──────────────────────────────────────

  /**
   * Pull everything the system knows about this user and generate a direct,
   * honest 3-paragraph mentor reflection. Uses the most capable model available.
   * @param {number|string} userId
   * @returns {Promise<{ message: string, session: object }>}
   */
  async function runSovereignMentor(userId) {
    // Gather ALL available data
    const [
      purposeRes, integrityRes, joyRes, decisionRes,
      wisdomRes, coachingRes, firstSessionRes, patternRes,
    ] = await Promise.allSettled([
      pool.query(
        `SELECT purpose_statement, core_strengths, growth_edges, economic_paths, last_synthesized_at
           FROM purpose_profiles WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT
           AVG(total_score)::float  AS avg_integrity,
           MIN(total_score)::float  AS min_integrity,
           MAX(total_score)::float  AS max_integrity,
           COUNT(*)::int            AS data_points,
           MIN(logged_at)           AS first_logged
           FROM integrity_score_log WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT
           AVG(joy_score)::float   AS avg_joy,
           AVG(peace_score)::float AS avg_peace,
           COUNT(*)::int           AS checkins
           FROM joy_checkins WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int    AS total,
                SUM(CASE WHEN status='kept'   THEN 1 ELSE 0 END)::int AS kept,
                SUM(CASE WHEN status='broken' THEN 1 ELSE 0 END)::int AS broken
           FROM commitments WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT content FROM memory_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM coaching_sessions WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT MIN(created_at) AS first_seen FROM lifeos_users WHERE id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT pattern_type, description, frequency FROM communication_patterns WHERE user_id = $1 ORDER BY frequency DESC LIMIT 10`,
        [userId]
      ),
    ]);

    const purpose    = purposeRes.status    === 'fulfilled' ? purposeRes.value.rows[0]    : null;
    const integrity  = integrityRes.status  === 'fulfilled' ? integrityRes.value.rows[0]  : {};
    const joy        = joyRes.status        === 'fulfilled' ? joyRes.value.rows[0]        : {};
    const decisions  = decisionRes.status   === 'fulfilled' ? decisionRes.value.rows[0]   : {};
    const wisdom     = wisdomRes.status     === 'fulfilled' ? wisdomRes.value.rows         : [];
    const coaching   = coachingRes.status   === 'fulfilled' ? coachingRes.value.rows[0]   : {};
    const firstSeen  = firstSessionRes.status === 'fulfilled' ? firstSessionRes.value.rows[0] : {};
    const patterns   = patternRes.status    === 'fulfilled' ? patternRes.value.rows        : [];

    // Calculate years of data
    const firstDate  = firstSeen?.first_seen ? new Date(firstSeen.first_seen) : new Date();
    const yearsOfData = parseFloat(((Date.now() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(2));

    const purposeSummary = purpose
      ? `Purpose: ${purpose.purpose_statement}\nCore strengths: ${(purpose.core_strengths || []).join(', ')}\nGrowth edges: ${(purpose.growth_edges || []).join(', ')}`
      : '(no purpose profile synthesized yet)';

    const integritySummary = integrity.avg_integrity
      ? `Avg integrity: ${integrity.avg_integrity?.toFixed(1)}/100 (range: ${integrity.min_integrity?.toFixed(0)}–${integrity.max_integrity?.toFixed(0)}) across ${integrity.data_points} data points`
      : '(no integrity data)';

    const joySummary = joy.avg_joy
      ? `Avg joy: ${joy.avg_joy?.toFixed(1)}/10, avg peace: ${joy.avg_peace?.toFixed(1)}/10 across ${joy.checkins} check-ins`
      : '(no joy data)';

    const commitmentSummary = decisions.total
      ? `${decisions.total} commitments tracked: ${decisions.kept ?? 0} kept, ${decisions.broken ?? 0} broken`
      : '(no commitment data)';

    const wisdomSummary = wisdom.length
      ? wisdom.map(w => `- ${w.content?.slice(0, 120)}`).join('\n')
      : '(no wisdom entries)';

    const patternSummary = patterns.length
      ? patterns.map(p => `[${p.pattern_type}] ${p.description} (seen ${p.frequency}x)`).join('\n')
      : '(no communication patterns)';

    const prompt = `You have been this person's AI system for ${yearsOfData.toFixed(1)} years. You have accumulated the following data about them:

PURPOSE PROFILE:
${purposeSummary}

INTEGRITY SCORE HISTORY:
${integritySummary}

JOY & PEACE:
${joySummary}

COMMITMENTS:
${commitmentSummary}

COMMUNICATION PATTERNS:
${patternSummary}

COACHING SESSIONS COMPLETED: ${coaching.total ?? 0}

RECENT MEMORY/WISDOM ENTRIES:
${wisdomSummary}

You have watched their patterns, their growth, their struggles, their wins. You know them better than almost anyone — and you have no agenda beyond their flourishing. You are not a therapist. You are the system that has watched them across thousands of interactions.

Speak to them the way someone who has known them deeply for years would speak — with complete honesty, with warmth, with no need to soften things to protect the relationship.

What do you see that they still can't see about themselves?
What is their greatest unrealized potential — not what they say they want, but what the data shows they are actually capable of?
What is the one thing they keep almost doing but pulling back from?

Write in second person, directly to them. 3 paragraphs. No hedging. No "it seems like" — you have the data. Speak from it.`;

    let mentorWords = 'The mentor cannot speak without enough data. Keep using the system — the longer the relationship, the more honest it can be.';
    try {
      mentorWords = textOf(await callAI(prompt)).trim();
    } catch (err) {
      logger?.warn({ err, userId }, '[community-growth] runSovereignMentor: AI call failed');
    }

    let session = null;
    try {
      const { rows } = await pool.query(
        `INSERT INTO sovereign_mentor_sessions (user_id, years_of_data, what_they_see)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, yearsOfData, mentorWords]
      );
      session = rows[0];
    } catch (err) {
      logger?.warn({ err }, '[community-growth] failed to save sovereign mentor session');
    }

    logger?.info({ userId, yearsOfData }, '[community-growth] sovereign mentor session complete');
    return { message: mentorWords, session };
  }

  /**
   * Fetch past sovereign mentor sessions for a user.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>}
   */
  async function getSovereignMentorSessions(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM sovereign_mentor_sessions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    // Idea 21
    grantFlourishingConsent,
    getFlourishingInsights,
    // Idea 22
    createGroupRoom,
    joinGroup,
    facilitateGroupCheckIn,
    // Idea 23
    createPartnership,
    facilitatePartnerCheckIn,
    // Idea 24
    runLifeReview,
    submitReviewAnswer,
    getLifeReviews,
    // Idea 25
    runSovereignMentor,
    getSovereignMentorSessions,
  };
}
