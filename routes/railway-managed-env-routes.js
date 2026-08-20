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

/**
 * Read-only: environments + services in the project, plus per-environment
 * service instance presence. Used to verify real state before any
 * environment-cleanup mutation — never mutate blind on a live project.
 */
async function internalRailwayTopology() {
  const projectId = process.env.RAILWAY_PROJECT_ID;
  if (!projectId) throw new Error('RAILWAY_PROJECT_ID not set in environment');
  return railwayGql(
    `query Topology($id: String!) {
      project(id: $id) {
        id
        name
        environments { edges { node { id name } } }
        services {
          edges {
            node {
              id
              name
              serviceInstances { edges { node { id environmentId } } }
            }
          }
        }
      }
    }`,
    { id: projectId },
  );
}

/**
 * Remove a service's instance from one specific environment only — does not
 * touch its instances in other environments. Used for environment cleanup
 * after a founder-driven environment duplication.
 */
async function internalRailwayDeleteServiceInstance(serviceId, environmentId) {
  if (!serviceId || !environmentId) throw new Error('serviceId and environmentId required');
  // Real mutation confirmed via live schema introspection 2026-08-19:
  // serviceInstanceDelete does not exist. serviceDelete(id, environmentId)
  // is the correct one — environmentId scopes the delete to just that
  // environment's instance; omitting it would delete the service everywhere.
  return railwayGql(
    `mutation DeleteServiceInstance($serviceId: String!, $environmentId: String!) {
      serviceDelete(id: $serviceId, environmentId: $environmentId)
    }`,
    { serviceId, environmentId },
  );
}

async function internalRailwayRenameEnvironment(environmentId, newName) {
  if (!environmentId || !newName) throw new Error('environmentId and newName required');
  // Real mutation confirmed via live schema introspection 2026-08-19:
  // environmentUpdate does not exist; environmentRename(id, input) does.
  return railwayGql(
    `mutation RenameEnv($id: String!, $input: EnvironmentRenameInput!) {
      environmentRename(id: $id, input: $input) { id name }
    }`,
    { id: environmentId, input: { name: newName } },
  );
}

/**
 * Read-only: variable names + masked values for one service in one specific
 * environment — used to verify DB wiring is correct per-environment after
 * an environment duplication/cleanup, without ever printing real secrets.
 */
async function internalRailwayServiceVars(serviceId, environmentId) {
  const projectId = process.env.RAILWAY_PROJECT_ID;
  if (!projectId) throw new Error('RAILWAY_PROJECT_ID not set in environment');
  if (!serviceId || !environmentId) throw new Error('serviceId and environmentId required');
  const data = await railwayGql(
    `query GetVars($projectId: String!, $environmentId: String!, $serviceId: String!) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
    }`,
    { projectId, environmentId, serviceId },
  );
  const vars = data?.variables || {};
  // These are genuinely public (they ARE the public URL / non-secret name),
  // never mask them — everything else stays masked.
  const NEVER_SECRET = new Set(['RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_STATIC_URL', 'RAILWAY_SERVICE_NAME', 'RAILWAY_ENVIRONMENT_NAME', 'APP_URL', 'PUBLIC_BASE_URL']);
  const masked = {};
  for (const [k, v] of Object.entries(vars)) {
    const s = String(v);
    if (NEVER_SECRET.has(k)) { masked[k] = s; continue; }
    masked[k] = s.length === 0 ? '(empty)' : s.length > 6 ? `${s.slice(0, 4)}****${s.slice(-2)}` : `(len:${s.length})`;
  }
  return masked;
}

/**
 * Set one or more variables on one service in one specific environment.
 * Values pass through exactly as given — caller is responsible for not
 * logging/echoing secret values back out.
 */
async function internalRailwaySetServiceVars(serviceId, environmentId, variables) {
  const projectId = process.env.RAILWAY_PROJECT_ID;
  if (!projectId) throw new Error('RAILWAY_PROJECT_ID not set in environment');
  if (!serviceId || !environmentId) throw new Error('serviceId and environmentId required');
  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
    throw new Error('variables must be a plain object of {NAME: value}');
  }
  return railwayGql(
    `mutation SetServiceVars($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }`,
    { input: { projectId, environmentId, serviceId, variables, skipDeploys: true } },
  );
}

