import express from "express";
import { getRegistryHealth } from "../services/env-registry-map.js";

function getActor(req) {
  return req.get("x-actor") || req.body?.actor || req.query?.actor || "system";
}

export function createRailwayManagedEnvRoutes({ requireKey, managedEnvService }) {
  const router = express.Router();

  router.get("/", requireKey, async (req, res) => {
    try {
      const vars = await managedEnvService.listDesiredVars();
      res.json({ ok: true, vars, count: vars.length });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/status", requireKey, async (req, res) => {
    try {
      const status = await managedEnvService.getStatus();
      res.json({ ok: true, ...status });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/plan", requireKey, async (req, res) => {
    try {
      const names = req.query.names
        ? String(req.query.names).split(",").map((name) => name.trim()).filter(Boolean)
        : null;
      const plan = await managedEnvService.getSyncPlan({
        names,
        includeCurrent: req.query.includeCurrent === "true",
      });
      res.json({ ok: true, ...plan });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/audit", requireKey, async (req, res) => {
    try {
      const rows = await managedEnvService.getAuditLog(req.query.limit);
      res.json({ ok: true, rows, count: rows.length });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/", requireKey, async (req, res) => {
    try {
      const result = await managedEnvService.upsertDesiredVar({
        name: req.body?.name,
        value: req.body?.value,
        description: req.body?.description || null,
        managed: req.body?.managed !== false,
        allowOverwrite: req.body?.allowOverwrite !== false,
        syncOnBoot: req.body?.syncOnBoot !== false,
        actor: getActor(req),
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post("/bulk", requireKey, async (req, res) => {
    try {
      const vars = req.body?.vars;
      if (!vars || typeof vars !== "object") {
        return res.status(400).json({ ok: false, error: "vars must be an object" });
      }
      const results = await managedEnvService.upsertDesiredVars(vars, getActor(req));
      res.json({ ok: results.every((item) => item.ok), results });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/sync", requireKey, async (req, res) => {
    try {
      const names = Array.isArray(req.body?.names) ? req.body.names : null;
      const result = await managedEnvService.syncDesiredVars({
        actor: getActor(req),
        names,
        syncOnBootOnly: req.body?.syncOnBootOnly === true,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/verify", requireKey, async (req, res) => {
    try {
      const names = req.query.names
        ? String(req.query.names).split(",").map((name) => name.trim()).filter(Boolean)
        : null;
      const result = await managedEnvService.verifyManagedVars({ names });
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Live health check of every var in the ENV_REGISTRY against process.env
  // No Railway API call needed — Railway injects all vars at boot
  router.get("/registry", requireKey, (req, res) => {
    try {
      const category = req.query.category || null;
      const health = getRegistryHealth();
      if (category) {
        health.vars = health.vars.filter((v) => v.category === category);
      }
      res.json({ ok: true, ...health });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /bootstrap
   * One-time setup: provide a Railway API token and the system becomes fully
   * self-managing.  After this call you never need to touch the Railway dashboard
   * to add env vars again — use POST /bulk instead.
   *
   * Body: {
   *   railway_token:   string   (required) — Railway account API token
   *   project_id:      string?  — overrides RAILWAY_PROJECT_ID
   *   service_id:      string?  — overrides RAILWAY_SERVICE_ID
   *   environment_id:  string?  — overrides RAILWAY_ENVIRONMENT_ID
   *   vars:            object?  — { KEY: value } — additional vars to store+push
   * }
   *
   * How to get a Railway token:
   *   railway.app → Account Settings → Tokens → New Token
   */
  router.post("/bootstrap", requireKey, async (req, res) => {
    try {
      const { railway_token, project_id, service_id, environment_id, vars } = req.body || {};
      if (!railway_token) {
        return res.status(400).json({ ok: false, error: "railway_token is required" });
      }
      const result = await managedEnvService.bootstrapWithToken(railway_token, {
        projectId:     project_id,
        serviceId:     service_id,
        environmentId: environment_id,
        vars:          vars || {},
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.delete("/:name", requireKey, async (req, res) => {
    try {
      const result = await managedEnvService.deleteDesiredVar(req.params.name, getActor(req));
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

export default createRailwayManagedEnvRoutes;
