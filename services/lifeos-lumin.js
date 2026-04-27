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
 * Context: `buildContextSnapshot(userId, { mode })` loads base LifeOS slice + mode-specific DB hints (finance transactions, health rows, relationship checkins, etc.).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createResponseVariety } from './response-variety.js';

const CONTEXT_WINDOW = 20; // last N messages to send as context

/** Prepended to every Lumin system prompt — North Star Article II §2.6 + AMENDMENT_21 epistemic contract + prompts/00-LIFEOS-AGENT-CONTRACT.md */
const LUMIN_EPISTEMIC_CONTRACT = `Non-negotiable (North Star §2.6 — no lies, no misleading; law is mandatory):
- Never lie; never mislead (including confident tone when evidence is missing). If a fact is not verified from context, say so and label uncertainty plainly.
- These rules are not optional for speed: no cutting corners, no lazy skips — if you cannot verify, say you cannot; do not guess as fact.
- Never let the user operate on a misunderstanding: the moment you detect a wrong premise, missing piece, or ambiguous term, correct it before continuing with advice or plans.
- The user may not know what they don't know — proactively fill gaps (assumptions, risks, what is implemented in LifeOS vs backlog-only in docs).
- Relational depth over time: from this thread plus stored LifeOS context only, you may occasionally weave in one short optional reflective question or a gentle mirroring statement (e.g. values or relationships) when it fits naturally — never an interrogation, never a mandatory onboarding interview, always easy to ignore or decline. Never invent private facts or claim continuous ambient surveillance; only ground mirroring in what the user (or SSOT context payload) has actually shared.`;

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
  const parts = [LUMIN_EPISTEMIC_CONTRACT, base];

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
  const variety = createResponseVariety({ pool, logger });

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

    // Load LifeOS context snapshot (non-blocking, best-effort; mode enriches domain data)
    const contextData = await buildContextSnapshot(userId, { mode: thread.mode || 'general' });

    // Build base system prompt with mode + context
    const baseSystemPrompt = buildSystemPrompt(thread.mode, contextData, null, null);

    // Enrich with response variety + communication profile (both non-fatal)
    const { systemPrompt, styles } = await variety.wrapPromptWithVariety({
      userId,
      systemPrompt: baseSystemPrompt,
      userPrompt:   userMessage,
      callAI,
    });

    // Build prompt thread
    const historyText = history
      .slice(0, -1) // exclude the message we just saved (it's the current turn)
      .map(m => `${m.role === 'user' ? 'User' : 'Lumin'}: ${m.content}`)
      .join('\n\n');

    const fullPrompt = `${systemPrompt}\n\n${historyText ? `--- Conversation ---\n${historyText}\n\n` : ''}User: ${userMessage}\n\nLumin:`;

    const aiReply = await callAI(fullPrompt);

    // Log the styles used so variety engine learns what not to repeat
    await variety.logResponse({
      userId,
      styles:          styles || {},
      responsePreview: aiReply,
      context:         thread.mode,
    });

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
  async function buildContextSnapshot(userId, { mode: threadMode = 'general' } = {}) {
    const mode = (threadMode || 'general').toLowerCase();
    const ctx = { thread_mode: mode };
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

      // Open commitments (status values vary by vintage DB)
      pool.query(
        `SELECT COUNT(*) as count FROM commitments WHERE user_id = $1
           AND status IN ('active','open','in_progress')`,
        [userId]
      ).then(r => { ctx.active_commitments = parseInt(r.rows[0]?.count) || 0; }),

      // Latest joy score
      pool.query(
        `SELECT joy_score AS score, notes FROM joy_checkins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ).then(r => { ctx.latest_joy = r.rows[0] || null; }),

      // User profile basics
      pool.query(
        `SELECT display_name, truth_style, tier FROM lifeos_users WHERE id = $1`,
        [userId]
      ).then(r => {
        ctx.user = r.rows[0] || null;
      }),

      pool.query(
        `SELECT signals, created_at
           FROM lifeos_ambient_snapshots
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 6`,
        [userId],
      ).then((r) => {
        ctx.ambient_hints = (r.rows || []).map((row) => ({
          captured_at: row.created_at,
          ...(row.signals && typeof row.signals === 'object' ? row.signals : {}),
        }));
      }).catch(() => { ctx.ambient_hints = []; }),
    ]);

    await loadModeContextSnapshot(userId, mode, ctx, today);
    return ctx;
  }

  /** Extra DB slices per Lumin thread mode (best-effort; missing tables = omitted). */
  async function loadModeContextSnapshot(userId, mode, ctx, today) {
    const tasks = [];

    if (mode === 'mirror' || mode === 'coach') {
      tasks.push(
        pool.query(
          `SELECT checkin_date, weather, intensity, valence, depletion_tags
             FROM daily_emotional_checkins
            WHERE user_id = $1
            ORDER BY checkin_date DESC
            LIMIT 1`,
          [userId]
        ).then((r) => { ctx.latest_emotional_checkin = r.rows[0] || null; })
          .catch(() => { ctx.latest_emotional_checkin = null; })
      );
    }

    if (mode === 'finance') {
      tasks.push(
        pool.query(
          `SELECT t.id, t.amount, t.txn_date, t.memo, c.name AS category_name
             FROM lifeos_finance_transactions t
             LEFT JOIN lifeos_finance_categories c ON c.id = t.category_id
            WHERE t.user_id = $1
            ORDER BY t.txn_date DESC, t.id DESC
            LIMIT 8`,
          [userId]
        ).then((r) => { ctx.finance_recent_transactions = r.rows; })
          .catch(() => { ctx.finance_recent_transactions = []; })
      );
      const ym = today.slice(0, 7);
      tasks.push(
        pool.query(
          `SELECT COALESCE(SUM(amount),0)::numeric(14,2) AS net_month
             FROM lifeos_finance_transactions
            WHERE user_id = $1 AND to_char(txn_date, 'YYYY-MM') = $2`,
          [userId, ym]
        ).then((r) => { ctx.finance_month_net = r.rows[0] || { net_month: 0 }; })
          .catch(() => { ctx.finance_month_net = { net_month: 0 }; })
      );
    }

    if (mode === 'health') {
      tasks.push(
        pool.query(
          `SELECT metric, value, unit, recorded_at
             FROM wearable_data
            WHERE user_id = $1
            ORDER BY recorded_at DESC
            LIMIT 24`,
          [userId]
        ).then((r) => { ctx.wearable_recent = r.rows; })
          .catch(() => { ctx.wearable_recent = []; })
      );
      tasks.push(
        pool.query(
          `SELECT hrv_ms, sleep_hours, steps, source, recorded_at
             FROM health_readings
            WHERE user_id = $1
            ORDER BY recorded_at DESC
            LIMIT 5`,
          [userId]
        ).then((r) => { ctx.health_readings_recent = r.rows; })
          .catch(() => { ctx.health_readings_recent = []; })
      );
    }

    if (mode === 'relationship') {
      tasks.push(
        pool.query(
          `SELECT id, checkin_date, connection_score, conflict_level, what_is_working, what_needs_attention
             FROM relationship_checkins
            WHERE initiator_user_id = $1 OR partner_user_id = $1
            ORDER BY checkin_date DESC, created_at DESC
            LIMIT 5`,
          [userId]
        ).then((r) => { ctx.relationship_checkins = r.rows; })
          .catch(() => { ctx.relationship_checkins = []; })
      );
      tasks.push(
        pool.query(
          `SELECT id, user_id_a, user_id_b, relationship, active
             FROM household_links
            WHERE (user_id_a = $1 OR user_id_b = $1) AND active = true
            LIMIT 5`,
          [userId]
        ).then((r) => { ctx.household_links = r.rows; })
          .catch(() => { ctx.household_links = []; })
      );
    }

    if (mode === 'planning') {
      tasks.push(
        pool.query(
          `SELECT id, title, due_at, status, weight
             FROM commitments
            WHERE user_id = $1
              AND status IN ('active','open','in_progress')
              AND due_at IS NOT NULL
            ORDER BY due_at ASC
            LIMIT 10`,
          [userId]
        ).then((r) => { ctx.upcoming_commitments = r.rows; })
          .catch(() => { ctx.upcoming_commitments = []; })
      );
    }

    if (!tasks.length) return;
    await Promise.allSettled(tasks);
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
