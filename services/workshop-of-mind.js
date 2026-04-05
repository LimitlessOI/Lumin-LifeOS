/**
 * services/workshop-of-mind.js
 *
 * Workshop of the Mind — guided visualization and mental rehearsal.
 *
 * Neurological, not mystical. This is practical mental preparation.
 * Visualization activates the same neural pathways as physical practice —
 * this is established neuroscience, not woo.
 *
 * Session types:
 *   performance_rehearsal — rehearse before a presentation, performance, or hard conversation
 *   future_self_meeting   — meet your future self and have a conversation
 *   goal_crystallization  — get clear on what you actually want
 *   healing_visualization — for emotional wounds (advisory only, no clinical claims)
 *   morning_activation    — 5-minute morning mental set
 *   evening_integration   — process the day, set down what needs to be set down
 *
 * Sessions are 8–12 exchanges. Facilitator language is calm, present-tense,
 * second-person, sensory-rich. Every prompt ends with a question that invites
 * deeper presence.
 *
 * Constitutional constraint: No clinical claims. No diagnosis. Sessions are
 * mental preparation tools, not therapy. The healing_visualization type
 * includes explicit advisory language.
 *
 * Exports: createWorkshopOfMind({ pool, callAI })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const VALID_SESSION_TYPES = new Set([
  'performance_rehearsal',
  'future_self_meeting',
  'goal_crystallization',
  'healing_visualization',
  'morning_activation',
  'evening_integration',
]);

// Typical turn counts per session type
const SESSION_TURN_TARGET = {
  performance_rehearsal: 10,
  future_self_meeting:   12,
  goal_crystallization:  10,
  healing_visualization: 10,
  morning_activation:    6,
  evening_integration:   8,
};

const SYSTEM_PROMPT =
  `You are a guided visualization facilitator. Your role is to guide a person into a calming, focused mental state where they can access their own inner clarity.

Your language:
- Calm, measured, present-tense
- Second person: "you are standing...", "you notice...", "you feel..."
- Sensory-rich: include sight, sound, sensation, temperature, space
- Never rushed. Let the experience breathe.
- Every prompt ends with a question that invites deeper presence — not analysis, but noticing

Your boundaries:
- You never make clinical claims
- You never diagnose anything
- You never tell the person what they should want or feel
- You guide; you never push
- If someone expresses distress, you slow down and return to grounding before going deeper

Your structure:
- Opening: 1-2 calming entry exchanges to settle into the space
- Middle: 6-8 exchanges guiding the visualization
- Close: 1-2 exchanges to integrate and bring the person back

For healing_visualization type only: include a gentle advisory note in your first response that this is a mental preparation tool, not therapy, and that you will not make any clinical claims.`;

const SESSION_TYPE_OPENINGS = {
  performance_rehearsal: {
    openingGuidance: "Let's prepare your nervous system, not just your mind. What you're about to experience is a full rehearsal — your brain won't distinguish between imagined and real preparation if we do this right.",
    firstPrompt: "Find a comfortable position where you won't be disturbed. Close your eyes if that's comfortable. Take one slow breath in... and let it out. Now: where in your body do you feel the most tension about this performance or conversation? Just notice it — don't fix anything yet. Where is it?",
  },
  future_self_meeting: {
    openingGuidance: "You're going to meet yourself — a version of you who made it through. Who figured it out. This isn't fantasy; it's your own possible self, made visible so you can have a conversation with it.",
    firstPrompt: "Settle in. Breathe. You're standing at the entrance to a space that belongs entirely to you — it can be anywhere: a forest clearing, a quiet room, a hillside. What do you see around you? Describe where you are.",
  },
  goal_crystallization: {
    openingGuidance: "Goals stated quickly are rarely true goals. We're going to slow way down so that what you actually want has a chance to surface — past what sounds right, past what you think you should want.",
    firstPrompt: "Take a breath. Now: you've said you want something. Hold that thing in mind lightly — don't analyze it yet. What emotion comes up when you imagine already having it? Just name the emotion. What do you feel?",
  },
  healing_visualization: {
    openingGuidance: "Important note: this is a mental preparation and emotional processing tool. It is not therapy and I'm not a clinician. What I can do is help you create inner space around something that's been heavy. Nothing I say is clinical advice.\n\nWith that clear — you don't have to carry this alone right now. Let's make some room.",
    firstPrompt: "Find stillness first. Breathe slowly — in through your nose, out through your mouth. You're safe right now, in this moment. If you could put the thing you're carrying down — just for the next few minutes — where would you set it? What does it look like when you put it down?",
  },
  morning_activation: {
    openingGuidance: "Five minutes. That's all this takes. You're going to set your nervous system before the day sets it for you.",
    firstPrompt: "Take one breath and arrive in this moment. The day hasn't started yet — it's still yours to shape. If you could walk into today as the most grounded, clear version of yourself: what does that person feel like in their body? Where do you feel that quality right now, even a trace of it?",
  },
  evening_integration: {
    openingGuidance: "The day is done. You don't have to carry all of it into tomorrow. Let's find out what to keep, what to set down, and what deserves a moment of acknowledgment before you rest.",
    firstPrompt: "Breathe out the day. Let your body settle. If the day had a texture — rough, smooth, jagged, soft — what texture was today? Just notice. What comes up?",
  },
};

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createWorkshopOfMind({ pool, callAI }) {

  // ── Session management ────────────────────────────────────────────────────

  async function fetchSession(userId, sessionId) {
    const { rows } = await pool.query(
      `SELECT * FROM workshop_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );
    if (!rows[0]) throw new Error(`Workshop session ${sessionId} not found`);
    return rows[0];
  }

  function parseMessages(session) {
    try {
      return Array.isArray(session.messages)
        ? session.messages
        : JSON.parse(session.messages || '[]');
    } catch {
      return [];
    }
  }

  // ── AI facilitation ───────────────────────────────────────────────────────

  async function callFacilitator(sessionType, messages, instruction) {
    if (!callAI) {
      return {
        guidance:    'Continue at your own pace. What do you notice?',
        nextPrompt:  'What else are you aware of right now?',
        complete:    false,
      };
    }

    const turnTarget = SESSION_TURN_TARGET[sessionType] || 10;
    const userTurns  = messages.filter(m => m.role === 'user').length;
    const isNearEnd  = userTurns >= turnTarget - 2;

    const historyText = messages
      .map(m => `${m.role === 'user' ? 'Person' : 'Facilitator'}: ${m.content}`)
      .join('\n');

    const prompt =
      `${SYSTEM_PROMPT}

Session type: ${sessionType}
Exchange count: ${userTurns} of approximately ${turnTarget}
${isNearEnd ? 'NOTE: This session is nearing completion. Begin guiding toward closure and integration.' : ''}

Session history:
${historyText}

${instruction}

Respond with JSON:
{
  "guidance": "A brief reflective observation (1-2 sentences max) that acknowledges what they shared",
  "nextPrompt": "The next facilitation question or invitation — sensory-rich, present-tense, ends with a question",
  "complete": ${isNearEnd ? 'true if this should be the last exchange' : 'false'}
}`;

    try {
      const raw    = await callAI(prompt);
      const text   = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
      return {
        guidance:   parsed.guidance   || '',
        nextPrompt: parsed.nextPrompt || 'What do you notice now?',
        complete:   Boolean(parsed.complete) || false,
      };
    } catch {
      return {
        guidance:   'Stay with what came up.',
        nextPrompt: 'What do you notice right now — in your body, your mind, or both?',
        complete:   isNearEnd,
      };
    }
  }

  async function generateClose(sessionType, messages) {
    if (!callAI) {
      return {
        insight:       'Something shifted in this session.',
        anchorPhrase:  'I know what I am capable of.',
        integration:   'Carry this awareness into your next action.',
      };
    }

    const historyText = messages
      .slice(-6)  // Use last 6 messages for closing context
      .map(m => `${m.role === 'user' ? 'Person' : 'Facilitator'}: ${m.content}`)
      .join('\n');

    const prompt =
      `You are closing a ${sessionType} Workshop of the Mind session.

Recent exchange:
${historyText}

Generate a closing integration. Return JSON:
{
  "insight": "The key thing that surfaced in this session — one sentence, specific to what they shared",
  "anchorPhrase": "A short phrase (5-10 words) they can say to themselves to re-access this state or insight. Something like 'I remember what I am capable of' or 'I know what I want now.'",
  "integration": "A practical bridge from this visualization to real action — specific, one sentence. NOT 'keep working on this' — something concrete."
}`;

    try {
      const raw    = await callAI(prompt);
      const text   = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
      return {
        insight:      parsed.insight      || 'Something shifted in this session.',
        anchorPhrase: parsed.anchorPhrase || 'I am ready.',
        integration:  parsed.integration  || 'Carry this into your next action.',
      };
    } catch {
      return {
        insight:       'Something shifted in this session.',
        anchorPhrase:  'I know what I am capable of.',
        integration:   'Carry this awareness into your next action.',
      };
    }
  }

  // ── Public methods ────────────────────────────────────────────────────────

  /**
   * Start a new workshop session.
   */
  async function startSession(userId, { sessionType, context, intention }) {
    if (!VALID_SESSION_TYPES.has(sessionType)) {
      throw new Error(`Invalid session_type. Valid: ${[...VALID_SESSION_TYPES].join(', ')}`);
    }

    const opening = SESSION_TYPE_OPENINGS[sessionType];

    // Initial facilitator turn
    const initialMessages = [
      {
        role:       'facilitator',
        content:    `${opening.openingGuidance}\n\n${opening.firstPrompt}`,
        created_at: new Date().toISOString(),
      },
    ];

    const { rows } = await pool.query(
      `INSERT INTO workshop_sessions
         (user_id, session_type, context, intention, status, messages)
       VALUES ($1, $2, $3, $4, 'active', $5)
       RETURNING id`,
      [userId, sessionType, context || null, intention || null, JSON.stringify(initialMessages)],
    );

    return {
      sessionId:       rows[0].id,
      openingGuidance: opening.openingGuidance,
      firstPrompt:     opening.firstPrompt,
    };
  }

  /**
   * Send a user response and receive next guidance.
   */
  async function sendResponse(userId, sessionId, userResponse) {
    const session  = await fetchSession(userId, sessionId);
    if (session.status !== 'active') {
      throw new Error(`Session ${sessionId} is ${session.status}, not active`);
    }

    const messages = parseMessages(session);

    // Append user message
    messages.push({
      role:       'user',
      content:    userResponse,
      created_at: new Date().toISOString(),
    });

    // Get facilitator response
    const result = await callFacilitator(
      session.session_type,
      messages,
      `The person just responded. Acknowledge what they shared and guide them deeper, or begin closing if near the end.`,
    );

    // Append facilitator message
    messages.push({
      role:       'facilitator',
      content:    result.complete
        ? result.guidance  // closing exchange — don't append a new prompt
        : `${result.guidance}\n\n${result.nextPrompt}`,
      created_at: new Date().toISOString(),
    });

    // Persist
    await pool.query(
      `UPDATE workshop_sessions SET messages = $1 WHERE id = $2`,
      [JSON.stringify(messages), sessionId],
    );

    return {
      guidance:   result.guidance,
      nextPrompt: result.complete ? null : result.nextPrompt,
      complete:   result.complete,
    };
  }

  /**
   * Close a session and extract insight + anchor phrase.
   */
  async function closeSession(userId, sessionId) {
    const session  = await fetchSession(userId, sessionId);
    const messages = parseMessages(session);

    const closing = await generateClose(session.session_type, messages);

    await pool.query(
      `UPDATE workshop_sessions
       SET status = 'completed', ended_at = now(),
           anchor_phrase = $1, insight = $2, integration_notes = $3
       WHERE id = $4`,
      [closing.anchorPhrase, closing.insight, closing.integration, sessionId],
    );

    return closing;
  }

  /**
   * Get recent session history.
   */
  async function getSessionHistory(userId, limit = 10) {
    const { rows } = await pool.query(
      `SELECT id, session_type, context, intention, anchor_phrase, insight,
              integration_notes, status, started_at, ended_at,
              jsonb_array_length(messages::jsonb) AS message_count
       FROM workshop_sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return rows;
  }

  /**
   * Get all anchor phrases from past sessions — quick re-access toolkit.
   */
  async function getAnchorPhrases(userId) {
    const { rows } = await pool.query(
      `SELECT id, session_type, anchor_phrase, insight, started_at
       FROM workshop_sessions
       WHERE user_id = $1
         AND anchor_phrase IS NOT NULL
         AND status = 'completed'
       ORDER BY started_at DESC`,
      [userId],
    );
    return rows;
  }

  return {
    startSession,
    sendResponse,
    closeSession,
    getSessionHistory,
    getAnchorPhrases,
  };
}
