import express from "express";
import { pool } from "../core/db.js";
import authMiddleware from "../mw/auth.js";
import { DEFAULT_BUILDER_MODE, BUILDER_MODE, BUILDER_MODE_RULES } from "../config/builder-release-modes.js";

const ALPHA_READY = "ALPHA_READY";
const NOT_ALPHA_READY = "NOT_ALPHA_READY";
const UNKNOWN = "UNKNOWN";
const NOT_WIRED = "NOT_WIRED";

const createCommandCenterAggregateRoutes = ({ rk }) => {
  const router = express.Router();

  router.get("/api/v1/lifeos/command-center/phase14", authMiddleware(rk), async (req, res, next) => {
    try {
      const result = await pool.query(
        "SELECT id, verdict, findings, findings_json, audited_at FROM builder_audit_receipts WHERE written_by=$1 AND findings ILIKE $2 ORDER BY audited_at DESC LIMIT 1",
        ["OIL", "Phase 14 Alpha-Ready Certification%"]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const findingsJson = JSON.parse(row.findings_json);
        res.json({
          found: true,
          alpha_ready: findingsJson.alpha_ready,
          status: findingsJson.alpha_ready ? ALPHA_READY : NOT_ALPHA_READY,
          verified: findingsJson.verified_phases?.length ?? 0,
          conditional: findingsJson.conditional_phases?.length ?? 0,
          blockers: findingsJson.blockers?.length ?? 0,
          certified_at: row.audited_at,
          receipt_id: row.id,
          verified_phases: findingsJson.verified_phases ?? [],
          conditional_phases: findingsJson.conditional_phases ?? [],
          blockers: findingsJson.blockers ?? [],
        });
      } else {
        res.json({ found: false, status: UNKNOWN, alpha_ready: null });
      }
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/v1/lifeos/command-center/mode", authMiddleware(rk), async (req, res, next) => {
    try {
      res.json({
        mode: DEFAULT_BUILDER_MODE,
        rules: BUILDER_MODE_RULES[DEFAULT_BUILDER_MODE],
        all_modes: Object.keys(BUILDER_MODE),
        note: "Mode is compiled constant. Runtime switching not yet wired.",
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/v1/lifeos/command-center/mode", authMiddleware(rk), (req, res) => {
    res.status(501).json({ ok: false, status: NOT_WIRED, note: "Runtime mode switching is not yet implemented. Mode is a compiled constant in config/builder-release-modes.js. Stage 2 will add a builder_runtime_config table." });
  });

  router.use((err, req, res, next) => {
    tryCatch(err, res);
  });

  router.use((req, res, next) => {
    res.locals.__ssot = "docs/projects/AMENDMENT_12_COMMAND_CENTER.md";
    next();
  });

  return router;
};

export default createCommandCenterAggregateRoutes;

function tryCatch(err, res) {
  if (err) {
    res.status(500).json({ ok: false, status: "INTERNAL_SERVER_ERROR", error: err.message });
  }
}