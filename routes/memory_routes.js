/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 */
import express from 'express';

function getJsonBody(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function safeString(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function normalizePagination(query) {
  const limitRaw = Number.parseInt(query.limit, 10);
  const offsetRaw = Number.parseInt(query.offset, 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 25;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
  return { limit, offset };
}

async function listMemoryCapsules(pool, filters = {}) {
  const { limit, offset } = normalizePagination(filters);
  const clauses = [];
  const params = [];
  let idx = 1;

  if (filters.owner_id) {
    clauses.push(`owner_id = $${idx++}`);
    params.push(filters.owner_id);
  }
  if (filters.status) {
    clauses.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.capsule_type) {
    clauses.push(`capsule_type = $${idx++}`);
    params.push(filters.capsule_type);
  }
  if (filters.task_scope) {
    clauses.push(`task_scope = $${idx++}`);
    params.push(filters.task_scope);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await pool.query(
    `
      SELECT
        capsule_id,
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
        created_at,
        updated_at,
        id,
        owner_id,
        data
      FROM memory_capsules
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `,
    params,
  );

  return rows;
}

export function registerMemoryRoutes(app, deps) {
  const { pool, requireKey, callCouncilMember, logger, commitToGitHub, commitManyToGitHub } = deps || {};

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerMemoryRoutes: deps.pool is required');
  }

  app.get('/api/memory/capsules', async (req, res) => {
    try {
      const rows = await listMemoryCapsules(pool, {
        owner_id: req.query.owner_id,
        status: req.query.status,
        capsule_type: req.query.capsule_type,
        task_scope: req.query.task_scope,
        limit: req.query.limit,
        offset: req.query.offset,
      });
      res.json({ ok: true, capsules: rows });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory capsules list failed');
      res.status(500).json({ ok: false, error: 'Failed to list memory capsules' });
    }
  });

  app.get('/api/memory/capsules/:capsule_id', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `
          SELECT
            capsule_id,
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
            created_at,
            updated_at,
            id,
            owner_id,
            data
          FROM memory_capsules
          WHERE capsule_id = $1
          LIMIT 1
        `,
        [req.params.capsule_id],
      );

      if (!rows.length) {
        return res.status(404).json({ ok: false, error: 'Memory capsule not found' });
      }

      res.json({ ok: true, capsule: rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory capsule get failed');
      res.status(500).json({ ok: false, error: 'Failed to load memory capsule' });
    }
  });

  app.post('/api/memory/capsules', requireKey, async (req, res) => {
    try {
      const body = getJsonBody(req);

      const title = safeString(body.title).trim();
      if (!title) {
        return res.status(400).json({ ok: false, error: 'title is required' });
      }

      const insert = await pool.query(
        `
          INSERT INTO memory_capsules (
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
            data
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
          )
          RETURNING
            capsule_id,
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
            created_at,
            updated_at,
            id,
            owner_id,
            data
        `,
        [
          body.fact_id ?? null,
          title,
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
          body.status ?? 'active',
          body.legacy_import_method ?? null,
          body.review_required ?? null,
          body.owner_id ?? null,
          body.data ?? null,
        ],
      );

      res.status(201).json({ ok: true, capsule: insert.rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory capsule create failed');
      res.status(500).json({ ok: false, error: 'Failed to create memory capsule' });
    }
  });

  app.post('/api/memory/working-entries', requireKey, async (req, res) => {
    try {
      const body = getJsonBody(req);

      const insert = await pool.query(
        `
          INSERT INTO working_memory_entries (
            session_id,
            capsule_id,
            task_scope,
            retrieval_lane,
            entry_content,
            injected_at,
            used_in_decision,
            decision_ref,
            promoted_to_candidate
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING *
        `,
        [
          body.session_id ?? null,
          body.capsule_id ?? null,
          body.task_scope ?? null,
          body.retrieval_lane ?? null,
          body.entry_content ?? null,
          body.injected_at ?? null,
          body.used_in_decision ?? null,
          body.decision_ref ?? null,
          body.promoted_to_candidate ?? null,
        ],
      );

      res.status(201).json({ ok: true, entry: insert.rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'working memory entry create failed');
      res.status(500).json({ ok: false, error: 'Failed to create working memory entry' });
    }
  });

  app.get('/api/memory/receipts', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `
          SELECT *
          FROM memory_use_receipts
          ORDER BY created_at DESC
          LIMIT 100
        `,
      );
      res.json({ ok: true, receipts: rows });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory receipts list failed');
      res.status(500).json({ ok: false, error: 'Failed to list memory receipts' });
    }
  });

  app.post('/api/memory/receipts', requireKey, async (req, res) => {
    try {
      const body = getJsonBody(req);

      const insert = await pool.query(
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
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING *
        `,
        [
          body.capsule_id ?? null,
          body.receipt_type ?? null,
          body.use_type ?? null,
          body.decision_ref ?? null,
          body.task_scope ?? null,
          body.retrieval_lane ?? null,
          body.signal_id ?? null,
          body.source_ref ?? null,
          body.created_by ?? null,
        ],
      );

      res.status(201).json({ ok: true, receipt: insert.rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory receipt create failed');
      res.status(500).json({ ok: false, error: 'Failed to create memory receipt' });
    }
  });

  app.get('/api/memory/health', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `
          SELECT *
          FROM system_health_log
          ORDER BY snapshot_at DESC
          LIMIT 1
        `,
      );
      res.json({ ok: true, health: rows[0] ?? null });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory health read failed');
      res.status(500).json({ ok: false, error: 'Failed to load system health' });
    }
  });

  app.post('/api/memory/conversation', requireKey, async (req, res) => {
    try {
      const body = getJsonBody(req);

      const insert = await pool.query(
        `
          INSERT INTO conversation_memory (
            memory_id,
            orchestrator_msg,
            ai_response,
            ai_member,
            key_facts,
            context_metadata,
            memory_type
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)
          RETURNING *
        `,
        [
          body.memory_id ?? null,
          body.orchestrator_msg ?? null,
          body.ai_response ?? null,
          body.ai_member ?? null,
          body.key_facts ?? null,
          body.context_metadata ?? null,
          body.memory_type ?? null,
        ],
      );

      res.status(201).json({ ok: true, memory: insert.rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'conversation memory create failed');
      res.status(500).json({ ok: false, error: 'Failed to create conversation memory' });
    }
  });

  app.post('/api/memory/self-repair', requireKey, async (req, res) => {
    try {
      const body = getJsonBody(req);

      const insert = await pool.query(
        `
          INSERT INTO self_repair_memory_events (
            trigger,
            issue_detected,
            repair_chain_run,
            result,
            receipts_written,
            lesson_learned,
            prevention_rule,
            confidence,
            source_execution_id,
            repair_id,
            deploy_sha,
            proof_status_before,
            proof_status_after,
            duration_ms,
            classification,
            classification_signals,
            verification_path,
            triggered_by,
            fact_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
          RETURNING *
        `,
        [
          body.trigger ?? null,
          body.issue_detected ?? null,
          body.repair_chain_run ?? null,
          body.result ?? null,
          body.receipts_written ?? null,
          body.lesson_learned ?? null,
          body.prevention_rule ?? null,
          body.confidence ?? null,
          body.source_execution_id ?? null,
          body.repair_id ?? null,
          body.deploy_sha ?? null,
          body.proof_status_before ?? null,
          body.proof_status_after ?? null,
          body.duration_ms ?? null,
          body.classification ?? null,
          body.classification_signals ?? null,
          body.verification_path ?? null,
          body.triggered_by ?? null,
          body.fact_id ?? null,
        ],
      );

      res.status(201).json({ ok: true, event: insert.rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'self-repair memory event create failed');
      res.status(500).json({ ok: false, error: 'Failed to create self-repair memory event' });
    }
  });

  app.get('/api/memory/council/summary', async (req, res) => {
    try {
      if (typeof callCouncilMember !== 'function') {
        return res.status(500).json({ ok: false, error: 'AI council dependency unavailable' });
      }

      const topic = safeString(req.query.topic, 'memory routes status');
      const prompt = `Summarize the state of memory routes for topic: ${topic}. Keep it concise and operational.`;
      const response = await callCouncilMember('memory-architect', prompt, { baseUrl: deps?.baseUrl });
      res.json({ ok: true, summary: response });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory council summary failed');
      res.status(500).json({ ok: false, error: 'Failed to generate memory summary' });
    }
  });

  app.post('/api/memory/commit/capsules', requireKey, async (req, res) => {
    try {
      if (typeof commitManyToGitHub !== 'function' && typeof commitToGitHub !== 'function') {
        return res.status(500).json({ ok: false, error: 'GitHub commit dependency unavailable' });
      }

      const body = getJsonBody(req);
      const files = Array.isArray(body.files) ? body.files : [];
      const message = safeString(body.message, 'Update memory artifacts');

      if (typeof commitManyToGitHub === 'function') {
        const result = await commitManyToGitHub(files, message);
        return res.json({ ok: true, result });
      }

      if (files.length !== 1) {
        return res.status(400).json({ ok: false, error: 'Exactly one file is required when using single-file commit support' });
      }

      const result = await commitToGitHub(files[0].path, files[0].content, message);
      res.json({ ok: true, result });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory commit failed');
      res.status(500).json({ ok: false, error: 'Failed to commit memory artifacts' });
    }
  });
}

export default registerMemoryRoutes;