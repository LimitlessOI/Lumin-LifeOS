/**
 * SYNOPSIS: Railway env vault + sync (production spine).
 * Railway env vault + sync (production spine).
 * @authority Legacy production spine — see routes/AGENTS.md. Not canonical factory runtime.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import express from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { getRegistryHealth } from "../services/env-registry-map.js";

const RAILWAY_GQL = 'https://backboard.railway.app/graphql/v2';

/**
 * Internal Railway GraphQL helper — uses RAILWAY_TOKEN from process.env.
 * Called by self-redeploy to avoid depending on command key auth.
 */
async function railwayGql(query, variables) {
  const token = process.env.RAILWAY_TOKEN;
  if (!token) throw new Error('RAILWAY_TOKEN not set in environment');
  const res = await fetch(RAILWAY_GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Railway API HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Railway GQL error: ${json.errors.map(e => e.message).join('; ')}`);
  return json.data;
}

async function internalRailwayRedeploy() {
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  if (!serviceId) throw new Error('RAILWAY_SERVICE_ID not set in environment');
  if (!environmentId) throw new Error('RAILWAY_ENVIRONMENT_ID not set in environment');
  return railwayGql(
    `mutation Redeploy($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }`,
    { serviceId, environmentId }
  );
}

/**
 * Trigger a fresh build from the latest GitHub commit (not just a restart of the current image).
 * Pass latestCommit:true so Railway pulls HEAD — bare serviceInstanceDeploy was redeploying stale SHAs.
 */
async function internalRailwayBuildFromLatest({ commitSha = null } = {}) {
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  if (!serviceId) throw new Error('RAILWAY_SERVICE_ID not set in environment');
  if (!environmentId) throw new Error('RAILWAY_ENVIRONMENT_ID not set in environment');
  const sha = commitSha ? String(commitSha).trim() : null;
  return railwayGql(
    `mutation BuildFromLatest($serviceId: String!, $environmentId: String!, $commitSha: String, $latestCommit: Boolean) {
      serviceInstanceDeploy(
        serviceId: $serviceId
        environmentId: $environmentId
        commitSha: $commitSha
        latestCommit: $latestCommit
      )
    }`,
    {
      serviceId,
      environmentId,
      commitSha: sha,
      latestCommit: sha ? null : true,
    },
  );
}

async function internalRailwayRedeployDeployment(deploymentId) {
  const id = String(deploymentId || '').trim();
  if (!id) throw new Error('deployment_id_required');
  return railwayGql(
    `mutation RedeployDeployment($id: String!) {
      deploymentRedeploy(id: $id)
    }`,
    { id },
  );
}

function getActor(req) {
  return req.get("x-actor") || req.body?.actor || req.query?.actor || "system";
}

function setSensitiveNoStoreHeaders(res) {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });
}

function safeSecretMatch(candidate, expected) {
  const left = Buffer.from(String(candidate || "").trim());
  const right = Buffer.from(String(expected || "").trim());
  if (!left.length || !right.length || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function getOperatorKeyFromRequest(req) {
  return (
    req.headers["x-command-key"] ||
    req.headers["x-command-center-key"] ||
    req.headers["x-lifeos-key"] ||
    req.headers["x-api-key"] ||
    ""
  );
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
   * POST /sync-command-key
   * Returns the COMMAND_CENTER_KEY value that Railway is actually running with.
   * Auth: x-railway-token must match RAILWAY_TOKEN in process.env.
   * Used by npm run system:sync-command-key to pull Railway's live key into .env.local
   * without touching Railway vault at all.
   */
  router.post("/sync-command-key", (req, res) => {
    setSensitiveNoStoreHeaders(res);
    const railwayToken = String(req.headers['x-railway-token'] || '').trim();
    const envToken = String(process.env.RAILWAY_TOKEN || '').trim();

    if (!safeSecretMatch(railwayToken, envToken)) {
      return res.status(401).json({
        ok: false,
        error: 'Unauthorized — x-railway-token must match RAILWAY_TOKEN in vault',
      });
    }

    const currentKey = process.env.COMMAND_CENTER_KEY ||
                       process.env.LIFEOS_KEY ||
                       process.env.API_KEY;

    if (!currentKey) {
      return res.status(500).json({ ok: false, error: 'No command key configured on Railway' });
    }

    res.json({ ok: true, command_center_key: currentKey });
  });

  /**
   * POST /rotate-command-key
   * Atomically rotates COMMAND_CENTER_KEY in Railway vault.
   * Auth: x-railway-token header must match RAILWAY_TOKEN in process.env.
   * This escape-hatch bypasses the command key so it can be reset even when
   * local .env.local and Railway vault are out of sync.
   *
   * Body: { new_key: string }  — caller must generate locally; route no longer returns secrets
   * Returns: { ok, message }
   */
  router.post("/rotate-command-key", async (req, res) => {
    try {
      setSensitiveNoStoreHeaders(res);
      const railwayToken = String(req.headers['x-railway-token'] || '').trim();
      const envToken = String(process.env.RAILWAY_TOKEN || '').trim();

      if (!safeSecretMatch(railwayToken, envToken)) {
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

      // Server-side generation was leaking the rotated key through an HTTP response.
      // Require callers to generate locally and send the exact key to store.
      const newKey = String(req.body?.new_key || '').trim();
      if (!newKey) {
        return res.status(400).json({
          ok: false,
          error: 'new_key is required; generate locally and send it to avoid secret return over HTTP',
        });
      }

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
        message: 'COMMAND_CENTER_KEY updated in Railway vault using caller-provided key. Update local env to match, then redeploy.',
        next_steps: [
          'Update COMMAND_CENTER_KEY in your local env to the caller-generated value',
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
      const commandKey = getOperatorKeyFromRequest(req);

      const envToken      = process.env.RAILWAY_TOKEN;
      const envCommandKey = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY ||
                            process.env.API_KEY;

      const authedViaRailwayToken = safeSecretMatch(railwayToken, envToken);
      const authedViaCommandKey = safeSecretMatch(commandKey, envCommandKey);

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

  /**
   * POST /build-from-latest
   * Triggers Railway to build a NEW deployment from the latest GitHub commit.
   * Different from self-redeploy: restarts current image. This rebuilds from source.
   * Use when commits are pushed but Railway isn't auto-deploying them.
   */
  router.post('/build-from-latest', async (req, res) => {
    try {
      const commandKey = getOperatorKeyFromRequest(req);
      const envCommandKey = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY;
      if (!safeSecretMatch(commandKey, envCommandKey)) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
      const commitSha = req.body?.commit_sha || req.body?.commitSha || null;
      const data = await internalRailwayBuildFromLatest({ commitSha });
      console.log('[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=BUILD_FROM_LATEST | triggered fresh Railway build | NEXT=PROBE /ready in ~120s');
      res.json({
        ok: true,
        message: commitSha
          ? `Railway build triggered for commit ${commitSha}`
          : 'Fresh Railway build from latest GitHub commit triggered',
        commit_sha: commitSha || 'latest',
        data,
      });
    } catch (error) {
      console.error('[RAILWAY-BUILD-FROM-LATEST] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /deployments/:id/redeploy
   * Promote an existing successful Railway deployment (e.g. after stale rollback).
   */
  router.post('/deployments/:id/redeploy', async (req, res) => {
    try {
      const commandKey = getOperatorKeyFromRequest(req);
      const envCommandKey = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY;
      if (!safeSecretMatch(commandKey, envCommandKey)) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
      const data = await internalRailwayRedeployDeployment(req.params.id);
      res.json({ ok: true, message: 'Deployment redeploy triggered', deployment_id: req.params.id, data });
    } catch (error) {
      console.error('[RAILWAY-DEPLOYMENT-REDEPLOY] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ── Deployment log reading ──────────────────────────────────────────
  // RAILWAY_SERVICE_ID + RAILWAY_ENVIRONMENT_ID + RAILWAY_TOKEN all confirmed SET

  const getRailwayIds = () => ({
    serviceId: process.env.RAILWAY_SERVICE_ID,
    environmentId: process.env.RAILWAY_ENVIRONMENT_ID,
  });

  /**
   * GET /deployments
   * Lists the last N Railway deployments for this service.
   * Query param: ?first=10 (default 10, max 50)
   */
  router.get("/deployments", requireKey, async (req, res) => {
    try {
      const first = Math.min(parseInt(req.query.first, 10) || 10, 50);
      const { serviceId, environmentId } = getRailwayIds();
      if (!serviceId || !environmentId) {
        return res.status(500).json({ ok: false, error: "RAILWAY_SERVICE_ID or RAILWAY_ENVIRONMENT_ID not set" });
      }
      const data = await railwayGql(
        `query Deployments($serviceId: String!, $environmentId: String!, $first: Int!) {
          deployments(first: $first, input: { serviceId: $serviceId, environmentId: $environmentId }) {
            edges {
              node {
                id
                status
                createdAt
                meta
                url
              }
            }
          }
        }`,
        { serviceId, environmentId, first }
      );
      const deployments = (data?.deployments?.edges || []).map((e) => e.node);
      res.json({ ok: true, count: deployments.length, deployments });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /deployments/latest
   * Returns the most recent deployment with its pass/fail status.
   * Quick probe after a git push — poll until status !== "DEPLOYING".
   */
  router.get("/deployments/latest", requireKey, async (req, res) => {
    try {
      const { serviceId, environmentId } = getRailwayIds();
      if (!serviceId || !environmentId) {
        return res.status(500).json({ ok: false, error: "RAILWAY_SERVICE_ID or RAILWAY_ENVIRONMENT_ID not set" });
      }
      const data = await railwayGql(
        `query LatestDeployment($serviceId: String!, $environmentId: String!) {
          deployments(first: 1, input: { serviceId: $serviceId, environmentId: $environmentId }) {
            edges {
              node {
                id
                status
                createdAt
                meta
                url
              }
            }
          }
        }`,
        { serviceId, environmentId }
      );
      const node = data?.deployments?.edges?.[0]?.node ?? null;
      if (!node) return res.json({ ok: true, deployment: null, message: "No deployments found" });
      res.json({ ok: true, success: node.status === "SUCCESS", deployment: node });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /deployments/:id/logs
   * Returns build logs for a specific Railway deployment ID.
   * Query param: ?limit=200 (default 200, max 1000)
   */
  router.get("/deployments/:id/logs", requireKey, async (req, res) => {
    try {
      const deploymentId = req.params.id;
      const data = await railwayGql(
        `query DeploymentLogs($deploymentId: String!) {
          deploymentLogs(deploymentId: $deploymentId) {
            timestamp
            message
            severity
          }
        }`,
        { deploymentId }
      );
      const logs = data?.deploymentLogs ?? [];
      const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
      res.json({ ok: true, count: logs.length, logs: logs.slice(-limit) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ── Local log file serving ──────────────────────────────────────────
  // Strict whitelist prevents arbitrary file reads.
  const LOCAL_LOG_ALLOWLIST = {
    "local-builder-daemon":   { path: "logs/local-builder-daemon.out",                      description: "Local builder daemon stdout" },
    "local-server":           { path: "logs/local-server.out",                               description: "Local server stdout" },
    "runtime-builder-lifeos": { path: "logs/tsos-runtime-builder-lifeos.log",                description: "LifeOS builder runtime log" },
    "runtime-builder-tc":     { path: "logs/tsos-runtime-builder-tc.log",                    description: "TC builder runtime log" },
    "runtime-builder-site":   { path: "logs/tsos-runtime-builder-site-builder.log",          description: "Site builder runtime log" },
    "runtime-auditor":        { path: "logs/tsos-runtime-auditor.log",                       description: "Sentinel auditor runtime log" },
    "runtime-guardian":       { path: "logs/tsos-runtime-guardian.log",                      description: "Runtime guardian log" },
    "runtime-overseer":       { path: "logs/tsos-runtime-overseer.log",                      description: "Overseer daemon runtime log" },
    "build-summaries":        { path: "data/builder-build-summaries.jsonl",                  description: "Structured build summaries (JSONL)" },
    "queue-log":              { path: "data/builder-continuous-queue-log.jsonl",             description: "Queue run log (JSONL)" },
    "daemon-log":             { path: "data/builder-daemon-log.jsonl",                       description: "Builder daemon log (JSONL)" },
    "auditor-log":            { path: "data/tsos-auditor-log.jsonl",                         description: "Auditor cycle log (JSONL)" },
    "overseer-log":           { path: "data/tsos-overseer-log.jsonl",                        description: "Overseer log (JSONL)" },
    "preflight-log":          { path: "data/builder-preflight-log.jsonl",                    description: "Builder preflight log (JSONL)" },
    "quarantined-tasks":      { path: "data/quarantined-tasks.json",                         description: "Quarantined task list (JSON)" },
  };

  /**
   * GET /logs/local
   * Lists all whitelisted local log files with size + last-modified.
   */
  router.get("/logs/local", requireKey, async (req, res) => {
    const root = process.cwd();
    const files = await Promise.all(
      Object.entries(LOCAL_LOG_ALLOWLIST).map(async ([name, meta]) => {
        const abs = join(root, meta.path);
        try {
          const s = await stat(abs);
          return { name, path: meta.path, description: meta.description, size_bytes: s.size, modified: s.mtime };
        } catch {
          return { name, path: meta.path, description: meta.description, exists: false };
        }
      })
    );
    res.json({ ok: true, count: files.length, files });
  });

  /**
   * GET /logs/local/:name
   * Tails the last N lines of a whitelisted local log file.
   * Query params:
   *   ?lines=100   default 100, max 2000
   *   ?raw=1       plain-text response instead of JSON
   */
  router.get("/logs/local/:name", requireKey, async (req, res) => {
    const entry = LOCAL_LOG_ALLOWLIST[req.params.name];
    if (!entry) {
      return res.status(404).json({
        ok: false,
        error: `Unknown log name '${req.params.name}'. Valid names: ${Object.keys(LOCAL_LOG_ALLOWLIST).join(", ")}`,
      });
    }
    const abs = join(process.cwd(), entry.path);
    try {
      const raw = await readFile(abs, "utf8");
      const lines = raw.split("\n").filter(Boolean);
      const limit = Math.min(parseInt(req.query.lines, 10) || 100, 2000);
      const tail = lines.slice(-limit);
      if (req.query.raw === "1") {
        res.setHeader("Content-Type", "text/plain");
        return res.send(tail.join("\n"));
      }
      res.json({ ok: true, name: req.params.name, path: entry.path, total_lines: lines.length, returned: tail.length, lines: tail });
    } catch (err) {
      if (err.code === "ENOENT") return res.status(404).json({ ok: false, error: `File not found: ${entry.path}` });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /custom-domains
   * List Railway service + custom domains for lumin-web.
   */
  router.get("/custom-domains", requireKey, async (_req, res) => {
    try {
      const projectId = process.env.RAILWAY_PROJECT_ID;
      const { serviceId, environmentId } = getRailwayIds();
      if (!projectId || !serviceId || !environmentId) {
        return res.status(500).json({
          ok: false,
          error: "RAILWAY_PROJECT_ID / RAILWAY_SERVICE_ID / RAILWAY_ENVIRONMENT_ID required",
        });
      }
      const data = await railwayGql(
        `query Domains($projectId: String!, $environmentId: String!, $serviceId: String!) {
          domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) {
            serviceDomains { id domain }
            customDomains {
              id
              domain
              status {
                dnsRecords { hostlabel recordType requiredValue status zone }
                certificateStatus
                verificationToken
              }
            }
          }
        }`,
        { projectId, environmentId, serviceId },
      );
      res.json({ ok: true, projectId, serviceId, environmentId, domains: data?.domains || null });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /custom-domains
   * Body: { domain: "sitebuilder.taloaos.com", targetPort?: number }
   * Attaches a custom domain on Railway; returns CNAME + TXT verification records.
   */
  router.post("/custom-domains", requireKey, async (req, res) => {
    try {
      const domain = String(req.body?.domain || "").trim().toLowerCase();
      if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
        return res.status(400).json({ ok: false, error: "valid domain required" });
      }
      const projectId = process.env.RAILWAY_PROJECT_ID;
      const { serviceId, environmentId } = getRailwayIds();
      if (!projectId || !serviceId || !environmentId) {
        return res.status(500).json({
          ok: false,
          error: "RAILWAY_PROJECT_ID / RAILWAY_SERVICE_ID / RAILWAY_ENVIRONMENT_ID required",
        });
      }
      const targetPort = Number(req.body?.targetPort) || Number(process.env.PORT) || 8080;
      const created = await railwayGql(
        `mutation CustomDomainCreate($input: CustomDomainCreateInput!) {
          customDomainCreate(input: $input) {
            id
            domain
            status {
              dnsRecords { hostlabel recordType requiredValue status zone }
              certificateStatus
              verificationToken
            }
          }
        }`,
        {
          input: {
            projectId,
            environmentId,
            serviceId,
            domain,
            targetPort,
          },
        },
      );
      const row = created?.customDomainCreate || null;
      const railwayHost =
        process.env.RAILWAY_PUBLIC_DOMAIN
        || "lumin-web-production-e3a9.up.railway.app";
      res.json({
        ok: true,
        customDomain: row,
        cloudflare_dns: {
          note: "Add in Cloudflare DNS for taloaos.com — proxy orange-cloud after Railway cert issues (start DNS-only if cert stuck)",
          records: [
            {
              type: "CNAME",
              name: domain.replace(/\.taloaos\.com$/i, "") || "@",
              target: railwayHost,
              proxied: true,
            },
            row?.status?.verificationToken
              ? {
                  type: "TXT",
                  name: `_railway-verify.${domain.replace(/\.taloaos\.com$/i, "")}`,
                  content: row.status.verificationToken,
                  proxied: false,
                }
              : null,
          ].filter(Boolean),
        },
      });
    } catch (error) {
      const msg = String(error.message || error);
      const already = /already|exists|taken/i.test(msg);
      res.status(already ? 200 : 500).json({
        ok: already,
        error: msg,
        note: already ? "Domain may already be attached — GET /custom-domains" : undefined,
      });
    }
  });

  /**
   * POST /custom-domains/bootstrap-taloa
   * Attach sitebuilder + app (+ optional apex) hosts for taloaos.com.
   */
  router.post("/custom-domains/bootstrap-taloa", requireKey, async (req, res) => {
    try {
      const { CLOUDFLARE_RAILWAY_HOSTS } = await import("../config/cloudflare-railway.js");
      const includeApex = req.body?.includeApex === true;
      const hosts = CLOUDFLARE_RAILWAY_HOSTS.filter((h) => includeApex || !h.apex);
      const results = [];
      for (const h of hosts) {
        try {
          const projectId = process.env.RAILWAY_PROJECT_ID;
          const { serviceId, environmentId } = getRailwayIds();
          const targetPort = Number(process.env.PORT) || 8080;
          const created = await railwayGql(
            `mutation CustomDomainCreate($input: CustomDomainCreateInput!) {
              customDomainCreate(input: $input) {
                id domain
                status {
                  dnsRecords { hostlabel recordType requiredValue status zone }
                  certificateStatus
                  verificationToken
                }
              }
            }`,
            {
              input: {
                projectId,
                environmentId,
                serviceId,
                domain: h.host,
                targetPort,
              },
            },
          );
          results.push({ host: h.host, ok: true, customDomain: created?.customDomainCreate || null });
        } catch (err) {
          results.push({ host: h.host, ok: false, error: err.message });
        }
      }
      const railwayHost =
        process.env.RAILWAY_PUBLIC_DOMAIN
        || "lumin-web-production-e3a9.up.railway.app";
      res.json({
        ok: results.some((r) => r.ok),
        railway_cname_target: railwayHost,
        results,
        cloudflare_next: {
          zone: "taloaos.com",
          ssl_mode: "Full",
          steps: [
            `In Cloudflare DNS, CNAME sitebuilder → ${railwayHost} (DNS only until Railway shows cert issued, then Proxied)`,
            `CNAME app → ${railwayHost} (same)`,
            "Add any TXT _railway-verify.* records returned above",
            "SSL/TLS mode: Full (or Full strict once origin cert OK)",
            "Then set SITE_BASE_URL=https://sitebuilder.taloaos.com via managed-env/bulk",
          ],
        },
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

export default createRailwayManagedEnvRoutes;