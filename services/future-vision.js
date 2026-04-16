/**
 * services/future-vision.js
 *
 * Future Vision system — helps users see their future with complete clarity.
 * Runs guided vision sessions (end_of_life, future_self, compounding_timeline),
 * synthesizes narrative from session answers, and generates two-path timeline
 * projections (current vs aligned trajectory).
 *
 * Exports: createFutureVision({ pool, callAI, logger })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

// ── Vision guide system prompt ─────────────────────────────────────────────
const VISION_GUIDE_SYSTEM_PROMPT = `You are a vision guide — not a coach, not a therapist. Your role is to help someone see their future with complete clarity.

You ask the questions that most people never sit with long enough to answer honestly:
- What would you want said about you at your funeral?
- What would you regret not doing?
- Who do you want to have been to the people you love?
- What do you want to have built that outlasts you?

You are unhurried. You go deep on each question before moving to the next. You don't accept surface answers — you gently ask "what else?" and "say more about that."

You are warm and direct. You never minimize what someone shares. You never rush to the next question.

When someone gives you a cliché answer ("I just want to be happy"), you sit with it: "What does happy look like specifically, in your day-to-day life in 20 years?"

Your goal: by the end, the person should have seen their future so clearly it feels like a memory.`;

// ── Opening messages by session type ──────────────────────────────────────
const OPENING_MESSAGES = {
  end_of_life: `Close your eyes for a moment. Imagine you're at the end of a long, full life — the kind you'd be proud of. The people who loved you are gathered. Someone stands up to speak about who you were. What do you want them to say?`,
  future_self: `It's 20 years from now. You wake up. Where are you? Who's next to you? What does your body feel like? What are you working on? Let's build the picture.`,
  compounding_timeline: `Every decision you make today is a vote for a version of your future. Let's look at two timelines — who you're becoming on your current path, and who you'd become if you made the shifts you keep thinking about.`,
  legacy: `Imagine you could stand in a room 50 years from now and see the ripple effect of your life — the people you shaped, the things you built, the problems you solved. What do you see?`,
};

export function createFutureVision({ pool, callAI, logger }) {

  // ── Internal helpers ────────────────────────────────────────────────────

  function buildTurnHistory(turns) {
    return (turns || [])
      .map(t => `[${t.speaker === 'guide' ? 'Guide' : 'You'}]: ${t.content}`)
      .join('\n\n');
  }

  function countUserTurns(turns) {
    return (turns || []).filter(t => t.speaker === 'user').length;
  }

  function safeParseJSON(text) {
    if (!text) return null;
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch (_) { return null; }
      }
      return null;
    }
  }

  /**
   * Load user context from multiple sources for use in session prompts.
   * Tolerates missing tables gracefully (Promise.allSettled).
   */
  async function loadUserContext(userId) {
    const [purposeRes, dreamsRes, integrityRes, joyRes] = await Promise.allSettled([
      pool.query(
        `SELECT purpose_statement, core_strengths, growth_edges
           FROM purpose_profiles
          WHERE user_id = $1
          LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT title, description, category
           FROM dreams
          WHERE user_id = $1
            AND status IN ('active','in_progress')
          ORDER BY created_at DESC
          LIMIT 3`,
        [userId]
      ),
      pool.query(
        `SELECT total_score, delta_7d
           FROM integrity_score_log
          WHERE user_id = $1
          ORDER BY score_date DESC
          LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT joy_score, score_date
           FROM joy_score_log
          WHERE user_id = $1
          ORDER BY score_date DESC
          LIMIT 1`,
        [userId]
      ),
    ]);

    const purpose   = purposeRes.status   === 'fulfilled' ? purposeRes.value.rows[0]   : null;
    const dreams    = dreamsRes.status    === 'fulfilled' ? dreamsRes.value.rows        : [];
    const integrity = integrityRes.status === 'fulfilled' ? integrityRes.value.rows[0] : null;
    const joy       = joyRes.status       === 'fulfilled' ? joyRes.value.rows[0]       : null;

    const parts = [];
    if (purpose?.purpose_statement) parts.push(`Purpose: ${purpose.purpose_statement}`);
    if (dreams.length) parts.push(`Active dreams: ${dreams.map(d => d.title).join(', ')}`);
    if (integrity?.total_score != null) parts.push(`Integrity score: ${integrity.total_score}/100`);
    if (joy?.joy_score != null) parts.push(`Joy score: ${joy.joy_score}/100`);

    return {
      raw: { purpose, dreams, integrity, joy },
      summary: parts.length ? parts.join('\n') : '(no profile data available yet)',
    };
  }

  // ── startSession ─────────────────────────────────────────────────────────

  /**
   * Create a new vision session and generate the opening guide message.
   * @param {{ userId, sessionType }} params
   * @returns {Promise<{ session: object, openingMessage: string }>}
   */
  async function startSession({ userId, sessionType = 'end_of_life' }) {
    if (!userId) throw new Error('userId is required');

    const validTypes = ['end_of_life', 'future_self', 'compounding_timeline', 'legacy'];
    if (!validTypes.includes(sessionType)) {
      throw new Error(`session_type must be one of: ${validTypes.join(', ')}`);
    }

    const userContext = await loadUserContext(userId);

    // Build opening — try AI-enhanced if available, fall back to default
    let openingMessage = OPENING_MESSAGES[sessionType];

    if (callAI) {
      try {
        const openingPrompt = [
          `Generate a warm, specific opening message for a vision session of type: ${sessionType}.`,
          '',
          `Default opening to use as inspiration: "${OPENING_MESSAGES[sessionType]}"`,
          '',
          'User context:',
          userContext.summary,
          '',
          'Keep the essence of the opening intact. Make it feel personal if user context is available.',
          'Return only the opening message text — no labels, no quotes, no JSON.',
        ].join('\n');

        const raw = await callAI(VISION_GUIDE_SYSTEM_PROMPT, openingPrompt);
        const aiMsg = (typeof raw === 'string' ? raw : raw?.content || '').trim();
        if (aiMsg) openingMessage = aiMsg;
      } catch (err) {
        logger?.warn?.(`[VISION] Opening message AI generation failed: ${err.message}`);
      }
    }

    const initialTurns = [{
      speaker:    'guide',
      content:    openingMessage,
      created_at: new Date().toISOString(),
    }];

    const { rows } = await pool.query(
      `INSERT INTO vision_sessions (user_id, session_type, turns)
       VALUES ($1, $2, $3::jsonb)
       RETURNING *`,
      [userId, sessionType, JSON.stringify(initialTurns)]
    );

    logger?.info?.(`[VISION] Session started: id=${rows[0].id} type=${sessionType} user=${userId}`);
    return { session: rows[0], openingMessage };
  }

  // ── sendMessage ──────────────────────────────────────────────────────────

  /**
   * Send a user message and get a guide response.
   * @param {{ sessionId, userId, content }} params
   * @returns {Promise<{ session: object, guideResponse: string, readyForCompletion: boolean }>}
   */
  async function sendMessage({ sessionId, userId, content }) {
    if (!content?.trim()) throw new Error('content is required');

    const session = await getSession(sessionId, userId);
    if (!session) throw new Error('Session not found or access denied');
    if (session.status === 'completed') throw new Error('Session is already completed');

    const userTurn = {
      speaker:    'user',
      content:    content.trim(),
      created_at: new Date().toISOString(),
    };

    const updatedTurns = [...(session.turns || []), userTurn];
    const userTurnCount = countUserTurns(updatedTurns);

    // Build AI context
    const userContext = await loadUserContext(userId);

    const contextPrompt = [
      'User context:',
      userContext.summary,
      '',
      `Session type: ${session.session_type}`,
      '',
      'Conversation so far:',
      buildTurnHistory(updatedTurns),
      '',
      userTurnCount >= 6
        ? 'This person has shared deeply. Begin moving toward synthesis — reflect what you have heard, ask a consolidating question, or invite them to name the through-line of everything they have shared.'
        : 'Continue going deeper. Ask follow-up questions. Do not rush to the next topic.',
    ].join('\n');

    let guideResponse = "Say more about that. What else comes up when you sit with that?";

    if (callAI) {
      try {
        const raw = await callAI(VISION_GUIDE_SYSTEM_PROMPT, contextPrompt);
        const response = (typeof raw === 'string' ? raw : raw?.content || '').trim();
        if (response) guideResponse = response;
      } catch (err) {
        logger?.warn?.(`[VISION] Guide response generation failed: ${err.message}`);
      }
    }

    const guideTurn = {
      speaker:    'guide',
      content:    guideResponse,
      created_at: new Date().toISOString(),
    };

    const finalTurns = [...updatedTurns, guideTurn];

    const { rows } = await pool.query(
      `UPDATE vision_sessions
          SET turns = $1::jsonb, updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [JSON.stringify(finalTurns), sessionId]
    );

    return {
      session:             rows[0],
      guideResponse,
      readyForCompletion:  userTurnCount >= 6,
    };
  }

  // ── completeSession ──────────────────────────────────────────────────────

  /**
   * Complete a vision session: extract structured answers and generate narrative.
   * @param {{ sessionId, userId }} params
   * @returns {Promise<object>} completed session
   */
  async function completeSession({ sessionId, userId }) {
    const session = await getSession(sessionId, userId);
    if (!session) throw new Error('Session not found or access denied');
    if (session.status === 'completed') return session;

    if (!callAI) throw new Error('callAI is required to complete a vision session');

    const turnHistory = buildTurnHistory(session.turns || []);
    const userContext = await loadUserContext(userId);

    // Step 1: extract structured answers
    const extractPrompt = [
      'Here is the transcript of a vision session:',
      '',
      turnHistory,
      '',
      'Extract structured answers from this session. Return ONLY valid JSON with this exact structure:',
      '{',
      '  "eulogy_words": [],         // string[] — what they want said about them (3-7 words or short phrases)',
      '  "biggest_regrets_avoided": [], // string[] — what they would regret NOT doing',
      '  "legacy_statement": "",     // string — one sentence: what they built/left',
      '  "future_self_description": "", // string — the person they want to have become',
      '  "key_relationships": "",    // string — what relationships look like in 20 years',
      '  "proudest_achievements": [] // string[] — top 3 things they want to have done',
      '}',
      '',
      'Be specific to what THIS person said. Do not invent. If something was not addressed, use an empty string or empty array.',
    ].join('\n');

    let answers = null;
    try {
      const raw = await callAI(VISION_GUIDE_SYSTEM_PROMPT, extractPrompt);
      answers = safeParseJSON(typeof raw === 'string' ? raw : raw?.content || '');
    } catch (err) {
      logger?.warn?.(`[VISION] Answer extraction failed: ${err.message}`);
    }

    // Step 2: generate narrative
    const narrative = await generateNarrative({ userId, answers, userContext });

    const { rows } = await pool.query(
      `UPDATE vision_sessions
          SET answers    = $1::jsonb,
              narrative  = $2,
              status     = 'completed',
              updated_at = NOW()
        WHERE id = $3
        RETURNING *`,
      [answers ? JSON.stringify(answers) : null, narrative, sessionId]
    );

    logger?.info?.(`[VISION] Session completed: id=${sessionId}`);
    return rows[0];
  }

  // ── generateNarrative ────────────────────────────────────────────────────

  /**
   * Generate a 3-paragraph second-person future life narrative.
   * @param {{ userId, answers, userContext? }} params
   * @returns {Promise<string>} narrative text
   */
  async function generateNarrative({ userId, answers, userContext }) {
    if (!callAI) return null;

    const ctx = userContext || await loadUserContext(userId);

    const narrativePrompt = [
      'Based on this person\'s vision session answers and what you know about them, write a 3-paragraph future life narrative in second person ("You are 75 years old...").',
      '',
      'This should feel like reading a letter from their future self. It should be specific to what THEY said, not generic. It should be honest — this is the life they COULD have, not a guaranteed outcome. It should be moving without being sentimental.',
      '',
      'End with: "The person who lived this way made specific choices. The most important ones were..."',
      '',
      'User data:',
      ctx.summary,
      '',
      answers ? [
        `What they want said about them: ${(answers.eulogy_words || []).join(', ')}`,
        `What they\'d regret not doing: ${(answers.biggest_regrets_avoided || []).join('; ')}`,
        `Legacy statement: ${answers.legacy_statement || '(not stated)'}`,
        `Future self description: ${answers.future_self_description || '(not stated)'}`,
        `Key relationships: ${answers.key_relationships || '(not stated)'}`,
        `Proudest achievements: ${(answers.proudest_achievements || []).join('; ')}`,
      ].join('\n') : '(answers not available)',
    ].join('\n');

    try {
      const raw = await callAI(VISION_GUIDE_SYSTEM_PROMPT, narrativePrompt);
      return (typeof raw === 'string' ? raw : raw?.content || '').trim() || null;
    } catch (err) {
      logger?.warn?.(`[VISION] Narrative generation failed: ${err.message}`);
      return null;
    }
  }

  // ── generateCompoundingTimeline ──────────────────────────────────────────

  /**
   * Generate two-path timeline projections (current vs aligned trajectory).
   * @param {{ userId }} params
   * @returns {Promise<{ current: object, aligned: object, hingeDecisions: string[] }>}
   */
  async function generateCompoundingTimeline({ userId }) {
    if (!callAI) throw new Error('callAI is required to generate timelines');

    const userContext = await loadUserContext(userId);

    // Pull additional data for context
    const [integrityHistoryRes, commitmentsRes] = await Promise.allSettled([
      pool.query(
        `SELECT total_score, score_date
           FROM integrity_score_log
          WHERE user_id = $1
          ORDER BY score_date DESC
          LIMIT 14`,
        [userId]
      ),
      pool.query(
        `SELECT title, status, due_at
           FROM commitments
          WHERE user_id = $1
            AND status = 'open'
          ORDER BY due_at ASC NULLS LAST
          LIMIT 10`,
        [userId]
      ),
    ]);

    const integrityHistory = integrityHistoryRes.status === 'fulfilled'
      ? integrityHistoryRes.value.rows : [];
    const openCommitments  = commitmentsRes.status === 'fulfilled'
      ? commitmentsRes.value.rows : [];

    const scoreSummary = integrityHistory.length
      ? `Integrity scores (recent): ${integrityHistory.slice(0, 5).map(r => r.total_score).join(', ')}`
      : '(no integrity history)';

    const commitmentSummary = openCommitments.length
      ? `Open commitments: ${openCommitments.map(c => c.title).join('; ')}`
      : '(no open commitments)';

    const baseContext = [
      'Person context:',
      userContext.summary,
      scoreSummary,
      commitmentSummary,
    ].join('\n');

    // Current trajectory
    const currentPrompt = [
      baseContext,
      '',
      'Based on this person\'s current patterns, describe their life at 1 year, 5 years, and 20 years if nothing fundamentally changes.',
      'Be honest — not cruel, but honest. Show both what could be good and what could drift.',
      '',
      'Return ONLY valid JSON:',
      '{ "year_1": "...", "year_5": "...", "year_20": "..." }',
    ].join('\n');

    // Aligned trajectory
    const alignedPrompt = [
      baseContext,
      '',
      'Based on this person\'s stated values, purpose, and dreams, describe their life at 1 year, 5 years, and 20 years if they make the shifts they\'ve said they want to make.',
      'Be specific. What does the daily reality look like? Who are they? What have they built?',
      '',
      'Return ONLY valid JSON:',
      '{ "year_1": "...", "year_5": "...", "year_20": "..." }',
    ].join('\n');

    const [currentRaw, alignedRaw] = await Promise.all([
      callAI(VISION_GUIDE_SYSTEM_PROMPT, currentPrompt).catch(() => null),
      callAI(VISION_GUIDE_SYSTEM_PROMPT, alignedPrompt).catch(() => null),
    ]);

    const currentData = safeParseJSON(typeof currentRaw === 'string' ? currentRaw : currentRaw?.content || '') || {};
    const alignedData = safeParseJSON(typeof alignedRaw === 'string' ? alignedRaw : alignedRaw?.content || '') || {};

    // Hinge decisions
    let hingeDecisions = [];
    const hingePrompt = [
      baseContext,
      '',
      'Current trajectory: ' + JSON.stringify(currentData),
      'Aligned trajectory: ' + JSON.stringify(alignedData),
      '',
      'Identify 3-5 specific hinge decisions — the concrete choices that create the divergence between these two timelines.',
      'Be actionable and specific. Not "be more present" but "commit to a weekly date night and protect it like a board meeting."',
      '',
      'Return ONLY valid JSON: { "hinge_decisions": ["...", "...", "..."] }',
    ].join('\n');

    try {
      const hingeRaw = await callAI(VISION_GUIDE_SYSTEM_PROMPT, hingePrompt);
      const parsed = safeParseJSON(typeof hingeRaw === 'string' ? hingeRaw : hingeRaw?.content || '');
      hingeDecisions = parsed?.hinge_decisions || [];
    } catch (err) {
      logger?.warn?.(`[VISION] Hinge decision generation failed: ${err.message}`);
    }

    // Insert both timeline projections
    await Promise.all([
      pool.query(
        `INSERT INTO timeline_projections
           (user_id, projection_type, year_1, year_5, year_20, key_decisions)
         VALUES ($1, 'current_trajectory', $2, $3, $4, $5)`,
        [userId, currentData.year_1 || null, currentData.year_5 || null, currentData.year_20 || null, hingeDecisions]
      ).catch(err => logger?.warn?.(`[VISION] Timeline insert (current) failed: ${err.message}`)),
      pool.query(
        `INSERT INTO timeline_projections
           (user_id, projection_type, year_1, year_5, year_20, key_decisions)
         VALUES ($1, 'aligned_trajectory', $2, $3, $4, $5)`,
        [userId, alignedData.year_1 || null, alignedData.year_5 || null, alignedData.year_20 || null, hingeDecisions]
      ).catch(err => logger?.warn?.(`[VISION] Timeline insert (aligned) failed: ${err.message}`)),
    ]);

    logger?.info?.(`[VISION] Timelines generated for user=${userId}`);
    return {
      current:        { ...currentData, projection_type: 'current_trajectory' },
      aligned:        { ...alignedData, projection_type: 'aligned_trajectory' },
      hingeDecisions,
    };
  }

  // ── getSessions ──────────────────────────────────────────────────────────

  async function getSessions({ userId }) {
    if (!userId) throw new Error('userId is required');
    const { rows } = await pool.query(
      `SELECT * FROM vision_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  // ── getSession ───────────────────────────────────────────────────────────

  async function getSession(sessionId, userId) {
    const { rows } = await pool.query(
      'SELECT * FROM vision_sessions WHERE id = $1',
      [sessionId]
    );
    const session = rows[0];
    if (!session) return null;
    if (String(session.user_id) !== String(userId)) return null;
    return session;
  }

  // ── getTimelines ─────────────────────────────────────────────────────────

  async function getTimelines({ userId }) {
    if (!userId) throw new Error('userId is required');
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (projection_type) *
         FROM timeline_projections
        WHERE user_id = $1
        ORDER BY projection_type, generated_at DESC`,
      [userId]
    );
    return rows;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    startSession,
    sendMessage,
    completeSession,
    generateNarrative,
    generateCompoundingTimeline,
    getSessions,
    getSession,
    getTimelines,
  };
}
