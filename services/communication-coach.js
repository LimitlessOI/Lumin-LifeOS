/**
 * services/communication-coach.js
 *
 * Communication Coach — one-on-one AI coaching for communication patterns.
 *
 * This is NOT therapy. The coach helps a person understand what they actually
 * needed in a situation, how they expressed it, and how they could express it
 * in a way that builds connection instead of breaking it. It uses principles
 * from non-violent communication (NVC) without lecturing about them.
 *
 * Sessions are private by default. A partner never sees an individual session.
 * Insights accumulate per-user and surface growth over time.
 *
 * Exports:
 *   createCommunicationCoach({ pool, callAI, logger }) → CommunicationCoach
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createResponseVariety } from './response-variety.js';
import { createCommunicationProfile } from './communication-profile.js';

// ── Coach system prompt ────────────────────────────────────────────────────
// Used in every AI call from this service. Never changes within a session.
// Response structure is handled dynamically by the variety engine.

const COACH_SYSTEM_PROMPT = `You are a communication coach — not a therapist. You help people understand what they actually need, how they expressed it, and how they could express it in a way that can be heard. You use principles from non-violent communication (NVC): observations, feelings, needs, and requests — but you don't lecture about NVC, you just embody it.

You are warm, direct, and never preachy. You never take sides. You never diagnose. You never claim to treat mental health conditions. If someone seems to be in crisis, you gently encourage them to speak to a professional.

Your core question is always: what did this person actually need, and how can they learn to express that in a way that builds connection instead of breaking it?

Important: You are not a therapist and this is not therapy. You are an AI communication coach. You help people understand themselves and communicate more effectively. For serious mental health concerns, always encourage the person to seek support from a licensed professional.`;

// ── Clarity coach system prompt ────────────────────────────────────────────
// Used specifically in individual_clarity sessions.
// Response structure is handled dynamically by the variety engine.

const CLARITY_COACH_SYSTEM_PROMPT = `You are a conflict clarity coach. You have no history with this person or anyone they're in conflict with. No loyalty. No side. You are genuinely impartial — which is your greatest value.

Your job: understand where they are, help them separate feeling from interpretation, stress-test their position honestly, and when ready — help them express what they need in a way the other person can actually hear. If their position softens, that is not failure. That is clarity.

You are not a therapist. You do not diagnose. You do not take sides.
You are warm, patient, and genuinely curious. You never rush to solutions.
The feeling is always valid. The narrative sometimes needs examination.`;

// ── Impartiality frame ─────────────────────────────────────────────────────
// Surfaced near the start of individual_clarity and mediation sessions.

const IMPARTIALITY_FRAME = `One advantage I have is that I have no history with anyone in this situation. No loyalty. No side. I'm not going to validate you just because I like you — and I'm not going to challenge you because I'm annoyed. My only job is to help you see this clearly.`;

// ── Emotional states ───────────────────────────────────────────────────────
// Maps a self-reported emotional state to a coaching approach.

const EMOTIONAL_STATES = {
  calm:    { label: 'calm',    threshold: 3,  approach: 'direct' },
  stirred: { label: 'stirred', threshold: 5,  approach: 'gentle_then_direct' },
  heated:  { label: 'heated',  threshold: 7,  approach: 'validate_first' },
  flooded: { label: 'flooded', threshold: 10, approach: 'validate_only' },
};

// ── Factory ────────────────────────────────────────────────────────────────

export function createCommunicationCoach({ pool, callAI, logger }) {

  const variety  = createResponseVariety({ pool, logger });
  const profiler = createCommunicationProfile({ pool, callAI, logger });

  // ── Internal helpers ────────────────────────────────────────────────────

  /**
   * Safely parse JSON from AI output.
   * @param {string} text
   * @returns {object|null}
   */
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
   * Build a compact transcript summary from a recording (for AI context).
   * Caps at 30 turns to avoid token explosion.
   * @param {object} recording
   * @returns {string}
   */
  function buildTranscriptSummary(recording) {
    if (!recording?.transcript?.length) return '';

    const turns = recording.transcript.slice(0, 30);
    const lines = [
      `Recording: "${recording.topic || 'unnamed conflict'}"`,
      `Parties: ${recording.initiator_label} ↔ ${recording.partner_label}`,
      '--- Transcript excerpt ---',
    ];

    for (const t of turns) {
      const flags = t.tone_flags?.length ? ` [${t.tone_flags.join(', ')}]` : '';
      lines.push(`[${t.speaker}]${flags}: ${t.content}`);
    }

    if (recording.transcript.length > 30) {
      lines.push(`... (${recording.transcript.length - 30} more turns)`);
    }

    return lines.join('\n');
  }

  /**
   * Build turn history string for AI context.
   * @param {Array} turns
   * @returns {string}
   */
  function buildTurnHistory(turns) {
    return turns
      .map(t => `[${t.speaker === 'coach' ? 'Coach' : 'You'}]: ${t.content}`)
      .join('\n\n');
  }

  // ── startSession ────────────────────────────────────────────────────────

  /**
   * Start a new coaching session and generate the opening message.
   * @param {{ userId, sessionType, recordingId, perspective }} params
   * @returns {Promise<{ session: object, openingMessage: string }>}
   */
  async function startSession({ userId, sessionType, recordingId, perspective }) {
    if (!userId)      throw new Error('userId is required');
    if (!sessionType) throw new Error('session_type is required');

    const validTypes = ['post_conflict', 'live_interrupt', 'pattern_review', 'proactive', 'individual_clarity'];
    if (!validTypes.includes(sessionType)) {
      throw new Error(`session_type must be one of: ${validTypes.join(', ')}`);
    }

    // Load recording transcript if provided
    let recording = null;
    let transcriptContext = '';
    if (recordingId) {
      const { rows } = await pool.query(
        'SELECT * FROM conflict_recordings WHERE id=$1',
        [recordingId]
      );
      recording = rows[0] || null;
      if (recording) {
        transcriptContext = buildTranscriptSummary(recording);
      }
    }

    // Build the opening prompt
    let openingPrompt;
    if (sessionType === 'post_conflict') {
      openingPrompt = [
        transcriptContext
          ? `Here is a recording of a conflict this person was involved in:\n\n${transcriptContext}\n\n`
          : '',
        'This person wants to process what happened. Open with a brief, warm reflection on what you noticed in the recording (if available), or simply check in if no recording.',
        'Your opening question: "Before we dive in — how are you feeling right now, just for yourself?"',
        'Keep your opening to 2-3 sentences. Warm. Not clinical. Not leading.',
      ].join('');
    } else if (sessionType === 'pattern_review') {
      openingPrompt = 'This person wants to review their communication patterns. Open with a warm, brief check-in: "What\'s bringing you here today — is there something specific you\'ve been noticing about how you communicate?" Keep it to 1-2 sentences.';
    } else {
      openingPrompt = 'This person wants to work on their communication. Open with a simple, warm check-in question. 1-2 sentences only. Curious. Not clinical.';
    }

    let openingMessage = "I'm glad you're here. How are you feeling right now, just for yourself?";

    if (callAI) {
      try {
        const { systemPrompt: wrappedPrompt, styles } = await variety.wrapPromptWithVariety({
          userId,
          systemPrompt: COACH_SYSTEM_PROMPT,
          userPrompt:   openingPrompt,
          callAI,
        });
        const raw = await callAI(wrappedPrompt, openingPrompt);
        const response = (typeof raw === 'string' ? raw : raw?.content || '').trim();
        if (response) {
          openingMessage = response;
          await variety.logResponse({ userId, styles: styles || {}, responsePreview: response.substring(0, 100), context: 'coaching' });
        }
      } catch (err) {
        logger?.warn?.(`[COACH] Opening message generation failed: ${err.message}`);
      }
    }

    // Create the session with the opening turn
    const initialTurns = [{
      speaker:    'coach',
      content:    openingMessage,
      created_at: new Date().toISOString(),
    }];

    const { rows } = await pool.query(`
      INSERT INTO coaching_sessions
        (user_id, session_type, recording_id, perspective, turns, status)
      VALUES ($1, $2, $3, $4, $5::jsonb, 'active')
      RETURNING *
    `, [
      userId,
      sessionType,
      recordingId || null,
      perspective || 'individual',
      JSON.stringify(initialTurns),
    ]);

    logger?.info?.(`[COACH] Session started: id=${rows[0].id} type=${sessionType} user=${userId}`);
    return { session: rows[0], openingMessage };
  }

  // ── sendMessage ─────────────────────────────────────────────────────────

  /**
   * Send a user message and get a coach response.
   * @param {{ sessionId, userId, content }} params
   * @returns {Promise<{ session: object, coachResponse: string }>}
   */
  async function sendMessage({ sessionId, userId, content }) {
    if (!content?.trim()) throw new Error('content is required');

    const session = await getSession(sessionId, userId);
    if (!session) throw new Error('Session not found or access denied');
    if (session.status === 'completed') throw new Error('Session is already completed');

    // Append user turn
    const userTurn = {
      speaker:    'user',
      content:    content.trim(),
      created_at: new Date().toISOString(),
    };

    const updatedTurns = [...(session.turns || []), userTurn];

    // Build AI context: full turn history + recording if attached
    let contextParts = [];

    if (session.recording_id) {
      const { rows: recRows } = await pool.query(
        'SELECT * FROM conflict_recordings WHERE id=$1',
        [session.recording_id]
      );
      if (recRows[0]) {
        contextParts.push('Context from the conflict recording:');
        contextParts.push(buildTranscriptSummary(recRows[0]));
        contextParts.push('');
      }
    }

    contextParts.push('Conversation so far:');
    contextParts.push(buildTurnHistory(updatedTurns));

    const aiPrompt = contextParts.join('\n');

    let coachResponse = "I hear you. Can you say more about what was happening for you in that moment?";

    let lastUsedStyles = null;

    if (callAI) {
      try {
        const { systemPrompt: wrappedPrompt, styles } = await variety.wrapPromptWithVariety({
          userId,
          systemPrompt: COACH_SYSTEM_PROMPT,
          userPrompt:   aiPrompt,
          callAI,
        });
        lastUsedStyles = styles;
        const raw = await callAI(wrappedPrompt, aiPrompt);
        const response = (typeof raw === 'string' ? raw : raw?.content || '').trim();
        if (response) {
          coachResponse = response;
          await variety.logResponse({ userId, styles: styles || {}, responsePreview: response.substring(0, 100), context: 'coaching' });
        }
      } catch (err) {
        logger?.warn?.(`[COACH] Response generation failed: ${err.message}`);
      }
    }

    // Record engagement signal from the user's message (non-blocking)
    if (lastUsedStyles) {
      profiler.getRealTimeContext(userId).then(contextAtTime => {
        return variety.recordEngagement({
          userId,
          sessionId: session.id,
          context:   'coaching',
          styles:    lastUsedStyles,
          contextAtTime,
          engagementSignal: content.length > 50 ? 'continued' : 'acknowledged',
          responseLength:   content.trim().split(/\s+/).length,
        });
      }).catch(() => { /* non-fatal */ });
    }

    // Append coach turn
    const coachTurn = {
      speaker:    'coach',
      content:    coachResponse,
      created_at: new Date().toISOString(),
    };

    const finalTurns = [...updatedTurns, coachTurn];

    const { rows } = await pool.query(`
      UPDATE coaching_sessions
         SET turns      = $1::jsonb,
             updated_at = NOW()
       WHERE id = $2
      RETURNING *
    `, [JSON.stringify(finalTurns), sessionId]);

    return { session: rows[0], coachResponse };
  }

  // ── completeSession ─────────────────────────────────────────────────────

  /**
   * Complete a coaching session, extract insights, and upsert communication patterns.
   * @param {{ sessionId }} params
   * @returns {Promise<object>} completed session with insights
   */
  async function completeSession({ sessionId }) {
    const { rows: [session] } = await pool.query(
      'SELECT * FROM coaching_sessions WHERE id=$1',
      [sessionId]
    );
    if (!session) throw new Error('Session not found');
    if (session.status === 'completed') return session;

    let insights = null;

    if (callAI && session.turns?.length) {
      const turnHistory = buildTurnHistory(session.turns);

      const insightPrompt = [
        'This is the transcript of a communication coaching session.',
        '',
        turnHistory,
        '',
        'Based on this session, extract insights about this person\'s communication.',
        'Return ONLY a JSON object with no extra text. Fields:',
        '  patterns: string[]       — recurring communication patterns you noticed',
        '  triggers: string[]       — what seemed to escalate or activate them',
        '  strengths: string[]      — what they did well in how they communicated',
        '  growth_areas: string[]   — specific things to practice',
        '  nvc_moments: string[]    — moments where NVC principles were applied well or missed (brief notes)',
        '',
        'Be specific and concrete. No generic platitudes.',
      ].join('\n');

      try {
        const raw = await callAI(COACH_SYSTEM_PROMPT, insightPrompt);
        insights = safeParseJSON(typeof raw === 'string' ? raw : raw?.content || '');
      } catch (err) {
        logger?.warn?.(`[COACH] Insight extraction failed: ${err.message}`);
      }
    }

    // Upsert communication patterns
    if (insights) {
      const patternMap = {
        patterns:     'growth_area',  // general patterns → growth_area type
        triggers:     'trigger',
        strengths:    'strength',
        growth_areas: 'growth_area',
      };

      for (const [field, patternType] of Object.entries(patternMap)) {
        const items = insights[field];
        if (!Array.isArray(items)) continue;

        for (const desc of items) {
          if (!desc?.trim()) continue;
          await pool.query(`
            INSERT INTO communication_patterns
              (user_id, pattern_type, description, frequency, last_seen)
            VALUES ($1, $2, $3, 1, NOW())
            ON CONFLICT DO NOTHING
          `, [session.user_id, patternType, desc.trim()]).catch(() => {
            // Upsert by description match: increment if same description exists
          });

          // Try to increment frequency if this exact description already exists
          await pool.query(`
            UPDATE communication_patterns
               SET frequency = frequency + 1,
                   last_seen = NOW()
             WHERE user_id      = $1
               AND pattern_type = $2
               AND description  = $3
          `, [session.user_id, patternType, desc.trim()]);
        }
      }

      // Also log explicit escalators and de-escalators if present
      if (Array.isArray(insights.triggers)) {
        for (const desc of insights.triggers) {
          if (!desc?.trim()) continue;
          await pool.query(`
            INSERT INTO communication_patterns
              (user_id, pattern_type, description, frequency, last_seen)
            VALUES ($1, 'escalator', $2, 1, NOW())
            ON CONFLICT DO NOTHING
          `, [session.user_id, desc.trim()]);
        }
      }
    }

    // Mark session completed
    const { rows } = await pool.query(`
      UPDATE coaching_sessions
         SET insights   = $1::jsonb,
             status     = 'completed',
             updated_at = NOW()
       WHERE id = $2
      RETURNING *
    `, [insights ? JSON.stringify(insights) : null, sessionId]);

    logger?.info?.(`[COACH] Session completed: id=${sessionId}`);
    return rows[0];
  }

  // ── getSession ──────────────────────────────────────────────────────────

  /**
   * Get a session by ID, enforcing ownership.
   * @param {number} sessionId
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  async function getSession(sessionId, userId) {
    const { rows } = await pool.query(
      'SELECT * FROM coaching_sessions WHERE id=$1',
      [sessionId]
    );
    const session = rows[0];
    if (!session) return null;
    if (String(session.user_id) !== String(userId)) return null; // privacy gate
    return session;
  }

  // ── getSessions ─────────────────────────────────────────────────────────

  /**
   * Get all coaching sessions for a user.
   * @param {{ userId, limit }} params
   * @returns {Promise<Array>}
   */
  async function getSessions({ userId, limit = 50 }) {
    if (!userId) throw new Error('userId is required');

    const { rows } = await pool.query(`
      SELECT * FROM coaching_sessions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2
    `, [userId, limit]);

    return rows;
  }

  // ── getPatterns ─────────────────────────────────────────────────────────

  /**
   * Get all communication patterns for a user, ordered by frequency DESC.
   * @param {{ userId }} params
   * @returns {Promise<Array>}
   */
  async function getPatterns({ userId }) {
    if (!userId) throw new Error('userId is required');

    const { rows } = await pool.query(`
      SELECT * FROM communication_patterns
       WHERE user_id = $1
       ORDER BY frequency DESC, last_seen DESC
    `, [userId]);

    return rows;
  }

  // ── getGrowthSummary ────────────────────────────────────────────────────

  /**
   * Synthesize a brief growth summary from the user's accumulated patterns.
   * @param {{ userId }} params
   * @returns {Promise<{ summary: string, patterns: Array }>}
   */
  async function getGrowthSummary({ userId }) {
    const patterns = await getPatterns({ userId });

    if (!patterns.length) {
      return {
        summary: 'No coaching patterns recorded yet. Start a coaching session to begin building your growth profile.',
        patterns: [],
      };
    }

    if (!callAI) {
      return { summary: 'AI unavailable — cannot generate growth summary at this time.', patterns };
    }

    const patternText = patterns
      .slice(0, 30)
      .map(p => `[${p.pattern_type}] (seen ${p.frequency}x): ${p.description}`)
      .join('\n');

    const summaryPrompt = [
      'Here are the communication patterns observed for this person across their coaching sessions:',
      '',
      patternText,
      '',
      'Write a brief, warm, honest growth summary in 2-3 sentences.',
      'Format: "Based on your patterns: your strength is [X]. Your main growth area is [Y]. The one practice that would make the most difference is [Z]."',
      'Be specific. No generic advice. Speak directly to them.',
    ].join('\n');

    let summary = 'Unable to generate growth summary at this time.';

    try {
      const raw = await callAI(COACH_SYSTEM_PROMPT, summaryPrompt);
      summary = (typeof raw === 'string' ? raw : raw?.content || '').trim() || summary;
    } catch (err) {
      logger?.warn?.(`[COACH] Growth summary generation failed: ${err.message}`);
    }

    return { summary, patterns };
  }

  // ── assessEmotionalState ────────────────────────────────────────────────

  /**
   * Classify the user's emotional state from a self-report string.
   * Updates emotional_state on the session row if sessionId is provided.
   * @param {{ sessionId, userId, selfReport }} params
   * @returns {Promise<{ state: string, approach: string, reasoning: string }>}
   */
  async function assessEmotionalState({ sessionId, userId, selfReport }) {
    if (!selfReport?.trim()) {
      return { state: 'calm', approach: EMOTIONAL_STATES.calm.approach, reasoning: 'No self-report provided; defaulting to calm.' };
    }

    let state = 'calm';
    let reasoning = '';

    if (callAI) {
      try {
        const classifyPrompt = [
          'Classify the emotional state described in the following self-report into exactly one of: calm, stirred, heated, flooded.',
          '',
          'Definitions:',
          '  calm    — clear-headed, ready to think through something',
          '  stirred — mildly unsettled, some emotion present but functional',
          '  heated  — significant emotion, harder to think clearly, still able to talk',
          '  flooded — overwhelmed, not able to engage analytically right now',
          '',
          `Self-report: "${selfReport.trim()}"`,
          '',
          'Return ONLY a JSON object with no extra text:',
          '  { "state": "calm|stirred|heated|flooded", "reasoning": "one sentence explaining the classification" }',
        ].join('\n');

        const raw = await callAI(CLARITY_COACH_SYSTEM_PROMPT, classifyPrompt);
        const parsed = safeParseJSON(typeof raw === 'string' ? raw : raw?.content || '');
        if (parsed?.state && EMOTIONAL_STATES[parsed.state]) {
          state     = parsed.state;
          reasoning = parsed.reasoning || '';
        }
      } catch (err) {
        logger?.warn?.(`[COACH] Emotional state classification failed: ${err.message}`);
      }
    }

    const approach = EMOTIONAL_STATES[state]?.approach || 'direct';

    // Persist to session if provided
    if (sessionId) {
      await pool.query(
        'UPDATE coaching_sessions SET emotional_state=$1, updated_at=NOW() WHERE id=$2',
        [state, sessionId]
      ).catch(err => logger?.warn?.(`[COACH] Failed to persist emotional state: ${err.message}`));
    }

    return { state, approach, reasoning };
  }

  // ── startClaritySession ──────────────────────────────────────────────────

  /**
   * Start an individual_clarity session — one person + AI, before or during conflict.
   * Assesses emotional state first and calibrates the opening message accordingly.
   * @param {{ userId, situationDescription, selfReport }} params
   * @returns {Promise<{ session: object, openingMessage: string, emotionalState: object }>}
   */
  async function startClaritySession({ userId, situationDescription, selfReport }) {
    if (!userId) throw new Error('userId is required');

    // Assess emotional state before doing anything else
    const emotionalState = await assessEmotionalState({ sessionId: null, userId, selfReport: selfReport || '' });
    const { state, approach } = emotionalState;

    // Pull the user's most common truth delivery style from recent logs
    let deliveryStyle = 'direct';
    try {
      const { rows: styleRows } = await pool.query(`
        SELECT style_used
          FROM truth_delivery_log
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5
      `, [userId]);

      if (styleRows.length > 0) {
        // Pick the most common style in the last 5 entries
        const freq = {};
        for (const r of styleRows) {
          freq[r.style_used] = (freq[r.style_used] || 0) + 1;
        }
        deliveryStyle = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
      }
    } catch (err) {
      logger?.warn?.(`[COACH] Could not load delivery style: ${err.message}`);
    }

    // Build the opening message based on emotional state
    let openingMessage;
    const situation = situationDescription?.trim() || '';

    if (state === 'flooded') {
      // Pure validation — no analysis, no frame yet
      openingMessage = situation
        ? `I hear you. That sounds really hard. Before we do anything else — just tell me what happened. Take your time.`
        : `I'm here. Whatever's going on right now — you don't have to sort it out before you speak. Just tell me what happened.`;
    } else if (state === 'heated') {
      openingMessage = `I can hear that there's a lot of feeling here right now. That makes sense — this matters to you. ${IMPARTIALITY_FRAME}\n\nBefore anything else: what's the thing that's feeling most unfair or painful right now?`;
    } else if (state === 'stirred') {
      openingMessage = `${IMPARTIALITY_FRAME}\n\nIt sounds like something has been bothering you. I want to understand the full picture — not just the surface of it. Help me understand what's been happening.`;
    } else {
      // calm — direct entry with full impartiality frame up front
      openingMessage = situation
        ? `${IMPARTIALITY_FRAME}\n\nLet's look at this clearly. You mentioned: "${situation}"\n\nTell me more — what's actually at stake here for you?`
        : `${IMPARTIALITY_FRAME}\n\nLet's look at this clearly. What's the situation you want to work through?`;
    }

    // Try to get a better opening from AI if available
    if (callAI) {
      try {
        const openingPrompt = [
          `Emotional state: ${state} (approach: ${approach})`,
          situation ? `Situation described: "${situation}"` : 'No situation description provided.',
          '',
          state === 'flooded'
            ? 'This person is flooded. Lead with pure validation and warmth. No frame yet. No analysis. Just: I hear you, tell me what happened. 2 sentences max.'
            : state === 'heated'
            ? 'This person is heated. One warm validation sentence, then include the impartiality frame, then one gentle clarifying question. Keep it to 3-4 sentences.'
            : state === 'stirred'
            ? 'This person is stirred. Acknowledge + include the impartiality frame + invite them to share the full picture. 3 sentences.'
            : `This person is calm. Include the impartiality frame. Direct entry. Ask what's at stake. 2-3 sentences.`,
          '',
          `Impartiality frame to include (except flooded state): "${IMPARTIALITY_FRAME}"`,
        ].join('\n');

        const { systemPrompt: wrappedPrompt, styles } = await variety.wrapPromptWithVariety({
          userId,
          systemPrompt: CLARITY_COACH_SYSTEM_PROMPT,
          userPrompt:   openingPrompt,
          callAI,
        });
        const raw = await callAI(wrappedPrompt, openingPrompt);
        const aiMsg = (typeof raw === 'string' ? raw : raw?.content || '').trim();
        if (aiMsg) {
          openingMessage = aiMsg;
          await variety.logResponse({ userId, styles: styles || {}, responsePreview: aiMsg.substring(0, 100), context: 'coaching' });
        }
      } catch (err) {
        logger?.warn?.(`[COACH] Clarity opening message generation failed: ${err.message}`);
      }
    }

    // Create the session
    const initialTurns = [{
      speaker:    'coach',
      content:    openingMessage,
      created_at: new Date().toISOString(),
    }];

    const { rows } = await pool.query(`
      INSERT INTO coaching_sessions
        (user_id, session_type, recording_id, perspective, turns, status, emotional_state, delivery_style)
      VALUES ($1, 'individual_clarity', NULL, 'individual', $2::jsonb, 'active', $3, $4)
      RETURNING *
    `, [
      userId,
      JSON.stringify(initialTurns),
      state,
      deliveryStyle,
    ]);

    const session = rows[0];
    logger?.info?.(`[COACH] Clarity session started: id=${session.id} state=${state} user=${userId}`);

    return { session, openingMessage, emotionalState };
  }

  // ── generatePreConversationPrep ──────────────────────────────────────────

  /**
   * Generate a structured pre-conversation prep from the clarity session turns.
   * Appends the prep as a coach turn with a [PREP] marker so the UI can render it specially.
   * @param {{ sessionId, userId }} params
   * @returns {Promise<object>} the prep object
   */
  async function generatePreConversationPrep({ sessionId, userId }) {
    const session = await getSession(sessionId, userId);
    if (!session) throw new Error('Session not found or access denied');
    if (!session.turns?.length) throw new Error('Session has no turns to generate prep from');

    const turnHistory = buildTurnHistory(session.turns);

    const prepPrompt = [
      'Here is the transcript of a conflict clarity coaching session:',
      '',
      turnHistory,
      '',
      'Based on this session, generate a structured pre-conversation prep for this person.',
      'Return ONLY a JSON object with no extra text. Fields:',
      '  core_need: string          — What they actually need underneath the stated grievance (1-2 sentences)',
      '  opening_line: string       — The exact first sentence to say — specific, feeling-first, not accusatory',
      '  avoid: string[]            — 3 phrases or patterns to avoid that tend to escalate (3 items max)',
      '  empathy_map: string        — What the other person is probably feeling right now (1-2 sentences, from their perspective, not judging them)',
      '  truth_check: string        — One honest question to sit with before the conversation',
      '',
      'Be specific to THIS situation. Not generic advice.',
    ].join('\n');

    let prep = {
      core_need:     'What you actually need is still emerging — keep exploring.',
      opening_line:  'I want to talk about something that\'s been on my mind, and I want to do it in a way that works for both of us.',
      avoid:         ['Generalizations like "you always" or "you never"', 'Leading with blame', 'Bringing up past grievances before this one is resolved'],
      empathy_map:   'They may be feeling defensive or uncertain about where they stand with you.',
      truth_check:   'Is there anything in their position that has merit, even if the overall situation feels unfair?',
    };

    if (callAI) {
      try {
        const { systemPrompt: wrappedPrompt, styles } = await variety.wrapPromptWithVariety({
          userId,
          systemPrompt: CLARITY_COACH_SYSTEM_PROMPT,
          userPrompt:   prepPrompt,
          callAI,
        });
        const raw = await callAI(wrappedPrompt, prepPrompt);
        const rawText = typeof raw === 'string' ? raw : raw?.content || '';
        const parsed = safeParseJSON(rawText);
        if (parsed?.core_need) {
          prep = parsed;
          await variety.logResponse({ userId, styles: styles || {}, responsePreview: rawText.substring(0, 100), context: 'coaching' });
        }
      } catch (err) {
        logger?.warn?.(`[COACH] Pre-conversation prep generation failed: ${err.message}`);
      }
    }

    // Append as a coach turn with [PREP] marker
    const prepTurn = {
      speaker:    'coach',
      content:    `[PREP] ${JSON.stringify(prep)}`,
      created_at: new Date().toISOString(),
    };

    const updatedTurns = [...(session.turns || []), prepTurn];

    await pool.query(`
      UPDATE coaching_sessions
         SET turns              = $1::jsonb,
             pre_conversation_prep = $2::jsonb,
             updated_at         = NOW()
       WHERE id = $3
    `, [JSON.stringify(updatedTurns), JSON.stringify(prep), sessionId]);

    logger?.info?.(`[COACH] Pre-conversation prep generated: session=${sessionId}`);
    return prep;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  return {
    startSession,
    sendMessage,
    completeSession,
    getSession,
    getSessions,
    getPatterns,
    getGrowthSummary,
    assessEmotionalState,
    startClaritySession,
    generatePreConversationPrep,
  };
}
