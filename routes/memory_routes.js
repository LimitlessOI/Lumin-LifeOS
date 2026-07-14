/**
 * SYNOPSIS: Exports registerMemoryRoutes — routes/memory_routes.js.
 */
import { randomUUID } from 'node:crypto';

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function') {
    return res.status(statusCode).json(payload);
  }
  res.statusCode = statusCode;
  if (typeof res.setHeader === 'function') {
    res.setHeader('content-type', 'application/json; charset=utf-8');
  }
  res.end(JSON.stringify(payload));
  return res;
}

function normalizeText(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function normalizeArrayLike(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }
  if (value == null) return [];
  return [value];
}

function pickMemoryRoutePayload(body = {}) {
  const memoryId = normalizeText(body.memory_id || body.memoryId);
  const orchestratorMsg = normalizeText(body.orchestrator_msg || body.orchestratorMsg);
  const aiResponse = normalizeText(body.ai_response || body.aiResponse);
  const aiMember = normalizeText(body.ai_member || body.aiMember);
  const memoryType = normalizeText(body.memory_type || body.memoryType);
  const keyFacts = body.key_facts ?? body.keyFacts ?? null;
  const contextMetadata = body.context_metadata ?? body.contextMetadata ?? null;

  return {
    memory_id: memoryId || null,
    orchestrator_msg: orchestratorMsg || null,
    ai_response: aiResponse || null,
    ai_member: aiMember || null,
    key_facts: keyFacts,
    context_metadata: contextMetadata,
    memory_type: memoryType || null,
  };
}

async function maybeCreateConversationMemoryViaDb(pool, payload) {
  const memoryId = payload.memory_id || randomUUID();
  const result = await pool.query(
    `INSERT INTO conversation_memory
      (memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at`,
    [
      memoryId,
      payload.orchestrator_msg,
      payload.ai_response,
      payload.ai_member,
      payload.key_facts,
      payload.context_metadata,
      payload.memory_type,
    ]
  );
  return result.rows[0];
}

