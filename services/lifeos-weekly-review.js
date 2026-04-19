/**
 * services/lifeos-weekly-review.js
 *
 * LifeOS Weekly Review — AI narrative + interactive conversation
 *
 * Every week the system generates a personal letter for each user: what happened,
 * what patterns it noticed, where you were strong, where you drifted, one thing
 * to carry forward. No action required — it just lands.
 *
 * But if you want to go deeper, you can open a conversation. Ask "why do you
 * think that?" Push back. Say "that's not right, here's what actually happened."
 * Make a commitment right there in the conversation. Change a priority. The
 * system listens, responds, extracts agreed actions, and writes them back.
 *
 * The conversation is grounded in that week's data snapshot — not general AI
 * chat. Every response the AI gives has the actual numbers behind it.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const WEEK_LETTER_PROMPT = ({ displayName, weekStr, snapshot }) => `You are the LifeOS system writing a personal weekly review letter for ${displayName}.

Week: ${weekStr}
Data from this week:
${JSON.stringify(snapshot, null, 2)}

Write a personal, honest, warm weekly letter — 4–6 paragraphs. Structure:
1. What you observed this week (the actual data, made human)
2. Where you were strong — specific, evidence-based
3. Where you drifted — honest, not harsh, just true
4. One pattern you noticed that spans multiple areas
5. One thing to carry into next week — a single clear intention

Rules:
- Write directly to ${displayName} in second person ("you")
- Ground every observation in the data — no generic coaching
- No bullet points. No headers. Prose only.
- No moralizing. No "you should." Only "here's what the data shows."
- End with one sentence that feels like something a trusted friend who knows everything would say

Return only the letter. No preamble.`;

const CONVERSATION_SYSTEM_PROMPT = ({ displayName, weekStr, snapshot, narrative }) => `You are LifeOS, a personal operating system having a real conversation with ${displayName} about their week of ${weekStr}.

You already wrote them this weekly review:
---
${narrative}
---

The data behind it:
${JSON.stringify(snapshot, null, 2)}

You are now in a live conversation. The user may:
- Ask you to explain an observation ("why do you think that?")
- Challenge something you said ("that's not accurate, here's what happened")
- Ask about something you didn't mention
- Make a commitment or state a new intention
- Ask you to help them think through something from the week
- Change a priority or goal for next week

How to respond:
- Stay grounded in the data — you have receipts
- Accept corrections gracefully — you don't know everything they know
- When they state a commitment or intention, acknowledge it clearly and confirm you've noted it
- Keep responses conversational — 2–5 sentences unless they ask for depth
- Never be preachy. Never repeat the same point twice.
- If they make a decision or commitment, end your message with: ACTION: {type}|{brief description} so it can be extracted

ACTION types: create_commitment | update_goal | set_priority | add_note | log_moment | schedule_event`;

const ACTION_EXTRACT_PROMPT = (content) => `Extract any actions agreed to in this conversation message.
Return a JSON array of action objects (empty array if none).
Each object: { action_type, payload }

action_type options:
- create_commitment: payload = { title, due_date (optional), remind_interval (optional, e.g. "24 hours") }
- update_goal: payload = { goal_description, change }
- set_priority: payload = { area, priority_level, notes }
- add_note: payload = { content }
- log_moment: payload = { title, trait (integrity|generosity|courage), description }
- schedule_event: payload = { title, date, duration_minutes }

Message: "${content.replace(/"/g, '\\"')}"

Return ONLY valid JSON array. No markdown.`;

export function createLifeOSWeeklyReview({ pool, callAI, logger }) {
  const log = logger || console;

  // ── Week boundary helpers ────────────────────────────────────────────────────
  function weekBounds(referenceDate = new Date()) {
    const d = new Date(referenceDate);
    // Monday of the week
    const day = d.getUTCDay(); // 0=Sun
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + diffToMon);
    monday.setUTCHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);
    return {
      start: monday.toISOString().slice(0, 10),
      end:   sunday.toISOString().slice(0, 10),
      label: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };
  }

  // ── Collect data snapshot for the week ──────────────────────────────────────
  async function buildSnapshot(userId, weekStart, weekEnd) {
    const snap = {};

    // Joy check-ins
    try {
      const { rows } = await pool.query(
        `SELECT AVG(score)::numeric(4,1) as avg_score, COUNT(*) as count
         FROM joy_checkins
         WHERE user_id = $1 AND created_at::date BETWEEN $2 AND $3`,
        [userId, weekStart, weekEnd]
      );
      snap.joy = { avg: parseFloat(rows[0]?.avg_score) || null, count: parseInt(rows[0]?.count) || 0 };
    } catch { snap.joy = null; }

    // Integrity score
    try {
      const { rows } = await pool.query(
        `SELECT AVG(overall_score)::numeric(4,1) as avg_score, COUNT(*) as count
         FROM integrity_scores
         WHERE user_id = $1 AND created_at::date BETWEEN $2 AND $3`,
        [userId, weekStart, weekEnd]
      );
      snap.integrity = { avg: parseFloat(rows[0]?.avg_score) || null, count: parseInt(rows[0]?.count) || 0 };
    } catch { snap.integrity = null; }

    // Commitments
    try {
      const { rows } = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'active')    as active,
           COUNT(*) FILTER (WHERE status = 'completed'
             AND updated_at::date BETWEEN $2 AND $3)    as completed_this_week,
           COUNT(*) FILTER (WHERE status = 'missed'
             AND updated_at::date BETWEEN $2 AND $3)    as missed_this_week
         FROM commitments
         WHERE user_id = $1`,
        [userId, weekStart, weekEnd]
      );
      snap.commitments = {
        active:            parseInt(rows[0]?.active) || 0,
        completed_this_week: parseInt(rows[0]?.completed_this_week) || 0,
        missed_this_week:  parseInt(rows[0]?.missed_this_week) || 0,
      };
    } catch { snap.commitments = null; }

    // Health (latest wearable reading in window)
    try {
      const { rows } = await pool.query(
        `SELECT AVG(hrv_ms)::numeric(5,1) as avg_hrv,
                AVG(sleep_hours)::numeric(4,2) as avg_sleep,
                AVG(steps)::numeric(8,0) as avg_steps
         FROM health_readings
         WHERE user_id = $1 AND recorded_at::date BETWEEN $2 AND $3`,
        [userId, weekStart, weekEnd]
      );
      snap.health = {
        avg_hrv:   parseFloat(rows[0]?.avg_hrv) || null,
        avg_sleep: parseFloat(rows[0]?.avg_sleep) || null,
        avg_steps: parseInt(rows[0]?.avg_steps) || null,
      };
    } catch { snap.health = null; }

    // Emotional pattern signals
    try {
      const { rows } = await pool.query(
        `SELECT pattern_type, COUNT(*) as count
         FROM emotional_patterns
         WHERE user_id = $1 AND detected_at::date BETWEEN $2 AND $3
         GROUP BY pattern_type ORDER BY count DESC LIMIT 5`,
        [userId, weekStart, weekEnd]
      );
      snap.emotional_patterns = rows.map(r => ({ type: r.pattern_type, count: parseInt(r.count) }));
    } catch { snap.emotional_patterns = []; }

    // Decisions logged
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*) as count FROM decisions
         WHERE user_id = $1 AND created_at::date BETWEEN $2 AND $3`,
        [userId, weekStart, weekEnd]
      );
      snap.decisions_logged = parseInt(rows[0]?.count) || 0;
    } catch { snap.decisions_logged = null; }

    // Outreach activity
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*) as count FROM outreach_log
         WHERE user_id = $1 AND created_at::date BETWEEN $2 AND $3`,
        [userId, weekStart, weekEnd]
      );
      snap.outreach_sent = parseInt(rows[0]?.count) || 0;
    } catch { snap.outreach_sent = null; }

    // Finance: transaction count + net spend
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount),0)::numeric(10,2) as net
         FROM finance_transactions
         WHERE user_id = $1 AND txn_date BETWEEN $2 AND $3`,
        [userId, weekStart, weekEnd]
      );
      snap.finance = {
        transactions: parseInt(rows[0]?.count) || 0,
        net_spend:    parseFloat(rows[0]?.net) || 0,
      };
    } catch { snap.finance = null; }

    return snap;
  }

  // ── Generate the weekly review letter ───────────────────────────────────────
  async function generateReview(userId, { referenceDate = null, force = false } = {}) {
    if (!callAI) throw new Error('AI not available');

    const { start, end, label } = weekBounds(referenceDate || new Date());

    // Check if already generated (skip unless forced)
    if (!force) {
      const { rows: existing } = await pool.query(
        `SELECT id, narrative_text FROM weekly_reviews WHERE user_id = $1 AND week_start = $2`,
        [userId, start]
      );
      if (existing.length) return existing[0];
    }

    const { rows: [user] } = await pool.query(
      `SELECT display_name FROM lifeos_users WHERE id = $1`,
      [userId]
    );
    const displayName = user?.display_name || 'there';

    const snapshot = await buildSnapshot(userId, start, end);
    const narrative = await callAI(
      WEEK_LETTER_PROMPT({ displayName, weekStr: label, snapshot })
    );

    const { rows: [review] } = await pool.query(
      `INSERT INTO weekly_reviews (user_id, week_start, week_end, narrative_text, data_snapshot)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, week_start) DO UPDATE
         SET narrative_text = EXCLUDED.narrative_text,
             data_snapshot  = EXCLUDED.data_snapshot,
             status         = 'delivered'
       RETURNING *`,
      [userId, start, end, narrative, JSON.stringify(snapshot)]
    );
    log.info({ userId, week: start }, '[WEEKLY-REVIEW] Generated review');
    return review;
  }

  // ── Get latest review (or a specific week) ──────────────────────────────────
  async function getReview(userId, weekStart = null) {
    const q = weekStart
      ? `SELECT * FROM weekly_reviews WHERE user_id = $1 AND week_start = $2 LIMIT 1`
      : `SELECT * FROM weekly_reviews WHERE user_id = $1 ORDER BY week_start DESC LIMIT 1`;
    const params = weekStart ? [userId, weekStart] : [userId];
    const { rows } = await pool.query(q, params);
    return rows[0] || null;
  }

  async function listReviews(userId, { limit = 12 } = {}) {
    const { rows } = await pool.query(
      `SELECT id, week_start, week_end, status, created_at
       FROM weekly_reviews WHERE user_id = $1
       ORDER BY week_start DESC LIMIT $2`,
      [userId, Math.min(limit, 52)]
    );
    return rows;
  }

  // ── Open or resume a conversation session for a review ──────────────────────
  async function openSession(userId, reviewId) {
    // Get or create session
    const { rows: existing } = await pool.query(
      `SELECT * FROM weekly_review_sessions WHERE review_id = $1`,
      [reviewId]
    );
    if (existing.length) {
      // Resume: update last_active
      await pool.query(
        `UPDATE weekly_review_sessions SET last_active = NOW(), status = 'active' WHERE id = $1`,
        [existing[0].id]
      );
      // Return session with message history
      const { rows: messages } = await pool.query(
        `SELECT role, content, created_at FROM weekly_review_messages
         WHERE session_id = $1 ORDER BY created_at ASC`,
        [existing[0].id]
      );
      return { session: existing[0], messages, resumed: true };
    }

    // New session — fetch the review
    const { rows: [review] } = await pool.query(
      `SELECT * FROM weekly_reviews WHERE id = $1 AND user_id = $2`,
      [reviewId, userId]
    );
    if (!review) throw Object.assign(new Error('Review not found'), { status: 404 });

    const { rows: [session] } = await pool.query(
      `INSERT INTO weekly_review_sessions (review_id, user_id) VALUES ($1, $2) RETURNING *`,
      [reviewId, userId]
    );

    // Seed with the opening assistant message (the narrative itself)
    const opening = `Here's your week at a glance — I'll let you read it and then we can talk about any of it.\n\n${review.narrative_text}`;
    await pool.query(
      `INSERT INTO weekly_review_messages (session_id, role, content) VALUES ($1, 'assistant', $2)`,
      [session.id, opening]
    );

    // Mark review as reviewed
    await pool.query(
      `UPDATE weekly_reviews SET status = 'reviewed' WHERE id = $1`,
      [reviewId]
    );

    return { session, messages: [{ role: 'assistant', content: opening }], resumed: false };
  }

  // ── Send a message in the conversation ──────────────────────────────────────
  async function sendMessage(sessionId, userId, userMessage) {
    if (!callAI) throw new Error('AI not available');

    // Load session + review
    const { rows: [session] } = await pool.query(
      `SELECT wrs.*, wr.narrative_text, wr.data_snapshot,
              wr.week_start, wr.week_end
       FROM weekly_review_sessions wrs
       JOIN weekly_reviews wr ON wr.id = wrs.review_id
       WHERE wrs.id = $1 AND wrs.user_id = $2`,
      [sessionId, userId]
    );
    if (!session) throw Object.assign(new Error('Session not found'), { status: 404 });

    // Load history
    const { rows: history } = await pool.query(
      `SELECT role, content FROM weekly_review_messages
       WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );

    // Persist user message
    await pool.query(
      `INSERT INTO weekly_review_messages (session_id, role, content) VALUES ($1, 'user', $2)`,
      [sessionId, userMessage]
    );

    const { rows: [user] } = await pool.query(
      `SELECT display_name FROM lifeos_users WHERE id = $1`,
      [userId]
    );

    const weekStr = `${session.week_start} – ${session.week_end}`;
    const systemPrompt = CONVERSATION_SYSTEM_PROMPT({
      displayName: user?.display_name || 'you',
      weekStr,
      snapshot: session.data_snapshot || {},
      narrative: session.narrative_text,
    });

    // Build message thread for AI
    const thread = history.map(m => `${m.role === 'user' ? 'User' : 'LifeOS'}: ${m.content}`).join('\n\n');
    const fullPrompt = `${systemPrompt}\n\n--- Conversation so far ---\n${thread}\n\nUser: ${userMessage}\n\nLifeOS:`;

    const aiReply = await callAI(fullPrompt);

    // Persist assistant reply
    await pool.query(
      `INSERT INTO weekly_review_messages (session_id, role, content) VALUES ($1, 'assistant', $2)`,
      [sessionId, aiReply]
    );

    // Update last_active
    await pool.query(
      `UPDATE weekly_review_sessions SET last_active = NOW() WHERE id = $1`,
      [sessionId]
    );

    // Extract any actions from the AI's response
    const actions = await extractActions(sessionId, aiReply);

    return { reply: aiReply, actions_staged: actions.length, actions };
  }

  // ── Extract and stage actions from an AI message ─────────────────────────────
  async function extractActions(sessionId, content) {
    if (!callAI) return [];

    // Quick check — only call AI if it looks like there's an action marker
    if (!content.includes('ACTION:') && !content.match(/commitment|goal|priority|schedule|note/i)) {
      return [];
    }

    try {
      const raw = await callAI(ACTION_EXTRACT_PROMPT(content));
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const actions = JSON.parse(json);
      if (!Array.isArray(actions) || !actions.length) return [];

      const staged = [];
      for (const a of actions) {
        if (!a.action_type || !a.payload) continue;
        const { rows: [row] } = await pool.query(
          `INSERT INTO weekly_review_actions (session_id, action_type, payload)
           VALUES ($1, $2, $3) RETURNING *`,
          [sessionId, a.action_type, JSON.stringify(a.payload)]
        );
        staged.push(row);
      }
      return staged;
    } catch {
      return [];
    }
  }

  // ── Apply staged actions back into LifeOS ────────────────────────────────────
  async function applyActions(sessionId, userId) {
    const { rows: pending } = await pool.query(
      `SELECT * FROM weekly_review_actions
       WHERE session_id = $1 AND applied = FALSE`,
      [sessionId]
    );

    const results = [];
    for (const action of pending) {
      try {
        const p = action.payload;
        let applied = false;

        if (action.action_type === 'create_commitment') {
          await pool.query(
            `INSERT INTO commitments (user_id, title, due_date, remind_interval, source)
             VALUES ($1, $2, $3, $4::interval, 'weekly_review')`,
            [userId, p.title, p.due_date || null, p.remind_interval || '24 hours']
          );
          applied = true;
        } else if (action.action_type === 'add_note') {
          await pool.query(
            `INSERT INTO lifeos_notes (user_id, content, source) VALUES ($1, $2, 'weekly_review')`,
            [userId, p.content]
          );
          applied = true;
        } else if (action.action_type === 'set_priority') {
          await pool.query(
            `INSERT INTO lifeos_priorities (user_id, area, priority_level, notes, source)
             VALUES ($1, $2, $3, $4, 'weekly_review')
             ON CONFLICT (user_id, area) DO UPDATE
               SET priority_level = EXCLUDED.priority_level,
                   notes = EXCLUDED.notes,
                   updated_at = NOW()`,
            [userId, p.area, p.priority_level, p.notes || null]
          );
          applied = true;
        } else if (action.action_type === 'schedule_event') {
          await pool.query(
            `INSERT INTO lifeos_events (user_id, title, start_time, duration_minutes, source)
             VALUES ($1, $2, $3::timestamptz, $4, 'weekly_review')`,
            [userId, p.title, p.date, p.duration_minutes || 60]
          );
          applied = true;
        }
        // log_moment and update_goal are noted but require human confirmation
        // (they touch more sensitive records) — mark applied so they don't repeat

        if (applied || action.action_type === 'log_moment' || action.action_type === 'update_goal') {
          await pool.query(
            `UPDATE weekly_review_actions SET applied = TRUE, applied_at = NOW() WHERE id = $1`,
            [action.id]
          );
        }

        results.push({ action_type: action.action_type, applied, payload: action.payload });
      } catch (err) {
        log.warn({ sessionId, actionId: action.id, err: err.message }, '[WEEKLY-REVIEW] action apply failed');
        results.push({ action_type: action.action_type, applied: false, error: err.message });
      }
    }

    return results;
  }

  // ── Close a session ──────────────────────────────────────────────────────────
  async function closeSession(sessionId, userId) {
    await pool.query(
      `UPDATE weekly_review_sessions SET status = 'closed' WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    return { ok: true };
  }

  // ── Get pending (unapplied) actions for a session ────────────────────────────
  async function getPendingActions(sessionId) {
    const { rows } = await pool.query(
      `SELECT * FROM weekly_review_actions WHERE session_id = $1 AND applied = FALSE ORDER BY created_at ASC`,
      [sessionId]
    );
    return rows;
  }

  return {
    generateReview,
    getReview,
    listReviews,
    openSession,
    sendMessage,
    applyActions,
    closeSession,
    getPendingActions,
    weekBounds,
    buildSnapshot,
  };
}
