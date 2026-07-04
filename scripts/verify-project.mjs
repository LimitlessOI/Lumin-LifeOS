/**
 * SYNOPSIS: Exports createTCRoutes — scripts/verify-project.mjs.
 */
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const TARGET_FILES = [
  'db/migrations/20260704_create_transactions_table.sql',
  'services/tc-coordinator.js',
  'services/tc-doc-intake.js',
  'services/mls-deal-scanner.js',
  'routes/tc-routes.js',
];

const ROUTE_PATHS = [
  '/status',
  '/access/readiness',
  '/access/bootstrap',
  '/access/seed-defaults',
];

function readText(filePath) {
  return fs.readFile(path.join(ROOT, filePath), 'utf8');
}

function hasLiteral(haystack, needle) {
  return String(haystack).includes(needle);
}

function extractDeclaredRoutes(routesSource) {
  const out = new Set();
  const re = /router\.(get|post|put)\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = re.exec(routesSource))) out.add(match[2]);
  return out;
}

function findFactoryLine(routesSource) {
  const re = /export function createTCRoutes\s*\(/;
  return re.test(routesSource);
}

async function runAudit() {
  const checks = [];
  const issues = [];

  const [migration, coordinator, intake, scanner, routes] = await Promise.all(TARGET_FILES.map(readText));

  checks.push({
    name: 'db migration has transactions table',
    ok: hasLiteral(migration, 'CREATE TABLE IF NOT EXISTS transactions'),
  });

  checks.push({
    name: 'tc-coordinator exports createTransactionService',
    ok: hasLiteral(coordinator, 'export function createTransactionService'),
  });

  checks.push({
    name: 'tc-doc-intake exports createTcEmailScanAndUpload',
    ok: hasLiteral(intake, 'export function createTcEmailScanAndUpload'),
  });

  checks.push({
    name: 'mls-deal-scanner exports createTcService',
    ok: hasLiteral(scanner, 'export function createTcService'),
  });

  checks.push({
    name: 'routes factory line exists',
    ok: findFactoryLine(routes),
  });

  const declaredRoutes = extractDeclaredRoutes(routes);
  for (const routePath of ROUTE_PATHS) {
    checks.push({
      name: `routes declare ${routePath}`,
      ok: declaredRoutes.has(routePath),
    });
  }

  for (const c of checks) {
    if (!c.ok) issues.push(c.name);
  }

  const baseUrl = (process.env.PUBLIC_BASE_URL || process.env.REMOTE_VERIFY_BASE_URL || '').trim();
  const commandKey = (process.env.COMMAND_CENTER_KEY || '').trim();

  if (!baseUrl) issues.push('PUBLIC_BASE_URL/REMOTE_VERIFY_BASE_URL missing');
  if (!commandKey) issues.push('COMMAND_CENTER_KEY missing');

  const probe = async (method, routePath, body = null) => {
    if (!baseUrl || !commandKey) return { ok: false, status: 0, data: null };
    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/tc${routePath}`;
    const response = await fetch(url, {
      method,
      headers: {
        'x-command-key': commandKey,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    return { ok: response.ok, status: response.status, data };
  };

  const statusProbe = await probe('GET', '/status');
  checks.push({
    name: 'HTTP 200 on GET /api/v1/tc/status',
    ok: statusProbe.status === 200 && statusProbe.data?.ok === true,
  });

  for (const routePath of ['/access/readiness', '/access/bootstrap', '/access/seed-defaults']) {
    const method = routePath === '/access/readiness' ? 'GET' : 'POST';
    const result = await probe(method, routePath, method === 'POST' ? { actor: 'tc_acceptance_runner' } : null);
    checks.push({
      name: `${method} /api/v1/tc${routePath} reachable`,
      ok: result.status === 200,
    });
    if (method !== 'GET') {
      checks.push({
        name: `${method} /api/v1/tc${routePath} ok:true when applicable`,
        ok: result.data?.ok === true,
      });
    }
  }

  const passCount = checks.filter((c) => c.ok).length;
  const failCount = checks.length - passCount;

  for (const c of checks) {
    if (!c.ok) console.error(`FAIL: ${c.name}`);
  }

  if (failCount > 0) {
    console.error(`\nFailed ${failCount}/${checks.length} checks`);
    process.exit(1);
  }

  console.log(`PASS ${passCount}/${checks.length}`);
}

async function main() {
  await runAudit();
}

main().catch(() => process.exit(1));