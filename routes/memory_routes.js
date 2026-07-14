/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 */
import express from 'express';

function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim();
  return String(value);
}

function toPositiveInt(value, fallback = 50, max = 500) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

async function queryJsonRows(pool, sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows.map((row) => ({
    ...row,
    key_facts: safeJsonParse(row.key_facts, row.key_facts),
    context_metadata: safeJsonParse(row.context_metadata, row.context_metadata),
    document: safeJsonParse(row.document, row.document),
    snapshot_data: safeJsonParse(row.snapshot_data, row.snapshot_data),
    data: safeJsonParse(row.data, row.data)
  }));
}

export function registerMemoryRoutes(app, deps) {
  const { pool, requireKey, logger, callCouncilMember, commitToGitHub, commitManyToGitHub, baseUrl } = deps || {};

  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerMemoryRoutes requires an Express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerMemoryRoutes requires deps.pool');
  }

  app.get('/api/memory/health', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT error_count_1h, error_count_24h, build_success_rate, avg_response_ms, queue_depth, deployed_count, pending_ideas, open_bugs, snapshot_at
         FROM system_health_log
         ORDER BY snapshot_at DESC NULLS LAST
         LIMIT 1`
      );
      res.json({ ok: true, latest: rows[0] || null, baseUrl: baseUrl || null });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory health route failed');
      res.status(500).json({ ok: false, error: 'health_lookup_failed' });
    }
  });

  app.get('/api/memory/conversations', async (req, res) => {
    try {
      const limit = toPositiveInt(req.query.limit, 25, 200);
      const rows = await queryJsonRows(
        pool,
        `SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
         FROM conversation_memory
         ORDER BY created_at DESC NULLS LAST
         LIMIT $1`,
        [limit]
      );
      res.json({ ok: true, items: rows });
    } catch (error) {
      logger?.error?.({ err: error }, 'list conversation memories failed');
      res.status(500).json({ ok: false, error: 'conversation_list_failed' });
    }
  });

  app.get('/api/memory/capsules', async (req, res) => {
    try {
      const limit = toPositiveInt(req.query.limit, 50, 200);
      const ownerId = normalizeText(req.query.owner_id, '');
      const params = [];
      let where = '';
      if (ownerId) {
        params.push(ownerId);
        where = `WHERE owner_id = $1`;
      }
      params.push(limit);
      const rows = await queryJsonRows(
        pool,
        `SELECT id, owner_id, capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by, status, legacy_import_method, review_required, created_at, updated_at, data
         FROM memory_capsules
         ${where}
         ORDER BY created_at DESC NULLS LAST
         LIMIT $${params.length}`,
        params
      );
      res.json({ ok: true, items: rows });
    } catch (error) {
      logger?.error?.({ err: error }, 'list memory capsules failed');
      res.status(500).json({ ok: false, error: 'capsule_list_failed' });
    }
  });

  app.post('/api/memory/conversations', requireKey, express.json({ limit: '1mb' }), async (req, res) => {
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
        `INSERT INTO conversation_memory
          (memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at`,
        [
          memory_id,
          orchestrator_msg,
          ai_response,
          ai_member,
          key_facts == null ? null : typeof key_facts === 'string' ? key_facts : JSON.stringify(key_facts),
          context_metadata == null ? null : typeof context_metadata === 'string' ? context_metadata : JSON.stringify(context_metadata),
          memory_type
        ]
      );

      res.status(201).json({ ok: true, item: queryJsonRows({ query: async () => result }, '', []).then ? null : null });
      const item = result.rows[0];
      res.status(201).json({
        ok: true,
        item: {
          ...item,
          key_facts: safeJsonParse(item.key_facts, item.key_facts),
          context_metadata: safeJsonParse(item.context_metadata, item.context_metadata)
        }
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'create conversation memory failed');
      res.status(500).json({ ok: false, error: 'conversation_create_failed' });
    }
  });

  app.post('/api/memory/capsules', requireKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const body = req.body || {};
      const result = await pool.query(
        `INSERT INTO memory_capsules
          (owner_id, capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by, status, legacy_import_method, review_required, data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         RETURNING id, owner_id, capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by, status, legacy_import_method, review_required, created_at, updated_at, data`,
        [
          body.owner_id ?? null,
          body.capsule_id ?? null,
          body.fact_id ?? null,
          body.title ?? null,
          body.capsule_type ?? null,
          body.truth_class ?? null,
          body.trust_level ?? null,
          body.evidence_level ?? null,
          body.sensitivity ?? null,
          body.source_type ?? null,
          body.source_ref ?? null,
          body.retrieval_permission ?? null,
          body.task_scope ?? null,
          body.retrieval_lane_ceiling ?? null,
          body.canonical_statement_id ?? null,
          body.fact_family_id ?? null,
          body.review_by ?? null,
          body.status ?? null,
          body.legacy_import_method ?? null,
          body.review_required ?? null,
          body.data == null ? null : typeof body.data === 'string' ? body.data : JSON.stringify(body.data)
        ]
      );

      const item = result.rows[0];
      res.status(201).json({ ok: true, item: { ...item, data: safeJsonParse(item.data, item.data) } });
    } catch (error) {
      logger?.error?.({ err: error }, 'create memory capsule failed');
      res.status(500).json({ ok: false, error: 'capsule_create_failed' });
    }
  });

  app.get('/api/memory/palace', async (req, res) => {
    try {
      const limit = toPositiveInt(req.query.limit, 25, 100);
      const rows = await pool.query(
        `SELECT id, user_id, memory_title, place, memory_text, sensory_details, sounds, smells, feels, significance, artifact_ids, created_at
         FROM memory_palace
         ORDER BY created_at DESC NULLS LAST
         LIMIT $1`,
        [limit]
      );
      res.json({ ok: true, items: rows.rows });
    } catch (error) {
      logger?.error?.({ err: error }, 'list memory palace failed');
      res.status(500).json({ ok: false, error: 'palace_list_failed' });
    }
  });

  app.post('/api/memory/route-council', requireKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      if (typeof callCouncilMember !== 'function') {
        return res.status(500).json({ ok: false, error: 'ai_hook_unavailable' });
      }
      const prompt = normalizeText(req.body?.prompt, '');
      const role = normalizeText(req.body?.role, 'memory');
      const response = await callCouncilMember(role, prompt, req.body?.opts || {});
      res.json({ ok: true, response });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory council call failed');
      res.status(500).json({ ok: false, error: 'council_call_failed' });
    }
  });

  app.post('/api/memory/commit-snippet', requireKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const { path, content, message } = req.body || {};
      if (!path || !content || !message) {
        return res.status(400).json({ ok: false, error: 'missing_path_content_message' });
      }
      if (typeof commitToGitHub !== 'function') {
        return res.status(500).json({ ok: false, error: 'commit_hook_unavailable' });
      }
      const result = await commitToGitHub(path, content, message);
      res.json({ ok: true, result: result ?? null });
    } catch (error) {
      logger?.error?.({ err: error }, 'single file commit failed');
      res.status(500).json({ ok: false, error: 'commit_failed' });
    }
  });

  app.post('/api/memory/commit-batch', requireKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const files = Array.isArray(req.body?.files) ? req.body.files : null;
      const message = normalizeText(req.body?.message, '');
      if (!files?.length || !message) {
        return res.status(400).json({ ok: false, error: 'missing_files_or_message' });
      }
      if (typeof commitManyToGitHub !== 'function') {
        return res.status(500).json({ ok: false, error: 'commit_hook_unavailable' });
      }
      const result = await commitManyToGitHub(files, message);
      res.json({ ok: true, result: result ?? null });
    } catch (error) {
      logger?.error?.({ err: error }, 'batch commit failed');
      res.status(500).json({ ok: false, error: 'commit_batch_failed' });
    }
  });
}

export default registerMemoryRoutes;