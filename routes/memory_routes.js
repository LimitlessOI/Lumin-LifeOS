/**
 * SYNOPSIS: HTTP route module — Memory Routes.
 */
import { z } from 'zod';

const memoryRouteInputSchema = z.object({
  memory_id: z.string().trim().min(1).optional(),
  orchestrator_msg: z.string().trim().min(1).optional(),
  ai_response: z.string().trim().min(1).optional(),
  ai_member: z.string().trim().min(1).optional(),
  key_facts: z.union([z.array(z.any()), z.record(z.any()), z.string()]).optional(),
  context_metadata: z.union([z.array(z.any()), z.record(z.any()), z.string()]).optional(),
  memory_type: z.string().trim().min(1).optional()
});

function jsonError(res, status, message, details) {
  return res.status(status).json({
    ok: false,
    error: message,
    ...(details ? { details } : {})
  });
}

function parseMaybeJson(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeTextOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function registerMemoryRoutes(app, deps) {
  const { pool, requireKey, callCouncilMember, logger } = deps || {};
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerMemoryRoutes requires an Express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerMemoryRoutes requires deps.pool');
  }

  app.get('/api/memory', async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query?.limit) || 25, 1), 100);
      const offset = Math.max(Number(req.query?.offset) || 0, 0);

      const result = await pool.query(
        `SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
         FROM conversation_memory
         ORDER BY created_at DESC, id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return res.json({
        ok: true,
        items: result.rows.map((row) => ({
          ...row,
          key_facts: parseMaybeJson(row.key_facts),
          context_metadata: parseMaybeJson(row.context_metadata)
        }))
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'GET /api/memory failed');
      return jsonError(res, 500, 'Failed to load memory records');
    }
  });

  app.get('/api/memory/:memoryId', async (req, res) => {
    try {
      const memoryId = normalizeTextOrNull(req.params?.memoryId);
      if (!memoryId) return jsonError(res, 400, 'memoryId is required');

      const result = await pool.query(
        `SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
         FROM conversation_memory
         WHERE memory_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [memoryId]
      );

      if (!result.rows.length) return jsonError(res, 404, 'Memory record not found');

      const row = result.rows[0];
      return res.json({
        ok: true,
        item: {
          ...row,
          key_facts: parseMaybeJson(row.key_facts),
          context_metadata: parseMaybeJson(row.context_metadata)
        }
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'GET /api/memory/:memoryId failed');
      return jsonError(res, 500, 'Failed to load memory record');
    }
  });

  app.post('/api/memory', requireKey, async (req, res) => {
    try {
      const parsed = memoryRouteInputSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return jsonError(res, 400, 'Invalid memory payload', parsed.error.flatten());
      }

      const body = parsed.data;
      const memoryId = body.memory_id || normalizeTextOrNull(req.body?.memory_id) || null;
      const orchestratorMsg = normalizeTextOrNull(body.orchestrator_msg);
      const aiResponse = normalizeTextOrNull(body.ai_response);
      const aiMember = normalizeTextOrNull(body.ai_member);
      const memoryType = normalizeTextOrNull(body.memory_type);
      const keyFacts = body.key_facts == null ? null : JSON.stringify(body.key_facts);
      const contextMetadata = body.context_metadata == null ? null : JSON.stringify(body.context_metadata);

      const inserted = await pool.query(
        `INSERT INTO conversation_memory
          (memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at`,
        [
          memoryId,
          orchestratorMsg,
          aiResponse,
          aiMember,
          keyFacts,
          contextMetadata,
          memoryType
        ]
      );

      return res.status(201).json({
        ok: true,
        item: {
          ...inserted.rows[0],
          key_facts: parseMaybeJson(inserted.rows[0].key_facts),
          context_metadata: parseMaybeJson(inserted.rows[0].context_metadata)
        }
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'POST /api/memory failed');
      return jsonError(res, 500, 'Failed to create memory record');
    }
  });

  app.post('/api/memory/compose', requireKey, async (req, res) => {
    try {
      const prompt = normalizeTextOrNull(req.body?.prompt);
      if (!prompt) return jsonError(res, 400, 'prompt is required');

      const aiResponse = await callCouncilMember('memory', prompt, { source: 'memory_routes' });
      return res.json({
        ok: true,
        ai_response: aiResponse
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'POST /api/memory/compose failed');
      return jsonError(res, 500, 'Failed to compose memory response');
    }
  });
}

export { registerMemoryRoutes };
export default registerMemoryRoutes;