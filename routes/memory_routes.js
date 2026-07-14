/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 */
export function registerMemoryRoutes(app, deps) {
  const { pool, requireKey, logger, callCouncilMember, baseUrl, commitToGitHub, commitManyToGitHub } = deps || {};

  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerMemoryRoutes requires an Express app');
  }

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerMemoryRoutes requires deps.pool with query(sql, params)');
  }

  const log = logger || console;

  const json = (res, status, body) => res.status(status).json(body);

  const safeLimit = (value, fallback = 50, max = 200) => {
    const n = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(n, max);
  };

  const safeOffset = (value) => {
    const n = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  app.get('/api/memory/health', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        'select error_count_1h, error_count_24h, build_success_rate, avg_response_ms, queue_depth, deployed_count, pending_ideas, open_bugs, snapshot_at from system_health_log order by snapshot_at desc nulls last limit 1'
      );
      return json(res, 200, { ok: true, latest: rows[0] || null });
    } catch (error) {
      log.error?.({ error }, 'memory health route failed');
      return json(res, 500, { ok: false, error: 'failed_to_fetch_memory_health' });
    }
  });

  app.get('/api/memory/conversations', async (req, res) => {
    try {
      const limit = safeLimit(req.query?.limit, 50, 200);
      const offset = safeOffset(req.query?.offset);
      const { rows } = await pool.query(
        `select id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
         from conversation_memory
         order by created_at desc
         limit $1 offset $2`,
        [limit, offset]
      );
      return json(res, 200, { ok: true, rows, limit, offset });
    } catch (error) {
      log.error?.({ error }, 'list conversation memory failed');
      return json(res, 500, { ok: false, error: 'failed_to_list_conversation_memory' });
    }
  });

  app.get('/api/memory/capsules', async (req, res) => {
    try {
      const limit = safeLimit(req.query?.limit, 50, 200);
      const offset = safeOffset(req.query?.offset);
      const status = req.query?.status ? String(req.query.status) : null;

      const params = [limit, offset];
      let where = '';
      if (status) {
        params.push(status);
        where = `where status = $3`;
      }

      const { rows } = await pool.query(
        `select capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by, status, legacy_import_method, review_required, created_at, updated_at, id, owner_id, data
         from memory_capsules
         ${where}
         order by created_at desc
         limit $1 offset $2`,
        params
      );
      return json(res, 200, { ok: true, rows, limit, offset, status });
    } catch (error) {
      log.error?.({ error }, 'list memory capsules failed');
      return json(res, 500, { ok: false, error: 'failed_to_list_memory_capsules' });
    }
  });

  app.get('/api/memory/working', async (req, res) => {
    try {
      const limit = safeLimit(req.query?.limit, 50, 200);
      const offset = safeOffset(req.query?.offset);
      const sessionId = req.query?.session_id ? String(req.query.session_id) : null;

      const params = [limit, offset];
      let where = '';
      if (sessionId) {
        params.push(sessionId);
        where = `where session_id = $3`;
      }

      const { rows } = await pool.query(
        `select id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision, decision_ref, promoted_to_candidate, created_at
         from working_memory_entries
         ${where}
         order by created_at desc
         limit $1 offset $2`,
        params
      );
      return json(res, 200, { ok: true, rows, limit, offset, sessionId });
    } catch (error) {
      log.error?.({ error }, 'list working memory failed');
      return json(res, 500, { ok: false, error: 'failed_to_list_working_memory' });
    }
  });

  app.post('/api/memory/conversations', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const memoryId = body.memory_id ?? body.memoryId ?? null;
      const orchestratorMsg = body.orchestrator_msg ?? body.orchestratorMsg ?? null;
      const aiResponse = body.ai_response ?? body.aiResponse ?? null;
      const aiMember = body.ai_member ?? body.aiMember ?? null;
      const keyFacts = body.key_facts ?? body.keyFacts ?? null;
      const contextMetadata = body.context_metadata ?? body.contextMetadata ?? null;
      const memoryType = body.memory_type ?? body.memoryType ?? null;

      if (!orchestratorMsg && !aiResponse && !memoryId) {
        return json(res, 400, { ok: false, error: 'missing_conversation_payload' });
      }

      const { rows } = await pool.query(
        `insert into conversation_memory (memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at`,
        [memoryId, orchestratorMsg, aiResponse, aiMember, keyFacts, contextMetadata, memoryType]
      );

      return json(res, 201, { ok: true, row: rows[0] });
    } catch (error) {
      log.error?.({ error }, 'create conversation memory failed');
      return json(res, 500, { ok: false, error: 'failed_to_create_conversation_memory' });
    }
  });

  app.post('/api/memory/capsules', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const values = [
        body.fact_id ?? body.factId ?? null,
        body.title ?? null,
        body.capsule_type ?? body.capsuleType ?? null,
        body.truth_class ?? body.truthClass ?? null,
        body.trust_level ?? body.trustLevel ?? null,
        body.evidence_level ?? body.evidenceLevel ?? null,
        body.sensitivity ?? null,
        body.source_type ?? body.sourceType ?? null,
        body.source_ref ?? body.sourceRef ?? null,
        body.retrieval_permission ?? body.retrievalPermission ?? null,
        body.task_scope ?? body.taskScope ?? null,
        body.retrieval_lane_ceiling ?? body.retrievalLaneCeiling ?? null,
        body.canonical_statement_id ?? body.canonicalStatementId ?? null,
        body.fact_family_id ?? body.factFamilyId ?? null,
        body.review_by ?? body.reviewBy ?? null,
        body.status ?? null,
        body.legacy_import_method ?? body.legacyImportMethod ?? null,
        body.review_required ?? body.reviewRequired ?? null,
        body.owner_id ?? body.ownerId ?? null,
        body.data ?? null
      ];

      const { rows } = await pool.query(
        `insert into memory_capsules (
          fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref,
          retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by,
          status, legacy_import_method, review_required, owner_id, data
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
        )
        returning capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by, status, legacy_import_method, review_required, created_at, updated_at, id, owner_id, data`,
        values
      );

      return json(res, 201, { ok: true, row: rows[0] });
    } catch (error) {
      log.error?.({ error }, 'create memory capsule failed');
      return json(res, 500, { ok: false, error: 'failed_to_create_memory_capsule' });
    }
  });

  app.post('/api/memory/working', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const { rows } = await pool.query(
        `insert into working_memory_entries (
          session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision, decision_ref, promoted_to_candidate
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        returning id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision, decision_ref, promoted_to_candidate, created_at`,
        [
          body.session_id ?? body.sessionId ?? null,
          body.capsule_id ?? body.capsuleId ?? null,
          body.task_scope ?? body.taskScope ?? null,
          body.retrieval_lane ?? body.retrievalLane ?? null,
          body.entry_content ?? body.entryContent ?? null,
          body.injected_at ?? body.injectedAt ?? null,
          body.used_in_decision ?? body.usedInDecision ?? null,
          body.decision_ref ?? body.decisionRef ?? null,
          body.promoted_to_candidate ?? body.promotedToCandidate ?? null
        ]
      );

      return json(res, 201, { ok: true, row: rows[0] });
    } catch (error) {
      log.error?.({ error }, 'create working memory failed');
      return json(res, 500, { ok: false, error: 'failed_to_create_working_memory' });
    }
  });

  app.post('/api/memory/repair-recommendation', requireKey, async (req, res) => {
    try {
      if (typeof callCouncilMember !== 'function') {
        return json(res, 500, { ok: false, error: 'ai_hook_unavailable' });
      }

      const body = req.body || {};
      const prompt = [
        'Generate a concise memory repair recommendation grounded in the supplied context.',
        `baseUrl: ${baseUrl || ''}`,
        `input: ${JSON.stringify(body)}`
      ].join('\n');

      const recommendation = await callCouncilMember('memory', prompt, { maxTokens: 600 });

      const { rows } = await pool.query(
        `insert into conversation_memory (memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at`,
        [
          body.memory_id ?? body.memoryId ?? null,
          body.orchestrator_msg ?? body.orchestratorMsg ?? null,
          recommendation,
          'memory',
          body.key_facts ?? body.keyFacts ?? null,
          body.context_metadata ?? body.contextMetadata ?? null,
          'repair_recommendation'
        ]
      );

      return json(res, 200, { ok: true, recommendation, receipt: rows[0] });
    } catch (error) {
      log.error?.({ error }, 'memory repair recommendation failed');
      return json(res, 500, { ok: false, error: 'failed_to_generate_memory_repair_recommendation' });
    }
  });

  app.post('/api/memory/commit-route-module', requireKey, async (_req, res) => {
    try {
      const content = `export function registerMemoryRoutes(app, deps) {\n  /* auto-registered memory routes module */\n}\n`;
      if (typeof commitToGitHub === 'function') {
        const result = await commitToGitHub('routes/memory_routes.js', content, 'Register memory routes module');
        return json(res, 200, { ok: true, committed: true, result });
      }
      if (typeof commitManyToGitHub === 'function') {
        const result = await commitManyToGitHub(
          [{ path: 'routes/memory_routes.js', content }],
          'Register memory routes module'
        );
        return json(res, 200, { ok: true, committed: true, result });
      }
      return json(res, 200, { ok: true, committed: false, error: 'commit_hook_unavailable' });
    } catch (error) {
      log.error?.({ error }, 'commit route module failed');
      return json(res, 500, { ok: false, error: 'failed_to_commit_route_module' });
    }
  });
}

export default registerMemoryRoutes;