export async function registerMemoryRoutes(app, deps = {}) {
  const { pool, requireKey, callCouncilMember, logger, baseUrl, commitToGitHub, commitManyToGitHub } = deps;

  app.get('/api/memory/health', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, error_count_1h, error_count_24h, build_success_rate, avg_response_ms, queue_depth, deployed_count, pending_ideas, open_bugs, snapshot_at
         FROM system_health_log
         ORDER BY snapshot_at DESC NULLS LAST, id DESC
         LIMIT 1`
      );
      return sendJson(res, 200, { ok: true, latest: rows[0] || null });
    } catch (error) {
      logger?.error?.({ error }, 'memory health query failed');
      return sendJson(res, 500, { ok: false, error: 'health_query_failed' });
    }
  });

  app.get('/api/memory/conversation', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
         FROM conversation_memory
         ORDER BY created_at DESC, id DESC
         LIMIT 100`
      );
      return sendJson(res, 200, { ok: true, items: rows });
    } catch (error) {
      logger?.error?.({ error }, 'conversation memory list failed');
      return sendJson(res, 500, { ok: false, error: 'conversation_list_failed' });
    }
  });

  app.post('/api/memory/conversation', requireKey, async (req, res) => {
    try {
      const payload = pickMemoryRoutePayload(req.body || {});
      const row = await maybeCreateConversationMemoryViaDb(pool, payload);
      return sendJson(res, 201, { ok: true, item: row });
    } catch (error) {
      logger?.error?.({ error }, 'conversation memory create failed');
      return sendJson(res, 500, { ok: false, error: 'conversation_create_failed' });
    }
  });

  app.get('/api/memory/capsules', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by, status, legacy_import_method, review_required, created_at, updated_at, id, owner_id, data
         FROM memory_capsules
         ORDER BY created_at DESC, id DESC
         LIMIT 100`
      );
      return sendJson(res, 200, { ok: true, items: rows });
    } catch (error) {
      logger?.error?.({ error }, 'memory capsules list failed');
      return sendJson(res, 500, { ok: false, error: 'capsules_list_failed' });
    }
  });

  app.get('/api/memory/working', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision, decision_ref, promoted_to_candidate, created_at
         FROM working_memory_entries
         ORDER BY created_at DESC, id DESC
         LIMIT 100`
      );
      return sendJson(res, 200, { ok: true, items: rows });
    } catch (error) {
      logger?.error?.({ error }, 'working memory list failed');
      return sendJson(res, 500, { ok: false, error: 'working_list_failed' });
    }
  });

  app.get('/api/memory/receipts', async (_req, res) => {
    try {
      const [useReceipts, importReceipts] = await Promise.all([
        pool.query(
          `SELECT id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id, source_ref, created_by, created_at
           FROM memory_use_receipts
           ORDER BY created_at DESC, id DESC
           LIMIT 100`
        ),
        pool.query(
          `SELECT id, source_table, source_row_id, import_method, import_batch_id, capsule_id, created_at
           FROM memory_import_receipts
           ORDER BY created_at DESC, id DESC
           LIMIT 100`
        ),
      ]);
      return sendJson(res, 200, { ok: true, use_receipts: useReceipts.rows, import_receipts: importReceipts.rows });
    } catch (error) {
      logger?.error?.({ error }, 'memory receipts list failed');
      return sendJson(res, 500, { ok: false, error: 'receipts_list_failed' });
    }
  });

  app.get('/api/memory/snapshots', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, snapshot_id, snapshot_data, version, reason, created_at
         FROM system_snapshots
         ORDER BY created_at DESC, id DESC
         LIMIT 100`
      );
      return sendJson(res, 200, { ok: true, items: rows });
    } catch (error) {
      logger?.error?.({ error }, 'system snapshots list failed');
      return sendJson(res, 500, { ok: false, error: 'snapshots_list_failed' });
    }
  });

  app.post('/api/memory/snapshot', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const snapshotId = normalizeText(body.snapshot_id || body.snapshotId) || randomUUID();
      const snapshotData = body.snapshot_data ?? body.snapshotData ?? body.data ?? null;
      const version = normalizeText(body.version) || null;
      const reason = normalizeText(body.reason) || null;

      const { rows } = await pool.query(
        `INSERT INTO system_snapshots (snapshot_id, snapshot_data, version, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING id, snapshot_id, snapshot_data, version, reason, created_at`,
        [snapshotId, snapshotData, version, reason]
      );

      return sendJson(res, 201, { ok: true, item: rows[0] });
    } catch (error) {
      logger?.error?.({ error }, 'system snapshot create failed');
      return sendJson(res, 500, { ok: false, error: 'snapshot_create_failed' });
    }
  });

  app.post('/api/memory/council', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const role = normalizeText(body.role);
      const prompt = normalizeText(body.prompt);
      const opts = body.opts && typeof body.opts === 'object' ? body.opts : undefined;

      if (!role || !prompt) {
        return sendJson(res, 400, { ok: false, error: 'role_and_prompt_required' });
      }

      const response = await callCouncilMember(role, prompt, opts);
      return sendJson(res, 200, { ok: true, role, response });
    } catch (error) {
      logger?.error?.({ error }, 'council call failed');
      return sendJson(res, 500, { ok: false, error: 'council_call_failed' });
    }
  });

  app.post('/api/memory/commit', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const path = normalizeText(body.path);
      const content = typeof body.content === 'string' ? body.content : null;
      const message = normalizeText(body.message) || 'update memory routes';

      if (!path || !content) {
        return sendJson(res, 400, { ok: false, error: 'path_and_content_required' });
      }

      if (typeof commitToGitHub === 'function') {
        const result = await commitToGitHub(path, content, message);
        return sendJson(res, 200, { ok: true, result: result ?? null });
      }

      if (typeof commitManyToGitHub === 'function') {
        const result = await commitManyToGitHub([{ path, content }], message);
        return sendJson(res, 200, { ok: true, result: result ?? null });
      }

      return sendJson(res, 501, { ok: false, error: 'commit_hook_unavailable' });
    } catch (error) {
      logger?.error?.({ error }, 'commit route failed');
      return sendJson(res, 500, { ok: false, error: 'commit_failed' });
    }
  });

  logger?.info?.({ baseUrl }, 'memory routes registered');
}

export default registerMemoryRoutes;