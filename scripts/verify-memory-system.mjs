/**
 * SYNOPSIS: MS-P1-004 acceptance audit for memory-system routes.
 * Runs live HTTP probes against the memory capsule surface using x-command-key.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ROUTES_FILE = path.join(ROOT, 'routes/memory-routes.js');
const MIGRATION_FILE = path.join(ROOT, 'db/migrations/20260704_create_memory_capsules.sql');

function readFile(relPath) {
  return fs.readFileSync(relPath, 'utf8');
}

function resolveBaseUrl() {
  return (
    process.env.PUBLIC_BASE_URL ||
    process.env.BUILDER_BASE_URL ||
    process.env.LUMIN_SMOKE_BASE_URL ||
    ''
  ).replace(/\/$/, '');
}

function resolveCommandKey() {
  return (
    process.env.COMMAND_CENTER_KEY ||
    process.env.COMMAND_KEY ||
    process.env.LIFEOS_KEY ||
    process.env.API_KEY ||
    ''
  );
}

function extractRoutePaths(source) {
  const paths = new Set();
  const re = /legacyRouter\.(get|post|put)\(\s*(['"`])([^'"`]+)\2/g;
  let match;
  while ((match = re.exec(source))) paths.add(match[3]);
  return [...paths];
}

function routeMatchesDeclared(routePaths, probePath) {
  return routePaths.some((declared) => {
    if (declared === probePath) return true;
    const normalizedDeclared = declared.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
    const normalizedProbe = probePath.replace(/\/[^/]+$/, '/{$id}');
    return normalizedDeclared === normalizedProbe;
  });
}

async function probe(baseUrl, commandKey, method, route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(commandKey ? { 'x-command-key': commandKey } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, text, json };
}

export async function runAudit() {
  const baseUrl = resolveBaseUrl();
  const commandKey = resolveCommandKey();
  const routesSource = readFile(ROUTES_FILE);
  const routePaths = extractRoutePaths(routesSource);
  const migrationSource = readFile(MIGRATION_FILE);

  const checks = [];
  const fail = (msg) => checks.push({ ok: false, msg });
  const pass = (msg) => checks.push({ ok: true, msg });

  if (!routesSource.includes("createLegacyMemoryRoutes(options = {})")) {
    fail('route factory check failed');
  } else {
    pass('route factory check passed');
  }

  if (!routesSource.includes("import memorySystem from '../core/memory-system.js';")) {
    fail('route signature check failed');
  } else {
    pass('route signature check passed');
  }

  if (!migrationSource.includes('CREATE TABLE IF NOT EXISTS memory_capsules')) {
    fail('migration literal missing');
  } else {
    pass('migration literal present');
  }

  if (!baseUrl) {
    fail('PUBLIC_BASE_URL missing');
    return { ok: false, checks };
  }

  if (!commandKey) {
    fail('COMMAND_CENTER_KEY missing');
    return { ok: false, checks };
  }

  const statusProbe = await probe(baseUrl, commandKey, 'GET', '/api/v1/memory/status');
  if (!(statusProbe.response.ok && statusProbe.response.status === 200)) {
    fail(`GET /api/v1/memory/status failed with ${statusProbe.response.status}`);
  } else {
    pass('GET /api/v1/memory/status passed');
  }

  const capsuleId = String(
    statusProbe.json?.capsule?.id ||
      statusProbe.json?.id ||
      statusProbe.json?.capsule_id ||
      statusProbe.json?.data?.id ||
      '1',
  );

  const requiredRoutes = [
    { method: 'GET', route: '/api/v1/memory/capsules/health' },
    { method: 'POST', route: '/api/v1/memory/capsules/signal', body: {} },
    { method: 'POST', route: '/api/v1/memory/capsules/retrieve', body: {} },
    { method: 'GET', route: `/api/v1/memory/capsules/capsule/${encodeURIComponent(capsuleId)}` },
    { method: 'POST', route: '/api/v1/memory/capsules/correct', body: {} },
  ];

  for (const item of requiredRoutes) {
    if (!routeMatchesDeclared(routePaths, item.route)) {
      fail(`route not declared in routes file: ${item.route}`);
      continue;
    }

    const probeResult = await probe(baseUrl, commandKey, item.method, item.route, item.body);
    if (probeResult.response.status !== 200) {
      fail(`${item.method} ${item.route} failed with ${probeResult.response.status}`);
      continue;
    }
    if (probeResult.json && probeResult.json.ok === false) {
      fail(`${item.method} ${item.route} returned ok:false`);
      continue;
    }
    pass(`${item.method} ${item.route} passed`);
  }

  const failed = checks.filter((c) => !c.ok);
  for (const entry of checks) {
    console.log(`${entry.ok ? 'PASS' : 'FAIL'} ${entry.msg}`);
  }

  return {
    ok: failed.length === 0,
    checks,
    baseUrl,
    commandKeyPresent: Boolean(commandKey),
    routeCount: routePaths.length,
  };
}

async function main() {
  const result = await runAudit();
  if (!result.ok) process.exit(1);
  process.exit(0);
}

main().catch(() => process.exit(1));