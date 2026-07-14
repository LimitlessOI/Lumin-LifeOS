/**
 * SYNOPSIS: HTTP route module — Memory Routes.
 */
import express from 'express';

function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function compactObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function createErrorResponse(message, details) {
  return compactObject({ ok: false, error: message, details });
}

function registerMemoryRoutes(app, deps) {
  const pool = deps?.pool;
  const logger = deps?.logger;

  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerMemoryRoutes requires an Express app with get/post methods');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerMemoryRoutes requires deps.pool with query()');
  }

  const requireKey = typeof deps?.requireKey === 'function' ? deps.requireKey : undefined;
  const callCouncilMember = typeof deps?.callCouncilMember === 'function' ? deps.callCouncilMember : undefined;

  app.get('/api/memory/health', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `select
           count(*)::int as memory_count
         from conversation_memory`
      );
      res.json({ ok: true, memory_count: rows?.[0]?.memory_count ?? 0 });
    } catch (error) {
      logger?.error?.({ error }, 'memory health route failed');
      res.status(500).json(createErrorResponse('memory_health_failed'));
    }
  });

  app.get('/api/memory/recent', async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(Number(req.query?.limit ?? 25) || 25, 100));
      const { rows } = await pool.query(
        `select
           id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts,
           context_metadata, memory_type, created_at
         from conversation_memory
         order by created_at desc nulls last, id desc
         limit $1`,
        [limit]
      );
      res.json({ ok: true, memories: rows.map((row) => ({
        ...row,
        key_facts: safeJsonParse(row.key_facts, row.key_facts),
        context_metadata: safeJsonParse(row.context_metadata, row.context_metadata)
      })) });
    } catch (error) {
      logger?.error?.({ error }, 'memory recent route failed');
      res.status(500).json(createErrorResponse('memory_recent_failed'));
    }
  });

  app.post('/api/memory', requireKey ?? ((_, __, next) => next()), async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const orchestratorMsg = body.orchestrator_msg ?? body.orchestratorMsg ?? null;
      const aiResponse = body.ai_response ?? body.aiResponse ?? null;
      const aiMember = body.ai_member ?? body.aiMember ?? null;
      const keyFacts = body.key_facts ?? body.keyFacts ?? null;
      const contextMetadata = body.context_metadata ?? body.contextMetadata ?? null;
      const memoryType = body.memory_type ?? body.memoryType ?? null;

      if (!orchestratorMsg && !aiResponse && !aiMember && !keyFacts && !contextMetadata && !memoryType) {
        return res.status(400).json(createErrorResponse('missing_memory_payload'));
      }

      const memoryId = body.memory_id ?? body.memoryId ?? null;

      const { rows } = await pool.query(
        `insert into conversation_memory
           (memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type)
         values
           ($1, $2, $3, $4, $5, $6, $7)
         returning id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at`,
        [
          memoryId,
          orchestratorMsg,
          aiResponse,
          aiMember,
          keyFacts == null ? null : (typeof keyFacts === 'string' ? keyFacts : JSON.stringify(keyFacts)),
          contextMetadata == null ? null : (typeof contextMetadata === 'string' ? contextMetadata : JSON.stringify(contextMetadata)),
          memoryType
        ]
      );

      const row = rows?.[0] ?? null;
      res.status(201).json({
        ok: true,
        memory: row
          ? {
              ...row,
              key_facts: safeJsonParse(row.key_facts, row.key_facts),
              context_metadata: safeJsonParse(row.context_metadata, row.context_metadata)
            }
          : null
      });
    } catch (error) {
      logger?.error?.({ error }, 'memory create route failed');
      res.status(500).json(createErrorResponse('memory_create_failed'));
    }
  });

  app.get('/api/memory/capsules', async (req, res) => {
    try {
      const ownerId = req.query?.owner_id ?? req.query?.ownerId ?? null;
      const status = req.query?.status ?? null;
      const limit = Math.max(1, Math.min(Number(req.query?.limit ?? 50) || 50, 200));

      const where = [];
      const params = [];
      if (ownerId) {
        params.push(ownerId);
        where.push(`owner_id = $${params.length}`);
      }
      if (status) {
        params.push(status);
        where.push(`status = $${params.length}`);
      }
      params.push(limit);

      const { rows } = await pool.query(
        `select
           id, owner_id, capsule_id, fact_id, title, capsule_type, truth_class, trust_level,
           evidence_level, sensitivity, source_type, source_ref, retrieval_permission, task_scope,
           retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by, status,
           legacy_import_method, review_required, created_at, updated_at, data
         from memory_capsules
         ${where.length ? `where ${where.join(' and ')}` : ''}
         order by created_at desc nulls last, id desc
         limit $${params.length}`,
        params
      );

      res.json({ ok: true, capsules: rows.map((row) => ({ ...row, data: safeJsonParse(row.data, row.data) })) });
    } catch (error) {
      logger?.error?.({ error }, 'memory capsules route failed');
      res.status(500).json(createErrorResponse('memory_capsules_failed'));
    }
  });

  app.get('/api/memory/working', async (req, res) => {
    try {
      const sessionId = req.query?.session_id ?? req.query?.sessionId ?? null;
      const limit = Math.max(1, Math.min(Number(req.query?.limit ?? 50) || 50, 200));

      const { rows } = await pool.query(
        `select
           id, session_id, capsule_id, task_scope, retrieval_lane, entry_content,
           injected_at, used_in_decision, decision_ref, promoted_to_candidate, created_at
         from working_memory_entries
         ${sessionId ? 'where session_id = $1' : ''}
         order by created_at desc nulls last, id desc
         limit ${sessionId ? '$2' : '$1'}`,
        sessionId ? [sessionId, limit] : [limit]
      );

      res.json({ ok: true, entries: rows });
    } catch (error) {
      logger?.error?.({ error }, 'working memory route failed');
      res.status(500).json(createErrorResponse('working_memory_failed'));
    }
  });

  app.get('/api/memory/receipts', async (req, res) => {
    try {
      const capsuleId = req.query?.capsule_id ?? req.query?.capsuleId ?? null;
      const limit = Math.max(1, Math.min(Number(req.query?.limit ?? 50) || 50, 200));

      const { rows } = await pool.query(
        `select
           id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane,
           signal_id, source_ref, created_by, created_at
         from memory_use_receipts
         ${capsuleId ? 'where capsule_id = $1' : ''}
         order by created_at desc nulls last, id desc
         limit ${capsuleId ? '$2' : '$1'}`,
        capsuleId ? [capsuleId, limit] : [limit]
      );

      res.json({ ok: true, receipts: rows });
    } catch (error) {
      logger?.error?.({ error }, 'memory receipts route failed');
      res.status(500).json(createErrorResponse('memory_receipts_failed'));
    }
  });

  app.post('/api/memory/retrieve', requireKey ?? ((_, __, next) => next()), async (req, res) => {
    try {
      if (!callCouncilMember) {
        return res.status(500).json(createErrorResponse('ai_hook_unavailable'));
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const prompt = body.prompt ?? body.query ?? body.question ?? '';
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json(createErrorResponse('missing_prompt'));
      }

      const role = body.role ?? 'memory';
      const response = await callCouncilMember(role, prompt, {
        taskScope: body.task_scope ?? body.taskScope ?? null,
        retrievalLane: body.retrieval_lane ?? body.retrievalLane ?? null
      });

      res.json({ ok: true, response });
    } catch (error) {
      logger?.error?.({ error }, 'memory retrieve route failed');
      res.status(500).json(createErrorResponse('memory_retrieve_failed'));
    }
  });

  if (logger?.info) {
    logger.info({ module: 'routes/memory_routes' }, 'memory routes registered');
  }
}

export { registerMemoryRoutes };
export default registerMemoryRoutes;