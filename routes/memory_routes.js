/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 */
export function registerMemoryRoutes(app, deps) {
  const pool = deps?.pool;
  const requireKey = deps?.requireKey;
  const callCouncilMember = deps?.callCouncilMember;
  const logger = deps?.logger ?? console;

  if (!app || !pool || !callCouncilMember) {
    throw new Error("registerMemoryRoutes requires app, deps.pool, and deps.callCouncilMember");
  }

  const json = (res, status, body) => res.status(status).json(body);

  const safeParseJson = (value, fallback = null) => {
    if (value == null) return fallback;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const normalizeText = (v) => (typeof v === "string" ? v.trim() : "");

  const buildContextPrompt = (rows, userPrompt, role) => {
    const memoryLines = rows
      .map((r, i) => {
        const keyFacts = Array.isArray(r.key_facts)
          ? r.key_facts
          : safeParseJson(r.key_facts, r.key_facts);
        const metadata = safeParseJson(r.context_metadata, r.context_metadata);
        return [
          `${i + 1}. memory_id=${r.memory_id}`,
          `   ai_member=${r.ai_member ?? ""}`,
          `   memory_type=${r.memory_type ?? ""}`,
          `   orchestrator_msg=${normalizeText(r.orchestrator_msg)}`,
          `   ai_response=${normalizeText(r.ai_response)}`,
          `   key_facts=${JSON.stringify(keyFacts ?? [])}`,
          `   context_metadata=${JSON.stringify(metadata ?? {})}`,
        ].join("\n");
      })
      .join("\n");

    return [
      `ROLE: ${role}`,
      `USER_PROMPT: ${userPrompt}`,
      `RECENT_MEMORY_ROWS:`,
      memoryLines || "(none)",
      `Return a concise, useful response grounded in the supplied memory rows.`,
    ].join("\n\n");
  };

  app.get("/api/memory/routes/health", async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, snapshot_at, error_count_1h, error_count_24h, build_success_rate, avg_response_ms, queue_depth, deployed_count, pending_ideas, open_bugs
         FROM system_health_log
         ORDER BY snapshot_at DESC
         LIMIT 1`
      );
      return json(res, 200, {
        ok: true,
        hasSnapshot: result.rows.length > 0,
        snapshot: result.rows[0] ?? null,
      });
    } catch (error) {
      logger.error({ error }, "memory routes health failed");
      return json(res, 500, { ok: false, error: "failed_to_read_health" });
    }
  });

  app.get("/api/memory/routes/memory-messages", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 10) || 10, 50);
      const result = await pool.query(
        `SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
         FROM conversation_memory
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return json(res, 200, { ok: true, rows: result.rows });
    } catch (error) {
      logger.error({ error }, "failed to list memory messages");
      return json(res, 500, { ok: false, error: "failed_to_list_memory_messages" });
    }
  });

  app.post("/api/memory/routes/memory-messages", requireKey, async (req, res) => {
    try {
      const {
        memory_id,
        orchestrator_msg,
        ai_response,
        ai_member,
        key_facts,
        context_metadata,
        memory_type,
      } = req.body ?? {};

      const result = await pool.query(
        `INSERT INTO conversation_memory
          (memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at`,
        [
          normalizeText(memory_id) || null,
          normalizeText(orchestrator_msg) || null,
          normalizeText(ai_response) || null,
          normalizeText(ai_member) || null,
          key_facts != null ? JSON.stringify(key_facts) : null,
          context_metadata != null ? JSON.stringify(context_metadata) : null,
          normalizeText(memory_type) || null,
        ]
      );

      return json(res, 201, { ok: true, row: result.rows[0] });
    } catch (error) {
      logger.error({ error }, "failed to create memory message");
      return json(res, 500, { ok: false, error: "failed_to_create_memory_message" });
    }
  });

  app.get("/api/memory/routes/memory-capsules", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 25) || 25, 100);
      const result = await pool.query(
        `SELECT id, capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity,
                source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling,
                canonical_statement_id, fact_family_id, review_by, status, legacy_import_method,
                review_required, created_at, updated_at, owner_id, data
         FROM memory_capsules
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return json(res, 200, { ok: true, rows: result.rows });
    } catch (error) {
      logger.error({ error }, "failed to list memory capsules");
      return json(res, 500, { ok: false, error: "failed_to_list_memory_capsules" });
    }
  });

  app.post("/api/memory/routes/memory-capsules", requireKey, async (req, res) => {
    try {
      const body = req.body ?? {};
      const result = await pool.query(
        `INSERT INTO memory_capsules
          (fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref,
           retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by,
           status, legacy_import_method, review_required, owner_id, data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING id, capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity,
                   source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id,
                   fact_family_id, review_by, status, legacy_import_method, review_required, created_at, updated_at, owner_id, data`,
        [
          body.fact_id ?? null,
          normalizeText(body.title) || null,
          normalizeText(body.capsule_type) || null,
          normalizeText(body.truth_class) || null,
          body.trust_level ?? null,
          body.evidence_level ?? null,
          normalizeText(body.sensitivity) || null,
          normalizeText(body.source_type) || null,
          normalizeText(body.source_ref) || null,
          normalizeText(body.retrieval_permission) || null,
          normalizeText(body.task_scope) || null,
          body.retrieval_lane_ceiling ?? null,
          body.canonical_statement_id ?? null,
          body.fact_family_id ?? null,
          normalizeText(body.review_by) || null,
          normalizeText(body.status) || null,
          normalizeText(body.legacy_import_method) || null,
          body.review_required ?? null,
          body.owner_id ?? null,
          body.data != null ? JSON.stringify(body.data) : null,
        ]
      );

      return json(res, 201, { ok: true, row: result.rows[0] });
    } catch (error) {
      logger.error({ error }, "failed to create memory capsule");
      return json(res, 500, { ok: false, error: "failed_to_create_memory_capsule" });
    }
  });

  app.get("/api/memory/routes/working-memory", async (req, res) => {
    try {
      const sessionId = normalizeText(req.query.session_id);
      const params = [];
      let where = "";
      if (sessionId) {
        params.push(sessionId);
        where = `WHERE session_id = $1`;
      }
      const result = await pool.query(
        `SELECT id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at,
                used_in_decision, decision_ref, promoted_to_candidate, created_at
         FROM working_memory_entries
         ${where}
         ORDER BY created_at DESC
         LIMIT 100`,
        params
      );
      return json(res, 200, { ok: true, rows: result.rows });
    } catch (error) {
      logger.error({ error }, "failed to list working memory");
      return json(res, 500, { ok: false, error: "failed_to_list_working_memory" });
    }
  });

  app.post("/api/memory/routes/working-memory", requireKey, async (req, res) => {
    try {
      const body = req.body ?? {};
      const result = await pool.query(
        `INSERT INTO working_memory_entries
          (session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision,
           decision_ref, promoted_to_candidate)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at,
                   used_in_decision, decision_ref, promoted_to_candidate, created_at`,
        [
          normalizeText(body.session_id) || null,
          body.capsule_id ?? null,
          normalizeText(body.task_scope) || null,
          normalizeText(body.retrieval_lane) || null,
          normalizeText(body.entry_content) || null,
          body.injected_at ?? null,
          body.used_in_decision ?? null,
          normalizeText(body.decision_ref) || null,
          body.promoted_to_candidate ?? null,
        ]
      );
      return json(res, 201, { ok: true, row: result.rows[0] });
    } catch (error) {
      logger.error({ error }, "failed to create working memory entry");
      return json(res, 500, { ok: false, error: "failed_to_create_working_memory_entry" });
    }
  });

  app.get("/api/memory/routes/use-receipts", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
      const result = await pool.query(
        `SELECT id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id,
                source_ref, created_by, created_at
         FROM memory_use_receipts
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      return json(res, 200, { ok: true, rows: result.rows });
    } catch (error) {
      logger.error({ error }, "failed to list use receipts");
      return json(res, 500, { ok: false, error: "failed_to_list_use_receipts" });
    }
  });

  app.post("/api/memory/routes/use-receipts", requireKey, async (req, res) => {
    try {
      const body = req.body ?? {};
      const result = await pool.query(
        `INSERT INTO memory_use_receipts
          (capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id, source_ref, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id, source_ref, created_by, created_at`,
        [
          body.capsule_id ?? null,
          normalizeText(body.receipt_type) || null,
          normalizeText(body.use_type) || null,
          normalizeText(body.decision_ref) || null,
          normalizeText(body.task_scope) || null,
          normalizeText(body.retrieval_lane) || null,
          normalizeText(body.signal_id) || null,
          normalizeText(body.source_ref) || null,
          normalizeText(body.created_by) || null,
        ]
      );
      return json(res, 201, { ok: true, row: result.rows[0] });
    } catch (error) {
      logger.error({ error }, "failed to create use receipt");
      return json(res, 500, { ok: false, error: "failed_to_create_use_receipt" });
    }
  });

  app.post("/api/memory/routes/generate-summary", requireKey, async (req, res) => {
    try {
      const body = req.body ?? {};
      const role = normalizeText(body.role) || "memory-assistant";
      const userPrompt = normalizeText(body.prompt) || "Summarize the most recent memory rows.";
      const limit = Math.min(Number(body.limit ?? 8) || 8, 20);

      const rowsResult = await pool.query(
        `SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
         FROM conversation_memory
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      const prompt = buildContextPrompt(rowsResult.rows, userPrompt, role);
      const aiResponse = await callCouncilMember(role, prompt, body.opts ?? {});
      return json(res, 200, {
        ok: true,
        prompt,
        response: aiResponse,
        rows_considered: rowsResult.rows.length,
      });
    } catch (error) {
      logger.error({ error }, "failed to generate memory summary");
      return json(res, 500, { ok: false, error: "failed_to_generate_memory_summary" });
    }
  });

  return app;
}

export default registerMemoryRoutes;