/**
 * Repoints a whitelisted set of secret var NAMES on a target service+
 * environment to LITERAL copies of Abbott's own already-loaded process.env
 * values. Fixes the real failure mode found live 2026-08-19: those vars
 * were previously Railway reference variables (${{lumin-web.NAME}}) that
 * silently resolved to empty once lumin-web's instance was removed from
 * that environment during the Castello/Abbott split — the keys stayed,
 * the values broke. Raw values never appear in the request or response.
 */
async function internalRailwayRepointSecretsFromAbbott(serviceId, environmentId, names) {
  const toSet = {};
  const skipped = [];
  for (const name of names) {
    const v = process.env[name];
    if (v) toSet[name] = v; else skipped.push(name);
  }
  if (Object.keys(toSet).length > 0) {
    await internalRailwaySetServiceVars(serviceId, environmentId, toSet);
  }
  return { repointed: Object.keys(toSet), skipped_not_set_on_abbott: skipped };
}

/** Redeploy any service+environment (not just Abbott, unlike /self-redeploy). */
async function internalRailwayRedeployService(serviceId, environmentId) {
  if (!serviceId || !environmentId) throw new Error('serviceId and environmentId required');
  return railwayGql(
    `mutation RedeployService($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }`,
    { serviceId, environmentId },
  );
}

/**
 * Same serviceInstanceDeploy mutation internalRailwayBuildFromLatest uses,
 * but for an arbitrary service/environment instead of hardcoding Abbott's
 * own RAILWAY_SERVICE_ID/RAILWAY_ENVIRONMENT_ID -- needed 2026-08-20 to
 * rebuild Costello from its latest commit (8 commits ahead of its crashed
 * deployment) rather than only being able to restart the same stale image
 * serviceInstanceRedeploy above is limited to.
 */
async function internalRailwayDeployServiceLatest(serviceId, environmentId, commitSha = null) {
  if (!serviceId || !environmentId) throw new Error('serviceId and environmentId required');
  const sha = commitSha ? String(commitSha).trim() : null;
  return railwayGql(
    `mutation DeployServiceLatest($serviceId: String!, $environmentId: String!, $commitSha: String, $latestCommit: Boolean) {
      serviceInstanceDeploy(
        serviceId: $serviceId
        environmentId: $environmentId
        commitSha: $commitSha
        latestCommit: $latestCommit
      )
    }`,
    { serviceId, environmentId, commitSha: sha, latestCommit: sha ? null : true },
  );
}

/**
 * Trigger another service's own internal autopilot/cron build endpoint,
 * reading its raw COMMAND_CENTER_KEY server-side and using it only for this
 * one call -- never returned to the caller. Needed 2026-08-20: Costello's
 * scheduled GitHub Actions workflows (including the ones that call this same
 * endpoint on a cron) are blocked by a repo-level GitHub billing issue, so
 * nothing has been telling its otherwise-healthy server to actually start
 * building. This lets the conductor trigger a real build cycle directly
 * against Costello's own already-working /internal/cron/autopilot route,
 * independent of the blocked CI path -- same shape as
 * internalRailwayWireCostelloDatabase's existing "read a real secret
 * server-side, never expose it" pattern.
 */
