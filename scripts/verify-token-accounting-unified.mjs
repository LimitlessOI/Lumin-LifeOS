#!/usr/bin/env node
/**
 * SYNOPSIS: Verify unified Token Accounting OS API + view.
 * Verify unified Token Accounting OS API + view.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const base = (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

const checks = [];

function add(name, ok, detail) {
  checks.push({ name, ok, detail });
}

async function fetchJson(pathname) {
  const res = await fetch(`${base}${pathname}`, {
    headers: key ? { 'x-command-key': key } : {},
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  add('migration_operator', fs.existsSync(path.join(ROOT, 'db/migrations/20260531_operator_consumption_ledger.sql')), 'OCL migration on disk');
  add('migration_unified_view', fs.existsSync(path.join(ROOT, 'db/migrations/20260532_unified_token_accounting_view.sql')), 'unified view migration on disk');
  add('service_token_accounting', fs.existsSync(path.join(ROOT, 'services/token-accounting-service.js')), 'token-accounting-service.js');
  add('routes_token_accounting', fs.existsSync(path.join(ROOT, 'routes/token-accounting-routes.js')), 'token-accounting-routes.js');
  add('routes_ocl', fs.existsSync(path.join(ROOT, 'routes/operator-consumption-ledger-routes.js')), 'operator-consumption-ledger-routes.js');

  const reg = fs.readFileSync(path.join(ROOT, 'startup/register-runtime-routes.js'), 'utf8');
  add('routes_mounted', reg.includes('createTokenAccountingRoutes') && reg.includes('/api/v1/tokens'), 'register-runtime-routes mounts /api/v1/tokens');

  if (!key) {
    add('api_health', false, 'COMMAND_CENTER_KEY not set — skip live API');
  } else {
    for (const ep of ['/api/v1/tokens/unified/health', '/api/v1/tokens/unified/blind-spots', '/api/v1/tokens/verify']) {
      const { status, body } = await fetchJson(ep);
      add(`api_${ep.split('/').pop()}`, status === 200 && body.ok !== false, `HTTP ${status}`);
    }
  }

  const passed = checks.filter((c) => c.ok).length;
  const label = passed === checks.length ? 'VERIFIED' : passed >= checks.length - 2 ? 'PARTIALLY VERIFIED' : checks.some((c) => c.name.startsWith('migration') && !c.ok) ? 'BLOCKED' : 'UNVERIFIED';

  console.log(JSON.stringify({ label, passed, total: checks.length, checks }, null, 2));
  process.exit(label === 'VERIFIED' ? 0 : label === 'BLOCKED' ? 2 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ label: 'BLOCKED', error: err.message }, null, 2));
  process.exit(2);
});
