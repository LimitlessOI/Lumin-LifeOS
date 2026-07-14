/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 */
import express from 'express';

function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function pickNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function normalizeLimit(value, fallback = 50, max = 200) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function normalizeOffset(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function buildMemoryListQuery({
  table,
  idColumn,
  orderColumn = 'created_at',
  filters = [],
  select = '*'
}) {
  const where = filters.length ? ` WHERE ${filters.map((f, i) => `${f.sql}`).join(' AND ')}` : '';
  return `SELECT ${select} FROM ${table}${where} ORDER BY ${orderColumn} DESC`;
}

async function queryOne(pool, sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function queryMany(pool, sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

export function registerMemoryRoutes(app, deps = {}) {
  const { pool, requireKey, logger, callCouncilMember, baseUrl, commitToGitHub, commitManyToGitHub } = deps;

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerMemoryRoutes requires deps.pool with query()');
  }

  const log = logger || console;
  const requireCommandKey = typeof requireKey === 'function' ? requireKey : (req, res, next) => next();

  app.get('/api/memory/health', async (req, res) => {
    try {
      const health = await queryOne(
        pool,
        `SELECT id, error_count_1h, error_count_24h, build_success_rate, avg_response_ms, queue_depth, deployed_count, pending_ideas, open_bugs, snapshot_at
         FROM system_health_log
         ORDER BY snapshot_at DESC
         LIMIT 1`
      );
      res.json({ ok: true, health });
    } catch (error) {
      log.error?.({ err: error }, 'memory health route failed');
      res.status(500).json({ ok: false, error: 'failed_to_read_health' });
    }
  });

  app.get('/api/memory/conversations', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const offset = normalizeOffset(req.query.offset);
      const memoryType = pickNonEmptyString(req.query.memory_type);
      const aiMember = pickNonEmptyString(req.query.ai_member);

      const filters = [];
      const params = [];
      if (memoryType) {
        params.push(memoryType);
        filters.push({ sql: `memory_type = $${params.length}` });
      }
      if (aiMember) {
        params.push(aiMember);
        filters.push({ sql: `ai_member = $${params.length}` });
      }

      params.push(limit, offset);
      const sql = `
        SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        FROM conversation_memory
        ${filters.length ? `WHERE ${filters.map((f) => f.sql).join(' AND ')}` : ''}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      const rows = await queryMany(pool, sql, params);
      res.json({ ok: true, items: rows });
    } catch (error) {
      log.error?.({ err: error }, 'list conversation memories failed');
      res.status(500).json({ ok: false, error: 'failed_to_list_conversations' });
    }
  });

  app.get('/api/memory/memory-capsules', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const offset = normalizeOffset(req.query.offset);
      const status = pickNonEmptyString(req.query.status);
      const taskScope = pickNonEmptyString(req.query.task_scope);

      const params = [];
      const clauses = [];
      if (status) {
        params.push(status);
        clauses.push(`status = $${params.length}`);
      }
      if (taskScope) {
        params.push(taskScope);
        clauses.push(`task_scope = $${params.length}`);
      }

      params.push(limit, offset);
      const sql = `
        SELECT capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity,
               source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling,
               canonical_statement_id, fact_family_id, review_by, status, legacy_import_method,
               review_required, created_at, updated_at, id, owner_id, data
        FROM memory_capsules
        ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      const rows = await queryMany(pool, sql, params);
      res.json({ ok: true, items: rows });
    } catch (error) {
      log.error?.({ err: error }, 'list memory capsules failed');
      res.status(500).json({ ok: false, error: 'failed_to_list_memory_capsules' });
    }
  });

  app.get('/api/memory/working-memory', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const sessionId = pickNonEmptyString(req.query.session_id);
      const capsuleId = pickNonEmptyString(req.query.capsule_id);

      const params = [];
      const clauses = [];
      if (sessionId) {
        params.push(sessionId);
        clauses.push(`session_id = $${params.length}`);
      }
      if (capsuleId) {
        params.push(capsuleId);
        clauses.push(`capsule_id = $${params.length}`);
      }

      params.push(limit);
      const sql = `
        SELECT id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision,
               decision_ref, promoted_to_candidate, created_at
        FROM working_memory_entries
        ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
        ORDER BY created_at DESC
        LIMIT $${params.length}
      `;
      const rows = await queryMany(pool, sql, params);
      res.json({ ok: true, items: rows });
    } catch (error) {
      log.error?.({ err: error }, 'list working memory failed');
      res.status(500).json({ ok: false, error: 'failed_to_list_working_memory' });
    }
  });

  app.get('/api/memory/use-receipts', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const capsuleId = pickNonEmptyString(req.query.capsule_id);
      const taskScope = pickNonEmptyString(req.query.task_scope);

      const params = [];
      const clauses = [];
      if (capsuleId) {
        params.push(capsuleId);
        clauses.push(`capsule_id = $${params.length}`);
      }
      if (taskScope) {
        params.push(taskScope);
        clauses.push(`task_scope = $${params.length}`);
      }

      params.push(limit);
      const sql = `
        SELECT id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id,
               source_ref, created_by, created_at
        FROM memory_use_receipts
        ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
        ORDER BY created_at DESC
        LIMIT $${params.length}
      `;
      const rows = await queryMany(pool, sql, params);
      res.json({ ok: true, items: rows });
    } catch (error) {
      log.error?.({ err: error }, 'list use receipts failed');
      res.status(500).json({ ok: false, error: 'failed_to_list_use_receipts' });
    }
  });

  app.post('/api/memory/conversations', requireCommandKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const {
        memory_id,
        orchestrator_msg,
        ai_response,
        ai_member,
        key_facts,
        context_metadata,
        memory_type
      } = req.body || {};

      const result = await pool.query(
        `INSERT INTO conversation_memory (
           memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at`,
        [
          memory_id ?? null,
          orchestrator_msg ?? null,
          ai_response ?? null,
          ai_member ?? null,
          key_facts ?? null,
          context_metadata ?? null,
          memory_type ?? null
        ]
      );

      res.status(201).json({ ok: true, item: result.rows[0] });
    } catch (error) {
      log.error?.({ err: error }, 'create conversation memory failed');
      res.status(500).json({ ok: false, error: 'failed_to_create_conversation_memory' });
    }
  });

  app.post('/api/memory/memory-capsules', requireCommandKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const body = req.body || {};
      const result = await pool.query(
        `INSERT INTO memory_capsules (
           fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity,
           source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling,
           canonical_statement_id, fact_family_id, review_by, status, legacy_import_method,
           review_required, owner_id, data
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity,
                   source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling,
                   canonical_statement_id, fact_family_id, review_by, status, legacy_import_method,
                   review_required, created_at, updated_at, id, owner_id, data`,
        [
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
          body.owner_id ?? null,
          body.data ?? null
        ]
      );

      res.status(201).json({ ok: true, item: result.rows[0] });
    } catch (error) {
      log.error?.({ err: error }, 'create memory capsule failed');
      res.status(500).json({ ok: false, error: 'failed_to_create_memory_capsule' });
    }
  });

  app.post('/api/memory/working-memory', requireCommandKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const body = req.body || {};
      const result = await pool.query(
        `INSERT INTO working_memory_entries (
           session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision,
           decision_ref, promoted_to_candidate
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at,
                   used_in_decision, decision_ref, promoted_to_candidate, created_at`,
        [
          body.session_id ?? null,
          body.capsule_id ?? null,
          body.task_scope ?? null,
          body.retrieval_lane ?? null,
          body.entry_content ?? null,
          body.injected_at ?? null,
          body.used_in_decision ?? null,
          body.decision_ref ?? null,
          body.promoted_to_candidate ?? null
        ]
      );

      res.status(201).json({ ok: true, item: result.rows[0] });
    } catch (error) {
      log.error?.({ err: error }, 'create working memory entry failed');
      res.status(500).json({ ok: false, error: 'failed_to_create_working_memory_entry' });
    }
  });

  app.post('/api/memory/use-receipts', requireCommandKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const body = req.body || {};
      const result = await pool.query(
        `INSERT INTO memory_use_receipts (
           capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id, source_ref, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id,
                   source_ref, created_by, created_at`,
        [
          body.capsule_id ?? null,
          body.receipt_type ?? null,
          body.use_type ?? null,
          body.decision_ref ?? null,
          body.task_scope ?? null,
          body.retrieval_lane ?? null,
          body.signal_id ?? null,
          body.source_ref ?? null,
          body.created_by ?? null
        ]
      );

      res.status(201).json({ ok: true, item: result.rows[0] });
    } catch (error) {
      log.error?.({ err: error }, 'create use receipt failed');
      res.status(500).json({ ok: false, error: 'failed_to_create_use_receipt' });
    }
  });

  app.post('/api/memory/ask-council', requireCommandKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      if (typeof callCouncilMember !== 'function') {
        return res.status(501).json({ ok: false, error: 'ai_hook_unavailable' });
      }
      const role = pickNonEmptyString(req.body?.role) || 'memory';
      const prompt = pickNonEmptyString(req.body?.prompt);
      if (!prompt) {
        return res.status(400).json({ ok: false, error: 'prompt_required' });
      }
      const response = await callCouncilMember(role, prompt, req.body?.opts || {});
      res.json({ ok: true, response });
    } catch (error) {
      log.error?.({ err: error }, 'ask council failed');
      res.status(500).json({ ok: false, error: 'failed_to_call_council' });
    }
  });

  app.post('/api/memory/commit/capsule', requireCommandKey, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      if (typeof commitToGitHub !== 'function' && typeof commitManyToGitHub !== 'function') {
        return res.status(501).json({ ok: false, error: 'commit_hook_unavailable' });
      }
      const path = pickNonEmptyString(req.body?.path);
      const content = typeof req.body?.content === 'string' ? req.body.content : null;
      const message = pickNonEmptyString(req.body?.message) || 'Update memory artifact';
      if (!path || content == null) {
        return res.status(400).json({ ok: false, error: 'path_and_content_required' });
      }
      const result = await commitToGitHub(path, content, message);
      res.json({ ok: true, result: result ?? null, baseUrl: baseUrl ?? null });
    } catch (error) {
      log.error?.({ err: error }, 'commit memory artifact failed');
      res.status(500).json({ ok: false, error: 'failed_to_commit_memory_artifact' });
    }
  });

  log.info?.({ module: 'routes/memory_routes.js' }, 'memory routes registered');
}

export default registerMemoryRoutes;

/*
ASSUMPTIONS
- The memory routes are exposed under /api/memory to fit the existing app-style route layout implied by the platform context.
- Protected write routes use deps.requireKey as the command-key gate.
- Read routes are left unguarded to keep them usable for runtime introspection and operational tooling.
*/