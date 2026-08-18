#!/usr/bin/env node
/**
 * SYNOPSIS: Deploy the repo to Railway from GitHub Actions.
 * @authority Legacy production spine — deploy path repair only.
 *
 * Preferred path: call the live service's managed-env build endpoint.
 * Fallback path: Railway Public GraphQL API using an account/workspace token
 * or an environment-scoped project token.
 *
 * Current Railway CLI/API convention:
 *   RAILWAY_TOKEN     = project-scoped token (Project-Access-Token header)
 *   RAILWAY_API_TOKEN = account/workspace token (Authorization: Bearer)
 */

const RAILWAY_GQL = "https://backboard.railway.com/graphql/v2";

function getEnv(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function requireEnv(name) {
  const value = getEnv(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function normalizeConnection(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.edges)) return value.edges.map((edge) => edge?.node).filter(Boolean);
  if (Array.isArray(value.nodes)) return value.nodes.filter(Boolean);
  return [];
}

function getCommandKey() {
  return getEnv("COMMAND_CENTER_KEY") || getEnv("LIFEOS_KEY") || getEnv("API_KEY");
}

function getLiveBaseUrl() {
  return (getEnv("APP_URL") || getEnv("PUBLIC_BASE_URL")).replace(/\/$/, "");
}

function getProjectToken() {
  return getEnv("RAILWAY_PROJECT_TOKEN") || getEnv("RAILWAY_SERVICE_TOKEN") || getEnv("RAILWAY_TOKEN");
}

function getApiToken() {
  return getEnv("RAILWAY_API_TOKEN");
}

function railwayAuthHeaders() {
  const projectToken = getProjectToken();
  if (projectToken) {
    return {
      "content-type": "application/json",
      "Project-Access-Token": projectToken,
    };
  }
  const apiToken = getApiToken();
  if (!apiToken) throw new Error("Railway token is required");
  return {
    "content-type": "application/json",
    authorization: `Bearer ${apiToken}`,
  };
}

async function railwayGql(query, variables = {}) {
  const res = await fetch(RAILWAY_GQL, {
    method: "POST",
    headers: railwayAuthHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Railway API returned non-JSON (${res.status}): ${text.slice(0, 500)}`);
  }
  if (!res.ok) throw new Error(`Railway API HTTP ${res.status}: ${text.slice(0, 500)}`);
  if (json.errors?.length) throw new Error(json.errors.map((err) => err.message).join("; "));
  return json.data;
}

async function resolveProjectTopology(projectId) {
  return railwayGql(
    `query ResolveProject($projectId: String!) {
      project(id: $projectId) {
        id
        name
        services { edges { node { id name } } }
        environments { edges { node { id name } } }
      }
    }`,
    { projectId },
  );
}

function findByName(items, expectedName, kind) {
  const lowered = String(expectedName).trim().toLowerCase();
  const match = items.find((item) => String(item?.name || "").trim().toLowerCase() === lowered);
  if (!match) {
    const available = items.map((item) => item?.name).filter(Boolean).join(", ") || "(none)";
    throw new Error(`${kind} "${expectedName}" not found. Available: ${available}`);
  }
  return match;
}

async function triggerDeploy({ serviceId, environmentId, commitSha }) {
  return railwayGql(
    `mutation Deploy($serviceId: String!, $environmentId: String!, $commitSha: String, $latestCommit: Boolean) {
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
      commitSha: commitSha || null,
      latestCommit: commitSha ? null : true,
    },
  );
}

async function fetchLatestDeployment({ serviceId, environmentId }) {
  const data = await railwayGql(
    `query LatestDeployment($serviceId: String!, $environmentId: String!) {
      deployments(first: 1, input: { serviceId: $serviceId, environmentId: $environmentId }) {
        edges { node { id status meta createdAt updatedAt } }
      }
    }`,
    { serviceId, environmentId },
  );
  return normalizeConnection(data?.deployments)[0] || null;
}

async function deployViaLiveManagedEnv({ baseUrl, commandKey, commitSha }) {
  const url = `${baseUrl}/api/v1/railway/managed-env/build-from-latest`;
  console.log(`Deploy path: live managed-env → ${baseUrl}`);
  if (commitSha) console.log(`Deploying commit: ${commitSha}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-command-key": commandKey },
    body: JSON.stringify(commitSha ? { commit_sha: commitSha } : {}),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`managed-env deploy returned non-JSON (${res.status}): ${text.slice(0, 500)}`);
  }
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `managed-env deploy HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  console.log("Live managed-env deploy accepted:");
  console.log(JSON.stringify({ ok: json.ok, message: json.message, commit_sha: json.commit_sha, data: json.data }, null, 2));
  return json;
}

async function deployViaDirectRailwayGraphql({ commitSha }) {
  const requestedServiceId = getEnv("RAILWAY_SERVICE_ID");
  const requestedEnvironmentId = getEnv("RAILWAY_ENVIRONMENT_ID");
  const projectTokenPresent = Boolean(getProjectToken());

  if (projectTokenPresent && requestedServiceId && requestedEnvironmentId) {
    console.log("Deploy path: direct Railway GraphQL with scoped project token");
    console.log(`Target service: ${requestedServiceId}`);
    console.log(`Target environment: ${requestedEnvironmentId}`);
    if (commitSha) console.log(`Deploying commit: ${commitSha}`);
    const deploy = await triggerDeploy({ serviceId: requestedServiceId, environmentId: requestedEnvironmentId, commitSha });
    console.log("Railway deploy mutation accepted:");
    console.log(JSON.stringify(deploy, null, 2));
    const latest = await fetchLatestDeployment({ serviceId: requestedServiceId, environmentId: requestedEnvironmentId });
    if (latest) console.log(JSON.stringify(latest, null, 2));
    return;
  }

  const projectId = requireEnv("RAILWAY_PROJECT_ID");
  const requestedServiceName = getEnv("RAILWAY_SERVICE_NAME", "lumin-web");
  const requestedEnvironmentName = getEnv("RAILWAY_ENVIRONMENT_NAME", "production");

  console.log("Deploy path: direct Railway GraphQL (topology fallback)");
  console.log(`Target project: ${projectId}`);
  console.log(`Target service: ${requestedServiceId || requestedServiceName}`);
  console.log(`Target environment: ${requestedEnvironmentId || requestedEnvironmentName}`);

  const topology = await resolveProjectTopology(projectId);
  const project = topology?.project;
  if (!project?.id) throw new Error(`Project "${projectId}" not found or not accessible`);
  const services = normalizeConnection(project.services);
  const environments = normalizeConnection(project.environments);
  const service = requestedServiceId
    ? services.find((item) => item.id === requestedServiceId) || (() => { throw new Error(`Service ID "${requestedServiceId}" not found in project`); })()
    : findByName(services, requestedServiceName, "Service");
  const environment = requestedEnvironmentId
    ? environments.find((item) => item.id === requestedEnvironmentId) || (() => { throw new Error(`Environment ID "${requestedEnvironmentId}" not found in project`); })()
    : findByName(environments, requestedEnvironmentName, "Environment");

  console.log(`Resolved Railway project: ${project.name} (${project.id})`);
  console.log(`Resolved service: ${service.name} (${service.id})`);
  console.log(`Resolved environment: ${environment.name} (${environment.id})`);
  if (commitSha) console.log(`Deploying commit: ${commitSha}`);
  const deploy = await triggerDeploy({ serviceId: service.id, environmentId: environment.id, commitSha });
  console.log("Railway deploy mutation accepted:");
  console.log(JSON.stringify(deploy, null, 2));
  const latest = await fetchLatestDeployment({ serviceId: service.id, environmentId: environment.id });
  if (latest) console.log(JSON.stringify(latest, null, 2));
}

async function main() {
  const commitSha = getEnv("GITHUB_SHA");
  const baseUrl = getLiveBaseUrl();
  const commandKey = getCommandKey();
  if (baseUrl && commandKey) {
    try {
      await deployViaLiveManagedEnv({ baseUrl, commandKey, commitSha });
      return;
    } catch (error) {
      const hasDirectToken = Boolean(getProjectToken() || getApiToken());
      if (!hasDirectToken) throw error;
      console.warn(`Live managed-env deploy failed (${error.message}); falling back to direct GraphQL`);
    }
  }
  await deployViaDirectRailwayGraphql({ commitSha });
}

main().catch((error) => {
  console.error(`Railway deploy failed: ${error.message}`);
  process.exit(1);
});
