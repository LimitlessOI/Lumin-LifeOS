/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 */
export function registerMemoryRoutes(app, deps) {
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerMemoryRoutes requires an Express app');
  }
  if (!deps || !deps.pool || typeof deps.pool.query !== 'function') {
    throw new Error('registerMemoryRoutes requires deps.pool');
  }

  const { pool, requireKey, callCouncilMember, logger } = deps;

  const log = logger || console;

  const sendError = (res, status, message, details) => {
    const payload = { error: message };
    if (details !== undefined) payload.details = details;
    return res.status(status).json(payload);
  };

  const parseJsonBody = (value) => {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  const normalizeLimit = (value, fallback = 50, max = 200) => {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(n, max);
  };

  app.get('/api/memory/routes/health', async (_req, res) => {
    try {
      const result = await pool.query('select now() as now');
      return res.json({ ok: true, at: result.rows?.[0]?.now ?? null });
    } catch (error) {
      log.error?.({ error }, 'memory routes health check failed');
      return sendError(res, 500, 'memory routes health check failed');
    }
  });

  app.get('/api/memory/conversation', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const memoryType = req.query.memory_type || req.query.memoryType || null;

      const params = [];
      let where = '';
      if (memoryType) {
        params.push(memoryType);
        where = `where memory_type = $${params.length}`;
      }

      params.push(limit);
      const q = `
        select id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        from conversation_memory
        ${where}
        order by created_at desc
        limit $${params.length}
      `;

      const result = await pool.query(q, params);
      return res.json({ ok: true, items: result.rows });
    } catch (error) {
      log.error?.({ error }, 'failed to list conversation memory');
      return sendError(res, 500, 'failed to list conversation memory');
    }
  });

  app.post('/api/memory/conversation', requireKey, async (req, res) => {
    try {
      const {
        memory_id = null,
        orchestrator_msg = null,
        ai_response = null,
        ai_member = null,
        key_facts = null,
        context_metadata = null,
        memory_type = null
      } = req.body || {};

      const result = await pool.query(
        `
          insert into conversation_memory (
            memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          returning id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        `,
        [
          memory_id,
          orchestrator_msg,
          ai_response,
          ai_member,
          key_facts,
          context_metadata,
          memory_type
        ]
      );

      return res.status(201).json({ ok: true, item: result.rows[0] });
    } catch (error) {
      log.error?.({ error }, 'failed to create conversation memory');
      return sendError(res, 500, 'failed to create conversation memory');
    }
  });

  app.get('/api/memory/capsules', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const ownerId = req.query.owner_id || req.query.ownerId || null;
      const status = req.query.status || null;

      const clauses = [];
      const params = [];

      if (ownerId) {
        params.push(ownerId);
        clauses.push(`owner_id = $${params.length}`);
      }
      if (status) {
        params.push(status);
        clauses.push(`status = $${params.length}`);
      }

      params.push(limit);
      const q = `
        select *
        from memory_capsules
        ${clauses.length ? `where ${clauses.join(' and ')}` : ''}
        order by created_at desc nulls last
        limit $${params.length}
      `;

      const result = await pool.query(q, params);
      return res.json({ ok: true, items: result.rows });
    } catch (error) {
      log.error?.({ error }, 'failed to list memory capsules');
      return sendError(res, 500, 'failed to list memory capsules');
    }
  });

  app.post('/api/memory/capsules', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const fields = [
        'fact_id',
        'title',
        'capsule_type',
        'truth_class',
        'trust_level',
        'evidence_level',
        'sensitivity',
        'source_type',
        'source_ref',
        'retrieval_permission',
        'task_scope',
        'retrieval_lane_ceiling',
        'canonical_statement_id',
        'fact_family_id',
        'review_by',
        'status',
        'legacy_import_method',
        'review_required',
        'owner_id',
        'data'
      ];

      const cols = [];
      const vals = [];
      const params = [];

      for (const field of fields) {
        if (body[field] !== undefined) {
          cols.push(field);
          vals.push(`$${params.length + 1}`);
          params.push(body[field]);
        }
      }

      if (!cols.length) {
        return sendError(res, 400, 'no capsule fields provided');
      }

      const result = await pool.query(
        `
          insert into memory_capsules (${cols.join(', ')})
          values (${vals.join(', ')})
          returning *
        `,
        params
      );

      return res.status(201).json({ ok: true, item: result.rows[0] });
    } catch (error) {
      log.error?.({ error }, 'failed to create memory capsule');
      return sendError(res, 500, 'failed to create memory capsule');
    }
  });

  app.get('/api/memory/working', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const sessionId = req.query.session_id || req.query.sessionId || null;
      const taskScope = req.query.task_scope || req.query.taskScope || null;

      const clauses = [];
      const params = [];

      if (sessionId) {
        params.push(sessionId);
        clauses.push(`session_id = $${params.length}`);
      }
      if (taskScope) {
        params.push(taskScope);
        clauses.push(`task_scope = $${params.length}`);
      }

      params.push(limit);
      const result = await pool.query(
        `
          select *
          from working_memory_entries
          ${clauses.length ? `where ${clauses.join(' and ')}` : ''}
          order by created_at desc
          limit $${params.length}
        `,
        params
      );

      return res.json({ ok: true, items: result.rows });
    } catch (error) {
      log.error?.({ error }, 'failed to list working memory entries');
      return sendError(res, 500, 'failed to list working memory entries');
    }
  });

  app.post('/api/memory/working', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const fields = [
        'session_id',
        'capsule_id',
        'task_scope',
        'retrieval_lane',
        'entry_content',
        'injected_at',
        'used_in_decision',
        'decision_ref',
        'promoted_to_candidate'
      ];

      const cols = [];
      const vals = [];
      const params = [];

      for (const field of fields) {
        if (body[field] !== undefined) {
          cols.push(field);
          vals.push(`$${params.length + 1}`);
          params.push(body[field]);
        }
      }

      if (!cols.length) {
        return sendError(res, 400, 'no working memory fields provided');
      }

      const result = await pool.query(
        `
          insert into working_memory_entries (${cols.join(', ')})
          values (${vals.join(', ')})
          returning *
        `,
        params
      );

      return res.status(201).json({ ok: true, item: result.rows[0] });
    } catch (error) {
      log.error?.({ error }, 'failed to create working memory entry');
      return sendError(res, 500, 'failed to create working memory entry');
    }
  });

  app.get('/api/memory/receipts', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const capsuleId = req.query.capsule_id || req.query.capsuleId || null;
      const receiptType = req.query.receipt_type || req.query.receiptType || null;

      const clauses = [];
      const params = [];

      if (capsuleId) {
        params.push(capsuleId);
        clauses.push(`capsule_id = $${params.length}`);
      }
      if (receiptType) {
        params.push(receiptType);
        clauses.push(`receipt_type = $${params.length}`);
      }

      params.push(limit);
      const result = await pool.query(
        `
          select *
          from memory_use_receipts
          ${clauses.length ? `where ${clauses.join(' and ')}` : ''}
          order by created_at desc
          limit $${params.length}
        `,
        params
      );

      return res.json({ ok: true, items: result.rows });
    } catch (error) {
      log.error?.({ error }, 'failed to list memory use receipts');
      return sendError(res, 500, 'failed to list memory use receipts');
    }
  });

  app.post('/api/memory/receipts', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const fields = [
        'capsule_id',
        'receipt_type',
        'use_type',
        'decision_ref',
        'task_scope',
        'retrieval_lane',
        'signal_id',
        'source_ref',
        'created_by'
      ];

      const cols = [];
      const vals = [];
      const params = [];

      for (const field of fields) {
        if (body[field] !== undefined) {
          cols.push(field);
          vals.push(`$${params.length + 1}`);
          params.push(body[field]);
        }
      }

      if (!cols.length) {
        return sendError(res, 400, 'no receipt fields provided');
      }

      const result = await pool.query(
        `
          insert into memory_use_receipts (${cols.join(', ')})
          values (${vals.join(', ')})
          returning *
        `,
        params
      );

      return res.status(201).json({ ok: true, item: result.rows[0] });
    } catch (error) {
      log.error?.({ error }, 'failed to create memory use receipt');
      return sendError(res, 500, 'failed to create memory use receipt');
    }
  });

  app.get('/api/memory/snapshots', async (_req, res) => {
    try {
      const result = await pool.query(
        `
          select id, snapshot_id, snapshot_data, version, reason, created_at
          from system_snapshots
          order by created_at desc
          limit 50
        `
      );
      return res.json({ ok: true, items: result.rows });
    } catch (error) {
      log.error?.({ error }, 'failed to list snapshots');
      return sendError(res, 500, 'failed to list snapshots');
    }
  });

  app.post('/api/memory/snapshots', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const result = await pool.query(
        `
          insert into system_snapshots (snapshot_data, version, reason)
          values ($1, $2, $3)
          returning id, snapshot_id, snapshot_data, version, reason, created_at
        `,
        [body.snapshot_data ?? body.snapshotData ?? null, body.version ?? null, body.reason ?? null]
      );
      return res.status(201).json({ ok: true, item: result.rows[0] });
    } catch (error) {
      log.error?.({ error }, 'failed to create snapshot');
      return sendError(res, 500, 'failed to create snapshot');
    }
  });

  app.post('/api/memory/council/reflect', requireKey, async (req, res) => {
    try {
      if (typeof callCouncilMember !== 'function') {
        return sendError(res, 500, 'ai council hook unavailable');
      }

      const body = req.body || {};
      const role = body.role || body.ai_member || 'memory';
      const prompt = body.prompt || body.orchestrator_msg || body.input || '';
      const opts = body.opts || undefined;

      const response = await callCouncilMember(role, String(prompt), opts);

      return res.json({
        ok: true,
        role,
        response
      });
    } catch (error) {
      log.error?.({ error }, 'failed to call council member');
      return sendError(res, 500, 'failed to call council member');
    }
  });

  app.post('/api/memory/notes', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const memoryType = body.memory_type || body.memoryType || 'note';
      const aiMember = body.ai_member || body.aiMember || null;
      const orchestratorMsg = body.orchestrator_msg ?? body.orchestratorMsg ?? null;
      const aiResponse = body.ai_response ?? body.aiResponse ?? null;
      const keyFacts = parseJsonBody(body.key_facts ?? body.keyFacts ?? null);
      const contextMetadata = parseJsonBody(body.context_metadata ?? body.contextMetadata ?? null);

      const result = await pool.query(
        `
          insert into conversation_memory (
            orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type
          )
          values ($1, $2, $3, $4, $5, $6)
          returning id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        `,
        [orchestratorMsg, aiResponse, aiMember, keyFacts, contextMetadata, memoryType]
      );

      return res.status(201).json({ ok: true, item: result.rows[0] });
    } catch (error) {
      log.error?.({ error }, 'failed to create memory note');
      return sendError(res, 500, 'failed to create memory note');
    }
  });
}

export default registerMemoryRoutes;