async function internalRailwayTriggerAutopilot(serviceId, environmentId, { force = false } = {}) {
  const projectId = process.env.RAILWAY_PROJECT_ID;
  if (!projectId) throw new Error('RAILWAY_PROJECT_ID not set in environment');
  if (!serviceId || !environmentId) throw new Error('serviceId and environmentId required');
  const data = await railwayGql(
    `query GetVarsRaw($projectId: String!, $environmentId: String!, $serviceId: String!) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
    }`,
    { projectId, environmentId, serviceId },
  );
  const vars = data?.variables || {};
  const targetDomain = vars.RAILWAY_PUBLIC_DOMAIN || vars.PUBLIC_BASE_URL || vars.APP_URL;
  const key = vars.COMMAND_CENTER_KEY;
  if (!targetDomain) throw new Error('target service has no RAILWAY_PUBLIC_DOMAIN/PUBLIC_BASE_URL/APP_URL');
  if (!key) throw new Error('target service has no COMMAND_CENTER_KEY');
  const base = targetDomain.startsWith('http') ? targetDomain.replace(/\/$/, '') : `https://${targetDomain}`;
  const url = `${base}/internal/cron/autopilot?key=${encodeURIComponent(key)}${force ? '&force=1' : ''}`;
  const res = await fetch(url, { method: 'GET' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 2000) }; }
  return { http_status: res.status, target_domain: targetDomain, body };
}

/**
 * Point Costello's DATABASE_URL / APP_URL / PUBLIC_BASE_URL at its own real
 * dedicated database + its own real current Railway domain, WITHOUT the
 * caller ever needing to see or pass the raw connection string — built
 * entirely server-side from Abbott's own already-loaded process.env, using
 * the real RAILWAY_PUBLIC_DOMAIN this environment already reports.
 */
async function internalRailwayWireCostelloDatabase({ serviceId, environmentId, dbName = 'costello' }) {
  const abbottUrl = process.env.DATABASE_URL;
  if (!abbottUrl) throw new Error('DATABASE_URL not set in Abbott environment — cannot derive Costello URL');
  const u = new URL(abbottUrl);
  u.pathname = `/${dbName}`;
  const costelloDatabaseUrl = u.toString();

  const vars = await internalRailwayServiceVars(serviceId, environmentId);
  const realDomain = vars.RAILWAY_PUBLIC_DOMAIN;
  if (!realDomain || realDomain === '(empty)') {
    throw new Error('RAILWAY_PUBLIC_DOMAIN not available for this service/environment');
  }
  const realAppUrl = `https://${realDomain}`;

  await internalRailwaySetServiceVars(serviceId, environmentId, {
    DATABASE_URL: costelloDatabaseUrl,
    APP_URL: realAppUrl,
    PUBLIC_BASE_URL: realAppUrl,
  });

  return { dbName, appUrl: realAppUrl, dbHost: u.hostname };
}

/**
 * Provision a genuinely isolated, persistent Postgres service inside a
 * given environment (its own compute, its own volume — not a shared-server
 * database), then wire the target app service's DATABASE_URL to it via
 * Railway's private-network DNS convention (<service-name>.railway.internal)
 * and fix its APP_URL/PUBLIC_BASE_URL to its real current domain.
 *
 * The generated Postgres password never leaves this function — it's used
 * locally to build both the new Postgres service's own env vars and the
 * target service's DATABASE_URL, and is never returned to the caller.
 */
