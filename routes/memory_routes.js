/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 */
import express from 'express';

function asJson(res, status, payload) {
  return res.status(status).json(payload);
}

function normalizeLimit(value, fallback = 50, max = 200) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function normalizeOffset(value, fallback = 0) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function pickKnownMemoryFields(body = {}) {
  return {
    session_id: body.session_id ?? null,
    capsule_id: body.capsule_id ?? null,
    task_scope: body.task_scope ?? null,
    retrieval_lane: body.retrieval_lane ?? null,
    entry_content: body.entry_content ?? null,
    used_in_decision: body.used_in_decision ?? null,
    decision_ref: body.decision_ref ?? null,
    promoted_to_candidate: body.promoted_to_candidate ?? null
  };
}

export function registerMemoryRoutes(app, deps) {
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerMemoryRoutes requires an Express app');
  }
  if (!deps || typeof deps.pool?.query !== 'function') {
    throw new Error('registerMemoryRoutes requires deps.pool');
  }

  const { pool, requireKey, logger, callCouncilMember, baseUrl, commitToGitHub, commitManyToGitHub } = deps;
  const auth = typeof requireKey === 'function' ? requireKey : (req, res, next) => next();

  app.get('/api/memory', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const offset = normalizeOffset(req.query.offset, 0);
      const scope = typeof req.query.task_scope === 'string' ? req.query.task_scope.trim() : '';
      const lane = typeof req.query.retrieval_lane === 'string' ? req.query.retrieval_lane.trim() : '';

      const where = [];
      const params = [];

      if (scope) {
        params.push(scope);
        where.push(`task_scope = $${params.length}`);
      }
      if (lane) {
        params.push(lane);
        where.push(`retrieval_lane = $${params.length}`);
      }

      params.push(limit, offset);

      const sql = `
        SELECT id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision, decision_ref, promoted_to_candidate, created_at
        FROM working_memory_entries
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const { rows } = await pool.query(sql, params);
      return asJson(res, 200, { ok: true, items: rows, limit, offset });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory routes: list working memory failed');
      return asJson(res, 500, { ok: false, error: 'Failed to list memory entries' });
    }
  });

  app.get('/api/memory/capsules', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const offset = normalizeOffset(req.query.offset, 0);
      const scope = typeof req.query.task_scope === 'string' ? req.query.task_scope.trim() : '';
      const lane = typeof req.query.retrieval_lane === 'string' ? req.query.retrieval_lane.trim() : '';
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

      const where = [];
      const params = [];

      if (scope) {
        params.push(scope);
        where.push(`task_scope = $${params.length}`);
      }
      if (lane) {
        params.push(lane);
        where.push(`retrieval_lane_ceiling = $${params.length}`);
      }
      if (status) {
        params.push(status);
        where.push(`status = $${params.length}`);
      }

      params.push(limit, offset);

      const sql = `
        SELECT capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by, status, legacy_import_method, review_required, created_at, updated_at, id, owner_id, data
        FROM memory_capsules
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const { rows } = await pool.query(sql, params);
      return asJson(res, 200, { ok: true, items: rows, limit, offset });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory routes: list capsules failed');
      return asJson(res, 500, { ok: false, error: 'Failed to list memory capsules' });
    }
  });

  app.get('/api/memory/palace', async (req, res) => {
    try {
      const limit = normalizeLimit(req.query.limit, 50, 200);
      const offset = normalizeOffset(req.query.offset, 0);
      const userId = typeof req.query.user_id === 'string' ? req.query.user_id.trim() : '';

      const params = [];
      const where = [];
      if (userId) {
        params.push(userId);
        where.push(`user_id = $${params.length}`);
      }

      params.push(limit, offset);

      const sql = `
        SELECT id, user_id, memory_title, place, memory_text, sensory_details, sounds, smells, feels, significance, artifact_ids
        FROM memory_palace
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY id DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const { rows } = await pool.query(sql, params);
      return asJson(res, 200, { ok: true, items: rows, limit, offset });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory routes: list palace failed');
      return asJson(res, 500, { ok: false, error: 'Failed to list memory palace entries' });
    }
  });

  app.post('/api/memory/entries', auth, async (req, res) => {
    try {
      const body = req.body ?? {};
      if (!isNonEmptyString(body.entry_content)) {
        return asJson(res, 400, { ok: false, error: 'entry_content is required' });
      }

      const fields = pickKnownMemoryFields(body);
      const { rows } = await pool.query(
        `
        INSERT INTO working_memory_entries
          (session_id, capsule_id, task_scope, retrieval_lane, entry_content, used_in_decision, decision_ref, promoted_to_candidate)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision, decision_ref, promoted_to_candidate, created_at
        `,
        [
          fields.session_id,
          fields.capsule_id,
          fields.task_scope,
          fields.retrieval_lane,
          fields.entry_content,
          fields.used_in_decision,
          fields.decision_ref,
          fields.promoted_to_candidate
        ]
      );

      return asJson(res, 201, { ok: true, item: rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory routes: create working memory failed');
      return asJson(res, 500, { ok: false, error: 'Failed to create memory entry' });
    }
  });

  app.post('/api/memory/use-receipts', auth, async (req, res) => {
    try {
      const body = req.body ?? {};
      if (!isNonEmptyString(body.capsule_id)) {
        return asJson(res, 400, { ok: false, error: 'capsule_id is required' });
      }
      if (!isNonEmptyString(body.receipt_type)) {
        return asJson(res, 400, { ok: false, error: 'receipt_type is required' });
      }

      const { rows } = await pool.query(
        `
        INSERT INTO memory_use_receipts
          (capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id, source_ref, created_by)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id, source_ref, created_by, created_at
        `,
        [
          body.capsule_id,
          body.receipt_type,
          body.use_type ?? null,
          body.decision_ref ?? null,
          body.task_scope ?? null,
          body.retrieval_lane ?? null,
          body.signal_id ?? null,
          body.source_ref ?? null,
          body.created_by ?? null
        ]
      );

      return asJson(res, 201, { ok: true, item: rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory routes: create use receipt failed');
      return asJson(res, 500, { ok: false, error: 'Failed to create memory use receipt' });
    }
  });

  app.post('/api/memory/repair-events', auth, async (req, res) => {
    try {
      const body = req.body ?? {};
      if (!isNonEmptyString(body.trigger)) {
        return asJson(res, 400, { ok: false, error: 'trigger is required' });
      }

      const { rows } = await pool.query(
        `
        INSERT INTO self_repair_memory_events
          (trigger, issue_detected, repair_chain_run, result, receipts_written, lesson_learned, prevention_rule, confidence, source_execution_id, repair_id, deploy_sha, proof_status_before, proof_status_after, duration_ms, classification, classification_signals, verification_path, triggered_by, fact_id)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        RETURNING *
        `,
        [
          body.trigger,
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
          body.fact_id ?? null
        ]
      );

      return asJson(res, 201, { ok: true, item: rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory routes: create repair event failed');
      return asJson(res, 500, { ok: false, error: 'Failed to create repair event' });
    }
  });

  app.post('/api/memory/council', auth, async (req, res) => {
    try {
      if (typeof callCouncilMember !== 'function') {
        return asJson(res, 501, { ok: false, error: 'Council member AI hook unavailable' });
      }

      const body = req.body ?? {};
      const role = isNonEmptyString(body.role) ? body.role.trim() : 'memory';
      const prompt = isNonEmptyString(body.prompt) ? body.prompt.trim() : null;

      if (!prompt) {
        return asJson(res, 400, { ok: false, error: 'prompt is required' });
      }

      const response = await callCouncilMember(role, prompt, body.opts ?? {});
      return asJson(res, 200, { ok: true, role, response });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory routes: council call failed');
      return asJson(res, 500, { ok: false, error: 'Failed to call council member' });
    }
  });

  app.get('/api/memory/health', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `
        SELECT id, error_count_1h, error_count_24h, build_success_rate, avg_response_ms, queue_depth, deployed_count, pending_ideas, open_bugs, snapshot_at
        FROM system_health_log
        ORDER BY snapshot_at DESC NULLS LAST, id DESC
        LIMIT 1
        `
      );

      return asJson(res, 200, { ok: true, item: rows[0] ?? null });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory routes: health read failed');
      return asJson(res, 500, { ok: false, error: 'Failed to read health snapshot' });
    }
  });

  app.post('/api/memory/commit', auth, async (req, res) => {
    try {
      const body = req.body ?? {};
      const path = isNonEmptyString(body.path) ? body.path.trim() : '';
      const content = typeof body.content === 'string' ? body.content : '';
      const message = isNonEmptyString(body.message) ? body.message.trim() : 'Update memory routes';

      if (!path || !content) {
        return asJson(res, 400, { ok: false, error: 'path and content are required' });
      }
      if (typeof commitToGitHub !== 'function') {
        return asJson(res, 501, { ok: false, error: 'GitHub commit hook unavailable' });
      }

      const result = await commitToGitHub(path, content, message);
      return asJson(res, 200, { ok: true, result, baseUrl: baseUrl ?? null });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory routes: commit failed');
      return asJson(res, 500, { ok: false, error: 'Failed to commit file' });
    }
  });

  app.post('/api/memory/commit-many', auth, async (req, res) => {
    try {
      const body = req.body ?? {};
      const files = Array.isArray(body.files) ? body.files : [];
      const message = isNonEmptyString(body.message) ? body.message.trim() : 'Update memory routes';
      if (!files.length) {
        return asJson(res, 400, { ok: false, error: 'files is required' });
      }
      if (typeof commitManyToGitHub !== 'function') {
        return asJson(res, 501, { ok: false, error: 'GitHub bulk commit hook unavailable' });
      }

      const result = await commitManyToGitHub(files, message);
      return asJson(res, 200, { ok: true, result, baseUrl: baseUrl ?? null });
    } catch (error) {
      logger?.error?.({ err: error }, 'memory routes: bulk commit failed');
      return asJson(res, 500, { ok: false, error: 'Failed to commit files' });
    }
  });

  logger?.info?.({ mounted: true }, 'memory routes registered');
}

export default registerMemoryRoutes;