#!/usr/bin/env node
/**
 * SYNOPSIS: Verify BuilderOS Control Plane — measurement layer readiness.
 * Verify BuilderOS Control Plane — measurement layer readiness.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const base = (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';

const checks = [];
function add(name, ok, detail) {
  checks.push({ name, ok, detail });
}

async function main() {
  add('amendment_46', fs.existsSync(path.join(ROOT, 'docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md')), 'SSOT amendment');
  add('migration_build_task_ledger', fs.existsSync(path.join(ROOT, 'db/migrations/20260601_build_task_ledger.sql')), 'build_task_ledger migration');
  add('service_control_plane', fs.existsSync(path.join(ROOT, 'services/builderos-control-plane-service.js')), 'control plane service');
  add('routes_control_plane', fs.existsSync(path.join(ROOT, 'routes/builderos-control-plane-routes.js')), 'control plane routes');

  const reg = fs.readFileSync(path.join(ROOT, 'startup/register-runtime-routes.js'), 'utf8');
  add('routes_mounted', reg.includes('createBuilderOSControlPlaneRoutes') && reg.includes('/api/v1/builderos/control-plane'), 'mounted in register-runtime-routes');

  add('token_accounting_service', fs.existsSync(path.join(ROOT, 'services/token-accounting-service.js')), 'Token Accounting OS service');
  add('unmetered_migration', fs.existsSync(path.join(ROOT, 'db/migrations/20260531_operator_consumption_ledger.sql')), 'ai_unmetered_exceptions migration file');

  let dbProof = null;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('neon') ? { rejectUnauthorized: false } : undefined,
    });
    try {
      const { rows } = await pool.query(`
        SELECT
          to_regclass('public.build_task_ledger') IS NOT NULL AS btl,
          to_regclass('public.token_usage_log') IS NOT NULL AS tul,
          to_regclass('public.ai_unmetered_exceptions') IS NOT NULL AS aue,
          to_regclass('public.unified_token_accounting_report') IS NOT NULL AS uta
      `);
      dbProof = rows[0];
      add('db_build_task_ledger', Boolean(rows[0]?.btl), 'build_task_ledger in Neon');
      add('db_token_usage_log', Boolean(rows[0]?.tul), 'token_usage_log in Neon');
      add('db_unmetered', Boolean(rows[0]?.aue), 'ai_unmetered_exceptions in Neon');
      add('db_unified_view', Boolean(rows[0]?.uta), 'unified_token_accounting_report in Neon');

      if (rows[0]?.tul) {
        const stats = await pool.query(`
          SELECT COUNT(*)::int AS total,
                 COUNT(*) FILTER (WHERE logged_at >= NOW() - INTERVAL '24 hours')::int AS last_24h
          FROM token_usage_log
        `);
        dbProof.token_rows = stats.rows[0];
      }
    } finally {
      await pool.end();
    }
  } else {
    add('db_build_task_ledger', false, 'DATABASE_URL not set');
    add('db_token_usage_log', false, 'DATABASE_URL not set');
    add('db_unmetered', false, 'DATABASE_URL not set');
    add('db_unified_view', false, 'DATABASE_URL not set');
  }

  if (key) {
    const res = await fetch(`${base}/api/v1/builderos/control-plane/health`, {
      headers: { 'x-command-key': key },
    });
    const body = await res.json().catch(() => ({}));
    add('api_health', res.status === 200 && body.status, `HTTP ${res.status} status=${body.status || 'missing'}`);
  } else {
    add('api_health', false, 'COMMAND_CENTER_KEY not set');
  }

  const passed = checks.filter((c) => c.ok).length;
  let label = 'UNVERIFIED';
  if (!process.env.DATABASE_URL) label = 'BLOCKED';
  else if (passed === checks.length) label = 'VERIFIED';
  else if (passed >= checks.length - 3) label = 'PARTIALLY VERIFIED';
  else if (!checks.find((c) => c.name === 'migration_build_task_ledger')?.ok) label = 'BLOCKED';

  const out = { label, passed, total: checks.length, checks, db_proof: dbProof };
  console.log(JSON.stringify(out, null, 2));
  process.exit(label === 'VERIFIED' ? 0 : label === 'BLOCKED' ? 2 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ label: 'BLOCKED', error: err.message }, null, 2));
  process.exit(2);
});