async function internalRailwayProvisionIsolatedPostgres({
  projectId,
  environmentId,
  postgresServiceName = 'costello-postgres',
  targetServiceId,
  targetDbName = 'railway',
}) {
  if (!projectId || !environmentId || !targetServiceId) {
    throw new Error('projectId, environmentId, and targetServiceId required');
  }

  const createData = await railwayGql(
    `mutation CreatePostgres($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id name }
    }`,
    { input: { projectId, environmentId, name: postgresServiceName, source: { image: 'postgres:16' } } },
  );
  const pgServiceId = createData?.serviceCreate?.id;
  if (!pgServiceId) throw new Error('serviceCreate did not return a service id');

  await railwayGql(
    `mutation CreateVolume($input: VolumeCreateInput!) {
      volumeCreate(input: $input) { id }
    }`,
    { input: { projectId, environmentId, serviceId: pgServiceId, mountPath: '/var/lib/postgresql/data' } },
  );

  const pgPassword = randomBytes(24).toString('base64url');
  await internalRailwaySetServiceVars(pgServiceId, environmentId, {
    POSTGRES_PASSWORD: pgPassword,
    POSTGRES_DB: targetDbName,
    PGDATA: '/var/lib/postgresql/data/pgdata',
  });

  await railwayGql(
    `mutation DeployPostgres($serviceId: String!, $environmentId: String!) {
      serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
    }`,
    { serviceId: pgServiceId, environmentId },
  );

  // Railway's documented private-network convention: services in the same
  // project+environment reach each other at <service-name>.railway.internal
  // over the private network, no public exposure needed for this.
  const internalHost = `${postgresServiceName}.railway.internal`;
  const targetDatabaseUrl = `postgresql://postgres:${pgPassword}@${internalHost}:5432/${targetDbName}`;

  const targetVars = await internalRailwayServiceVars(targetServiceId, environmentId);
  const realDomain = targetVars.RAILWAY_PUBLIC_DOMAIN;
  const realAppUrl = realDomain && realDomain !== '(empty)' ? `https://${realDomain}` : undefined;

  const targetUpdate = { DATABASE_URL: targetDatabaseUrl };
  if (realAppUrl) {
    targetUpdate.APP_URL = realAppUrl;
    targetUpdate.PUBLIC_BASE_URL = realAppUrl;
  }
  await internalRailwaySetServiceVars(targetServiceId, environmentId, targetUpdate);

  await railwayGql(
    `mutation RedeployTarget($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }`,
    { serviceId: targetServiceId, environmentId },
  );

  return {
    postgresServiceId: pgServiceId,
    postgresServiceName,
    internalHost,
    targetDbName,
    targetAppUrl: realAppUrl || null,
  };
}

/**
 * One-time schema discovery helper: lists Mutation fields whose name
 * contains any of the given substrings, with their arg names/types.
 * Used to find the real mutation name for removing a service instance
 * from one environment — Railway's schema doesn't expose this in docs.
 */
async function internalRailwayIntrospectMutations(nameContains = []) {
  const data = await railwayGql(
    `query IntrospectMutations {
      __schema {
        mutationType {
          fields {
            name
            args { name type { name kind ofType { name kind } } }
          }
        }
      }
    }`,
    {},
  );
  const fields = data?.__schema?.mutationType?.fields || [];
  const needles = nameContains.map((s) => String(s).toLowerCase());
  return fields.filter((f) =>
    needles.length === 0 || needles.some((n) => f.name.toLowerCase().includes(n)),
  );
}

/**
 * Introspect a named GraphQL input/object type's own fields — used after
 * internalRailwayIntrospectMutations to see what a mutation's `input`
 * argument actually accepts.
 */
