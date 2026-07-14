/**
 * SYNOPSIS: Registers MemoryRoutes routes/handlers (routes/memory_routes.js).
 */
export function registerMemoryRoutes(app, deps) {
  const { pool, requireKey, callCouncilMember, logger, commitToGitHub } = deps || {};
  const router = app?.router || app;

  if (!router || typeof router.get !== "function" || typeof router.post !== "function") {
    throw new Error("registerMemoryRoutes requires an Express app/router with get/post methods");
  }
  if (!pool || typeof pool.query !== "function") {
    throw new Error("registerMemoryRoutes requires deps.pool with query()");
  }
  if (typeof requireKey !== "function") {
    throw new Error("registerMemoryRoutes requires deps.requireKey middleware");
  }

  const log = logger || console;

  function sendError(res, status, message, details) {
    const body = { ok: false, error: message };
    if (details !== undefined) body.details = details;
    return res.status(status).json(body);
  }

  function normalizeLimit(value, fallback = 50, max = 200) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(n, max);
  }

  function parseJsonMaybe(value, fallback = null) {
    if (value == null) return fallback;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  async function writeGitHubCommit(path, content, message) {
    if (typeof commitToGitHub !== "function") return null;
    return await commitToGitHub(path, content, message);
  }

  router.get("/api/memory/health", async (req, res) => {
    try {
      const result = await pool.query(
        "select id, error_count_1h, error_count_24h, build_success_rate, avg_response_ms, queue_depth, deployed_count, pending_ideas, open_bugs, snapshot_at from system_health_log order by snapshot_at desc nulls last, id desc limit 1"
      );
      return res.json({ ok: true, health: result.rows[0] || null });
    } catch (error) {
      log.error({ err: error }, "memory health query failed");
      return sendError(res, 500, "Failed to load system health");
    }
  });

  router.get("/api/memory/snapshots", async (req, res) => {
    try {
      const limit = normalizeLimit(req.query?.limit, 25, 100);
      const result = await pool.query(
        "select id, snapshot_id, snapshot_data, version, reason, created_at from system_snapshots order by created_at desc nulls last, id desc limit $1",
        [limit]
      );
      return res.json({ ok: true, snapshots: result.rows });
    } catch (error) {
      log.error({ err: error }, "system snapshots query failed");
      return sendError(res, 500, "Failed to load snapshots");
    }
  });

  router.get("/api/memory/source-of-truth", async (req, res) => {
    try {
      const limit = normalizeLimit(req.query?.limit, 50, 200);
      const result = await pool.query(
        "select id, document_type, version, title, content, section, is_active, priority, created_at, updated_at, document from system_source_of_truth order by priority desc nulls last, updated_at desc nulls last, id desc limit $1",
        [limit]
      );
      return res.json({ ok: true, documents: result.rows });
    } catch (error) {
      log.error({ err: error }, "source of truth query failed");
      return sendError(res, 500, "Failed to load source of truth documents");
    }
  });

  router.get("/api/memory/memories", async (req, res) => {
    try {
      const limit = normalizeLimit(req.query?.limit, 50, 200);
      const userId = req.query?.user_id ?? null;
      const params = [];
      let where = "";
      if (userId) {
        params.push(userId);
        where = ` where user_id = $${params.length}`;
      }
      params.push(limit);
      const result = await pool.query(
        `select id, user_id, memory_title, place, memory_text, sensory_details, sounds, smells, feels, significance, artifact_ids from memory_palace${where} order by id desc limit $${params.length}`,
        params
      );
      return res.json({ ok: true, memories: result.rows });
    } catch (error) {
      log.error({ err: error }, "memory palace query failed");
      return sendError(res, 500, "Failed to load memories");
    }
  });

  router.get("/api/memory/capsules", async (req, res) => {
    try {
      const limit = normalizeLimit(req.query?.limit, 50, 200);
      const result = await pool.query(
        "select id, owner_id, capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity, source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id, fact_family_id, review_by, status, legacy_import_method, review_required, created_at, updated_at, data from memory_capsules order by updated_at desc nulls last, created_at desc nulls last, id desc limit $1",
        [limit]
      );
      return res.json({ ok: true, capsules: result.rows });
    } catch (error) {
      log.error({ err: error }, "memory capsules query failed");
      return sendError(res, 500, "Failed to load memory capsules");
    }
  });

  router.get("/api/memory/working", async (req, res) => {
    try {
      const limit = normalizeLimit(req.query?.limit, 50, 200);
      const result = await pool.query(
        "select id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision, decision_ref, promoted_to_candidate, created_at from working_memory_entries order by created_at desc nulls last, id desc limit $1",
        [limit]
      );
      return res.json({ ok: true, entries: result.rows });
    } catch (error) {
      log.error({ err: error }, "working memory query failed");
      return sendError(res, 500, "Failed to load working memory entries");
    }
  });

  router.get("/api/memory/receipts", async (req, res) => {
    try {
      const limit = normalizeLimit(req.query?.limit, 50, 200);
      const result = await pool.query(
        "select id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id, source_ref, created_by, created_at from memory_use_receipts order by created_at desc nulls last, id desc limit $1",
        [limit]
      );
      return res.json({ ok: true, receipts: result.rows });
    } catch (error) {
      log.error({ err: error }, "memory receipts query failed");
      return sendError(res, 500, "Failed to load memory use receipts");
    }
  });

  router.get("/api/memory/import-receipts", async (req, res) => {
    try {
      const limit = normalizeLimit(req.query?.limit, 50, 200);
      const result = await pool.query(
        "select id, source_table, source_row_id, import_method, import_batch_id, capsule_id, created_at from memory_import_receipts order by created_at desc nulls last, id desc limit $1",
        [limit]
      );
      return res.json({ ok: true, receipts: result.rows });
    } catch (error) {
      log.error({ err: error }, "memory import receipts query failed");
      return sendError(res, 500, "Failed to load memory import receipts");
    }
  });

  router.get("/api/memory/events", async (req, res) => {
    try {
      const limit = normalizeLimit(req.query?.limit, 50, 200);
      const result = await pool.query(
        "select id, created_at, trigger, issue_detected, repair_chain_run, result, receipts_written, lesson_learned, prevention_rule, confidence, source_execution_id, repair_id, deploy_sha, proof_status_before, proof_status_after, duration_ms, classification, classification_signals, verification_path, triggered_by, fact_id from self_repair_memory_events order by created_at desc nulls last, id desc limit $1",
        [limit]
      );
      return res.json({ ok: true, events: result.rows });
    } catch (error) {
      log.error({ err: error }, "self repair memory events query failed");
      return sendError(res, 500, "Failed to load self-repair memory events");
    }
  });

  router.get("/api/memory/conversation", async (req, res) => {
    try {
      const limit = normalizeLimit(req.query?.limit, 50, 200);
      const result = await pool.query(
        "select id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at from conversation_memory order by created_at desc nulls last, id desc limit $1",
        [limit]
      );
      return res.json({ ok: true, conversations: result.rows });
    } catch (error) {
      log.error({ err: error }, "conversation memory query failed");
      return sendError(res, 500, "Failed to load conversation memory");
    }
  });

  router.post("/api/memory/summarize", requireKey, async (req, res) => {
    try {
      if (typeof callCouncilMember !== "function") {
        return sendError(res, 500, "AI council hook is unavailable");
      }

      const payload = req.body || {};
      const prompt = typeof payload.prompt === "string" && payload.prompt.trim()
        ? payload.prompt.trim()
        : "Summarize the most important memory-related signals for the operator in a concise bullet list.";

      const response = await callCouncilMember(
        payload.role || "memory-orchestrator",
        prompt,
        payload.opts || {}
      );

      return res.json({ ok: true, response });
    } catch (error) {
      log.error({ err: error }, "memory summarize failed");
      return sendError(res, 500, "Failed to generate memory summary");
    }
  });

  router.post("/api/memory/commit-source-of-truth", requireKey, async (req, res) => {
    try {
      const payload = req.body || {};
      const path = typeof payload.path === "string" && payload.path.trim() ? payload.path.trim() : null;
      const content = typeof payload.content === "string" ? payload.content : null;
      const message = typeof payload.message === "string" && payload.message.trim() ? payload.message.trim() : "Update source of truth";

      if (!path || content == null) {
        return sendError(res, 400, "path and content are required");
      }

      const commit = await writeGitHubCommit(path, content, message);
      return res.json({ ok: true, commit });
    } catch (error) {
      log.error({ err: error }, "commit source of truth failed");
      return sendError(res, 500, "Failed to commit content");
    }
  });

  router.post("/api/memory/working", requireKey, async (req, res) => {
    try {
      const payload = req.body || {};
      const result = await pool.query(
        "insert into working_memory_entries (session_id, capsule_id, task_scope, retrieval_lane, entry_content, used_in_decision, decision_ref, promoted_to_candidate) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision, decision_ref, promoted_to_candidate, created_at",
        [
          payload.session_id ?? null,
          payload.capsule_id ?? null,
          payload.task_scope ?? null,
          payload.retrieval_lane ?? null,
          payload.entry_content ?? null,
          payload.used_in_decision ?? null,
          payload.decision_ref ?? null,
          payload.promoted_to_candidate ?? null,
        ]
      );
      return res.status(201).json({ ok: true, entry: result.rows[0] });
    } catch (error) {
      log.error({ err: error }, "insert working memory failed");
      return sendError(res, 500, "Failed to create working memory entry");
    }
  });
}

export default registerMemoryRoutes;