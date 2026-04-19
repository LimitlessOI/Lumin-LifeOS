/**
 * services/lifeos-lumin.js
 *
 * Lumin — LifeOS conversational AI
 *
 * Lumin is the AI you talk to anytime. Like Alexa, but it knows everything
 * about your life. You ask it anything. It answers as a trusted advisor with
 * full context from your LifeOS data — not a generic chatbot.
 *
 * Every response is shaped by the response variety engine and communication
 * profile so it doesn't sound the same every time and it learns what works for
 * the specific person it's talking to.
 *
 * Modes: general / mirror / coach / finance / relationship / health / planning
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const CONTEXT_WINDOW = 20; // last N messages to send as context

const MODE_SYSTEM_PROMPTS = {
  general: `You are Lumin, the LifeOS AI. You are not a generic assistant. You are a trusted advisor who knows this person's life deeply — their commitments, patterns, struggles, wins, and what they care about most. You speak plainly. You don't flatter. You help them think, not think for them. You remember what matters.`,

  mirror: `You are Lumin in Mirror mode — a reflective, honest space. The user is checking in with themselves. Ask clarifying questions. Reflect back what you hear. Surface patterns gently. Don't rush to solutions. Create space for the person to hear themselves.`,

  coach: `You are Lumin in Coach mode. The user wants to move something forward. Be directive. Ask powerful questions. Hold them to what they said they wanted. Don't let them off the hook without gently noting the escape. Help them identify the one next action.`,

  finance: `You are Lumin in Finance mode — clarity only, not advice. Help the user see their financial reality clearly. Reference their actual data when you have it. Never recommend specific investments. Help them think, not comply.`,

  relationship: `You are Lumin in Relationship mode. Be careful. Be impartial. You are not on the user's side against anyone — you are on the side of what's true and what's healthy for everyone involved. Reflect back what you hear. Don't take shots at the other party. Help the user see all sides.`,

  health: `You are Lumin in Health mode. You have access to the user's health data. Help them see patterns — sleep, energy, HRV trends, how they feel on different days. Recommend they consult their doctor for medical decisions. You provide insight, not diagnosis.`,

  planning: `You are Lumin in Planning mode. Help the user think through the week or goals ahead. Be concrete. Ask about blockers. Help them turn vague intentions into committed actions with dates. Surface what keeps getting deferred.`,
};

function buildSystemPrompt(mode, contextData, varietyGuidance, profileSummary) {
  const base = MODE_SYSTEM_PROMPTS[mode] || MODE_SYSTEM_PROMPTS.general;
  const parts = [base];

  if (profileSummary) {
    parts.push(`\nCommunication profile for this person:\n${profileSummary}`);
  }
  if (varietyGuidance) {
    parts.push(`\nResponse style guidance (apply this):\n${varietyGuidance}`);
  }
  if (contextData && Object.keys(contextData).length > 0) {
    parts.push(`\nCurrent LifeOS context:\n${JSON.stringify(contextData, null, 2)}`);
  }

  parts.push(`\nYour name is Lumin. You can be addressed as "Lumin" or "hey Lumin" or similar. Keep responses conversational — not essays unless the question calls for depth. No hollow openers like "Great question!" or "Certainly!"`);

  return parts.join('\n');
}

export function createLifeOSLumin({ pool, callAI, logger }) {
  const log = logger || console;

  // ── Thread management ────────────────────────────────────────────────────────

  async function createThread(userId, { mode = 'general', title = null } = {}) {
    const { rows: [thread] } = await pool.query(
      `INSERT INTO lumin_threads (user_id, mode, title) VALUES ($1, $2, $3) RETURNING *`,
      [userId, mode, title]
    );
    return thread;
  }

  async function listThreads(userId, { includeArchived = false, limit = 20 } = {}) {
    const { rows } = await pool.query(
      `SELECT t.*, COUNT(m.id) as message_count
       FROM lumin_threads t
       LEFT JOIN lumin_messages m ON m.thread_id = t.id
       WHERE t.user_id = $1 ${includeArchived ? '' : 'AND t.archived = FALSE'}
       GROUP BY t.id
       ORDER BY t.pinned DESC, t.last_message_at DESC NULLS LAST
       LIMIT $2`,
      [userId, Math.min(limit, 100)]
    );
    return rows;
  }

  async function getThread(threadId, userId) {
    const { rows: [thread] } = await pool.query(
      `SELECT * FROM lumin_threads WHERE id = $1 AND user_id = $2`,
      [threadId, userId]
    );
    return thread || null;
  }

  async function updateThread(threadId, userId, updates) {
    const allowed = ['title', 'mode', 'pinned', 'archived'];
    const fields  = Object.keys(updates).filter(k => allowed.includes(k));
    if (!fields.length) return null;
    const setClauses = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const { rows: [t] } = await pool.query(
      `UPDATE lumin_threads SET ${setClauses} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [threadId, userId, ...fields.map(f => updates[f])]
    );
    return t;
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  async function getMessages(threadId, { limit = 50, before = null } = {}) {
    const q = before
      ? `SELECT * FROM lumin_messages WHERE thread_id = $1 AND id < $3 ORDER BY created_at DESC LIMIT $2`
      : `SELECT * FROM lumin_messages WHERE thread_id = $1 ORDER BY created_at DESC LIMIT $2`;
    const params = before ? [threadId, limit, before] : [threadId, limit];
    const { rows } = await pool.query(q, params);
    return rows.reverse(); // chronological order for display
  }

  async function getPinnedMessages(threadId) {
    const { rows } = await pool.query(
      `SELECT * FROM lumin_messages WHERE thread_id = $1 AND pinned = TRUE ORDER BY created_at ASC`,
      [threadId]
    );
    return rows;
  }

  async function pinMessage(messageId, userId, pinned = true) {
    const { rows: [msg] } = await pool.query(
      `UPDATE lumin_messages SET pinned = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [pinned, messageId, userId]
    );
    return msg;
  }

  async function reactToMessage(messageId, userId, reaction) {
    const valid = ['thumbs_up', 'thumbs_down', null];
    if (!valid.includes(reaction)) throw Object.assign(new Error('Invalid reaction'), { status: 400 });
    const { rows: [msg] } = await pool.query(
      `UPDATE lumin_messages SET reaction = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [reaction, messageId, userId]
    );
    return msg;
  }

  async function searchMessages(userId, query, { limit = 20 } = {}) {
    const { rows } = await pool.query(
      `SELECT m.*, t.mode, t.title as thread_title
       FROM lumin_messages m
       JOIN lumin_threads t ON t.id = m.thread_id
       WHERE m.user_id = $1
         AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)
       ORDER BY m.created_at DESC LIMIT $3`,
      [userId, query, Math.min(limit, 50)]
    );
    return rows;
  }

  // ── Send a message + get Lumin's reply ───────────────────────────────────────

  async function chat(threadId, userId, userMessage, { contentType = 'text' } = {}) {
    if (!callAI) throw new Error('AI not available');

    const thread = await getThread(threadId, userId);
    if (!thread) throw Object.assign(new Error('Thread not found'), { status: 404 });

    // Persist user message
    const { rows: [userMsg] } = await pool.query(
      `INSERT INTO lumin_messages (thread_id, user_id, role, content, content_type)
       VALUES ($1, $2, 'user', $3, $4) RETURNING *`,
      [threadId, userId, userMessage, contentType]
    );

    // Auto-title thread from first message
    if (!thread.title) {
      const shortTitle = userMessage.slice(0, 60).trim();
      await pool.query(
        `UPDATE lumin_threads SET title = $1 WHERE id = $2`,
        [shortTitle, threadId]
      );
    }

    // Load conversation history for context window
    const history = await getMessages(threadId, { limit: CONTEXT_WINDOW });

    // Load LifeOS context snapshot (non-blocking, best-effort)
    const contextData = await buildContextSnapshot(userId);

    // Try to load variety + profile guidance (both services may not exist — non-fatal)
    let varietyGuidance = null;
    let profileSummary  = null;
    try {
      const { rows: [profile] } = await pool.query(
        `SELECT ai_summary FROM communication_profiles WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      if (profile?.ai_summary) profileSummary = profile.ai_summary;
    } catch { /* non-fatal */ }

    const systemPrompt = buildSystemPrompt(thread.mode, contextData, varietyGuidance, profileSummary);

    // Build prompt thread
    const historyText = history
      .slice(0, -1) // exclude the message we just saved (it's the current turn)
      .map(m => `${m.role === 'user' ? 'User' : 'Lumin'}: ${m.content}`)
      .join('\n\n');

    const fullPrompt = `${systemPrompt}\n\n${historyText ? `--- Conversation ---\n${historyText}\n\n` : ''}User: ${userMessage}\n\nLumin:`;

    const aiReply = await callAI(fullPrompt);

    // Persist Lumin's reply
    const { rows: [assistantMsg] } = await pool.query(
      `INSERT INTO lumin_messages (thread_id, user_id, role, content)
       VALUES ($1, $2, 'assistant', $3) RETURNING *`,
      [threadId, userId, aiReply]
    );

    // Update thread last_message_at
    await pool.query(
      `UPDATE lumin_threads SET last_message_at = NOW() WHERE id = $1`,
      [threadId]
    );

    return { user_message: userMsg, reply: assistantMsg };
  }

  // ── LifeOS context snapshot for Lumin ─────────────────────────────────────────
  async function buildContextSnapshot(userId) {
    const ctx = {};
    const today = new Date().toISOString().slice(0, 10);

    await Promise.allSettled([
      // Today's MITs
      pool.query(
        `SELECT position, title, status FROM daily_mits WHERE user_id = $1 AND mit_date = $2 ORDER BY position`,
        [userId, today]
      ).then(r => { ctx.todays_mits = r.rows; }),

      // Latest scorecard
      pool.query(
        `SELECT score, grade, scorecard_date FROM daily_scorecards WHERE user_id = $1 ORDER BY scorecard_date DESC LIMIT 1`,
        [userId]
      ).then(r => { ctx.latest_score = r.rows[0] || null; }),

      // Active commitments count
      pool.query(
        `SELECT COUNT(*) as count FROM commitments WHERE user_id = $1 AND status = 'active'`,
        [userId]
      ).then(r => { ctx.active_commitments = parseInt(r.rows[0]?.count) || 0; }),

      // Latest joy score
      pool.query(
        `SELECT score, notes FROM joy_checkins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ).then(r => { ctx.latest_joy = r.rows[0] || null; }),

      // User profile basics
      pool.query(
        `SELECT display_name, truth_style, tier FROM lifeos_users WHERE id = $1`,
        [userId]
      ).then(r => {
        ctx.user = r.rows[0] || null;
      }),
    ]);

    return ctx;
  }

  // ── Get or create the "default" general thread for a user ─────────────────────
  async function getOrCreateDefaultThread(userId) {
    const { rows: existing } = await pool.query(
      `SELECT * FROM lumin_threads
       WHERE user_id = $1 AND mode = 'general' AND archived = FALSE
       ORDER BY last_message_at DESC NULLS LAST LIMIT 1`,
      [userId]
    );
    if (existing.length) return existing[0];
    return createThread(userId, { mode: 'general', title: 'Lumin' });
  }

  return {
    createThread,
    listThreads,
    getThread,
    updateThread,
    getMessages,
    getPinnedMessages,
    pinMessage,
    reactToMessage,
    searchMessages,
    chat,
    getOrCreateDefaultThread,
    buildContextSnapshot,
  };
}
