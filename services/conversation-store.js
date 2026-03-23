/**
 * services/conversation-store.js
 * Stores and retrieves all conversations: Claude Code sessions, server AI calls, any channel.
 *
 * Exports: createConversationStore(pool) → { save, search, get, getAll, summarize }
 * @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md
 */

export function createConversationStore(pool) {
  // ── Save a full conversation ───────────────────────────────────────────────
  /**
   * @param {object} conv
   * @param {string} conv.sessionId
   * @param {string} conv.source        — 'claude_code'|'council_api'|'manual'
   * @param {string} [conv.project]
   * @param {Date}   [conv.startedAt]
   * @param {Date}   [conv.endedAt]
   * @param {Array}  conv.messages      — [{ role, content, timestamp, metadata }]
   * @param {object} [conv.metadata]
   */
  async function save(conv) {
    const {
      sessionId,
      source,
      project = null,
      startedAt = null,
      endedAt = null,
      messages = [],
      metadata = null,
    } = conv;

    // Check if this session already exists
    const existing = await pool.query(
      `SELECT id FROM conversations WHERE session_id = $1 LIMIT 1`,
      [sessionId]
    );

    let conversationId;

    if (existing.rows.length > 0) {
      conversationId = existing.rows[0].id;
      // Update message count and timestamps
      await pool.query(
        `UPDATE conversations
         SET message_count = $1, ended_at = $2, metadata = $3
         WHERE id = $4`,
        [messages.length, endedAt, metadata ? JSON.stringify(metadata) : null, conversationId]
      );
    } else {
      const result = await pool.query(
        `INSERT INTO conversations
           (session_id, source, project, started_at, ended_at, message_count, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [sessionId, source, project, startedAt, endedAt, messages.length,
         metadata ? JSON.stringify(metadata) : null]
      );
      conversationId = result.rows[0].id;
    }

    // Upsert messages (skip already stored ones by index)
    const existingMessages = await pool.query(
      `SELECT message_index FROM conversation_messages WHERE conversation_id = $1`,
      [conversationId]
    );
    const existingIndexes = new Set(existingMessages.rows.map(r => r.message_index));

    let inserted = 0;
    for (let i = 0; i < messages.length; i++) {
      if (existingIndexes.has(i)) continue;
      const msg = messages[i];
      if (!msg.content || !msg.role) continue;

      try {
        await pool.query(
          `INSERT INTO conversation_messages
             (conversation_id, session_id, role, content, message_index, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            conversationId,
            sessionId,
            msg.role,
            typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            i,
            msg.timestamp || null,
            msg.metadata ? JSON.stringify(msg.metadata) : null,
          ]
        );
        inserted++;
      } catch {
        // Skip duplicate or malformed messages
      }
    }

    return { conversationId, inserted };
  }

  // ── Get a single conversation with messages ────────────────────────────────
  async function get(sessionId) {
    const convResult = await pool.query(
      `SELECT * FROM conversations WHERE session_id = $1 LIMIT 1`,
      [sessionId]
    );
    if (convResult.rows.length === 0) return null;

    const conv = convResult.rows[0];
    const messages = await pool.query(
      `SELECT role, content, message_index, timestamp
       FROM conversation_messages
       WHERE conversation_id = $1
       ORDER BY message_index ASC`,
      [conv.id]
    );

    return { ...conv, messages: messages.rows };
  }

  // ── List all conversations ─────────────────────────────────────────────────
  async function getAll({ source, limit = 50, offset = 0, search } = {}) {
    const params = [limit, offset];
    let where = 'WHERE 1=1';

    if (source) where += ` AND c.source = $${params.push(source)}`;

    if (search) {
      where += ` AND EXISTS (
        SELECT 1 FROM conversation_messages cm
        WHERE cm.conversation_id = c.id
          AND to_tsvector('english', cm.content) @@ plainto_tsquery('english', $${params.push(search)})
      )`;
    }

    const result = await pool.query(
      `SELECT c.*,
              (SELECT cm.content FROM conversation_messages cm
               WHERE cm.conversation_id = c.id AND cm.role = 'user'
               ORDER BY cm.message_index ASC LIMIT 1) as first_message
       FROM conversations c
       ${where}
       ORDER BY c.started_at DESC NULLS LAST
       LIMIT $1 OFFSET $2`,
      params
    );

    return result.rows;
  }

  // ── Full text search across all messages ──────────────────────────────────
  async function search(query, { limit = 20 } = {}) {
    const result = await pool.query(
      `SELECT
         cm.role,
         cm.content,
         cm.timestamp,
         cm.message_index,
         c.session_id,
         c.source,
         c.started_at,
         ts_rank(to_tsvector('english', cm.content), plainto_tsquery('english', $1)) as rank
       FROM conversation_messages cm
       JOIN conversations c ON c.id = cm.conversation_id
       WHERE to_tsvector('english', cm.content) @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC, cm.timestamp DESC
       LIMIT $2`,
      [query, limit]
    );
    return result.rows;
  }

  // ── Update conversation with AI-generated summary ─────────────────────────
  async function setSummary(sessionId, { summary, keyDecisions = [], topics = [] }) {
    await pool.query(
      `UPDATE conversations
       SET summary = $1, key_decisions = $2, topics = $3
       WHERE session_id = $4`,
      [summary, keyDecisions, topics, sessionId]
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  async function stats() {
    const result = await pool.query(
      `SELECT
         source,
         COUNT(*) as conversations,
         SUM(message_count) as total_messages,
         MIN(started_at) as first_conversation,
         MAX(started_at) as last_conversation
       FROM conversations
       GROUP BY source
       ORDER BY conversations DESC`
    );
    return result.rows;
  }

  return { save, get, getAll, search, setSummary, stats };
}
