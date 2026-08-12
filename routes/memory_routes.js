/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
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

function parseLimit(raw, fallback = 20, max = 100) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

async function queryDb(pool, sql, params = []) {
  const result = await pool.query(sql, params);
  return result?.rows ?? [];
}

export function registerMemoryRoutes(app, deps) {
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerMemoryRoutes requires an Express app');
  }
  if (!deps || !deps.pool) {
    throw new Error('registerMemoryRoutes requires deps.pool');
  }

  const { pool, requireKey, callCouncilMember, logger, commitToGitHub, commitManyToGitHub, baseUrl } = deps;

  app.get('/api/memory/health', async (req, res) => {
    try {
      const rows = await queryDb(
        pool,
        `SELECT id, error_count_1h, error_count_24h, build_success_rate, avg_response_ms, queue_depth, deployed_count, pending_ideas, open_bugs, snapshot_at
         FROM system_health_log
         ORDER BY snapshot_at DESC NULLS LAST, id DESC
         LIMIT 1`
      );

      res.json({ ok: true, health: rows[0] ?? null });
    } catch (error) {
      logger?.error?.({ error }, 'memory health route failed');
      res.status(500).json({ ok: false, error: 'Failed to load memory health' });
    }
  });

  app.get('/api/memory/capsules', requireKey, async (req, res) => {
    try {
      const limit = parseLimit(req.query?.limit, 20, 100);
      const ownerId = req.query?.owner_id ?? req.query?.ownerId ?? null;
      const status = req.query?.status ?? null;

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
      const sql = `
        SELECT capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity,
               source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling,
               canonical_statement_id, fact_family_id, review_by, status, legacy_import_method,
               review_required, created_at, updated_at, id, owner_id, data
        FROM memory_capsules
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT $${params.length}
      `;
      const rows = await queryDb(pool, sql, params);
      res.json({ ok: true, capsules: rows });
    } catch (error) {
      logger?.error?.({ error }, 'list memory capsules failed');
      res.status(500).json({ ok: false, error: 'Failed to load memory capsules' });
    }
  });

  app.post('/api/memory/capsules', requireKey, async (req, res) => {
    try {
      const body = req.body ?? {};
      const {
        fact_id = null,
        title = null,
        capsule_type = null,
        truth_class = null,
        trust_level = null,
        evidence_level = null,
        sensitivity = null,
        source_type = null,
        source_ref = null,
        retrieval_permission = null,
        task_scope = null,
        retrieval_lane_ceiling = null,
        canonical_statement_id = null,
        fact_family_id = null,
        review_by = null,
        status = null,
        legacy_import_method = null,
        review_required = null,
        owner_id = null,
        data = null,
      } = body;

      const result = await pool.query(
        `INSERT INTO memory_capsules
          (fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref,
           retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by,
           status, legacy_import_method, review_required, owner_id, data)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity,
                   source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling,
                   canonical_statement_id, fact_family_id, review_by, status, legacy_import_method,
                   review_required, created_at, updated_at, id, owner_id, data`,
        [
          fact_id,
          title,
          capsule_type,
          truth_class,
          trust_level,
          evidence_level,
          sensitivity,
          source_type,
          source_ref,
          retrieval_permission,
          task_scope,
          retrieval_lane_ceiling,
          canonical_statement_id,
          fact_family_id,
          review_by,
          status,
          legacy_import_method,
          review_required,
          owner_id,
          data,
        ]
      );

      res.status(201).json({ ok: true, capsule: result.rows[0] ?? null });
    } catch (error) {
      logger?.error?.({ error }, 'create memory capsule failed');
      res.status(500).json({ ok: false, error: 'Failed to create memory capsule' });
    }
  });

  app.get('/api/memory/entries', requireKey, async (req, res) => {
    try {
      const limit = parseLimit(req.query?.limit, 50, 200);
      const sessionId = req.query?.session_id ?? req.query?.sessionId ?? null;
      const capsuleId = req.query?.capsule_id ?? req.query?.capsuleId ?? null;

      const where = [];
      const params = [];
      if (sessionId) {
        params.push(sessionId);
        where.push(`session_id = $${params.length}`);
      }
      if (capsuleId) {
        params.push(capsuleId);
        where.push(`capsule_id = $${params.length}`);
      }

      params.push(limit);
      const rows = await queryDb(
        pool,
        `
        SELECT id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at,
               used_in_decision, decision_ref, promoted_to_candidate, created_at
        FROM working_memory_entries
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT $${params.length}
      `,
        params
      );

      res.json({ ok: true, entries: rows });
    } catch (error) {
      logger?.error?.({ error }, 'list working memory entries failed');
      res.status(500).json({ ok: false, error: 'Failed to load working memory entries' });
    }
  });

  app.post('/api/memory/entries', requireKey, async (req, res) => {
    try {
      const body = req.body ?? {};
      const result = await pool.query(
        `INSERT INTO working_memory_entries
          (session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision, decision_ref, promoted_to_candidate)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at,
                   used_in_decision, decision_ref, promoted_to_candidate, created_at`,
        [
          body.session_id ?? body.sessionId ?? null,
          body.capsule_id ?? body.capsuleId ?? null,
          body.task_scope ?? body.taskScope ?? null,
          body.retrieval_lane ?? body.retrievalLane ?? null,
          body.entry_content ?? body.entryContent ?? null,
          body.injected_at ?? body.injectedAt ?? null,
          body.used_in_decision ?? body.usedInDecision ?? null,
          body.decision_ref ?? body.decisionRef ?? null,
          body.promoted_to_candidate ?? body.promotedToCandidate ?? null,
        ]
      );

      res.status(201).json({ ok: true, entry: result.rows[0] ?? null });
    } catch (error) {
      logger?.error?.({ error }, 'create working memory entry failed');
      res.status(500).json({ ok: false, error: 'Failed to create working memory entry' });
    }
  });

  app.get('/api/memory/receipts', requireKey, async (req, res) => {
    try {
      const limit = parseLimit(req.query?.limit, 50, 200);
      const capsuleId = req.query?.capsule_id ?? req.query?.capsuleId ?? null;

      const params = [];
      const where = [];
      if (capsuleId) {
        params.push(capsuleId);
        where.push(`capsule_id = $${params.length}`);
      }
      params.push(limit);

      const rows = await queryDb(
        pool,
        `
        SELECT id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id,
               source_ref, created_by, created_at
        FROM memory_use_receipts
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT $${params.length}
      `,
        params
      );

      res.json({ ok: true, receipts: rows });
    } catch (error) {
      logger?.error?.({ error }, 'list memory receipts failed');
      res.status(500).json({ ok: false, error: 'Failed to load memory receipts' });
    }
  });

  app.post('/api/memory/receipts', requireKey, async (req, res) => {
    try {
      const body = req.body ?? {};
      const result = await pool.query(
        `INSERT INTO memory_use_receipts
          (capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id, source_ref, created_by)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id,
                   source_ref, created_by, created_at`,
        [
          body.capsule_id ?? body.capsuleId ?? null,
          body.receipt_type ?? body.receiptType ?? null,
          body.use_type ?? body.useType ?? null,
          body.decision_ref ?? body.decisionRef ?? null,
          body.task_scope ?? body.taskScope ?? null,
          body.retrieval_lane ?? body.retrievalLane ?? null,
          body.signal_id ?? body.signalId ?? null,
          body.source_ref ?? body.sourceRef ?? null,
          body.created_by ?? body.createdBy ?? null,
        ]
      );

      res.status(201).json({ ok: true, receipt: result.rows[0] ?? null });
    } catch (error) {
      logger?.error?.({ error }, 'create memory use receipt failed');
      res.status(500).json({ ok: false, error: 'Failed to create memory use receipt' });
    }
  });

  app.get('/api/memory/snapshots', requireKey, async (req, res) => {
    try {
      const limit = parseLimit(req.query?.limit, 20, 100);
      const rows = await queryDb(
        pool,
        `SELECT id, snapshot_id, snapshot_data, version, reason, created_at
         FROM system_snapshots
         ORDER BY created_at DESC NULLS LAST, id DESC
         LIMIT $1`,
        [limit]
      );
      res.json({ ok: true, snapshots: rows });
    } catch (error) {
      logger?.error?.({ error }, 'list snapshots failed');
      res.status(500).json({ ok: false, error: 'Failed to load snapshots' });
    }
  });

  app.post('/api/memory/snapshots', requireKey, async (req, res) => {
    try {
      const body = req.body ?? {};
      const result = await pool.query(
        `INSERT INTO system_snapshots (snapshot_id, snapshot_data, version, reason)
         VALUES ($1,$2,$3,$4)
         RETURNING id, snapshot_id, snapshot_data, version, reason, created_at`,
        [
          body.snapshot_id ?? body.snapshotId ?? null,
          body.snapshot_data ?? body.snapshotData ?? null,
          body.version ?? null,
          body.reason ?? null,
        ]
      );
      res.status(201).json({ ok: true, snapshot: result.rows[0] ?? null });
    } catch (error) {
      logger?.error?.({ error }, 'create snapshot failed');
      res.status(500).json({ ok: false, error: 'Failed to create snapshot' });
    }
  });

  app.post('/api/memory/never-stop', requireKey, async (req, res) => {
    try {
      const body = req.body ?? {};
      const prompt = typeof body.prompt === 'string' && body.prompt.trim()
        ? body.prompt.trim()
        : 'Generate a concise never-stop memory note with key facts and next action.';
      const role = body.role ?? 'memory_orchestrator';
      const aiResponse = await callCouncilMember(role, prompt, body.opts ?? {});
      const keyFacts = body.key_facts ?? body.keyFacts ?? null;
      const contextMetadata = body.context_metadata ?? body.contextMetadata ?? null;
      const memoryType = body.memory_type ?? body.memoryType ?? 'never-stop';

      const insert = await pool.query(
        `INSERT INTO conversation_memory
          (memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at`,
        [
          body.memory_id ?? body.memoryId ?? null,
          prompt,
          aiResponse,
          role,
          keyFacts,
          contextMetadata,
          memoryType,
        ]
      );

      res.status(201).json({ ok: true, memory: insert.rows[0] ?? null });
    } catch (error) {
      logger?.error?.({ error }, 'never-stop memory write failed');
      res.status(500).json({ ok: false, error: 'Failed to write memory' });
    }
  });

  app.get('/api/memory/source-of-truth', requireKey, async (req, res) => {
    try {
      const documentType = req.query?.document_type ?? req.query?.documentType ?? null;
      const rows = await queryDb(
        pool,
        `
        SELECT id, document_type, version, title, content, section, is_active, priority, created_at, updated_at, document
        FROM system_source_of_truth
        ${documentType ? 'WHERE document_type = $1' : ''}
        ORDER BY priority DESC NULLS LAST, version DESC NULLS LAST, id DESC
        LIMIT 100
      `,
        documentType ? [documentType] : []
      );
      res.json({ ok: true, documents: rows });
    } catch (error) {
      logger?.error?.({ error }, 'load source of truth failed');
      res.status(500).json({ ok: false, error: 'Failed to load source of truth' });
    }
  });

  if (commitToGitHub || commitManyToGitHub || baseUrl) {
    logger?.info?.({ baseUrl }, 'memory routes registered');
  }
}

export default registerMemoryRoutes;