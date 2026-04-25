/**
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import express from "express";
import { getRegistryHealth } from "../services/env-registry-map.js";

const RAILWAY_GQL = 'https://backboard.railway.app/graphql/v2';

/**
 * Internal Railway GraphQL helper — uses RAILWAY_TOKEN from process.env.
 * Called by self-redeploy to avoid depending on command key auth.
 */
async function internalRailwayRedeploy() {
  const token = process.env.RAILWAY_TOKEN;
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;

  if (!token) throw new Error('RAILWAY_TOKEN not set in environment');
  if (!serviceId) throw new Error('RAILWAY_SERVICE_ID not set in environment');
  if (!environmentId) throw new Error('RAILWAY_ENVIRONMENT_ID not set in environment');

  const res = await fetch(RAILWAY_GQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: `mutation Redeploy($serviceId: String!, $environmentId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
      }`,
      variables: { serviceId, environmentId },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Railway API HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Railway GQL error: ${json.errors.map(e => e.message).join('; ')}`);
  }
  return json.data;
}

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
      const actor = getActor(req);
      // Store encrypted in Neon
      const stored = await managedEnvService.upsertDesiredVars(vars, actor);
      // Immediately push to Railway if token is available (best-effort — never blocks)
      const sync = await managedEnvService.syncDesiredVars({
        actor,
        names: Object.keys(vars),
      }).catch((err) => ({ ok: false, error: err.message }));
      res.json({ ok: stored.every((item) => item.ok), stored, sync });
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

  /**
   * POST /rotate-command-key
   * Atomically rotates COMMAND_CENTER_KEY in Railway vault.
   * Auth: x-railway-token header must match RAILWAY_TOKEN in process.env.
   * This escape-hatch bypasses the command key so it can be reset even when
   * local .env.local and Railway vault are out of sync.
   *
   * Body: { new_key?: string }  — omit to auto-generate a secure random key
   * Returns: { ok, new_key, message }
   */
  router.post("/rotate-command-key", async (req, res) => {
    try {
      const railwayToken = req.headers['x-railway-token'];
      const envToken = process.env.RAILWAY_TOKEN;

      if (!envToken || !railwayToken || railwayToken !== envToken) {
        return res.status(401).json({
          ok: false,
          error: 'Unauthorized — x-railway-token must match RAILWAY_TOKEN in vault',
        });
      }

      const projectId     = process.env.RAILWAY_PROJECT_ID;
      const serviceId     = process.env.RAILWAY_SERVICE_ID;
      const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;

      if (!projectId || !serviceId || !environmentId) {
        return res.status(500).json({
          ok: false,
          error: 'Missing RAILWAY_PROJECT_ID / RAILWAY_SERVICE_ID / RAILWAY_ENVIRONMENT_ID',
        });
      }

      // Use provided key or generate a secure random one
      const rawKey = req.body?.new_key && String(req.body.new_key).trim();
      const newKey = rawKey || `CCK-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

      // Push to Railway vault via GraphQL
      const gqlRes = await fetch(RAILWAY_GQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${envToken}` },
        body: JSON.stringify({
          query: `mutation UpsertVars($input: VariableCollectionUpsertInput!) {
            variableCollectionUpsert(input: $input)
          }`,
          variables: {
            input: {
              projectId,
              serviceId,
              environmentId,
              variables: { COMMAND_CENTER_KEY: newKey },
            },
          },
        }),
      });

      if (!gqlRes.ok) {
        const text = await gqlRes.text();
        return res.status(502).json({ ok: false, error: `Railway API HTTP ${gqlRes.status}: ${text}` });
      }
      const gqlJson = await gqlRes.json();
      if (gqlJson.errors?.length) {
        return res.status(502).json({ ok: false, error: `Railway GQL: ${gqlJson.errors.map(e => e.message).join('; ')}` });
      }

      console.log('[ROTATE-CCK] COMMAND_CENTER_KEY rotated in Railway vault');

      res.json({
        ok: true,
        new_key: newKey,
        message: 'COMMAND_CENTER_KEY updated in Railway vault. Update .env.local to match, then redeploy.',
        next_steps: [
          `Set COMMAND_CENTER_KEY=${newKey} in your .env.local`,
          'Run: npm run system:railway:redeploy',
        ],
      });
    } catch (error) {
      console.error('[ROTATE-CCK] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /self-redeploy
   * Triggers Railway to redeploy this service using its own vault credentials.
   * Auth: x-railway-token header must match RAILWAY_TOKEN in process.env.
   * This bypasses COMMAND_CENTER_KEY so the system can redeploy itself even
   * when the operator's local key is out of sync with Railway vault.
   * Also accepts the standard command key as fallback.
   */
  router.post("/self-redeploy", async (req, res) => {
    try {
      const railwayToken = req.headers['x-railway-token'];
      const commandKey   = req.headers['x-command-key'] || req.headers['x-command-center-key'] ||
                           req.headers['x-lifeos-key']  || req.headers['x-api-key'] ||
                           req.query?.api_key;

      const envToken      = process.env.RAILWAY_TOKEN;
      const envCommandKey = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY ||
                            process.env.API_KEY;

      const authedViaRailwayToken = Boolean(envToken && railwayToken && railwayToken === envToken);
      const authedViaCommandKey   = Boolean(envCommandKey && commandKey && commandKey === envCommandKey);

      if (!authedViaRailwayToken && !authedViaCommandKey) {
        return res.status(401).json({
          ok: false,
          error: 'Unauthorized — provide x-railway-token (RAILWAY_TOKEN value) or standard command key',
        });
      }

      await internalRailwayRedeploy();
      console.log('[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=REDEPLOY | self-redeploy triggered via managed-env route | NEXT=PROBE /ready in ~60s');
      res.json({
        ok: true,
        message: 'Self-redeploy triggered on Railway',
        tsos: '[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=REDEPLOY | self-redeploy queued | NEXT=PROBE /ready in ~60s',
      });
    } catch (error) {
      console.error('[RAILWAY-SELF-REDEPLOY] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

export default createRailwayManagedEnvRoutes;
