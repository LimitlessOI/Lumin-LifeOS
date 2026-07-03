#!/usr/bin/env node
/**
 * SYNOPSIS: Deploy the repo to Railway from GitHub Actions without relying on the Railway CLI.
 * @authority Legacy production spine — deploy path repair only.
 *
 * Why this exists:
 * - Railway CLI auth in CI has been brittle across token types.
 * - This script talks to Railway GraphQL directly using the same token secret.
 *
 * Required env:
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

async function main() {
  const projectId = requireEnv("RAILWAY_PROJECT_ID");
  const requestedServiceId = getEnv("RAILWAY_SERVICE_ID");
  const requestedServiceName = getEnv("RAILWAY_SERVICE_NAME", "lumin-web");
  const requestedEnvironmentId = getEnv("RAILWAY_ENVIRONMENT_ID");
  const requestedEnvironmentName = getEnv("RAILWAY_ENVIRONMENT_NAME", "production");
  const commitSha = getEnv("GITHUB_SHA");

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

main().catch((error) => {
  console.error(`Railway deploy failed: ${error.message}`);
  process.exit(1);
});
