/**
 * services/live-copilot.js
 *
 * Live CoPilot Sessions — real-time AI-assisted coaching during an active
 * conversation, decision, or negotiation. User gets live support that floats
 * above whatever they're doing without requiring them to leave the context.
 *
 * Session Types:
 *   - 'negotiation'    — salary, deal, or contract conversation in progress
 *   - 'hard_conversation' — a difficult conversation with someone important
 *   - 'decision'       — real-time guidance as a decision unfolds
 *   - 'presentation'   — live coaching during a pitch or talk
 *   - 'interview'      — job or client interview support
 *
 * How it works:
 *   1. User opens a session (declares type + context)
 *   2. User sends messages during the live event ("they just said X, what do I do?")
 *   3. System returns immediate tactical guidance (sub-5-second response target)
 *   4. Session closes; key moments and insights are extracted
 *   5. Session becomes a reference for future similar situations
 *
 * This service uses cheaper/faster models for sub-5s latency.
 * Heavy analysis uses the council only at session close.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const SESSION_TYPES = ['negotiation', 'hard_conversation', 'decision', 'presentation', 'interview', 'other'];

const SYSTEM_PROMPTS = {
  negotiation:
    'You are a live negotiation copilot. Respond in under 60 words. ' +
    'Give one specific tactical move, not general advice. ' +
    'Be direct. No preamble. Format: [What to say or do] | [Why it works]',

  hard_conversation:
    'You are a live conversation copilot. Respond in under 60 words. ' +
    'Help the user stay grounded and clear. ' +
    'One move at a time. Never escalate. Format: [What to say] | [What to hold in mind]',

  decision:
    'You are a live decision copilot. Respond in under 60 words. ' +
    'Clarify the most important factor being ignored. ' +
    'Ask one sharp question or name one non-obvious risk. Be direct.',

  presentation:
    'You are a live presentation copilot. Respond in under 60 words. ' +
    'Give one immediate, concrete adjustment. Read the room — confidence, pacing, clarity. ' +
    'Format: [Do this now] | [Why]',

  interview:
    'You are a live interview copilot. Respond in under 60 words. ' +
    'Help the user answer well, highlight relevant strengths, handle hard questions. ' +
    'Be concrete and fast. Format: [Answer this way] | [Key point to emphasize]',

  other:
    'You are a live copilot. Respond in under 60 words. ' +
    'Give one immediate, useful move. Be direct and specific.',
};

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createLiveCopilot({ pool, callAI }) {
  /**
   * Start a new live CoPilot session.
   */
  async function startSession(userId, { sessionType, context, goal }) {
    if (!SESSION_TYPES.includes(sessionType)) {
      throw new Error(`Unknown session type: ${sessionType}. Use: ${SESSION_TYPES.join(', ')}`);
    }

    const result = await pool.query(
      `INSERT INTO copilot_sessions (user_id, session_type, context, goal, started_at, status)
       VALUES ($1, $2, $3, $4, now(), 'active')
       RETURNING id, started_at`,
      [userId, sessionType, context || null, goal || null]
    );

    const session = result.rows[0];

    // Store opening message in session log
    const openingPrompt = buildOpeningMessage(sessionType, context, goal);
    await pool.query(
      `INSERT INTO copilot_messages (session_id, role, content, sent_at)
       VALUES ($1, 'system', $2, now())`,
      [session.id, openingPrompt]
    ).catch(() => {});

    return {
      session_id: session.id,
      session_type: sessionType,
      started_at: session.started_at,
      opening: openingPrompt,
      status: 'active',
    };
  }

  /**
   * Send a live message during a session and get immediate guidance.
   * Target: sub-5 second response.
   */
  async function sendMessage(userId, sessionId, userMessage) {
    // Verify session belongs to user and is active
    const session = await pool.query(
      `SELECT id, session_type, context, goal, status
       FROM copilot_sessions
       WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [sessionId, userId]
    ).then(r => r.rows[0]).catch(() => null);

    if (!session) {
      throw new Error('Session not found or no longer active');
    }

    // Store user message
    await pool.query(
      `INSERT INTO copilot_messages (session_id, role, content, sent_at)
       VALUES ($1, 'user', $2, now())`,
      [sessionId, userMessage]
    ).catch(() => {});

    // Get recent messages for context (last 6 turns)
    const recentMessages = await pool.query(
      `SELECT role, content FROM copilot_messages
       WHERE session_id = $1 AND role != 'system'
       ORDER BY sent_at DESC LIMIT 6`,
      [sessionId]
    ).then(r => r.rows.reverse()).catch(() => []);

    let guidance = null;

    if (callAI) {
      try {
        const systemPrompt = SYSTEM_PROMPTS[session.session_type] || SYSTEM_PROMPTS.other;
        const contextLine = session.context ? `\nContext: ${session.context}` : '';
        const goalLine = session.goal ? `\nGoal: ${session.goal}` : '';

        const historyText = recentMessages
          .map(m => `${m.role === 'user' ? 'User' : 'Copilot'}: ${m.content}`)
          .join('\n');

        const fullPrompt =
          `${systemPrompt}${contextLine}${goalLine}\n\n` +
          `Conversation history:\n${historyText}\n\n` +
          `Now the user says: "${userMessage}"\n\nYour guidance:`;

        guidance = await callAI(fullPrompt);
      } catch (err) {
        guidance = "I'm having trouble connecting right now. Trust your instincts — you know more than you think.";
      }
    } else {
      guidance = "AI not available. Trust what you already know about this situation.";
    }

    // Store guidance
    await pool.query(
      `INSERT INTO copilot_messages (session_id, role, content, sent_at)
       VALUES ($1, 'copilot', $2, now())`,
      [sessionId, guidance]
    ).catch(() => {});

    return {
      session_id: sessionId,
      guidance,
      message_count: recentMessages.length + 1,
    };
  }

  /**
   * Close a session and extract key insights.
   */
  async function closeSession(userId, sessionId, { outcome, notes } = {}) {
    const session = await pool.query(
      `SELECT id, session_type, context, goal, started_at
       FROM copilot_sessions
       WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [sessionId, userId]
    ).then(r => r.rows[0]).catch(() => null);

    if (!session) {
      throw new Error('Session not found or already closed');
    }

    // Get all messages for insight extraction
    const allMessages = await pool.query(
      `SELECT role, content FROM copilot_messages
       WHERE session_id = $1 ORDER BY sent_at ASC`,
      [sessionId]
    ).then(r => r.rows).catch(() => []);

    let insights = null;

    if (callAI && allMessages.length > 2) {
      try {
        const transcript = allMessages
          .filter(m => m.role !== 'system')
          .map(m => `${m.role === 'user' ? 'User' : 'Copilot'}: ${m.content}`)
          .join('\n');

        const insightPrompt =
          `This was a live ${session.session_type} copilot session. ` +
          `Context: ${session.context || 'not specified'}. Goal: ${session.goal || 'not specified'}. ` +
          `Outcome: ${outcome || 'not specified'}.\n\n` +
          `Session transcript:\n${transcript}\n\n` +
          `Extract 2-3 specific insights about how this person handles ${session.session_type} situations — ` +
          `patterns to build on, blind spots that showed up, or moments of real strength. ` +
          `Be concrete and specific to what happened. Not generic. ` +
          `Format as JSON: { "strengths": ["..."], "patterns_to_watch": ["..."], "what_worked": "..." }`;

        const raw = await callAI(insightPrompt);
        try {
          insights = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
        } catch (_) {
          insights = { summary: raw };
        }
      } catch (_) { /* insight extraction is best-effort */ }
    }

    // Close the session
    await pool.query(
      `UPDATE copilot_sessions
       SET status = 'closed', ended_at = now(), outcome = $1, outcome_notes = $2, insights = $3
       WHERE id = $4`,
      [outcome || null, notes || null, insights ? JSON.stringify(insights) : null, sessionId]
    );

    return {
      session_id: sessionId,
      session_type: session.session_type,
      duration_minutes: Math.round((Date.now() - new Date(session.started_at)) / 60000),
      insights,
      status: 'closed',
    };
  }

  /**
   * Get session history for a user.
   */
  async function getSessionHistory(userId, limit = 20) {
    const rows = await pool.query(
      `SELECT id, session_type, context, goal, outcome, started_at, ended_at, status,
              insights, outcome_notes
       FROM copilot_sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [userId, limit]
    ).then(r => r.rows).catch(() => []);

    return rows;
  }

  /**
   * Get messages in an active or closed session.
   */
  async function getSessionMessages(userId, sessionId) {
    const session = await pool.query(
      `SELECT id FROM copilot_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    ).then(r => r.rows[0]).catch(() => null);

    if (!session) throw new Error('Session not found');

    const messages = await pool.query(
      `SELECT role, content, sent_at FROM copilot_messages
       WHERE session_id = $1 AND role != 'system'
       ORDER BY sent_at ASC`,
      [sessionId]
    ).then(r => r.rows);

    return messages;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  function buildOpeningMessage(sessionType, context, goal) {
    const openings = {
      negotiation: `Live negotiation mode active. ${goal ? `Your goal: ${goal}.` : ''} Send me what they say or ask — I'll give you the next move.`,
      hard_conversation: `I'm here with you for this conversation. ${context ? `I know the context: ${context}.` : ''} Tell me what's happening and I'll help you navigate it.`,
      decision: `Decision mode. ${context ? `Situation: ${context}.` : ''} Tell me what's in front of you — I'll help you see it more clearly.`,
      presentation: `Presentation mode active. ${context ? `Context: ${context}.` : ''} I'm watching with you — tell me what's happening and I'll coach in real-time.`,
      interview: `Interview copilot on. ${context ? `Role/company: ${context}.` : ''} Share their questions or your answers — I'll help you land them well.`,
      other: `CoPilot active. ${context ? `Context: ${context}.` : ''} Tell me what's happening.`,
    };
    return openings[sessionType] || openings.other;
  }

  return {
    startSession,
    sendMessage,
    closeSession,
    getSessionHistory,
    getSessionMessages,
  };
}
