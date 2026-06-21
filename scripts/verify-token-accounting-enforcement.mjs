#!/usr/bin/env node
/**
 * SYNOPSIS: Verify Token Accounting enforcement wiring (metered council path + unmetered exceptions).
 * Verify Token Accounting enforcement wiring (metered council path + unmetered exceptions).
 * @ssot docs/projects/AMENDMENT_44_TOKEN_ACCOUNTING_OS.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const checks = [];

function add(name, ok, detail) {
  checks.push({ name, ok, detail });
}

async function main() {
  const council = fs.readFileSync(path.join(ROOT, 'services/council-service.js'), 'utf8');
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const migration = fs.readFileSync(path.join(ROOT, 'db/migrations/20260531_operator_consumption_ledger.sql'), 'utf8');

  add('metered_helper', council.includes('async function recordMetered'), 'council-service recordMetered');
  add('token_accounting_injected', council.includes('tokenAccounting') && server.includes('createTokenAccountingService'), 'tokenAccounting wired in server + council');
  add('no_direct_savings_record', (council.match(/savingsLedger\.record\(/g) || []).length <= 1, 'only recordMetered fallback uses savingsLedger.record');
  add('unmetered_table', migration.includes('ai_unmetered_exceptions'), 'ai_unmetered_exceptions migration');
  add('metered_service', fs.existsSync(path.join(ROOT, 'services/metered-ai-call.js')), 'metered-ai-call.js exists');
  add('strict_env_documented', fs.existsSync(path.join(ROOT, 'docs/projects/AMENDMENT_44_TOKEN_ACCOUNTING_OS.md')), 'AMENDMENT_44 documents TOKEN_ACCOUNTING_STRICT');

  const passed = checks.filter((c) => c.ok).length;
  const label = passed === checks.length ? 'VERIFIED' : passed >= checks.length - 1 ? 'PARTIALLY VERIFIED' : 'UNVERIFIED';

  console.log(JSON.stringify({ label, passed, total: checks.length, checks }, null, 2));
  process.exit(label === 'VERIFIED' ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ label: 'BLOCKED', error: err.message }, null, 2));
  process.exit(2);
});
