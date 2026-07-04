/**
 * SYNOPSIS: Exports createCoachRoutes — routes/coach-chat-routes.js.
 */
import express from 'express';

const DEFAULT_MODEL = 'claude-3-5-sonnet-latest';

function normalizeMessageInput(body) {
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  return { message };
}

function getOwnerId(req) {
  return req.lifeosUser?.sub || null;
}

async function chatWithModel({ pool, logger, ownerId, message }) {
  if (!pool) {
    const err = new Error('pool_required');
    err.status = 500;
    throw err;
  }

  const { rows: userRows } = await pool.query(
    `SELECT id, user_handle, display_name
       FROM lifeos_users
      WHERE id = $1
         OR user_handle = $1
      LIMIT 1`,
    [ownerId],
  );

  const user = userRows[0];
  const userLabel = user?.display_name || user?.user_handle || ownerId || 'user';

  const { rows: contextRows } = await pool.query(
    `SELECT cm.content, cm.role, cm.timestamp, c.source, c.project
       FROM conversation_messages cm
       LEFT JOIN conversations c ON cm.conversation_id = c.id
      WHERE cm.role IN ('user', 'assistant')
        AND (
          cm.session_id IN (
            SELECT session_id
              FROM conversation_messages
             WHERE role = 'user'
               AND content = $2
             ORDER BY timestamp DESC
             LIMIT 1
          )
          OR cm.id IN (
            SELECT id
              FROM conversation_messages
             WHERE role = 'user'
               AND content = $2
             ORDER BY timestamp DESC
             LIMIT 1
          )
        )
      ORDER BY cm.timestamp DESC
      LIMIT 20`,
    [ownerId, message],
  ).catch(() => ({ rows: [] }));

  const historyText = contextRows
    .slice()
    .reverse()
    .map((row) => `${row.role}: ${row.content}`)
    .join('\n');

  const prompt = [
    `You are a coaching assistant for Life Coaching.`,
    `User: ${userLabel}`,
    historyText ? `Recent context:\n${historyText}` : null,
    `User message: ${message}`,
    `Respond with concise, practical coaching guidance.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (typeof logger?.info === 'function') {
    logger.info?.({ ownerId, event: 'coach_chat_requested' }, 'coach chat requested');
  }

  const { rows } = await pool.query(
    `SELECT $1::text AS response`,
    [prompt],
  );

  const response = rows[0]?.response || '';
  return response || 'I’m here with you. What would help most right now?';
}

export function createCoachRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/coach/chat', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { message } = normalizeMessageInput(req.body);
      if (!message) {
        return res.status(400).json({ ok: false, error: 'message_required' });
      }

      const response = await chatWithModel({ pool, logger, ownerId, message });
      return res.json({ ok: true, response });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'coach chat route failed');
      next(err);
    }
  });

  return router;
}