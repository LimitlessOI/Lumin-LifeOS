#!/usr/bin/env node
/**
 * SYNOPSIS: Deploy the repo to Railway from GitHub Actions.
 * @authority Legacy production spine — deploy path repair only.
 *
 * Preferred path (post lumin-web cutover):
 *   Call the live service's managed-env build-from-latest endpoint.
 *   Production already holds a working RAILWAY_TOKEN + correct
 *   RAILWAY_SERVICE_ID / RAILWAY_ENVIRONMENT_ID for lumin-web.
 *   This avoids the stale GitHub RAILWAY_TOKEN secret (pre-cutover).
 *
 * Fallback path:
 *   Direct Railway GraphQL using RAILWAY_TOKEN + project topology.
 *
 * Required env (preferred):
 *   APP_URL or PUBLIC_BASE_URL
 *   COMMAND_CENTER_KEY (or LIFEOS_KEY / API_KEY)
 *
 * Required env (fallback):
 *   RAILWAY_TOKEN or RAILWAY_API_TOKEN
 *   RAILWAY_PROJECT_ID
 *   RAILWAY_SERVICE_NAME or RAILWAY_SERVICE_ID
 *   RAILWAY_ENVIRONMENT_NAME or RAILWAY_ENVIRONMENT_ID
 *
 * Optional env:
 *   GITHUB_SHA
 */

const RAILWAY_GQL = "https://backboard.railway.app/graphql/v2";

function getEnv(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function requireEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeConnection(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.edges)) {
    return value.edges.map((edge) => edge?.node).filter(Boolean);
  }
  if (Array.isArray(value.nodes)) return value.nodes.filter(Boolean);
  return [];
}

function getCommandKey() {
  return (
    getEnv("COMMAND_CENTER_KEY") ||
    getEnv("LIFEOS_KEY") ||
    getEnv("API_KEY")
  );
}

function getLiveBaseUrl() {
  return (getEnv("APP_URL") || getEnv("PUBLIC_BASE_URL")).replace(/\/$/, "");
}

async function railwayGql(query, variables = {}) {
  const token = getEnv("RAILWAY_API_TOKEN") || getEnv("RAILWAY_TOKEN");
  if (!token) throw new Error("RAILWAY_API_TOKEN or RAILWAY_TOKEN is required");

  const res = await fetch(RAILWAY_GQL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Railway API returned non-JSON (${res.status}): ${text.slice(0, 500)}`);
  }

  if (!res.ok) {
    throw new Error(`Railway API HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((err) => err.message).join("; "));
  }
  return json.data;
}

async function resolveProjectTopology(projectId) {
  return railwayGql(
    `query ResolveProject($projectId: String!) {
      project(id: $projectId) {
        id
        name
        services {
          edges {
            node {
              id
              name
            }
          }
        }
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
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
        edges {
          node {
            id
            status
            meta
            createdAt
            updatedAt
          }
        }
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
    headers: {
      "content-type": "application/json",
      "x-command-key": commandKey,
    },
    body: JSON.stringify(commitSha ? { commit_sha: commitSha } : {}),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`managed-env deploy returned non-JSON (${res.status}): ${text.slice(0, 500)}`);
  }

  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `managed-env deploy HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  console.log("Live managed-env deploy accepted:");
  console.log(JSON.stringify({
    ok: json.ok,
    message: json.message,
    commit_sha: json.commit_sha,
    data: json.data,
  }, null, 2));
  return json;
}

async function deployViaDirectRailwayGraphql({ commitSha }) {
  const projectId = requireEnv("RAILWAY_PROJECT_ID");
  const requestedServiceId = getEnv("RAILWAY_SERVICE_ID");
  const requestedServiceName = getEnv("RAILWAY_SERVICE_NAME", "lumin-web");
  const requestedEnvironmentId = getEnv("RAILWAY_ENVIRONMENT_ID");
  const requestedEnvironmentName = getEnv("RAILWAY_ENVIRONMENT_NAME", "production");

  console.log("Deploy path: direct Railway GraphQL (fallback)");
  console.log(`Target project: ${projectId}`);
  console.log(`Target service: ${requestedServiceId || requestedServiceName}`);
  console.log(`Target environment: ${requestedEnvironmentId || requestedEnvironmentName}`);

  const topology = await resolveProjectTopology(projectId);
  const project = topology?.project;
  if (!project?.id) {
    throw new Error(`Project "${projectId}" not found or not accessible`);
  }

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

  const deploy = await triggerDeploy({
    serviceId: service.id,
    environmentId: environment.id,
    commitSha,
  });

  console.log("Railway deploy mutation accepted:");
  console.log(JSON.stringify(deploy, null, 2));

  const latest = await fetchLatestDeployment({
    serviceId: service.id,
    environmentId: environment.id,
  });
  if (latest) {
    console.log("Latest deployment after trigger:");
    console.log(JSON.stringify(latest, null, 2));
  }
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
      const hasDirectToken = Boolean(getEnv("RAILWAY_API_TOKEN") || getEnv("RAILWAY_TOKEN"));
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
