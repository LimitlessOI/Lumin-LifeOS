/**
 * SYNOPSIS: Exports runAudit — scripts/verify-tcservice.mjs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROUTES_FILE = path.resolve('routes/tc-routes.js');
const MIGRATION_FILE = path.resolve('db/migrations/20260704_create_transactions_table.sql');
const COORDINATOR_FILE = path.resolve('services/tc-coordinator.js');
const DOC_INTAKE_FILE = path.resolve('services/tc-doc-intake.js');
const MLS_SCANNER_FILE = path.resolve('services/mls-deal-scanner.js');

function extractRoutePaths(source) {
  const out = [];
  const re = /router\.(get|post|put)\(\s*(['"`])([^'"`]+)\2/g;
  let m;
  while ((m = re.exec(source))) out.push(m[3]);
  return out;
}

function ensure(condition, message, details = {}) {
  if (!condition) throw Object.assign(new Error(message), details);
}

async function readText(file) {
  return fs.readFile(file, 'utf8');
}

function getBaseUrl() {
  return process.env.PUBLIC_BASE_URL || process.env.PUBLIC_URL || '';
}

function getKey() {
  return process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';
}

async function probe(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'x-command-key': getKey(),
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
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
  const failures = [];
  const baseUrl = getBaseUrl();
  const key = getKey();

  try {
    ensure(Boolean(baseUrl), 'PUBLIC_BASE_URL is required');
    ensure(Boolean(key), 'COMMAND_CENTER_KEY is required');

    const [routesSource, migrationSource, coordinatorSource, docIntakeSource, mlsScannerSource] = await Promise.all([
      readText(ROUTES_FILE),
      readText(MIGRATION_FILE),
      readText(COORDINATOR_FILE),
      readText(DOC_INTAKE_FILE),
      readText(MLS_SCANNER_FILE),
    ]);

    const routePaths = extractRoutePaths(routesSource);
    ensure(routePaths.includes('/sessions'), 'Missing route: GET /sessions');
    ensure(routePaths.includes('/validate-payment-link'), 'Missing route: POST /validate-payment-link');

    ensure(migrationSource.includes("CREATE TABLE IF NOT EXISTS transactions"), 'Missing migration literal');
    ensure(coordinatorSource.includes('export function createTransactionService'), 'Missing coordinator service export');
    ensure(docIntakeSource.includes('export function createTcEmailScanAndUpload'), 'Missing doc intake service export');
    ensure(mlsScannerSource.includes('export function createTcService'), 'Missing MLS scanner service export');
    ensure(
      routesSource.includes("createTCRoutes(") || routesSource.includes("export function createTCRoutes"),
      'Missing routes factory signature'
    );

    const allowedPaths = new Set(routePaths);
    const checks = [
      {
        name: 'GET /api/v1/tc/sessions',
        path: '/api/v1/tc/sessions',
        method: 'GET',
        body: undefined,
        verify: (json, response) => response.status === 200 && json && json.ok === true,
      },
      {
        name: 'POST /api/v1/tc/validate-payment-link',
        path: '/api/v1/tc/validate-payment-link',
        method: 'POST',
        body: { link: 'https://buy.stripe.com/test' },
        verify: (json, response) => response.status === 200 && json && json.ok === true,
      },
    ];

    for (const check of checks) {
      const relative = check.path.replace(/^\/api\/v1\/tc/, '') || '/';
      ensure(allowedPaths.has(relative), `Probe path not declared in routes file: ${check.path}`);
      const url = `${baseUrl.replace(/\/+$/, '')}${check.path}`;
      const result = await probe(url, {
        method: check.method,
        body: check.body ? JSON.stringify(check.body) : undefined,
      });
      if (!check.verify(result.json, result.response)) {
        failures.push({
          name: check.name,
          status: result.response.status,
          body: result.text,
        });
      }
    }

    if (failures.length) {
      console.error(JSON.stringify({ ok: false, failures }, null, 2));
      process.exit(1);
    }

    console.log(JSON.stringify({ ok: true, checks: checks.map((c) => c.name) }, null, 2));
    return { ok: true };
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

async function main() {
  await runAudit();
}

main().catch(() => process.exit(1));