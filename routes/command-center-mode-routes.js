/**
 * SYNOPSIS: Registers CommandCenterModeRoutes routes/handlers (routes/command-center-mode-routes.js).
 */
import { setMode, getCurrentMode as getMode } from "../services/builder-runtime-mode-service.js";

const VALID_MODES = new Set(["run", "dry_run", "paused"]);

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function normalizeMode(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function registerCommandCenterModeRoutes(app, deps) {
  const db = deps?.db ?? deps?.pool;
  const callCouncilMember = deps?.callCouncilMember;
  const logger = deps?.logger;

  app.get("/api/v1/lifeos/command-center/mode", async (req, res) => {
    try {
      if (!db) {
        return sendError(res, 500, "Database dependency unavailable");
      }

      const mode = await getMode(db);
      return res.status(200).json({
        mode: mode?.mode ?? null,
        updated_at: mode?.updated_at ?? null,
        updated_by: mode?.updated_by ?? null,
      });
    } catch (error) {
      logger?.error?.({ err: error }, "failed to fetch command center mode");
      return sendError(res, 500, "Failed to fetch command center mode");
    }
  });

  app.post("/api/v1/lifeos/command-center/mode", deps?.requireKey, async (req, res) => {
    try {
      if (!db) {
        return sendError(res, 500, "Database dependency unavailable");
      }

      const mode = normalizeMode(req.body?.mode);
      const triggered_by = typeof req.body?.triggered_by === "string" ? req.body.triggered_by.trim() : "";

      if (!VALID_MODES.has(mode)) {
        return sendError(res, 400, `Invalid mode. Expected one of: ${Array.from(VALID_MODES).join(", ")}`);
      }

      if (!triggered_by) {
        return sendError(res, 400, "triggered_by is required");
      }

      const result = await setMode(db, mode, triggered_by, {
        source: "command_center_mode_routes",
      });

      return res.status(200).json(result);
    } catch (error) {
      logger?.error?.({ err: error }, "failed to set command center mode");
      return sendError(res, 500, "Failed to set command center mode");
    }
  });
}

export default registerCommandCenterModeRoutes;