/**
 * SYNOPSIS: Registers AuditIntakeFlowRoutes routes/handlers (routes/audit-intake-flow-routes.js).
 */
export function registerAuditIntakeFlowRoutes(app, deps) {
  const pool = deps?.pool;
  const requireKey = deps?.requireKey;
  const logger = deps?.logger || console;
  const callCouncilMember = deps?.callCouncilMember;

  if (!app || !pool) {
    throw new Error("registerAuditIntakeFlowRoutes requires app and deps.pool");
  }

  const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

  function sendJson(res, status, body) {
    res.status(status).set(jsonHeaders).send(JSON.stringify(body));
  }

  function safeJsonParse(value, fallback = null) {
    if (value == null) return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function getAuditIntakeRows(reqBody = {}) {
    const mode = typeof reqBody.mode === "string" ? reqBody.mode.trim() : "";
    return { mode };
  }

  async function listSessions(req, res) {
    try {
      const limit = Math.max(1, Math.min(Number(req.query?.limit || 25) || 25, 100));
      const result = await pool.query(
        `SELECT id, product_name, amendment_file, flow_type, status, codebase_scan_json, extracted_intent_json, gaps_json, gap_answers_json, blueprint_json, arc_report_json, conversation_json, blueprint_file, target_mission_id, owner_id, created_at, updated_at
         FROM blueprint_intake_sessions
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      sendJson(res, 200, { ok: true, sessions: result.rows });
    } catch (error) {
      logger.error?.({ err: error }, "audit intake sessions list failed");
      sendJson(res, 500, { ok: false, error: "Failed to load audit intake sessions" });
    }
  }

  async function createSession(req, res) {
    try {
      const body = req.body || {};
      const productName = typeof body.product_name === "string" ? body.product_name.trim() : "";
      const amendmentFile = typeof body.amendment_file === "string" ? body.amendment_file.trim() : null;
      const flowType = typeof body.flow_type === "string" ? body.flow_type.trim() : "audit-intake-flow";
      const status = typeof body.status === "string" ? body.status.trim() : "draft";

      if (!productName) {
        return sendJson(res, 400, { ok: false, error: "product_name is required" });
      }

      const result = await pool.query(
        `INSERT INTO blueprint_intake_sessions
          (product_name, amendment_file, flow_type, status, codebase_scan_json, extracted_intent_json, gaps_json, gap_answers_json, blueprint_json, arc_report_json, conversation_json, blueprint_file, target_mission_id, owner_id)
         VALUES
          ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14)
         RETURNING id, product_name, amendment_file, flow_type, status, codebase_scan_json, extracted_intent_json, gaps_json, gap_answers_json, blueprint_json, arc_report_json, conversation_json, blueprint_file, target_mission_id, owner_id, created_at, updated_at`,
        [
          productName,
          amendmentFile,
          flowType,
          status,
          JSON.stringify(body.codebase_scan_json ?? null),
          JSON.stringify(body.extracted_intent_json ?? null),
          JSON.stringify(body.gaps_json ?? null),
          JSON.stringify(body.gap_answers_json ?? null),
          JSON.stringify(body.blueprint_json ?? null),
          JSON.stringify(body.arc_report_json ?? null),
          JSON.stringify(body.conversation_json ?? null),
          typeof body.blueprint_file === "string" ? body.blueprint_file.trim() : null,
          body.target_mission_id ?? null,
          body.owner_id ?? null,
        ]
      );

      sendJson(res, 201, { ok: true, session: result.rows[0] });
    } catch (error) {
      logger.error?.({ err: error }, "audit intake session create failed");
      sendJson(res, 500, { ok: false, error: "Failed to create audit intake session" });
    }
  }

  async function getSession(req, res) {
    try {
      const id = req.params?.id;
      const result = await pool.query(
        `SELECT id, product_name, amendment_file, flow_type, status, codebase_scan_json, extracted_intent_json, gaps_json, gap_answers_json, blueprint_json, arc_report_json, conversation_json, blueprint_file, target_mission_id, owner_id, created_at, updated_at
         FROM blueprint_intake_sessions
         WHERE id = $1`,
        [id]
      );

      if (!result.rows.length) {
        return sendJson(res, 404, { ok: false, error: "Session not found" });
      }

      sendJson(res, 200, { ok: true, session: result.rows[0] });
    } catch (error) {
      logger.error?.({ err: error }, "audit intake session get failed");
      sendJson(res, 500, { ok: false, error: "Failed to load audit intake session" });
    }
  }

  async function updateSession(req, res) {
    try {
      const id = req.params?.id;
      const body = req.body || {};
      const fields = [];
      const values = [];
      let idx = 1;

      const updatable = [
        ["product_name", body.product_name, (v) => typeof v === "string" && v.trim() ? v.trim() : null],
        ["amendment_file", body.amendment_file, (v) => typeof v === "string" ? v.trim() : null],
        ["flow_type", body.flow_type, (v) => typeof v === "string" ? v.trim() : null],
        ["status", body.status, (v) => typeof v === "string" ? v.trim() : null],
        ["codebase_scan_json", body.codebase_scan_json, (v) => JSON.stringify(v ?? null)],
        ["extracted_intent_json", body.extracted_intent_json, (v) => JSON.stringify(v ?? null)],
        ["gaps_json", body.gaps_json, (v) => JSON.stringify(v ?? null)],
        ["gap_answers_json", body.gap_answers_json, (v) => JSON.stringify(v ?? null)],
        ["blueprint_json", body.blueprint_json, (v) => JSON.stringify(v ?? null)],
        ["arc_report_json", body.arc_report_json, (v) => JSON.stringify(v ?? null)],
        ["conversation_json", body.conversation_json, (v) => JSON.stringify(v ?? null)],
        ["blueprint_file", body.blueprint_file, (v) => typeof v === "string" ? v.trim() : null],
        ["target_mission_id", body.target_mission_id, (v) => v ?? null],
        ["owner_id", body.owner_id, (v) => v ?? null],
      ];

      for (const [column, value, transform] of updatable) {
        if (value !== undefined) {
          fields.push(`${column} = $${idx++}`);
          values.push(transform(value));
        }
      }

      if (!fields.length) {
        return sendJson(res, 400, { ok: false, error: "No updatable fields provided" });
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE blueprint_intake_sessions
         SET ${fields.join(", ")}, updated_at = NOW()
         WHERE id = $${idx}
         RETURNING id, product_name, amendment_file, flow_type, status, codebase_scan_json, extracted_intent_json, gaps_json, gap_answers_json, blueprint_json, arc_report_json, conversation_json, blueprint_file, target_mission_id, owner_id, created_at, updated_at`,
        values
      );

      if (!result.rows.length) {
        return sendJson(res, 404, { ok: false, error: "Session not found" });
      }

      sendJson(res, 200, { ok: true, session: result.rows[0] });
    } catch (error) {
      logger.error?.({ err: error }, "audit intake session update failed");
      sendJson(res, 500, { ok: false, error: "Failed to update audit intake session" });
    }
  }

  async function suggestQuestions(req, res) {
    try {
      const body = req.body || {};
      const productName = typeof body.product_name === "string" ? body.product_name.trim() : "";
      const flowType = typeof body.flow_type === "string" ? body.flow_type.trim() : "audit-intake-flow";
      const context = {
        product_name: productName,
        amendment_file: typeof body.amendment_file === "string" ? body.amendment_file : null,
        flow_type: flowType,
        blueprint: body.blueprint_json ?? null,
        gaps: body.gaps_json ?? null,
        current_answers: body.gap_answers_json ?? null,
      };

      let questions = [
        "What audit objective is most important for this intake?",
        "Which systems or workflows are in scope?",
        "What evidence or source data should be captured?",
        "Are there any optional system connections that need to be configured?",
      ];

      if (typeof callCouncilMember === "function") {
        const prompt = [
          "Generate 4-8 concise audit intake questions for a product flow.",
          "Focus on intake completeness, evidence capture, and optional system connections.",
          "Return as JSON array of strings only.",
          `Context: ${JSON.stringify(context)}`,
        ].join("\n");
        const raw = await callCouncilMember("planner", prompt, { temperature: 0.2 });
        const parsed = safeJsonParse(raw, null);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
          questions = parsed;
        }
      }

      sendJson(res, 200, { ok: true, questions });
    } catch (error) {
      logger.error?.({ err: error }, "audit intake question generation failed");
      sendJson(res, 500, { ok: false, error: "Failed to generate questions" });
    }
  }

  async function listConnections(req, res) {
    try {
      const result = await pool.query(
        `SELECT id, env_name, action, actor, status, details, created_at
         FROM railway_env_sync_audit
         ORDER BY created_at DESC
         LIMIT 100`
      );
      sendJson(res, 200, { ok: true, connections: result.rows });
    } catch (error) {
      logger.error?.({ err: error }, "audit intake connections list failed");
      sendJson(res, 500, { ok: false, error: "Failed to load system connections" });
    }
  }

  async function createConnectionAudit(req, res) {
    try {
      const body = req.body || {};
      const envName = typeof body.env_name === "string" ? body.env_name.trim() : "";
      const action = typeof body.action === "string" ? body.action.trim() : "";
      const actor = typeof body.actor === "string" ? body.actor.trim() : "audit-intake-flow";
      const status = typeof body.status === "string" ? body.status.trim() : "pending";
      const details = body.details ?? null;

      if (!envName || !action) {
        return sendJson(res, 400, { ok: false, error: "env_name and action are required" });
      }

      const result = await pool.query(
        `INSERT INTO railway_env_sync_audit (env_name, action, actor, status, details)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING id, env_name, action, actor, status, details, created_at`,
        [envName, action, actor, status, JSON.stringify(details)]
      );

      sendJson(res, 201, { ok: true, connection: result.rows[0] });
    } catch (error) {
      logger.error?.({ err: error }, "audit intake connection audit create failed");
      sendJson(res, 500, { ok: false, error: "Failed to create system connection audit" });
    }
  }

  app.get("/api/audit-intake-flow/sessions", listSessions);
  app.post("/api/audit-intake-flow/sessions", requireKey, createSession);
  app.get("/api/audit-intake-flow/sessions/:id", getSession);
  app.post("/api/audit-intake-flow/sessions/:id", requireKey, updateSession);
  app.post("/api/audit-intake-flow/questions", requireKey, suggestQuestions);
  app.get("/api/audit-intake-flow/connections", listConnections);
  app.post("/api/audit-intake-flow/connections", requireKey, createConnectionAudit);

  logger.info?.({ module: "audit-intake-flow-routes" }, "audit intake flow routes registered");
}

export default registerAuditIntakeFlowRoutes;