async function internalRailwayIntrospectType(typeName) {
  const data = await railwayGql(
    `query IntrospectType($name: String!) {
      __type(name: $name) {
        name
        kind
        inputFields { name type { name kind ofType { name kind ofType { name kind } } } }
        fields { name type { name kind ofType { name kind ofType { name kind } } } }
      }
    }`,
    { name: typeName },
  );
  return data?.__type || null;
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
   * GET /topology
   * Read-only: real environments + services + per-environment instance
   * presence, straight from Railway's API. Always call before any
   * environment-cleanup mutation on this project.
   */
  router.get("/topology", requireKey, async (req, res) => {
    try {
      const data = await internalRailwayTopology();
      res.json({ ok: true, project: data?.project || null });
    } catch (error) {
      console.error('[RAILWAY-TOPOLOGY] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /introspect-mutations?contains=delete,instance
   * One-time schema discovery for finding the real mutation name to remove
   * a service instance from a single environment.
   */
  router.get("/introspect-mutations", requireKey, async (req, res) => {
    try {
      const contains = String(req.query.contains || '').split(',').map((s) => s.trim()).filter(Boolean);
      const fields = await internalRailwayIntrospectMutations(contains);
      res.json({ ok: true, fields });
    } catch (error) {
      console.error('[RAILWAY-INTROSPECT] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /introspect-type?name=ServiceCreateInput
   */
  router.get("/introspect-type", requireKey, async (req, res) => {
    try {
      const type = await internalRailwayIntrospectType(String(req.query.name || ''));
      res.json({ ok: true, type });
    } catch (error) {
      console.error('[RAILWAY-INTROSPECT-TYPE] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /service-vars?serviceId=...&environmentId=...
   * Read-only, masked values only — verify DB wiring per environment.
   */
  router.get("/service-vars", requireKey, async (req, res) => {
    try {
      const { serviceId, environmentId } = req.query || {};
      const vars = await internalRailwayServiceVars(serviceId, environmentId);
      res.json({ ok: true, serviceId, environmentId, vars });
    } catch (error) {
      console.error('[RAILWAY-SERVICE-VARS] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /wire-costello-database
   * Body: { serviceId, environmentId, dbName? }
   * Points Costello's DATABASE_URL at its own dedicated Neon database
   * (derived server-side from Abbott's own DATABASE_URL — never passed
   * through the request) and fixes its stale APP_URL/PUBLIC_BASE_URL to
   * its real current Railway domain. Response never echoes the URL.
   */
  router.post("/wire-costello-database", requireKey, async (req, res) => {
    try {
      const { serviceId, environmentId, dbName } = req.body || {};
      const result = await internalRailwayWireCostelloDatabase({ serviceId, environmentId, dbName });
      console.log(`[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=WIRE_DATABASE | serviceId=${serviceId} environmentId=${environmentId} dbName=${result.dbName}`);
      res.json({ ok: true, serviceId, environmentId, dbName: result.dbName, dbHost: result.dbHost, appUrl: result.appUrl });
    } catch (error) {
      console.error('[RAILWAY-WIRE-COSTELLO-DB] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /provision-isolated-postgres
   * Body: { projectId, environmentId, targetServiceId, postgresServiceName?, targetDbName? }
   * Creates a genuinely separate Postgres service (own compute, own volume)
   * in the given environment, wires targetServiceId's DATABASE_URL to it via
   * Railway private networking, fixes APP_URL/PUBLIC_BASE_URL, redeploys the
   * target. The generated password is never returned or logged.
   */
  router.post("/provision-isolated-postgres", requireKey, async (req, res) => {
    try {
      const { projectId, environmentId, targetServiceId, postgresServiceName, targetDbName } = req.body || {};
      const result = await internalRailwayProvisionIsolatedPostgres({
        projectId, environmentId, targetServiceId, postgresServiceName, targetDbName,
      });
      console.log(`[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=PROVISION_POSTGRES | pgService=${result.postgresServiceId} target=${targetServiceId}`);
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error('[RAILWAY-PROVISION-POSTGRES] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /repoint-secrets-from-abbott
   * Body: { serviceId, environmentId, names: [...] }
   * Repoints broken reference variables to literal copies of Abbott's own
   * process.env values. Never echoes the values themselves.
   */
  router.post("/repoint-secrets-from-abbott", requireKey, async (req, res) => {
    try {
      const { serviceId, environmentId, names } = req.body || {};
      if (!Array.isArray(names) || names.length === 0) {
        return res.status(400).json({ ok: false, error: 'names array required' });
      }
      const result = await internalRailwayRepointSecretsFromAbbott(serviceId, environmentId, names);
      console.log(`[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=REPOINT_SECRETS | serviceId=${serviceId} count=${result.repointed.length}`);
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error('[RAILWAY-REPOINT-SECRETS] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /redeploy-service
   * Body: { serviceId, environmentId }
   * Redeploys any service, unlike /self-redeploy which is Abbott-only.
   */
  router.post("/redeploy-service", requireKey, async (req, res) => {
    try {
      const { serviceId, environmentId } = req.body || {};
      const data = await internalRailwayRedeployService(serviceId, environmentId);
      console.log(`[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=REDEPLOY_SERVICE | serviceId=${serviceId} environmentId=${environmentId}`);
      res.json({ ok: true, serviceId, environmentId, data });
    } catch (error) {
      console.error('[RAILWAY-REDEPLOY-SERVICE] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /deploy-service-latest
   * Body: { serviceId, environmentId, commit_sha? }
   * Rebuilds an arbitrary service from its latest GitHub commit (or a named
   * commit_sha) -- unlike /redeploy-service, which only restarts the same
   * already-built image, this pulls in commits pushed since the last deploy.
   */
  router.post("/deploy-service-latest", requireKey, async (req, res) => {
    try {
      const { serviceId, environmentId, commit_sha = null } = req.body || {};
      const data = await internalRailwayDeployServiceLatest(serviceId, environmentId, commit_sha);
      console.log(`[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=DEPLOY_SERVICE_LATEST | serviceId=${serviceId} environmentId=${environmentId} commit_sha=${commit_sha || 'latest'}`);
      res.json({ ok: true, serviceId, environmentId, commit_sha: commit_sha || 'latest', data });
    } catch (error) {
      console.error('[RAILWAY-DEPLOY-SERVICE-LATEST] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /trigger-autopilot
   * Body: { serviceId, environmentId, force? }
   * Calls another service's own /internal/cron/autopilot endpoint using its
   * real COMMAND_CENTER_KEY, read and used server-side only -- the key
   * itself is never included in the response.
   */
  router.post("/trigger-autopilot", requireKey, async (req, res) => {
    try {
      const { serviceId, environmentId, force = false } = req.body || {};
      const result = await internalRailwayTriggerAutopilot(serviceId, environmentId, { force: !!force });
      console.log(`[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=TRIGGER_AUTOPILOT | serviceId=${serviceId} environmentId=${environmentId} http_status=${result.http_status}`);
      res.json({ ok: true, serviceId, environmentId, ...result });
    } catch (error) {
      console.error('[RAILWAY-TRIGGER-AUTOPILOT] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /delete-service-instance
   * Body: { serviceId, environmentId }
   * Removes ONE service's instance from ONE environment. Does not touch the
   * same service's instance in any other environment.
   */
  router.post("/delete-service-instance", requireKey, async (req, res) => {
    try {
      const { serviceId, environmentId } = req.body || {};
      const data = await internalRailwayDeleteServiceInstance(serviceId, environmentId);
      console.log(`[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=DELETE_INSTANCE | serviceId=${serviceId} environmentId=${environmentId}`);
      res.json({ ok: true, serviceId, environmentId, data });
    } catch (error) {
      console.error('[RAILWAY-DELETE-INSTANCE] Error:', error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /rename-environment
   * Body: { environmentId, newName }
   */
  router.post("/rename-environment", requireKey, async (req, res) => {
    try {
      const { environmentId, newName } = req.body || {};
      const data = await internalRailwayRenameEnvironment(environmentId, newName);
      console.log(`[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=RENAME_ENV | environmentId=${environmentId} newName=${newName}`);
      res.json({ ok: true, environmentId, newName, data });
    } catch (error) {
      console.error('[RAILWAY-RENAME-ENV] Error:', error.message);
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
   * GET /service-latest-deployment?serviceId=...&environmentId=...
   * Same as /deployments/latest but for any service, not just Abbott.
   */
  router.get("/service-latest-deployment", requireKey, async (req, res) => {
    try {
      const { serviceId, environmentId } = req.query || {};
      if (!serviceId || !environmentId) {
        return res.status(400).json({ ok: false, error: 'serviceId and environmentId required' });
      }
      const data = await railwayGql(
        `query LatestDeployment($serviceId: String!, $environmentId: String!) {
          deployments(first: 1, input: { serviceId: $serviceId, environmentId: $environmentId }) {
            edges { node { id status createdAt meta url } }
          }
        }`,
        { serviceId, environmentId },
      );
      const node = data?.deployments?.edges?.[0]?.node ?? null;
      res.json({ ok: true, deployment: node });
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
   * POST /custom-domains/remove
   * Body: { id } or { domain }. (Not DELETE /custom-domains — that hits DELETE /:name.)
   * Frees Railway plan slots (e.g. reclaim unused taloaos hosts for WRM).
   */
  router.post("/custom-domains/remove", requireKey, async (req, res) => {
    try {
      let id = String(req.body?.id || "").trim();
      const domainWanted = String(req.body?.domain || "").trim().toLowerCase();
      if (!id && domainWanted) {
        const projectId = process.env.RAILWAY_PROJECT_ID;
        const { serviceId, environmentId } = getRailwayIds();
        const data = await railwayGql(
          `query Domains($projectId: String!, $environmentId: String!, $serviceId: String!) {
            domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) {
              customDomains { id domain }
            }
          }`,
          { projectId, environmentId, serviceId },
        );
        const hit = (data?.domains?.customDomains || []).find(
          (d) => String(d.domain || "").toLowerCase() === domainWanted,
        );
        id = hit?.id || "";
      }
      if (!id) {
        return res.status(400).json({ ok: false, error: "id or domain required" });
      }
      await railwayGql(
        `mutation CustomDomainDelete($id: String!) { customDomainDelete(id: $id) }`,
        { id },
      );
      res.json({ ok: true, deleted: id, domain: domainWanted || null });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /custom-domains/apply-cloudflare-dns
   * System path: upsert Railway-required CNAME + TXT into Cloudflare DNS.
   * Body: { token?, zoneId?, proxied?: false, persistToken?: true }
   * Uses CLOUDFLARE_API_TOKEN / ZONE_ID from env when body omits them.
   */
  router.post("/custom-domains/apply-cloudflare-dns", requireKey, async (req, res) => {
    try {
      const {
        buildDnsRecordsFromRailwayDomains,
        applyCloudflareDnsRecords,
        CLOUDFLARE_ZONE_NAME,
      } = await import("../config/cloudflare-railway.js");
      const token = String(
        req.body?.token
        || process.env.CLOUDFLARE_API_TOKEN
        || "",
      ).trim();
      if (!token) {
        return res.status(503).json({
          ok: false,
          error: "CLOUDFLARE_API_TOKEN missing — system cannot write DNS yet",
          next: "Store a Zone.DNS Edit token via managed-env/bulk or POST body.token, then retry",
        });
      }
      const projectId = process.env.RAILWAY_PROJECT_ID;
      const { serviceId, environmentId } = getRailwayIds();
      if (!projectId || !serviceId || !environmentId) {
        return res.status(500).json({
          ok: false,
          error: "RAILWAY_PROJECT_ID / RAILWAY_SERVICE_ID / RAILWAY_ENVIRONMENT_ID required",
        });
      }
      const listed = await railwayGql(
        `query Domains($projectId: String!, $environmentId: String!, $serviceId: String!) {
          domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) {
            serviceDomains { id domain }
            customDomains {
              id domain
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
      const domains = listed?.domains || { customDomains: [] };
      const proxied = req.body?.proxied === true;
      const records = buildDnsRecordsFromRailwayDomains(
        { domains },
        { proxied, zone: CLOUDFLARE_ZONE_NAME },
      );
      const applied = await applyCloudflareDnsRecords({
        token,
        zoneId: String(req.body?.zoneId || process.env.CLOUDFLARE_ZONE_ID || "").trim() || null,
        zoneName: CLOUDFLARE_ZONE_NAME,
        records,
      });

      if (req.body?.persistToken === true && req.body?.token && managedEnvService) {
        try {
          const bulkVars = { CLOUDFLARE_API_TOKEN: token };
          if (applied.zoneId) bulkVars.CLOUDFLARE_ZONE_ID = applied.zoneId;
          process.env.CLOUDFLARE_API_TOKEN = token;
          if (applied.zoneId) process.env.CLOUDFLARE_ZONE_ID = applied.zoneId;
          const stored = await managedEnvService.upsertDesiredVars(bulkVars, getActor(req));
          const sync = await managedEnvService.syncDesiredVars({
            actor: getActor(req),
            names: Object.keys(bulkVars),
          }).catch((err) => ({ ok: false, error: err.message }));
          applied.persisted = { stored, sync };
        } catch (err) {
          applied.persist_error = err.message;
        }
      }

      return res.status(applied.ok ? 200 : 502).json({
        ok: applied.ok,
        zone: CLOUDFLARE_ZONE_NAME,
        record_count: records.length,
        records,
        applied,
        next: applied.ok
          ? "Wait for Railway cert → then POST again with proxied:true (or flip orange cloud)"
          : "Fix Cloudflare token permissions (Zone.DNS Edit) or zone access, then retry",
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
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