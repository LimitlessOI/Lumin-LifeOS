/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 */
import { z } from 'zod';

const MemoryRouteQuerySchema = z.object({
  memory_type: z.string().trim().min(1).optional(),
  ai_member: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const MemoryCreateSchema = z.object({
  orchestrator_msg: z.string().trim().min(1),
  ai_response: z.string().trim().min(1),
  ai_member: z.string().trim().min(1),
  key_facts: z.union([z.array(z.any()), z.record(z.any()), z.string()]).optional(),
  context_metadata: z.union([z.array(z.any()), z.record(z.any()), z.string()]).optional(),
  memory_type: z.string().trim().min(1)
});

function jsonText(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function parseJsonField(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeMemoryRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    memory_id: row.memory_id,
    orchestrator_msg: row.orchestrator_msg,
    ai_response: row.ai_response,
    ai_member: row.ai_member,
    key_facts: parseJsonField(row.key_facts),
    context_metadata: parseJsonField(row.context_metadata),
    memory_type: row.memory_type,
    created_at: row.created_at
  };
}

export function registerMemoryRoutes(app, deps) {
  if (!app || !deps || !deps.pool) {
    throw new Error('registerMemoryRoutes requires app and deps.pool');
  }

  app.get('/api/memory', async (req, res) => {
    try {
      const parsed = MemoryRouteQuerySchema.safeParse(req.query ?? {});
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: 'Invalid query parameters', issues: parsed.error.flatten() });
      }

      const { memory_type, ai_member, limit = 50, offset = 0 } = parsed.data;
      const where = [];
      const params = [];
      let idx = 1;

      if (memory_type) {
        where.push(`memory_type = $${idx++}`);
        params.push(memory_type);
      }
      if (ai_member) {
        where.push(`ai_member = $${idx++}`);
        params.push(ai_member);
      }

      params.push(limit, offset);
      const limitIdx = idx++;
      const offsetIdx = idx++;

      const sql = `
        SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        FROM conversation_memory
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at DESC, id DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `;

      const result = await deps.pool.query(sql, params);
      return res.json({
        ok: true,
        items: result.rows.map(normalizeMemoryRow),
        limit,
        offset
      });
    } catch (error) {
      deps.logger?.error?.({ error }, 'memory routes: list failed');
      return res.status(500).json({ ok: false, error: 'Failed to list memory entries' });
    }
  });

  app.get('/api/memory/:memory_id', async (req, res) => {
    try {
      const { memory_id } = req.params ?? {};
      if (!memory_id) {
        return res.status(400).json({ ok: false, error: 'memory_id is required' });
      }

      const result = await deps.pool.query(
        `
          SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
          FROM conversation_memory
          WHERE memory_id = $1
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        `,
        [memory_id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ ok: false, error: 'Memory entry not found' });
      }

      return res.json({ ok: true, item: normalizeMemoryRow(result.rows[0]) });
    } catch (error) {
      deps.logger?.error?.({ error }, 'memory routes: fetch failed');
      return res.status(500).json({ ok: false, error: 'Failed to fetch memory entry' });
    }
  });

  app.post('/api/memory', deps.requireKey, async (req, res) => {
    try {
      const parsed = MemoryCreateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: 'Invalid request body', issues: parsed.error.flatten() });
      }

      const { orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type } = parsed.data;

      const result = await deps.pool.query(
        `
          INSERT INTO conversation_memory (
            orchestrator_msg,
            ai_response,
            ai_member,
            key_facts,
            context_metadata,
            memory_type
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        `,
        [
          orchestrator_msg,
          ai_response,
          ai_member,
          jsonText(key_facts),
          jsonText(context_metadata),
          memory_type
        ]
      );

      const item = normalizeMemoryRow(result.rows[0]);
      return res.status(201).json({ ok: true, item });
    } catch (error) {
      deps.logger?.error?.({ error }, 'memory routes: create failed');
      return res.status(500).json({ ok: false, error: 'Failed to create memory entry' });
    }
  });

  app.post('/api/memory/:memory_id/receipt', deps.requireKey, async (req, res) => {
    try {
      const { memory_id } = req.params ?? {};
      if (!memory_id) {
        return res.status(400).json({ ok: false, error: 'memory_id is required' });
      }

      const body = req.body ?? {};
      const receipt = {
        receipt_type: typeof body.receipt_type === 'string' ? body.receipt_type.trim() : '',
        use_type: typeof body.use_type === 'string' ? body.use_type.trim() : '',
        decision_ref: typeof body.decision_ref === 'string' ? body.decision_ref.trim() : null,
        task_scope: typeof body.task_scope === 'string' ? body.task_scope.trim() : null,
        retrieval_lane: typeof body.retrieval_lane === 'string' ? body.retrieval_lane.trim() : null,
        signal_id: typeof body.signal_id === 'string' ? body.signal_id.trim() : null,
        source_ref: typeof body.source_ref === 'string' ? body.source_ref.trim() : null,
        created_by: typeof body.created_by === 'string' ? body.created_by.trim() : null,
        capsule_id: typeof body.capsule_id === 'string' ? body.capsule_id.trim() : null
      };

      if (!receipt.receipt_type || !receipt.use_type) {
        return res.status(400).json({ ok: false, error: 'receipt_type and use_type are required' });
      }

      const result = await deps.pool.query(
        `
          INSERT INTO memory_use_receipts (
            capsule_id,
            receipt_type,
            use_type,
            decision_ref,
            task_scope,
            retrieval_lane,
            signal_id,
            source_ref,
            created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `,
        [
          receipt.capsule_id,
          receipt.receipt_type,
          receipt.use_type,
          receipt.decision_ref,
          receipt.task_scope,
          receipt.retrieval_lane,
          receipt.signal_id,
          receipt.source_ref,
          receipt.created_by
        ]
      );

      return res.status(201).json({ ok: true, item: result.rows[0], memory_id });
    } catch (error) {
      deps.logger?.error?.({ error }, 'memory routes: receipt create failed');
      return res.status(500).json({ ok: false, error: 'Failed to create memory receipt' });
    }
  });
}

export default registerMemoryRoutes;