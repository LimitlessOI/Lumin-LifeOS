/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 */
import { randomUUID } from 'node:crypto';

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

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

function parseLimit(value, fallback = 50, max = 200) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function getMemoryTypeFromBody(body) {
  return body?.memory_type ?? body?.type ?? body?.category ?? 'general';
}

function getTextField(body, keys, fallback = '') {
  for (const key of keys) {
    const value = body?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function createMemoryRoutesResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    memory_id: row.memory_id,
    orchestrator_msg: row.orchestrator_msg,
    ai_response: row.ai_response,
    ai_member: row.ai_member,
    key_facts: safeJsonParse(row.key_facts, row.key_facts),
    context_metadata: safeJsonParse(row.context_metadata, row.context_metadata),
    memory_type: row.memory_type,
    created_at: row.created_at,
  };
}

export function registerMemoryRoutes(app, deps) {
  const { pool, requireKey, callCouncilMember, logger, baseUrl, commitToGitHub, commitManyToGitHub } = deps || {};

  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerMemoryRoutes requires an Express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerMemoryRoutes requires deps.pool');
  }

  app.get('/api/memory', async (req, res) => {
    try {
      const limit = parseLimit(req.query?.limit, 50, 200);
      const offset = Math.max(0, Number.parseInt(req.query?.offset, 10) || 0);
      const memoryType = typeof req.query?.memory_type === 'string' ? req.query.memory_type.trim() : '';
      const memoryId = typeof req.query?.memory_id === 'string' ? req.query.memory_id.trim() : '';

      const where = [];
      const params = [];
      let idx = 1;

      if (memoryId) {
        where.push(`memory_id = $${idx++}`);
        params.push(memoryId);
      }
      if (memoryType) {
        where.push(`memory_type = $${idx++}`);
        params.push(memoryType);
      }

      const sql = `
        SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        FROM conversation_memory
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      params.push(limit, offset);

      const result = await pool.query(sql, params);
      res.json({
        ok: true,
        count: result.rowCount ?? normalizeRows(result.rows).length,
        items: normalizeRows(result.rows).map(createMemoryRoutesResponse),
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'GET /api/memory failed');
      res.status(500).json({ ok: false, error: 'failed_to_list_memory' });
    }
  });

  app.get('/api/memory/:memoryId', async (req, res) => {
    try {
      const memoryId = String(req.params?.memoryId || '').trim();
      if (!memoryId) {
        return res.status(400).json({ ok: false, error: 'memory_id_required' });
      }

      const result = await pool.query(
        `
          SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
          FROM conversation_memory
          WHERE memory_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [memoryId],
      );

      const row = result.rows?.[0] || null;
      if (!row) {
        return res.status(404).json({ ok: false, error: 'memory_not_found' });
      }

      res.json({ ok: true, item: createMemoryRoutesResponse(row) });
    } catch (error) {
      logger?.error?.({ err: error }, 'GET /api/memory/:memoryId failed');
      res.status(500).json({ ok: false, error: 'failed_to_load_memory' });
    }
  });

  app.post('/api/memory', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const memoryId = getTextField(body, ['memory_id'], randomUUID());
      const memoryType = getMemoryTypeFromBody(body);
      const orchestratorMsg = getTextField(body, ['orchestrator_msg', 'message', 'prompt', 'text']);
      const aiMember = getTextField(body, ['ai_member', 'member', 'role']);
      const aiResponse = getTextField(body, ['ai_response', 'response', 'output']);
      const keyFacts = body?.key_facts ?? body?.facts ?? null;
      const contextMetadata = body?.context_metadata ?? body?.metadata ?? null;

      if (!orchestratorMsg) {
        return res.status(400).json({ ok: false, error: 'orchestrator_msg_required' });
      }

      const result = await pool.query(
        `
          INSERT INTO conversation_memory (
            memory_id,
            orchestrator_msg,
            ai_response,
            ai_member,
            key_facts,
            context_metadata,
            memory_type
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        `,
        [
          memoryId,
          orchestratorMsg,
          aiResponse || null,
          aiMember || null,
          keyFacts == null ? null : JSON.stringify(keyFacts),
          contextMetadata == null ? null : JSON.stringify(contextMetadata),
          memoryType,
        ],
      );

      const row = result.rows?.[0] || null;
      res.status(201).json({ ok: true, item: createMemoryRoutesResponse(row) });
    } catch (error) {
      logger?.error?.({ err: error }, 'POST /api/memory failed');
      res.status(500).json({ ok: false, error: 'failed_to_create_memory' });
    }
  });

  app.post('/api/memory/council', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const role = getTextField(body, ['role'], 'memory');
      const prompt = getTextField(body, ['prompt', 'input', 'question', 'message']);
      const memoryType = getMemoryTypeFromBody(body);

      if (!prompt) {
        return res.status(400).json({ ok: false, error: 'prompt_required' });
      }

      const aiResponse = await callCouncilMember(role, prompt, body?.opts || body?.options || undefined);

      const inserted = await pool.query(
        `
          INSERT INTO conversation_memory (
            memory_id,
            orchestrator_msg,
            ai_response,
            ai_member,
            key_facts,
            context_metadata,
            memory_type
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        `,
        [
          randomUUID(),
          prompt,
          aiResponse,
          role,
          null,
          JSON.stringify({
            source: 'council',
            base_url: baseUrl || null,
          }),
          memoryType,
        ],
      );

      res.status(201).json({
        ok: true,
        ai_response: aiResponse,
        item: createMemoryRoutesResponse(inserted.rows?.[0] || null),
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'POST /api/memory/council failed');
      res.status(500).json({ ok: false, error: 'failed_to_run_memory_council' });
    }
  });

  app.get('/api/memory/health', async (_req, res) => {
    try {
      const result = await pool.query(
        `
          SELECT snapshot_at, error_count_1h, error_count_24h, build_success_rate, avg_response_ms, queue_depth, deployed_count, pending_ideas, open_bugs
          FROM system_health_log
          ORDER BY snapshot_at DESC
          LIMIT 1
        `,
      );
      res.json({ ok: true, item: result.rows?.[0] || null });
    } catch (error) {
      logger?.error?.({ err: error }, 'GET /api/memory/health failed');
      res.status(500).json({ ok: false, error: 'failed_to_load_health' });
    }
  });

  app.post('/api/memory/commit', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const path = getTextField(body, ['path']);
      const content = typeof body?.content === 'string' ? body.content : '';
      const message = getTextField(body, ['message'], 'update memory route module');

      if (!path || !content) {
        return res.status(400).json({ ok: false, error: 'path_and_content_required' });
      }

      const result = commitToGitHub ? await commitToGitHub(path, content, message) : null;
      res.json({ ok: true, result: result ?? null });
    } catch (error) {
      logger?.error?.({ err: error }, 'POST /api/memory/commit failed');
      res.status(500).json({ ok: false, error: 'failed_to_commit_file' });
    }
  });

  app.post('/api/memory/commit-many', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const files = Array.isArray(body?.files) ? body.files : [];
      const message = getTextField(body, ['message'], 'update memory route module');

      if (!files.length) {
        return res.status(400).json({ ok: false, error: 'files_required' });
      }

      const normalizedFiles = files
        .filter((file) => file && typeof file.path === 'string' && typeof file.content === 'string')
        .map((file) => ({ path: file.path, content: file.content }));

      if (!normalizedFiles.length) {
        return res.status(400).json({ ok: false, error: 'valid_files_required' });
      }

      const result = commitManyToGitHub ? await commitManyToGitHub(normalizedFiles, message) : null;
      res.json({ ok: true, result: result ?? null });
    } catch (error) {
      logger?.error?.({ err: error }, 'POST /api/memory/commit-many failed');
      res.status(500).json({ ok: false, error: 'failed_to_commit_files' });
    }
  });

  logger?.info?.({ mounted: true, routes: ['/api/memory', '/api/memory/:memoryId', '/api/memory/council', '/api/memory/health'] }, 'memory routes registered');
}

export default registerMemoryRoutes;