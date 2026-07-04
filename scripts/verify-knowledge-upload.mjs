/**
 * SYNOPSIS: Exports runAudit — scripts/verify-knowledge-upload.mjs.
 */
import fs from "fs";
import path from "path";

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseRouteFactories(text) {
  const exactFactoryLines = [];
  const factoryRegex = /export function (create[A-Za-z0-9_]+Routes)\s*\(([^)]*)\)/g;
  let match;
  while ((match = factoryRegex.exec(text))) {
    exactFactoryLines.push(match[0]);
  }
  return exactFactoryLines;
}

function extractRoutePaths(text) {
  const paths = new Set();
  const regex = /\.(get|post|put)\s*\(\s*(['"])(\/api\/v1\/[^'"]+)\2/g;
  let match;
  while ((match = regex.exec(text))) {
    paths.add(match[3]);
  }
  return [...paths];
}

function getPublicBaseUrl() {
  const base = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || "";
  assert(base, "PUBLIC_BASE_URL is required");
  return base.replace(/\/+$/, "");
}

function getCommandKey() {
  const key = process.env.COMMAND_CENTER_KEY || process.env.X_COMMAND_KEY || "";
  assert(key, "COMMAND_CENTER_KEY is required");
  return key;
}

async function httpJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { response, text, body };
}

export async function runAudit() {
  const repoRoot = process.cwd();
  const kbRoutesPath = path.join(repoRoot, "routes", "knowledge-base-routes.js");
  const webIntelRoutesPath = path.join(repoRoot, "routes", "web-intelligence-routes.js");
  const kbMigrationPath = path.join(repoRoot, "db", "migrations", "20260704_create_knowledge_base_files.sql");
  const sotMigrationPath = path.join(repoRoot, "db", "migrations", "20260704_create_system_source_of_truth.sql");

  const kbRoutes = readText(kbRoutesPath);
  const webIntelRoutes = readText(webIntelRoutesPath);
  const kbMigration = readText(kbMigrationPath);
  const sotMigration = readText(sotMigrationPath);

  const kbFactoryLine = "export function createXxxRoutes({ pool, requireKey, logger }) {";
  const webFactoryLine = "export function createWebIntelligenceRoutes(app, ctx) {";

  assert(kbRoutes.includes(kbFactoryLine), "Missing exact knowledge base route factory signature");
  assert(webIntelRoutes.includes(webFactoryLine), "Missing exact web intelligence route factory signature");
  assert(kbRoutes.includes("/api/v1/knowledge/upload"), "Missing knowledge upload route");
  assert(kbMigration.includes("CREATE TABLE IF NOT EXISTS knowledge_base_files"), "Missing knowledge_base_files migration");
  assert(sotMigration.includes("CREATE TABLE IF NOT EXISTS system_source_of_truth"), "Missing system_source_of_truth migration");

  const declaredPaths = new Set([
    ...extractRoutePaths(kbRoutes),
    ...extractRoutePaths(webIntelRoutes),
  ]);
  assert(declaredPaths.has("/api/v1/knowledge/upload"), "Route path not declared in routes file");

  const baseUrl = getPublicBaseUrl();
  const key = getCommandKey();

  const uploadUrl = `${baseUrl}/api/v1/knowledge-base/api/v1/knowledge/upload`;
  const form = new FormData();
  form.append("category", "acceptance-test");
  form.append("tags", JSON.stringify(["kb-p1-008"]));
  form.append("file", new Blob(["knowledge-upload-acceptance"], { type: "text/plain" }), "acceptance.txt");

  const { response, body } = await httpJson(uploadUrl, {
    method: "POST",
    headers: {
      "x-command-key": key,
    },
    body: form,
  });

  assert(response.status === 200, `Expected HTTP 200, got ${response.status}`);
  assert(body && body.ok === true, "Expected ok:true response");

  return { ok: true };
}

async function main() {
  await runAudit();
  process.exit(0);
}

main().catch(() => process.exit(1));