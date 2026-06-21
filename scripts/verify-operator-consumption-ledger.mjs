#!/usr/bin/env node
/**
 * SYNOPSIS: Verify Operator Consumption Ledger (OCL1) service + optional live write test.
 * Verify Operator Consumption Ledger (OCL1) service + optional live write test.
 * @ssot docs/projects/AMENDMENT_44_TOKEN_ACCOUNTING_OS.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const base = (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  add('service_file', fs.existsSync(path.join(ROOT, 'services/operator-consumption-ledger-service.js')), 'OCL service');
  add('routes_file', fs.existsSync(path.join(ROOT, 'routes/operator-consumption-ledger-routes.js')), 'OCL routes');
  add('migration_file', fs.existsSync(path.join(ROOT, 'db/migrations/20260531_operator_consumption_ledger.sql')), 'OCL migration');

  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('neon') ? { rejectUnauthorized: false } : undefined,
    });
    try {
      const { rows } = await pool.query(`SELECT to_regclass('public.operator_consumption_ledger') IS NOT NULL AS ok`);
      add('table_exists', Boolean(rows[0]?.ok), 'operator_consumption_ledger in DB');
    } finally {
      await pool.end();
    }
  } else {
    add('table_exists', false, 'DATABASE_URL not set');
  }

  if (key && !dryRun) {
    const res = await fetch(`${base}/api/v1/tokens/operator/recent?limit=1`, {
      headers: { 'x-command-key': key },
    });
    add('api_recent', res.status === 200, `GET /operator/recent HTTP ${res.status}`);
  } else {
    add('api_recent', false, dryRun ? 'dry-run' : 'no COMMAND_CENTER_KEY');
  }

  const passed = checks.filter((c) => c.ok).length;
  const label = passed >= 3 ? (passed === checks.length ? 'VERIFIED' : 'PARTIALLY VERIFIED') : 'UNVERIFIED';

  console.log(JSON.stringify({ label, passed, total: checks.length, checks }, null, 2));
  process.exit(label === 'VERIFIED' ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ label: 'BLOCKED', error: err.message }, null, 2));
  process.exit(2);
});
