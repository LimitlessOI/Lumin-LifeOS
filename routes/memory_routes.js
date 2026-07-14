/**
 * SYNOPSIS: HTTP route module — Memory Routes.
 */
import { z } from "zod";

const registerMemoryRoutes = (app, deps) => {
  const pool = deps?.pool;
  const logger = deps?.logger ?? console;

  if (!app || !pool) {
    throw new Error("registerMemoryRoutes requires app and deps.pool");
  }

  const textFromBody = (body) => {
    if (typeof body === "string") return body.trim();
    if (!body || typeof body !== "object") return "";
    return (
      body.memory_text ??
      body.text ??
      body.content ??
      body.entry_content ??
      body.prompt ??
      ""
    )
      .toString()
      .trim();
  };

  const safeArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value == null || value === "") return [];
    return [value];
  };

  const parseJson = (value, fallback) => {
    if (value == null) return fallback;
    if (typeof value === "object") return value;
    if (typeof value !== "string" || value.trim() === "") return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const listToSearchText = (value) =>
    safeArray(value)
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join("\n");

  const memoryCreateSchema = z.object({
    memory_id: z.string().min(1).optional(),
    orchestrator_msg: z.string().min(1).optional(),
    ai_response: z.string().min(1).optional(),
    ai_member: z.string().min(1).optional(),
    key_facts: z.union([z.array(z.any()), z.record(z.any()), z.string()]).optional(),
    context_metadata: z.union([z.record(z.any()), z.string()]).optional(),
    memory_type: z.string().min(1).optional(),
  });

  const capsuleCreateSchema = z.object({
    fact_id: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1),
    capsule_type: z.string().min(1).optional(),
    truth_class: z.string().min(1).optional(),
    trust_level: z.union([z.string(), z.number()]).optional(),
    evidence_level: z.union([z.string(), z.number()]).optional(),
    sensitivity: z.string().min(1).optional(),
    source_type: z.string().min(1).optional(),
    source_ref: z.string().min(1).optional(),
    retrieval_permission: z.string().min(1).optional(),
    task_scope: z.string().min(1).optional(),
    retrieval_lane_ceiling: z.union([z.string(), z.number()]).optional(),
    canonical_statement_id: z.union([z.string(), z.number()]).optional(),
    fact_family_id: z.union([z.string(), z.number()]).optional(),
    review_by: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    legacy_import_method: z.string().min(1).optional(),
    review_required: z.union([z.boolean(), z.string()]).optional(),
    owner_id: z.string().min(1).optional(),
    data: z.union([z.record(z.any()), z.array(z.any()), z.string()]).optional(),
  });

  const entryCreateSchema = z.object({
    session_id: z.string().min(1),
    capsule_id: z.union([z.string(), z.number()]).optional(),
    task_scope: z.string().min(1).optional(),
    retrieval_lane: z.string().min(1).optional(),
    entry_content: z.string().min(1),
    used_in_decision: z.union([z.boolean(), z.string()]).optional(),
    decision_ref: z.string().min(1).optional(),
    promoted_to_candidate: z.union([z.boolean(), z.string()]).optional(),
  });

  app.get("/api/memory", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
      const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
      const q = (req.query.q ?? "").toString().trim();

      const params = [];
      let where = "";
      if (q) {
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        where = `WHERE orchestrator_msg ILIKE $1 OR ai_response ILIKE $2 OR ai_member ILIKE $3`;
      }

      params.push(limit, offset);
      const sql = `
        SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        FROM conversation_memory
        ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const { rows } = await pool.query(sql, params);
      res.json({ ok: true, rows });
    } catch (error) {
      logger.error?.({ error }, "GET /api/memory failed");
      res.status(500).json({ ok: false, error: "Failed to list memory rows" });
    }
  });

  app.get("/api/memory/:id", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `
        SELECT id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
        FROM conversation_memory
        WHERE id = $1 OR memory_id = $1
        LIMIT 1
      `,
        [req.params.id]
      );

      if (!rows[0]) return res.status(404).json({ ok: false, error: "Memory not found" });
      res.json({ ok: true, row: rows[0] });
    } catch (error) {
      logger.error?.({ error }, "GET /api/memory/:id failed");
      res.status(500).json({ ok: false, error: "Failed to fetch memory row" });
    }
  });

  app.post("/api/memory", deps.requireKey, async (req, res) => {
    try {
      const parsed = memoryCreateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: "Invalid memory payload", issues: parsed.error.issues });
      }

      const body = parsed.data;
      const keyFacts = parseJson(body.key_facts, body.key_facts ?? null);
      const contextMetadata = parseJson(body.context_metadata, body.context_metadata ?? null);

      const { rows } = await pool.query(
        `
        INSERT INTO conversation_memory (
          memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, memory_id, orchestrator_msg, ai_response, ai_member, key_facts, context_metadata, memory_type, created_at
      `,
        [
          body.memory_id ?? null,
          body.orchestrator_msg ?? null,
          body.ai_response ?? null,
          body.ai_member ?? null,
          keyFacts,
          contextMetadata,
          body.memory_type ?? null,
        ]
      );

      res.status(201).json({ ok: true, row: rows[0] });
    } catch (error) {
      logger.error?.({ error }, "POST /api/memory failed");
      res.status(500).json({ ok: false, error: "Failed to create memory row" });
    }
  });

  app.get("/api/memory-capsules", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
      const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
      const q = (req.query.q ?? "").toString().trim();

      const params = [];
      let where = "";
      if (q) {
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        where = `WHERE title ILIKE $1 OR capsule_type ILIKE $2 OR source_ref ILIKE $3`;
      }

      params.push(limit, offset);
      const sql = `
        SELECT id, capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity,
               source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id,
               fact_family_id, review_by, status, legacy_import_method, review_required, created_at, updated_at, owner_id, data
        FROM memory_capsules
        ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      const { rows } = await pool.query(sql, params);
      res.json({ ok: true, rows });
    } catch (error) {
      logger.error?.({ error }, "GET /api/memory-capsules failed");
      res.status(500).json({ ok: false, error: "Failed to list memory capsules" });
    }
  });

  app.post("/api/memory-capsules", deps.requireKey, async (req, res) => {
    try {
      const parsed = capsuleCreateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: "Invalid capsule payload", issues: parsed.error.issues });
      }

      const body = parsed.data;
      const data = parseJson(body.data, body.data ?? null);
      const reviewRequired =
        typeof body.review_required === "string"
          ? ["true", "1", "yes", "on"].includes(body.review_required.toLowerCase())
          : body.review_required ?? null;

      const { rows } = await pool.query(
        `
        INSERT INTO memory_capsules (
          fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity,
          source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling,
          canonical_statement_id, fact_family_id, review_by, status, legacy_import_method,
          review_required, owner_id, data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING id, capsule_id, fact_id, title, capsule_type, truth_class, trust_level, evidence_level, sensitivity,
                  source_type, source_ref, retrieval_permission, task_scope, retrieval_lane_ceiling, canonical_statement_id,
                  fact_family_id, review_by, status, legacy_import_method, review_required, created_at, updated_at, owner_id, data
      `,
        [
          body.fact_id ?? null,
          body.title,
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
          reviewRequired,
          body.owner_id ?? null,
          data,
        ]
      );

      res.status(201).json({ ok: true, row: rows[0] });
    } catch (error) {
      logger.error?.({ error }, "POST /api/memory-capsules failed");
      res.status(500).json({ ok: false, error: "Failed to create memory capsule" });
    }
  });

  app.get("/api/working-memory", async (req, res) => {
    try {
      const sessionId = (req.query.session_id ?? "").toString().trim();
      const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);

      const params = [];
      let where = "";
      if (sessionId) {
        params.push(sessionId);
        where = `WHERE session_id = $1`;
      }
      params.push(limit);

      const { rows } = await pool.query(
        `
        SELECT id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision,
               decision_ref, promoted_to_candidate, created_at
        FROM working_memory_entries
        ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length}
      `,
        params
      );

      res.json({ ok: true, rows });
    } catch (error) {
      logger.error?.({ error }, "GET /api/working-memory failed");
      res.status(500).json({ ok: false, error: "Failed to list working memory entries" });
    }
  });

  app.post("/api/working-memory", deps.requireKey, async (req, res) => {
    try {
      const parsed = entryCreateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: "Invalid working memory payload", issues: parsed.error.issues });
      }

      const body = parsed.data;
      const usedInDecision =
        typeof body.used_in_decision === "string"
          ? ["true", "1", "yes", "on"].includes(body.used_in_decision.toLowerCase())
          : body.used_in_decision ?? null;
      const promotedToCandidate =
        typeof body.promoted_to_candidate === "string"
          ? ["true", "1", "yes", "on"].includes(body.promoted_to_candidate.toLowerCase())
          : body.promoted_to_candidate ?? null;

      const { rows } = await pool.query(
        `
        INSERT INTO working_memory_entries (
          session_id, capsule_id, task_scope, retrieval_lane, entry_content, used_in_decision, decision_ref, promoted_to_candidate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision,
                  decision_ref, promoted_to_candidate, created_at
      `,
        [
          body.session_id,
          body.capsule_id ?? null,
          body.task_scope ?? null,
          body.retrieval_lane ?? null,
          body.entry_content,
          usedInDecision,
          body.decision_ref ?? null,
          promotedToCandidate,
        ]
      );

      res.status(201).json({ ok: true, row: rows[0] });
    } catch (error) {
      logger.error?.({ error }, "POST /api/working-memory failed");
      res.status(500).json({ ok: false, error: "Failed to create working memory entry" });
    }
  });

  app.get("/api/memory-receipts", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
      const { rows } = await pool.query(
        `
        SELECT id, capsule_id, receipt_type, use_type, decision_ref, task_scope, retrieval_lane, signal_id, source_ref, created_by, created_at
        FROM memory_use_receipts
        ORDER BY created_at DESC
        LIMIT $1
      `,
        [limit]
      );
      res.json({ ok: true, rows });
    } catch (error) {
      logger.error?.({ error }, "GET /api/memory-receipts failed");
      res.status(500).json({ ok: false, error: "Failed to list memory receipts" });
    }
  });

  app.get("/api/system-source-of-truth", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `
        SELECT id, document_type, version, title, content, section, is_active, priority, created_at, updated_at, document
        FROM system_source_of_truth
        WHERE is_active = TRUE
        ORDER BY priority DESC, updated_at DESC, created_at DESC
      `
      );
      res.json({ ok: true, rows });
    } catch (error) {
      logger.error?.({ error }, "GET /api/system-source-of-truth failed");
      res.status(500).json({ ok: false, error: "Failed to list source of truth rows" });
    }
  });

  app.post("/api/memory/ai-summary", deps.requireKey, async (req, res) => {
    try {
      const prompt = textFromBody(req.body);
      if (!prompt) {
        return res.status(400).json({ ok: false, error: "Prompt is required" });
      }

      const response = await deps.callCouncilMember(
        "memory_archivist",
        prompt,
        { baseUrl: deps.baseUrl, route: "/api/memory/ai-summary" }
      );

      res.json({ ok: true, response });
    } catch (error) {
      logger.error?.({ error }, "POST /api/memory/ai-summary failed");
      res.status(500).json({ ok: false, error: "Failed to generate memory summary" });
    }
  });

  logger.info?.({ routeGroup: "memory" }, "Memory routes registered");
};

export { registerMemoryRoutes };
export default registerMemoryRoutes;